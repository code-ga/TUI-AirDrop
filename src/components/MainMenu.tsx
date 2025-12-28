import React from "react";
import { Text, Box } from "ink";
import CustomSelectInput from "./CustomSelectInput";

const MainMenu = ({
  onSelect,
  offeredFile,
}: {
  onSelect: (item: any) => void;
  offeredFile: string | null;
}) => {
  const items = [
    { label: "Send File", value: "send" },
    { label: "View Online Users/Shares", value: "receive" },
    { label: "Settings", value: "settings" },
  ];

  if (offeredFile) {
    items.push({ label: "Stop Offering", value: "stop" });
  }

  items.push({ label: "Exit", value: "exit" });

  return (
    <Box flexDirection="column">
      <Text>Welcome to Airdrop TUI</Text>
      <CustomSelectInput id="menu" items={items} onSelect={onSelect} />
    </Box>
  );
};

export default MainMenu;
