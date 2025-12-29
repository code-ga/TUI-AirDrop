import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";

interface SavePathPromptProps {
  filename: string;
  size: number;
  defaultPath: string;
  onConfirm: (path: string) => void;
  onCancel: () => void;
}

export const SavePathPrompt: React.FC<SavePathPromptProps> = ({
  filename,
  size,
  defaultPath,
  onConfirm,
  onCancel,
}) => {
  const [savePath, setSavePath] = useState(defaultPath);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={1}>
      <Text bold color="green">
        File Ready to Download
      </Text>
      <Box marginTop={1}>
        <Text>
          <Text bold>File:</Text> {filename}
        </Text>
      </Box>
      <Box>
        <Text>
          <Text bold>Size:</Text> {formatBytes(size)}
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text>Save to:</Text>
        <Box>
          <Text color="cyan">→ </Text>
          <TextInput
            value={savePath}
            onChange={setSavePath}
            onSubmit={() => onConfirm(savePath)}
          />
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Press Enter to confirm, Esc to cancel
        </Text>
      </Box>
    </Box>
  );
};

export default SavePathPrompt;
