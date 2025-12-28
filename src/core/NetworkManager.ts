import { Socket, createServer } from "node:net";
import { createSocket } from "node:dgram";
import type { RemoteInfo } from "node:dgram";
import { randomBytes } from "node:crypto";
import { hostname, networkInterfaces } from "node:os";
import EventEmitter from "node:events";

export interface Peer {
  displayName: string;
  ip: string;
  offering: { filename: string; size: number } | null;
  lastSeen: number;
}

export interface FileRequest {
  fromIp: string;
  fileName: string;
  approve: (approved: boolean) => void;
}

export interface NetworkManagerEvents {
  peerUpdate: (peers: Peer[]) => void;
  fileRequest: (req: FileRequest) => void;
  transferReady: (info: { token: string; ip: string; filePath: string }) => void;
}

export class NetworkManager extends EventEmitter {
  private udpSocket = createSocket("udp4");
  private peers = new Map<string, Peer>();
  private heartbeatInterval?: Timer;
  private cleanupInterval?: Timer;
  private controlServer = createServer();
  private tokens = new Map<string, { filePath: string; ip: string }>();

  public displayName: string = hostname();
  public localIps: string[] = [];
  public offering: { filename: string; size: number } | null = null;
  public sharingMode: "auto" | "manual" = "manual";

  private UDP_PORT = 8888;
  private CONTROL_PORT = 8889;

  constructor(udpPort = 8888, controlPort = 8889) {
    super();
    this.UDP_PORT = udpPort;
    this.CONTROL_PORT = controlPort;
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
      
      socket.once("data", (data) => {
        try {
          const req = JSON.parse(data.toString());
          if (req.type === "request_file") {
            this.handleFileRequest(socket, fromIp, req.fileName);
          }
        } catch (e) {
          socket.destroy();
        }
      });
    });

    this.controlServer.listen(this.CONTROL_PORT);
  }

  private handleFileRequest(socket: Socket, fromIp: string, fileName: string) {
    const approve = (approved: boolean) => {
      if (approved && this.offering && this.offering.filename === fileName) {
        const token = this.generateToken(fileName, fromIp); // Assume offering match
        socket.write(JSON.stringify({ approved: true, token }));
      } else {
        socket.write(JSON.stringify({ approved: false }));
      }
      socket.end();
    };

    if (this.sharingMode === "auto") {
      approve(true);
    } else {
      this.emit("fileRequest", { fromIp, fileName, approve });
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

  public async requestFile(peerIp: string, fileName: string): Promise<string | null> {
    return new Promise((resolve) => {
      const socket = new Socket();
      socket.connect(this.CONTROL_PORT, peerIp, () => {
        socket.write(JSON.stringify({ type: "request_file", fileName }));
      });

      socket.on("data", (data) => {
        try {
          const res = JSON.parse(data.toString());
          resolve(res.approved ? res.token : null);
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
}
