import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_HTML_BYTES = 1_000_000;
const MAX_REDIRECTS = 4;
const MAX_PAGES = 25;
const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;

function isPrivateIPv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 192 && b === 0) || a >= 224;
}

function isPrivateIPv6(address: string): boolean {
  const value = address.toLowerCase().split("%", 1)[0];
  if (value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb")) return true;
  const mapped = value.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIPv4(mapped[1]) : false;
}

export async function assertPublicHttpUrl(input: string): Promise<URL> {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("URL không hợp lệ."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Chỉ chấp nhận URL HTTP/HTTPS công khai.");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Không thể quét máy chủ nội bộ.");
  const ipVersion = isIP(host);
  if (ipVersion === 4 && isPrivateIPv4(host)) throw new Error("Không thể quét địa chỉ IP riêng tư.");
  if (ipVersion === 6 && isPrivateIPv6(host)) throw new Error("Không thể quét địa chỉ IPv6 riêng tư.");
  if (!ipVersion) {
    let addresses: Awaited<ReturnType<typeof lookup>>[];
    try { addresses = await lookup(host, { all: true, verbatim: true }); } catch { throw new Error("Không phân giải được tên miền."); }
    if (!addresses.length || addresses.some(({ address }) => isIP(address) === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address))) throw new Error("Tên miền trỏ tới địa chỉ mạng riêng tư hoặc không hợp lệ.");
  }
  url.hash = "";
  return url;
}

async function fetchHtml(initialUrl: string): Promise<{ url: URL; html: string }> {
  let current = await assertPublicHttpUrl(initialUrl);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(current, { redirect: "manual", signal: controller.signal, headers: { "user-agent": "ChatHubAI-KnowledgeBot/1.0" } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || redirect === MAX_REDIRECTS) throw new Error("Quá nhiều lần chuyển hướng hoặc thiếu Location.");
        current = await assertPublicHttpUrl(new URL(location, current).toString());
        continue;
      }
      if (!response.ok) throw new Error(`Máy chủ trả về HTTP ${response.status}.`);
      const type = response.headers.get("content-type") ?? "";
      if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) throw new Error("URL không trả về nội dung HTML.");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Không đọc được nội dung trang.");
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_HTML_BYTES) { await reader.cancel(); throw new Error("Trang vượt quá giới hạn 1 MB."); }
        chunks.push(value);
      }
      return { url: current, html: Buffer.concat(chunks).toString("utf8") };
    } finally { clearTimeout(timer); }
  }
  throw new Error("Không thể tải trang.");
}

export function chunkText(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + CHUNK_SIZE, normalized.length);
    if (end < normalized.length) {
      const boundary = normalized.lastIndexOf(" ", end);
      if (boundary > start + CHUNK_SIZE * 0.65) end = boundary;
    }
    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= normalized.length) break;
    start = Math.max(start + 1, end - CHUNK_OVERLAP);
  }
  return chunks;
}

export async function crawlWebsite(startUrl: string, scope: "single" | "domain") {
  const start = await assertPublicHttpUrl(startUrl);
  const origin = start.origin;
  const queue = [start.toString()];
  const seen = new Set<string>();
  const pages: { url: string; title: string; text: string; chunks: string[] }[] = [];
  const errors: { url: string; error: string }[] = [];

  while (queue.length && pages.length + errors.length < (scope === "single" ? 1 : MAX_PAGES)) {
    const candidate = queue.shift()!;
    let safeUrl: URL;
    try { safeUrl = await assertPublicHttpUrl(candidate); } catch (error) { errors.push({ url: candidate, error: error instanceof Error ? error.message : "URL không hợp lệ." }); continue; }
    safeUrl.search = "";
    safeUrl.hash = "";
    const normalizedUrl = safeUrl.toString();
    if (seen.has(normalizedUrl)) continue;
    seen.add(normalizedUrl);
    try {
      const { url, html } = await fetchHtml(normalizedUrl);
      if (url.origin !== origin) throw new Error("Trang chuyển hướng ra ngoài tên miền gốc.");
      const cheerio = await import("cheerio");
      const $ = cheerio.load(html);
      $("script, style, noscript, nav, footer, aside, header, form, svg, iframe, [role='navigation'], [aria-hidden='true']").remove();
      const title = $("title").first().text().trim() || url.hostname;
      const content = ($("main").text() || $("article").text() || $("body").text()).replace(/\s+/g, " ").trim();
      if (!content) throw new Error("Không tìm thấy nội dung văn bản.");
      pages.push({ url: url.toString(), title, text: content.slice(0, 100_000), chunks: chunkText(content).slice(0, 100) });
      if (scope === "domain") {
        $("a[href]").each((_, element) => {
          if (queue.length + seen.size >= MAX_PAGES * 3) return;
          try {
            const link = new URL($(element).attr("href")!, url);
            link.hash = "";
            if (link.origin === origin && ["http:", "https:"].includes(link.protocol) && !seen.has(link.toString())) queue.push(link.toString());
          } catch { /* Ignore malformed links. */ }
        });
      }
    } catch (error) {
      errors.push({ url: normalizedUrl, error: error instanceof Error ? error.message : "Không thể quét trang." });
    }
  }
  return { pages, errors, stats: { pagesFound: pages.length, failedPages: errors.length, chunks: pages.reduce((sum, page) => sum + page.chunks.length, 0), truncated: queue.length > 0 } };
}
