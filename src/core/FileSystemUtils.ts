import { readdir, stat } from "node:fs/promises";
import { statSync } from "node:fs";
import { join, basename, relative } from "node:path";
import { execSync } from "node:child_process";

export interface FileEntry {
  absolutePath: string;
  relativePath: string;
  size: number;
}

/**
 * Scans a directory recursively and returns a flat list of files.
 *
 * @param rootPath - The root directory path to scan.
 * @param skipHidden - If true, skip hidden files/folders during scanning. Default: true.
 * Hidden detection: On Windows, uses 'attrib' command to check for 'H' attribute; on other platforms, checks if filename starts with '.'.
 *
 * Logic:
 * 1. If the root folder itself starts with '.' (e.g. .git), we assume specific intent
 *    and INCLUDE all hidden files/folders inside it.
 * 2. If the root folder is normal (e.g. src) and skipHidden is true, we IGNORE all hidden files/folders
 *    encountered during recursion.
 */
export async function scanDirectory(
  rootPath: string,
  skipHidden: boolean = true
): Promise<FileEntry[]> {
  const rootName = basename(rootPath);
  const isExplicitlyHidden = rootName.startsWith(".");
  const entries: FileEntry[] = [];

  async function walk(currentPath: string) {
    const items = await readdir(currentPath);

    for (const item of items) {
      const fullPath = join(currentPath, item);
      let isHidden = false;
      if (process.platform === "win32") {
        try {
          const output = execSync(`attrib "${fullPath}"`, { encoding: "utf8" });
          isHidden = output.includes("H");
        } catch {
          isHidden = item.startsWith(".");
        }
      } else {
        isHidden = item.startsWith(".");
      }

      // If skipHidden is true, we are NOT in "Explicit Mode", and we hit a hidden file/folder, skip it.
      if (skipHidden && !isExplicitlyHidden && isHidden) {
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
    return [
      {
        absolutePath: rootPath,
        relativePath: rootName,
        size: rootStats.size,
      },
    ];
  }

  await walk(rootPath);
  return entries;
}
