import { Socket, createServer } from "node:net";
import { createSocket } from "node:dgram";
import type { RemoteInfo } from "node:dgram";
import { randomBytes } from "node:crypto";
import { hostname, networkInterfaces } from "node:os";
import { stat } from "node:fs/promises";
import EventEmitter from "node:events";
import { TransferManager } from "./TransferManager";
import type { TransferInfo } from "./TransferManager";
import { scanDirectory } from "./FileSystemUtils";

export interface Peer {
  displayName: string;
  ip: string;
  offering: { filename: string; size: number; filePath?: string } | null;
  lastSeen: number;
}

export interface FileRequest {
  fromIp: string;
  fileName: string;
  filePath: string;
  approve: (approved: boolean) => void;
}

export interface TransferReadyInfo {
  approved: true;
  token: string;
  host: string;
  port: number;
  filename: string;
  size: number;
  filePath: string;
  isBatch: boolean;
}

export interface NetworkManagerEvents {
  peerUpdate: (peers: Peer[]) => void;
  fileRequest: (req: FileRequest) => void;
  transferReady: (info: TransferReadyInfo) => void;
  transferProgress: (info: TransferInfo) => void;
  transferComplete: (info: { filename: string; savePath: string }) => void;
  transferError: (info: { filename: string; error: string }) => void;
}

export class NetworkManager extends EventEmitter {
  private udpSocket = createSocket("udp4");
  private peers = new Map<string, Peer>();
  private heartbeatInterval?: Timer;
  private cleanupInterval?: Timer;
  private controlServer = createServer();
  private tokens = new Map<string, { filePath: string; ip: string }>();
  private transferManager: TransferManager;
  private lastRequestTime = new Map<string, number>();
  private activeRequests = new Set<string>();

  public displayName: string = hostname();
  public localIps: string[] = [];
  public offering: { filename: string; size: number; filePath?: string } | null = null;
  public sharingMode: "auto" | "manual" = "manual";

  private UDP_PORT = 8888;
  private CONTROL_PORT = 8889;
  private TRANSFER_PORT = 5556;

  constructor(udpPort = 8888, controlPort = 8889, transferPort = 5556) {
    super();
    this.UDP_PORT = udpPort;
    this.CONTROL_PORT = controlPort;
    this.TRANSFER_PORT = transferPort;
    
    // Initialize TransferManager
    this.transferManager = new TransferManager(transferPort);
    this.transferManager.setTokenValidator((token, ip) => this.verifyToken(token, ip));
    
    // Forward transfer events
    this.transferManager.on("transferProgress", (info) => this.emit("transferProgress", info));
    this.transferManager.on("transferComplete", (info) => this.emit("transferComplete", info));
    this.transferManager.on("transferError", (info) => this.emit("transferError", info));
    
    this.setupUdp();
    this.setupControlServer();
  }

  private setupUdp() {
    this.udpSocket.on("message", (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString());
        if (this.localIps.includes(data.ip)) return;

        const peer: Peer = {
          displayName: data.displayName,
          ip: data.ip,
          offering: data.offering,
          lastSeen: Date.now(),
        };

        this.peers.set(peer.ip, peer);
        this.emit("peerUpdate", Array.from(this.peers.values()));
      } catch (e) {
        // Ignore invalid packets
      }
    });

    this.udpSocket.bind(this.UDP_PORT, () => {
      this.udpSocket.setBroadcast(true);
    });
  }

  public static getLocalIps(): string[] {
    const interfaces = networkInterfaces();
    const ips: string[] = [];
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        // Skip internal (loopback) and non-IPv4 addresses
        if (net.family === "IPv4" && !net.internal) {
          ips.push(net.address);
        }
      }
    }
    return ips;
  }

  public startDiscovery() {
    this.localIps = NetworkManager.getLocalIps();
    this.heartbeatInterval = setInterval(() => this.broadcastHeartbeat(), 2000);
    this.cleanupInterval = setInterval(() => this.cleanupPeers(), 5000);
  }

  public stopDiscovery() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }

  public async close(): Promise<void> {
    this.stopDiscovery();
    this.udpSocket.close();
    await this.transferManager.close();
    return new Promise((resolve) => {
      this.controlServer.close(() => resolve());
    });
  }

  private broadcastHeartbeat() {
    this.localIps = NetworkManager.getLocalIps(); // Refresh periodically
    
    for (const ip of this.localIps) {
      const payload = JSON.stringify({
        displayName: this.displayName,
        ip: ip,
        offering: this.offering,
      });

      // We send to 255.255.255.255, but the recipient will see the different IPs
      // in the payload and know which one to use.
      this.udpSocket.send(payload, this.UDP_PORT, "255.255.255.255");
    }
  }

  private cleanupPeers() {
    const now = Date.now();
    let changed = false;
    for (const [ip, peer] of this.peers.entries()) {
      if (now - peer.lastSeen > 10000) {
        this.peers.delete(ip);
        changed = true;
      }
    }
    if (changed) {
      this.emit("peerUpdate", Array.from(this.peers.values()));
    }
  }

  private setupControlServer() {
    this.controlServer.on("connection", (socket) => {
      const fromIp = socket.remoteAddress?.replace(/^.*:/, "") || "";
      
      socket.once("data", async (data) => {
        try {
          const req = JSON.parse(data.toString());
          if (req.type === "request_file") {
            await this.handleFileRequest(socket, fromIp, req.fileName);
          }
        } catch (e) {
          console.error(`Error handling request from ${fromIp}: ${e}`);
          socket.destroy();
        }
      });
    });

    this.controlServer.listen(this.CONTROL_PORT);
  }

  private async handleFileRequest(socket: Socket, fromIp: string, fileName: string) {
    // Validate file exists and matches offering
    if (!this.offering || this.offering.filename !== fileName) {
      socket.write(JSON.stringify({ approved: false, reason: "File not available" }));
      socket.end();
      return;
    }

    const requestKey = `${fromIp}:${fileName}`;

    // Rate limiting: 2 seconds between requests from the same IP
    const now = Date.now();
    const lastTime = this.lastRequestTime.get(fromIp) || 0;
    if (now - lastTime < 2000) {
      socket.write(JSON.stringify({ approved: false, reason: "Rate limit exceeded. Please wait." }));
      socket.end();
      return;
    }
    this.lastRequestTime.set(fromIp, now);

    // Prevent duplicate pending requests for the same file
    if (this.activeRequests.has(requestKey)) {
      socket.write(JSON.stringify({ approved: false, reason: "Request for this file is already pending approval." }));
      socket.end();
      return;
    }

    const approve = async (approved: boolean) => {
      this.activeRequests.delete(requestKey);
      
      if (approved && this.offering && this.offering.filename === fileName && this.offering.filePath) {
        try {
          // Get file stats
          const stats = await stat(this.offering.filePath);
          const isBatch = stats.isDirectory();
          let fileSize = stats.size;

          if (isBatch) {
            const files = await scanDirectory(this.offering.filePath);
            fileSize = files.reduce((acc, f) => acc + f.size, 0);
          }
          
          // Generate token
          const token = this.generateToken(this.offering.filePath, fromIp);
          
          // Send comprehensive response
          const response: TransferReadyInfo = {
            approved: true,
            token,
            host: this.localIps[0] || "127.0.0.1",
            port: this.TRANSFER_PORT,
            filename: fileName,
            size: fileSize,
            filePath: this.offering.filePath,
            isBatch: isBatch,
          };
          
          socket.write(JSON.stringify(response));
        } catch (error) {
          socket.write(JSON.stringify({ approved: false, reason: "File not found" }));
        }
      } else {
        socket.write(JSON.stringify({ approved: false, reason: approved ? "File not shared" : "Denied by host" }));
      }
      socket.end();
    };

    if (this.sharingMode === "auto") {
      await approve(true);
    } else {
      this.activeRequests.add(requestKey);
      this.emit("fileRequest", { fromIp, fileName, filePath: this.offering.filePath || "", approve });
      
      // Auto-cleanup request if not answered within 60 seconds
      setTimeout(() => {
        if (this.activeRequests.has(requestKey)) {
          this.activeRequests.delete(requestKey);
        }
      }, 60000);
    }
  }

  public generateToken(filePath: string, recipientIp: string): string {
    const token = randomBytes(16).toString("hex");
    this.tokens.set(token, { filePath, ip: recipientIp });
    
    // TTL 30 seconds
    setTimeout(() => {
      this.tokens.delete(token);
    }, 30000);

    return token;
  }

  public verifyToken(token: string, requesterIp: string): string | null {
    const info = this.tokens.get(token);
    if (info && info.ip === requesterIp) {
      // For simplicity, we consume the token once verified
      this.tokens.delete(token);
      return info.filePath;
    }
    return null;
  }

  public async requestFile(peerIp: string, fileName: string): Promise<TransferReadyInfo | null> {
    return new Promise((resolve) => {
      const socket = new Socket();
      socket.connect(this.CONTROL_PORT, peerIp, () => {
        socket.write(JSON.stringify({ type: "request_file", fileName }));
      });

      socket.on("data", (data) => {
        try {
          const res = JSON.parse(data.toString());
          if (res.approved && res.filename === fileName) {
            // Validate response has all required fields
            resolve(res as TransferReadyInfo);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
        socket.destroy();
      });

      socket.on("error", () => {
        resolve(null);
      });
    });
  }

  /**
   * Start receiving a file (client side)
   */
  public async downloadFile(
    transferInfo: TransferReadyInfo,
    savePath: string
  ): Promise<void> {
    return this.transferManager.receiveFile(
      transferInfo.host,
      transferInfo.token,
      savePath,
      transferInfo.filename,
      transferInfo.size,
      transferInfo.isBatch
    );
  }

  /**
   * Get active transfers
   */
  public getActiveTransfers(): TransferInfo[] {
    return this.transferManager.getActiveTransfers();
  }
}
