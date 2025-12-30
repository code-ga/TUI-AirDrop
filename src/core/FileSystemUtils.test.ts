import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { scanDirectory } from "./FileSystemUtils";
import { mkdir, writeFile, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

const TEST_DIR = join(process.cwd(), "test_scan_dir");

describe("FileSystemUtils - scanDirectory", () => {
  beforeAll(async () => {
    if (existsSync(TEST_DIR)) await rmdir(TEST_DIR, { recursive: true });
    await mkdir(TEST_DIR);

    // Structure:
    // test_scan_dir/
    //   normal/
    //     file1.txt
    //     .hidden_file
    //     sub/
    //       file2.txt
    //   .hidden_root/
    //     config
    //     .secret

    // Setup Normal Folder
    const normalDir = join(TEST_DIR, "normal");
    await mkdir(normalDir);
    await writeFile(join(normalDir, "file1.txt"), "content");
    await writeFile(join(normalDir, ".hidden_file"), "shh");
    
    await mkdir(join(normalDir, "sub"));
    await writeFile(join(normalDir, "sub", "file2.txt"), "content2");

    // Setup Hidden Root Folder
    const hiddenDir = join(TEST_DIR, ".hidden_root");
    await mkdir(hiddenDir);
    await writeFile(join(hiddenDir, "config"), "conf");
    await writeFile(join(hiddenDir, ".secret"), "topsecret");
  });

  afterAll(async () => {
    if (existsSync(TEST_DIR)) await rmdir(TEST_DIR, { recursive: true });
  });

  test("Scenario A: Normal folder should ignore hidden files", async () => {
    const root = join(TEST_DIR, "normal");
    const result = await scanDirectory(root);
    
    // Should contain file1.txt and sub/file2.txt
    // Should NOT contain .hidden_file
    const paths = result.map(r => r.relativePath).sort();
    
    expect(paths).toContain("file1.txt");
    expect(paths).toContain(join("sub", "file2.txt"));
    expect(paths.some(p => p.includes(".hidden_file"))).toBe(false);
  });

  test("Scenario B: Explicit hidden folder should include all contents", async () => {
    const root = join(TEST_DIR, ".hidden_root");
    const result = await scanDirectory(root);

    const paths = result.map(r => r.relativePath).sort();

    expect(paths).toContain("config");
    expect(paths).toContain(".secret");
  });

  test("Single file scan", async () => {
    const file = join(TEST_DIR, "normal", "file1.txt");
    const result = await scanDirectory(file);
    
    expect(result).toHaveLength(1);
    expect(result[0].relativePath).toBe("file1.txt");
  });
});
