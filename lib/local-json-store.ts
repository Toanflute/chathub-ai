import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const writeQueues = new Map<string, Promise<void>>();

function dataFilePath(fileName: string) {
  const dataDirectory = process.env.CHATHUB_DATA_DIR
    ? path.resolve(process.env.CHATHUB_DATA_DIR)
    : path.join(process.cwd(), "data");
  const localFileName = process.env.CHATHUB_DATA_DIR && fileName === "inbox-conversations.json"
    ? "conversations.json"
    : fileName;
  return path.join(dataDirectory, localFileName);
}

async function writeArray<T>(filePath: string, values: T[]) {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(values, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, filePath);
}

export async function readLocalJsonArray<T>(fileName: string): Promise<T[]> {
  const filePath = dataFilePath(fileName);
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
    if (!Array.isArray(parsed)) throw new Error(`Tệp ${fileName} phải chứa một mảng JSON.`);
    return parsed as T[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await writeArray(filePath, []);
    return [];
  }
}

export async function updateLocalJsonArray<T, R>(fileName: string, update: (values: T[]) => { values: T[]; result: R }): Promise<R> {
  const filePath = dataFilePath(fileName);
  const previous = writeQueues.get(filePath) ?? Promise.resolve();
  const operation = previous.then(async () => {
    const values = await readLocalJsonArray<T>(fileName);
    const next = update(values);
    await writeArray(filePath, next.values);
    return next.result;
  });
  writeQueues.set(filePath, operation.then(() => undefined, () => undefined));
  return operation;
}
