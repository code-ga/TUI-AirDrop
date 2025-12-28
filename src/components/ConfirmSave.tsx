import React from "react";
import { Text, Box } from "ink";
import CustomSelectInput from "./CustomSelectInput";

const ConfirmSave = ({
  selectedDir,
  onConfirm,
  currentShare,
}: {
  selectedDir: string;
  onConfirm: (action: "accept" | "reset" | "cancel") => void;
  currentShare: { from: string; file: string; size: string };
}) => {
  const items = [
    { label: `Accept: Save to ${selectedDir}`, value: "accept" },
    { label: `Reset: Save to ${process.cwd()}`, value: "reset" },
    { label: "Cancel", value: "cancel" },
  ];

  return (
    <Box flexDirection="column">
      <Text>
        Confirm save location for {currentShare.file} from {currentShare.from}
      </Text>
      <Text>Selected directory: {selectedDir}</Text>
      <CustomSelectInput
        id="confirm-save"
        items={items}
        onSelect={(item) => onConfirm(item.value)}
      />
    </Box>
  );
};

export default ConfirmSave;
