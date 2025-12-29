import { expect, test, describe } from "bun:test";
import { NetworkManager } from "./NetworkManager";
import type { Peer } from "./NetworkManager";
import { createSocket } from "node:dgram";

describe("NetworkManager", () => {
  test("getLocalIps should return a list of IPv4 addresses", () => {
    const ips = NetworkManager.getLocalIps();
    expect(Array.isArray(ips)).toBe(true);
    if (ips.length > 0) {
      expect(ips[0]).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
    }
  });

  test("generateToken and verifyToken should work", async () => {
    const nm = new NetworkManager(9001, 10001);
    const filePath = "/path/to/file.txt";
    const ip = "192.168.1.100";
    
    const token = nm.generateToken(filePath, ip);
    expect(token).toHaveLength(32);
    
    const verifiedPath = nm.verifyToken(token, ip);
    expect(verifiedPath).toBe(filePath);
      
    expect(nm.verifyToken(token, ip)).toBeNull();
    await nm.close();
  });

  test("UDP Discovery Loop (Listener)", async () => {
    const nm = new NetworkManager(9002, 10002);
    nm.startDiscovery();
    
    const promise = new Promise<void>((resolve) => {
      nm.on("peerUpdate", (peers: Peer[]) => {
        if (peers.some(p => p.displayName === "TestPeer")) {
          resolve();
        }
      });
    });

    const mockUdp = createSocket("udp4");
    
    // Test with multiple payloads (simulating multi-NIC)
    const payloads = [
      JSON.stringify({ displayName: "TestPeer", ip: "1.2.3.4", offering: { filename: "test1.txt", size: 123 } }),
      JSON.stringify({ displayName: "TestPeer", ip: "1.2.3.5", offering: { filename: "test1.txt", size: 123 } })
    ];
    
    await new Promise(r => setTimeout(r, 100));
    const p1 = payloads[0];
    const p2 = payloads[1];
    if (p1) mockUdp.send(p1, 9002, "127.0.0.1");
    if (p2) mockUdp.send(p2, 9002, "127.0.0.1");
    
    await promise;
    mockUdp.close();
    await nm.close();
  });

  test("TCP Handshake (Auto-Approve)", async () => {
    const nm = new NetworkManager(9003, 10003);
    nm.sharingMode = "auto";
    nm.offering = { filename: "shared.txt", size: 1000 };
    
    const token = await nm.requestFile("127.0.0.1", "shared.txt");
    expect(token).not.toBeNull();
    expect(token).toHaveLength(32);
    
    const filePath = nm.verifyToken(token?.token!, "127.0.0.1");
    expect(filePath).toBe("shared.txt");
    await nm.close();
  });

  test("TCP Handshake (Manual Approval)", async () => {
    const nm = new NetworkManager(9004, 10004);
    nm.sharingMode = "manual";
    nm.offering = { filename: "shared.txt", size: 1000 };
    
    const requestPromise = nm.requestFile("127.0.0.1", "shared.txt");
    
    nm.once("fileRequest", ({ approve }) => {
      approve(true);
    });

    const token = await requestPromise;
    expect(token).not.toBeNull();
    await nm.close();
  });
});
