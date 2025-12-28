import React from "react";
import { Text, Box } from "ink";
import CustomSelectInput from "./CustomSelectInput";

const Settings = ({
  onModeChange,
  currentMode,
  onBack,
}: {
  onModeChange: (mode: "auto" | "manual") => void;
  currentMode: "auto" | "manual";
  onBack: () => void;
}) => {
  const items = [
    { label: "Set Receive Mode to Auto-accept", value: "auto" },
    { label: "Set Receive Mode to Require Approval", value: "manual" },
    { label: "Back to Menu", value: "back" },
  ];

  const handleSelect = (item: any) => {
    if (item.value === "auto" || item.value === "manual") {
      onModeChange(item.value);
    } else if (item.value === "back") {
      onBack();
    }
  };

  return (
    <Box flexDirection="column">
      <Text>Settings</Text>
      <Text>
        Current Receive Mode:{" "}
        {currentMode === "auto" ? "Auto-accept" : "Require Approval"}
      </Text>
      <CustomSelectInput id="settings" items={items} onSelect={handleSelect} />
    </Box>
  );
};

export default Settings;
