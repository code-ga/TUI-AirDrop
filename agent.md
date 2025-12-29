# Agent Guide: TUI-AirDrop

This document provides essential technical context for AI agents working on this codebase.

## 🏗 System Architecture

TUI-AirDrop is built using a decoupled architecture where the networking logic (Core) is separated from the UI (Views/Components).

### Core Components

1.  **NetworkManager (`src/core/NetworkManager.ts`)**
    *   **UDP Discovery**: Broadcasts heartbeat packets to `255.255.255.255:8888`.
    *   **Peer Tracking**: Maintains a `Map<string, Peer>` with a 10s cleanup interval.
    *   **Session Management**: Handles `REQUEST_FILE` messages on port `8889` and manages one-time tokens.
    *   **Events**: Emits `peerUpdate`, `fileRequest`, `transferReady`, etc.

2.  **TransferManager (`src/core/TransferManager.ts`)**
    *   **Protocol**: Custom binary protocol on port `5556`.
    *   **Safety**: Calculates SHA-256 for every 64KB chunk.
    *   **Resume**: Uses `.part` files. It truncates partial chunks to the nearest 64KB boundary before resuming to ensure zero data corruption.
    *   **Flow**: Handshake (Token + StartSeq) -> Chunk Loop (Length + Header + Data).

### UI Layer

*   **Framework**: Ink (React for the terminal).
*   **Navigation**: Uses a custom `useNavigator` hook for view stack management.
*   **Focus Management**: Essential for terminal apps to handle arrow keys and inputs correctly. See `src/contexts/FocusContext.tsx`.

## 📡 Networking Specs

| Service | Port | Protocol | Payload |
| :--- | :--- | :--- | :--- |
| Discovery | 8888 | UDP | JSON: `{displayName, ip, offering}` |
| Control | 8889 | TCP | JSON: `{type, fileName}` |
| Transfer | 5556 | TCP | Binary: `[Length][Header][Data]` |

## 🛠 Development Guidelines

1.  **Strict Typing**: All events and shared data structures have interfaces in `NetworkManager.ts` or `TransferManager.ts`. Avoid `any`.
2.  **Backpressure**: When writing to sockets in `TransferManager`, always respect `socket.write()` return value and wait for the `drain` event.
3.  **Path Handling**: Supports both Windows and POSIX paths. Use `path.basename()` or regex to extract filenames cleanly for advertising.
4.  **TUI Design**: Keep borders clean. Use `Ink`'s `Box` for layout. Do not use standard `console.log` inside views as it breaks the Ink rendering; use the provided debug mechanisms or log to a file.

## 🔄 Common Tasks

*   **Adding a new message type**: Update `handleControlMessage` in `NetworkManager.ts` and ensure the client-side `requestFile` can handle the new response.
*   **Changing Chunk Size**: Modify `CHUNK_SIZE` in `TransferManager.ts`. Note that both host and client MUST use the same chunk size for resume logic to work correctly.
*   **Modifying Views**: Most UI state (active transfers, peers) is lifted to `App.tsx` and passed down.

## 🧪 Testing

Use `bun test` for unit testing the managers. Network tests should ideally mock the sockets to avoid port conflicts in CI environments.
