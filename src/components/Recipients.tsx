import React from "react";
import { Text, Box } from "ink";
import CustomSelectInput from "./CustomSelectInput";

const Recipients = ({ onSelect }: { onSelect: (item: any) => void }) => {
  const items = [
    { label: "Share with Approved Users", value: "approved" },
    { label: "Broadcast to Everyone", value: "everyone" },
  ];

  return (
    <Box flexDirection="column">
      <Text>Select Recipients</Text>
      <CustomSelectInput id="recipients" items={items} onSelect={onSelect} />
    </Box>
  );
};

export default Recipients;
