import { readdir, stat } from "node:fs/promises";
import { join, basename, relative } from "node:path";

export interface FileEntry {
  absolutePath: string;
  relativePath: string;
  size: number;
}

/**
 * Scans a directory recursively and returns a flat list of files.
 * 
 * Logic:
 * 1. If the root folder itself starts with '.' (e.g. .git), we assume specific intent
 *    and INCLUDE all hidden files/folders inside it.
 * 2. If the root folder is normal (e.g. src), we IGNORE all hidden files/folders
 *    encountered during recursion.
 */
export async function scanDirectory(rootPath: string): Promise<FileEntry[]> {
  const rootName = basename(rootPath);
  const isExplicitlyHidden = rootName.startsWith('.');
  const entries: FileEntry[] = [];

  async function walk(currentPath: string) {
    const items = await readdir(currentPath);

    for (const item of items) {
      const fullPath = join(currentPath, item);
      const isHidden = item.startsWith('.');

      // If we are NOT in "Explicit Mode" and we hit a hidden file/folder, skip it.
      if (!isExplicitlyHidden && isHidden) {
        continue;
      }

      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        await walk(fullPath);
      } else {
        entries.push({
          absolutePath: fullPath,
          relativePath: relative(rootPath, fullPath),
          size: stats.size,
        });
      }
    }
  }

  // Initial check: if rootPath is a file, just return it
  const rootStats = await stat(rootPath);
  if (!rootStats.isDirectory()) {
    return [{
      absolutePath: rootPath,
      relativePath: rootName,
      size: rootStats.size
    }];
  }

  await walk(rootPath);
  return entries;
}
