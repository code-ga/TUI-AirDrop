# Troubleshooting

This guide helps resolve common issues with TUI-AirDrop.

## Common Issues

### No Peers Discovered

**Symptoms**: Peer list remains empty despite other devices running TUI-AirDrop.

**Causes & Solutions**:

- **Firewall blocking UDP port 8888**: Configure firewall to allow inbound and
  outbound traffic on UDP port 8888.
- **Devices on different subnets**: Ensure all devices are on the same local
  network (same Wi-Fi or Ethernet segment).
- **Network isolation**: Corporate networks may block broadcasts; try direct IP
  connections if possible.
- **Antivirus interference**: Temporarily disable antivirus network protection.

### Transfer Fails or is Slow

**Symptoms**: Transfers stall, fail, or are very slow.

**Causes & Solutions**:

- **Backpressure issues**: Network congestion; wait for network to clear or
  reduce concurrent transfers.
- **Resume not working**: Ensure both devices use the same chunk size (64KB).
  Check for `.part` files in save directory.
- **Port conflicts**: Verify ports 8889 (TCP) and 5556 (TCP) are not blocked.
- **Large files**: Transfers are chunked; patience required for big files.

### UI Navigation Problems

**Symptoms**: Arrow keys don't work, screen glitches, or input not registering.

**Causes & Solutions**:

- **Terminal incompatibility**: Use a terminal supporting ANSI escape codes
  (e.g., Windows Terminal, iTerm2, GNOME Terminal).
- **Focus issues**: Ensure terminal window is active; try clicking in the
  terminal.
- **Rendering breaks**: Avoid resizing terminal during operation; restart if
  needed.

### Path Handling Errors

**Symptoms**: File selection fails or paths appear incorrect.

**Causes & Solutions**:

- **Cross-platform paths**: App handles Windows (`C:\`) and POSIX (`/`) paths,
  but ensure paths are valid on the sending OS.
- **Permissions**: Check read/write permissions on source and destination
  directories.
- **Special characters**: Avoid paths with special characters that may not
  transfer well.

### Token or Authentication Errors

**Symptoms**: "Invalid token" or transfer immediately fails.

**Causes & Solutions**:

- **Token expiration**: Tokens expire in 30 seconds; request again if delayed.
- **IP mismatch**: Ensure the requesting IP matches the token's assigned IP.
- **Network changes**: Restart discovery if IP addresses change during session.

## Frequently Asked Questions (FAQs)

### What ports does TUI-AirDrop use?

- **Discovery**: UDP port 8888 for peer broadcasts.
- **Control**: TCP port 8889 for file requests and approvals.
- **Transfer**: TCP port 5556 for actual file data transfer.

### How secure are the transfers?

Transfers use token-based authentication (30-second TTL) and SHA-256 integrity
checking on every 64KB chunk. No encryption is currently implemented.

### Can I transfer directories?

Yes, select directories in the file explorer; they are transferred recursively.

### Why does the app need admin/root privileges?

It doesn't normally, but firewall configurations may require elevated
permissions on some systems.

### How do I resume interrupted transfers?

The app automatically detects `.part` files and resumes from the last complete
chunk. Ensure chunk size matches between devices.

### Is TUI-AirDrop compatible with regular AirDrop?

No, this is a custom protocol for terminals; not compatible with Apple's
AirDrop.

### Can I run multiple instances?

Yes, but they will compete for ports. Use different port configurations if
needed (advanced).

### What file sizes are supported?

No hard limit, but very large files may take time due to chunking and
verification.

### How do I change the display name?

Go to Settings in the main menu and modify your display name.

### Why are transfers slow on Wi-Fi?

Wireless networks have variable latency; Ethernet provides better performance.
Chunk size and verification add overhead.
