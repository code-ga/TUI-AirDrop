# TUI-AirDrop 🚀

> ⚠️ **Important Notice:** Ensure your firewall allows incoming connections from
> public networks to private networks, as the app requires this for peer
> discovery and file transfers across different network configurations.

A powerful, secure, and beautiful Terminal User Interface (TUI) file-sharing
application designed for local networks. Think of it as AirDrop, but for your
terminal.

![GitHub Release](https://img.shields.io/github/v/release/code-ga/TUI-AirDrop)
![License](https://img.shields.io/badge/license-MIT-green)
[![Build and Release](https://github.com/code-ga/TUI-AirDrop/actions/workflows/release.yml/badge.svg)](https://github.com/code-ga/TUI-AirDrop/actions/workflows/release.yml)

## 📚 Documentation

- [User Guide](docs/USER-GUIDE.md) - Installation, usage, and navigation tips.
- [Developer Guide](docs/DEVELOPER-GUIDE.md) - Architecture, API reference, and
  contribution guidelines.
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and FAQs.

## ✨ Features

- **Zero Configuration Discovery**: Automatically find other peers on your local
  network using UDP broadcasts.
- **Secure Transfers**: Token-based session negotiation with a 30-second TTL.
- **Chunk-Based Engine**: Robust file transfer protocol using discrete packets
  for reliability.
- **Data Integrity**: Real-time SHA-256 hashing and verification for every data
  chunk.
- **Resume Support**: Interrupted transfers automatically seek and resume from
  the last successful chunk.
- **Modern UI**: Beautiful terminal interface built with Ink, featuring progress
  bars, speed tracking, and interactive prompts.
- **Flexible Approval Modes**: Choose between manual approval for every file or
  auto-approve for trusted environments.

## 🛠 Technology Stack

- **Runtime**: [Bun](https://bun.sh/)
- **UI Framework**: [Ink](https://github.com/vadimdemedes/ink) (React for CLI)
- **Language**: TypeScript
- **Security**: node:crypto (SHA-256)
- **Networking**: Node.js `net` (TCP) and `dgram` (UDP) modules

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your system.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/TUI-AirDrop.git
   cd TUI-AirDrop
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

### Usage

Start the application:

```bash
bun run index.tsx
```

## 📂 Project Structure

- `src/core/`: The "Brain" of the app.
  - `NetworkManager.ts`: Handles peer discovery, heartbeats, and session
    negotiation.
  - `TransferManager.ts`: Handles high-speed binary transfers, hashing, and
    resume logic.
  - `Navigation.ts`: Routing logic for the TUI.
- `src/views/`: Main page components (Menu, Send, Receive, Settings).
- `src/components/`: Reusable TUI elements (Progress bars, Select inputs,
  Modals).
- `src/contexts/`: Shared state like focus management.

## 🔐 Security & Protocol

- **Discovery**: UDP Port `8888`
- **Control/Handshake**: TCP Port `8889`
- **Data Transfer**: TCP Port `5556` (Binary Packet Protocol)

### Packet Structure

`[4-byte Length] + [JSON Header] + [Binary Data]`

- Header includes: `seq`, `size`, `hash` (SHA-256), `isLast`.

## 🗺 Roadmap

- [x] Phase 1: Interactive TUI & Navigation
- [x] Phase 2: Peer Discovery & Handshake
- [x] Phase 3: Secure Chunked Transfer & Integrity
- [ ] Phase 4: Folder Transfers & Compression
- [ ] Phase 5: Encryption & Advanced UI (Glassmorphism effects)

## 🤝 Contributing

We welcome contributions! Please see the
[Developer Guide](docs/DEVELOPER-GUIDE.md#contributing) for details on how to
get started.

## 📄 License

MIT © 2025 (2025 is gone) @code-ga
