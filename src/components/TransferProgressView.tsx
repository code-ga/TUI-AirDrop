import React from "react";
import { Box, Text } from "ink";

interface TransferProgressViewProps {
  filename: string;
  progress: number;
  size: number;
  speed: number;
  status: "pending" | "active" | "paused" | "complete" | "error";
  error?: string;
}

export const TransferProgressView: React.FC<TransferProgressViewProps & {
  isBatch?: boolean;
  currentFileIndex?: number;
  totalFiles?: number;
}> = ({
  filename,
  progress,
  size,
  speed,
  status,
  error,
  isBatch,
  currentFileIndex,
  totalFiles,
}) => {
  const percentage = size > 0 ? Math.floor((progress / size) * 100) : 0;
  const progressBar =
    "█".repeat(Math.floor(percentage / 5)) +
    "░".repeat(20 - Math.floor(percentage / 5));

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const getStatusColor = () => {
    switch (status) {
      case "complete":
        return "green";
      case "error":
        return "red";
      case "paused":
        return "yellow";
      case "active":
        return "cyan";
      default:
        return "gray";
    }
  };

  const getStatusText = () => {
    if (isBatch && status === 'active') {
        return `⬇ Batch ${currentFileIndex || '?'}/${totalFiles || '?'} files`;
    }
    switch (status) {
      case "complete":
        return "✅ Complete";
      case "error":
        return `❌ Error: ${error}`;
      case "paused":
        return "⏸ Paused";
      case "active":
        return "⬇ Downloading";
      default:
        return "⏳ Pending";
    }
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={getStatusColor()}
      paddingX={1}>
      <Text bold>{filename} {isBatch ? '(Folder)' : ''}</Text>
      <Box>
        <Text color={getStatusColor()}>{getStatusText()}</Text>
      </Box>
      <Box marginTop={1}>
        <Text>
          {progressBar} {percentage}%
        </Text>
      </Box>
      <Box justifyContent="space-between">
        <Text color="gray">
          {formatBytes(progress)} / {formatBytes(size)}
        </Text>
        {status === "active" && speed > 0 && (
          <Text color="cyan">{formatSpeed(speed)}</Text>
        )}
      </Box>
    </Box>
  );
};

export default TransferProgressView;
