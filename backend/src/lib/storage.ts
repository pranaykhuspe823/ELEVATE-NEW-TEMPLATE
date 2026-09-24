import fs from "fs";
import path from "path";

const STORAGE_DIR = path.resolve(
  process.cwd(),
  process.env.STORAGE_DIR || "../storage/resumes"
);

fs.mkdirSync(STORAGE_DIR, { recursive: true });

export interface StorageService {
  save(buffer: Buffer, filename: string): Promise<string>;
}

class LocalStorageService implements StorageService {
  async save(buffer: Buffer, filename: string): Promise<string> {
    const filePath = path.join(STORAGE_DIR, filename);
    await fs.promises.writeFile(filePath, buffer);
    return filePath;
  }
}

export const storage: StorageService = new LocalStorageService();
