import { createServer, Socket } from "node:net";
import { createHash } from "node:crypto";
import { open, stat, rename, unlink, mkdir } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import EventEmitter from "node:events";
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { scanDirectory } from "./FileSystemUtils";

export interface PacketHeader {
  type: "DATA" | "FILE_START" | "BATCH_END";
  seq: number;
  size: number; // Payload size for this packet
  hash?: string;
  isLast?: boolean;
  path?: string; // For FILE_START
  fileSize?: number; // Total file size, used in FILE_START
}

export interface TransferInfo {
  filename: string;
  size: number;
  progress: number;
  speed: number;
  status: "pending" | "active" | "paused" | "complete" | "error";
  error?: string;
  savePath?: string;
  isBatch?: boolean;
  currentFileIndex?: number;
  totalFiles?: number;
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
   * Host: Send file or folder to client
   */
  private async handleSend(socket: Socket, filePath: string, startSeq: number) {
    try {
      const stats = await stat(filePath);
      
      if (stats.isDirectory()) {
         await this.sendBatch(socket, filePath);
      } else {
         await this.sendFileStream(socket, filePath, startSeq);
      }
    } catch (error) {
      socket.destroy();
      console.error("Send error:", error);
    }
  }

  private async sendBatch(socket: Socket, rootPath: string) {
    try {
      const files = await scanDirectory(rootPath);
      
      for (const file of files) {
         // 1. Send FILE_START
         const startHeader: PacketHeader = {
            type: "FILE_START",
            seq: 0,
            size: 0, // No payload in control packet
            fileSize: file.size,
            path: file.relativePath
         };
         
         const startPacket = this.serializePacket(startHeader, Buffer.alloc(0));
         if (!socket.write(startPacket)) {
            await new Promise((resolve) => socket.once("drain", resolve));
         }

         // 2. Send File Data
         await this.sendFileStream(socket, file.absolutePath, 0, false);
      }

      // 3. Send BATCH_END
      const endHeader: PacketHeader = {
         type: "BATCH_END",
         seq: 0,
         size: 0
      };
      const endPacket = this.serializePacket(endHeader, Buffer.alloc(0));
      socket.write(endPacket);
      
      socket.end();

    } catch (error) {
       console.error("Batch send error", error);
       socket.destroy();
    }
  }

  private async sendFileStream(socket: Socket, filePath: string, startSeq: number, closeSocketAtEnd: boolean = true) {
    let fileHandle: FileHandle | null = null;
    
    try {
      const stats = await stat(filePath);
      const fileSize = stats.size;

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
          type: "DATA",
          seq: currentSeq,
          size: chunkSize,
          hash,
          isLast: bytesRead + chunkSize >= fileSize,
        };

        const packet = this.serializePacket(header, chunk);

        if (!socket.write(packet)) {
          await new Promise((resolve) => socket.once("drain", resolve));
        }

        bytesRead += chunkSize;
        currentSeq++;
      }

      await fileHandle.close();
      if (closeSocketAtEnd) {
         socket.end();
      }
    } catch (error) {
      if (fileHandle) await fileHandle.close();
      if (closeSocketAtEnd) socket.destroy();
      throw error;
    }
  }

  /**
   * Client: Receive file or batch from host
   */
  public async receiveFile(
    host: string,
    token: string,
    savePath: string,
    filename: string, // root name for batch
    totalSize: number, // total batch size or file size
    isBatch: boolean = false
  ): Promise<void> {
    
    // Prepare root directory if batch
    if (isBatch) {
      if (!existsSync(savePath)) {
        await mkdir(savePath, { recursive: true });
      }
    } else {
        const dir = dirname(savePath);
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }
    }

    return new Promise((resolve, reject) => {
      const socket = new Socket();
      
      // State for batch
      let currentFilePath = isBatch ? "" : savePath;
      let currentFileHandle: FileHandle | null = null;
      let partPath = "";

      // Track progress
      let batchCurrentBytes = 0;
      
      const transferInfo: TransferInfo = {
        filename,
        size: totalSize,
        progress: 0,
        speed: 0,
        status: "active",
        savePath,
        isBatch,
        totalFiles: 0, // Should be passed ideally, but we might not know
        currentFileIndex: 0
      };

      this.activeTransfers.set(filename, transferInfo);

      let buffer = Buffer.alloc(0);
      let lastProgressUpdate = Date.now();
      let lastBytes = 0;

      const cleanup = async () => {
        if (currentFileHandle) await currentFileHandle.close();
        socket.destroy();
      };

      socket.connect(this.TRANSFER_PORT, host, async () => {
        try {
          socket.write(Buffer.from(JSON.stringify({ token, startSeq: 0 })));
          
          if (!isBatch) {
             // Prepare single file receiving immediately
             partPath = `${savePath}.part`;
             currentFileHandle = await open(partPath, "w");
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
            const headerLength = buffer.readUInt32BE(0);
            if (buffer.length < 4 + headerLength) break;

            const headerJson = buffer.subarray(4, 4 + headerLength).toString();
            
            let header: PacketHeader;
            try {
                header = JSON.parse(headerJson);
            } catch (e) {
                 throw new Error("Invalid packet header");
            }

            // Packet Body Check
            if (buffer.length < 4 + headerLength + header.size) break; 

            // Extract binary data (only existing if header.size > 0)
            const binaryData = header.size > 0 
                ? buffer.subarray(4 + headerLength, 4 + headerLength + header.size)
                : Buffer.alloc(0);

            // Handle Packet Type
            if (header.type === "FILE_START") {
                 // Close previous if any (safeguard)
                 if (currentFileHandle) await currentFileHandle.close();
                 
                 if (!header.path) throw new Error("FILE_START missing path");
                 
                 // Create dir for file
                 const fullPath = join(savePath, header.path);
                 const fileDir = dirname(fullPath);
                 if (!existsSync(fileDir)) {
                     await mkdir(fileDir, { recursive: true });
                 }
                 
                 currentFilePath = fullPath;
                 partPath = `${fullPath}.part`;
                 currentFileHandle = await open(partPath, "w");
                 
                 // Update Info
                 transferInfo.currentFileIndex = (transferInfo.currentFileIndex || 0) + 1;
                 
                 // We don't have binary data here.
                 
            } else if (header.type === "BATCH_END") {
                 if (currentFileHandle) await currentFileHandle.close();
                 currentFileHandle = null;
                 
                 transferInfo.status = "complete";
                 transferInfo.progress = totalSize; 
                 this.emit("transferComplete", { filename, savePath });
                 this.activeTransfers.delete(filename);
                 socket.destroy();
                 resolve();
                 return;
                 
            } else if (header.type === "DATA" || !header.type) { // Default to DATA for backward compat if undefined?
                 // Verify hash
                 if (binaryData.length > 0) {
                     const calculatedHash = createHash("sha256")
                       .update(binaryData)
                       .digest("hex");
    
                     if (header.hash && calculatedHash !== header.hash) {
                       throw new Error("Data corruption");
                     }
                     
                     // Write
                     if (currentFileHandle) {
                         await currentFileHandle.write(binaryData);
                         batchCurrentBytes += header.size;
                         transferInfo.progress = batchCurrentBytes; // Updates global progress
                         // Note: totalSize passed to receiveFile should ideally be the Batch Size.
                     }
                 }
                 
                 if (header.isLast) {
                     // End of current file
                     if (currentFileHandle) await currentFileHandle.close();
                     currentFileHandle = null;
                     
                     if (isBatch) {
                        // Rename
                        await rename(partPath, currentFilePath);
                     } else {
                        // Single file mode
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
            }

            // Move Buffer
            buffer = buffer.subarray(4 + headerLength + header.size);
            
            // Emit progress occasionally
            const now = Date.now();
            if (now - lastProgressUpdate > 500) {
                const elapsed = (now - lastProgressUpdate) / 1000;
                transferInfo.speed = (batchCurrentBytes - lastBytes) / elapsed;
                this.emit("transferProgress", { ...transferInfo });
                lastProgressUpdate = now;
                lastBytes = batchCurrentBytes;
            }
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
