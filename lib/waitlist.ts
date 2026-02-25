import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

export interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  role: string;
  github?: string;
  interest: string;
  feedback?: string;
  appliedAt: string;
}

const DATA_DIR = join(process.cwd(), "data");
const FILE_PATH = join(DATA_DIR, "waitlist.json");

async function ensureFile(): Promise<WaitlistEntry[]> {
  try {
    const raw = await readFile(FILE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(FILE_PATH, "[]", "utf-8");
    return [];
  }
}

export async function addEntry(
  entry: Omit<WaitlistEntry, "id" | "appliedAt">
): Promise<WaitlistEntry> {
  const entries = await ensureFile();

  const duplicate = entries.find(
    (e) => e.email.toLowerCase() === entry.email.toLowerCase()
  );
  if (duplicate) {
    throw new Error("This email has already applied.");
  }

  const newEntry: WaitlistEntry = {
    ...entry,
    id: crypto.randomUUID(),
    appliedAt: new Date().toISOString(),
  };

  entries.push(newEntry);
  await writeFile(FILE_PATH, JSON.stringify(entries, null, 2), "utf-8");

  return newEntry;
}

export async function getEntries(): Promise<WaitlistEntry[]> {
  return ensureFile();
}

export async function getCount(): Promise<number> {
  const entries = await ensureFile();
  return entries.length;
}
