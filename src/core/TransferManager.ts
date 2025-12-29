import { createServer, Socket } from "node:net";
import { createHash } from "node:crypto";
import { open, stat, rename, unlink, mkdir } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import EventEmitter from "node:events";
import { existsSync, statSync } from "node:fs";
import { dirname } from "node:path";

export interface PacketHeader {
  seq: number;
  size: number;
  hash: string;
  isLast: boolean;
}

export interface TransferInfo {
  filename: string;
  size: number;
  progress: number;
  speed: number;
  status: "pending" | "active" | "paused" | "complete" | "error";
  error?: string;
  savePath?: string;
}

export interface TransferManagerEvents {
  transferProgress: (info: TransferInfo) => void;
  transferComplete: (info: { filename: string; savePath: string }) => void;
  transferError: (info: { filename: string; error: string }) => void;
}

export class TransferManager extends EventEmitter {
  private transferServer = createServer();
  private TRANSFER_PORT = 5556;
  private CHUNK_SIZE = 65536; // 64KB
  private activeTransfers = new Map<string, TransferInfo>();

  // Token validation callback
  private tokenValidator?: (token: string, ip: string) => string | null;

  constructor(transferPort = 5556) {
    super();
    this.TRANSFER_PORT = transferPort;
    this.setupTransferServer();
  }

  public setTokenValidator(validator: (token: string, ip: string) => string | null) {
    this.tokenValidator = validator;
  }

  private setupTransferServer() {
    this.transferServer.on("connection", (socket) => {
      const fromIp = socket.remoteAddress?.replace(/^.*:/, "") || "";

      socket.once("data", (data) => {
        try {
          const handshake = JSON.parse(data.toString());
          if (handshake.token && this.tokenValidator) {
            const filePath = this.tokenValidator(handshake.token, fromIp);
            if (filePath) {
              this.handleSend(socket, filePath, handshake.startSeq || 0);
            } else {
              socket.write(Buffer.from(JSON.stringify({ error: "Invalid token" })));
              socket.destroy();
            }
          } else {
            socket.destroy();
          }
        } catch (e) {
          socket.destroy();
        }
      });
    });

    this.transferServer.listen(this.TRANSFER_PORT);
  }

  /**
   * Host: Send file to client
   */
  private async handleSend(socket: Socket, filePath: string, startSeq: number) {
    let fileHandle: FileHandle | null = null;

    try {
      const stats = await stat(filePath);
      const fileSize = stats.size;
      const filename = filePath.split(/[/\\]/).pop() || filePath;

      fileHandle = await open(filePath, "r");
      const byteOffset = startSeq * this.CHUNK_SIZE;

      let currentSeq = startSeq;
      let bytesRead = byteOffset;

      while (bytesRead < fileSize) {
        const buffer = Buffer.allocUnsafe(this.CHUNK_SIZE);
        const { bytesRead: chunkSize } = await fileHandle.read(
          buffer,
          0,
          this.CHUNK_SIZE,
          bytesRead
        );

        if (chunkSize === 0) break;

        const chunk = buffer.subarray(0, chunkSize);
        const hash = createHash("sha256").update(chunk).digest("hex");

        const header: PacketHeader = {
          seq: currentSeq,
          size: chunkSize,
          hash,
          isLast: bytesRead + chunkSize >= fileSize,
        };

        const packet = this.serializePacket(header, chunk);

        // Wait for drain if needed (backpressure)
        if (!socket.write(packet)) {
          await new Promise((resolve) => socket.once("drain", resolve));
        }

        bytesRead += chunkSize;
        currentSeq++;
      }

      await fileHandle.close();
      socket.end();
    } catch (error) {
      if (fileHandle) await fileHandle.close();
      socket.destroy();
      console.error("Send error:", error);
    }
  }

  /**
   * Client: Receive file from host
   */
  public async receiveFile(
    host: string,
    token: string,
    savePath: string,
    filename: string,
    totalSize: number
  ): Promise<void> {
    // Ensure directory exists
    const dir = dirname(savePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const socket = new Socket();
      const partPath = `${savePath}.part`;

      // Check for resume
      let currentBytes = 0;
      let startSeq = 0;

      if (existsSync(partPath)) {
        currentBytes = statSync(partPath).size;
        // Truncate to nearest chunk boundary to avoid partial chunk corruption
        currentBytes = Math.floor(currentBytes / this.CHUNK_SIZE) * this.CHUNK_SIZE;
        startSeq = currentBytes / this.CHUNK_SIZE;
      }

      const transferInfo: TransferInfo = {
        filename,
        size: totalSize,
        progress: currentBytes,
        speed: 0,
        status: "active",
        savePath,
      };

      this.activeTransfers.set(filename, transferInfo);

      let fileHandle: FileHandle | null = null;
      let buffer = Buffer.alloc(0);
      let lastProgressUpdate = Date.now();
      let lastBytes = currentBytes;

      const cleanup = async () => {
        if (fileHandle) await fileHandle.close();
        socket.destroy();
      };

      socket.connect(this.TRANSFER_PORT, host, async () => {
        try {
          // Send handshake
          socket.write(Buffer.from(JSON.stringify({ token, startSeq })));

          // Open file for writing (append mode)
          fileHandle = await open(partPath, currentBytes > 0 ? "r+" : "w");
          if (currentBytes > 0) {
            await fileHandle.truncate(currentBytes);
          }
        } catch (error) {
          reject(error);
          await cleanup();
        }
      });

      socket.on("data", async (data) => {
        try {
          const chunk = typeof data === "string" ? Buffer.from(data) : data;
          buffer = Buffer.concat([buffer, chunk]);

          while (buffer.length >= 4) {
            // Read packet length
            const headerLength = buffer.readUInt32BE(0);

            if (buffer.length < 4 + headerLength) break; // Wait for full header

            // Parse header
            const headerJson = buffer.subarray(4, 4 + headerLength).toString();
            const header: PacketHeader = JSON.parse(headerJson);

            if (buffer.length < 4 + headerLength + header.size) break; // Wait for full data

            // Extract binary data
            const binaryData = buffer.subarray(
              4 + headerLength,
              4 + headerLength + header.size
            );

            // Verify hash
            const calculatedHash = createHash("sha256")
              .update(binaryData)
              .digest("hex");

            if (calculatedHash !== header.hash) {
              transferInfo.status = "error";
              transferInfo.error = "Data corruption detected";
              this.emit("transferError", {
                filename,
                error: "Data corruption detected",
              });
              await cleanup();
              reject(new Error("Data corruption"));
              return;
            }

            // Write to file
            if (fileHandle) {
              await fileHandle.write(binaryData, 0, header.size, currentBytes);
              currentBytes += header.size;

              // Update progress
              transferInfo.progress = currentBytes;

              const now = Date.now();
              if (now - lastProgressUpdate > 500) {
                // Update every 500ms
                const elapsed = (now - lastProgressUpdate) / 1000;
                transferInfo.speed = (currentBytes - lastBytes) / elapsed;
                this.emit("transferProgress", { ...transferInfo });
                lastProgressUpdate = now;
                lastBytes = currentBytes;
              }

              // Check if complete
              if (header.isLast) {
                await fileHandle.close();
                fileHandle = null;

                // Rename .part to final file
                await rename(partPath, savePath);

                transferInfo.status = "complete";
                transferInfo.progress = totalSize;
                this.activeTransfers.delete(filename);
                this.emit("transferComplete", { filename, savePath });
                socket.destroy();
                resolve();
                return;
              }
            }

            // Remove processed packet from buffer
            buffer = buffer.subarray(4 + headerLength + header.size);
          }
        } catch (error) {
          transferInfo.status = "error";
          transferInfo.error = String(error);
          this.emit("transferError", { filename, error: String(error) });
          await cleanup();
          reject(error);
        }
      });

      socket.on("error", async (error) => {
        transferInfo.status = "error";
        transferInfo.error = String(error);
        this.emit("transferError", { filename, error: String(error) });
        await cleanup();
        reject(error);
      });
    });
  }

  /**
   * Serialize packet: [4-byte length] + [JSON header] + [binary data]
   */
  private serializePacket(header: PacketHeader, data: Buffer): Buffer {
    const headerJson = JSON.stringify(header);
    const headerBuffer = Buffer.from(headerJson);
    const lengthBuffer = Buffer.allocUnsafe(4);
    lengthBuffer.writeUInt32BE(headerBuffer.length, 0);

    return Buffer.concat([lengthBuffer, headerBuffer, data]);
  }

  public getActiveTransfers(): TransferInfo[] {
    return Array.from(this.activeTransfers.values());
  }

  public async close(): Promise<void> {
    return new Promise((resolve) => {
      this.transferServer.close(() => resolve());
    });
  }
}
