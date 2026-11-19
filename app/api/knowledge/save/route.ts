import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { chunkText } from "@/lib/crawler";
import { getAiRuntimeSettings } from "@/lib/ai-settings";

export const runtime = "nodejs";
export const maxDuration = 60;

type InputPage = { url: string; title: string; text: string };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.knowledgeGroupId !== "string" || !Array.isArray(body.pages) || body.pages.length === 0 || body.pages.length > 25) return NextResponse.json({ error: "Cần chọn nhóm và gửi từ 1 đến 25 trang." }, { status: 400 });
    const group = await prisma.knowledgeGroup.findUnique({ where: { id: body.knowledgeGroupId } });
    if (!group) return NextResponse.json({ error: "Nhóm tài liệu không tồn tại." }, { status: 404 });
    const pages: InputPage[] = body.pages.map((item: unknown) => {
      if (!item || typeof item !== "object") throw new Error("Dữ liệu trang không hợp lệ.");
      const page = item as Record<string, unknown>;
      if (typeof page.url !== "string" || typeof page.title !== "string" || typeof page.text !== "string" || !page.text.trim() || page.text.length > 100_000) throw new Error("Trang thiếu URL, tiêu đề hoặc nội dung quá dài.");
      const url = new URL(page.url);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error("URL nguồn không hợp lệ.");
      return { url: url.toString(), title: page.title.slice(0, 250), text: page.text.trim() };
    });
    if (pages.reduce((total, page) => total + page.text.length, 0) > 500_000) return NextResponse.json({ error: "Tổng nội dung vượt quá 500.000 ký tự mỗi lần lưu." }, { status: 413 });

    const settings = await getAiRuntimeSettings();
    if (!settings.apiKey) return NextResponse.json({ error: "Hãy cấu hình AI Provider trước khi tạo embeddings." }, { status: 400 });
    const baseURL = settings.baseUrl?.trim() || (settings.provider === "deepseek" ? "https://api.deepseek.com" : undefined);
    const client = new OpenAI({ apiKey: settings.apiKey, ...(baseURL ? { baseURL } : {}), timeout: 30_000, maxRetries: 1 });
    const records = pages.map((page) => ({ ...page, chunks: chunkText(page.text) }));
    if (records.some((record) => record.chunks.length === 0)) return NextResponse.json({ error: "Không có nội dung để lưu." }, { status: 400 });
    const allChunks = records.flatMap((record, pageIndex) => record.chunks.map((content, chunkIndex) => ({ pageIndex, chunkIndex, content })));
    if (allChunks.length > 1500) return NextResponse.json({ error: "Số lượng đoạn vượt quá giới hạn 1.500." }, { status: 413 });

    const embeddings: number[][] = [];
    for (let offset = 0; offset < allChunks.length; offset += 100) {
      const batch = allChunks.slice(offset, offset + 100);
      const result = await client.embeddings.create({ model: settings.embeddingModel, input: batch.map((item) => item.content) });
      embeddings.push(...result.data.sort((a, b) => a.index - b.index).map((item) => item.embedding));
    }
    if (embeddings.length !== allChunks.length || embeddings.some((vector) => vector.length !== 1536)) return NextResponse.json({ error: "Embedding phải có đúng 1536 chiều theo cấu hình pgvector hiện tại." }, { status: 400 });

    const saved = await prisma.$transaction(async (tx) => {
      let cursor = 0;
      const documents = [];
      for (let pageIndex = 0; pageIndex < records.length; pageIndex++) {
        const record = records[pageIndex];
        const document = await tx.document.create({ data: { title: record.title || record.url, sourceUrl: record.url, sourceType: "website", status: "active", content: record.text, knowledgeGroupId: group.id } });
        const chunkRows = record.chunks.map((content, chunkIndex) => ({ documentId: document.id, content, chunkIndex }));
        await tx.documentChunk.createMany({ data: chunkRows });
        for (let chunkIndex = 0; chunkIndex < record.chunks.length; chunkIndex++) {
          const vector = `[${embeddings[cursor].join(",")}]`;
          await tx.$executeRaw`UPDATE document_chunks SET embedding = ${vector}::vector WHERE document_id = ${document.id} AND chunk_index = ${chunkIndex}`;
          cursor++;
        }
        documents.push({ id: document.id, title: document.title, sourceUrl: document.sourceUrl, chunks: record.chunks.length });
      }
      return documents;
    });
    return NextResponse.json({ success: true, documents: saved, stats: { documents: saved.length, chunks: allChunks.length } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể lưu tài liệu.";
    return NextResponse.json({ error: message.slice(0, 400) }, { status: 400 });
  }
}
