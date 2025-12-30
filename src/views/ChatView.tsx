import React, { useState, useContext, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import TextInput from "ink-text-input";
import { FocusContext } from "../contexts/FocusContext";
import type { ChatMessage } from "../core/NetworkManager";

interface ChatViewProps {
  chatHistory: ChatMessage[];
  onSend: (text: string) => void;
  onBack: () => void;
}

export default function ChatView({
  chatHistory,
  onSend,
  onBack,
}: ChatViewProps) {
  const [input, setInput] = useState("");
  const { setFocus } = useContext(FocusContext);

  useInput((inputChar, key) => {
    if (key.escape) {
      onBack();
    }
  });

  const handleSubmit = (value: string) => {
    if (value.trim()) {
      onSend(value.trim());
      setInput("");
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="single" borderColor="blue" paddingX={1}>
        <Text bold>Chat</Text>
        <Text dimColor> (Press ESC to go back)</Text>
      </Box>

      {/* Body */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {chatHistory.map((msg, index) => (
          <Box key={index} marginY={0}>
            <Text dimColor>[{formatTime(msg.timestamp)}]</Text>
            <Text>
              {" "}
              {msg.sender}: {msg.text}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Footer */}
      <Box borderStyle="single" borderColor="blue" paddingX={1}>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Type a message..."
        />
      </Box>
    </Box>
  );
}
