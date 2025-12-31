import React from "react";
import { Text, Box } from "ink";
import { MenuView } from "../core/MenuView";
import type { MenuItem } from "../core/MenuView";
import CustomSelectInput from "../components/CustomSelectInput";

interface SettingsProps {
  onModeChange: (mode: "auto" | "manual") => void;
  currentMode: "auto" | "manual";
  onSkipHiddenChange: (skip: boolean) => void;
  skipHidden: boolean;
  onBack: () => void;
}

export class SettingsView extends MenuView<SettingsProps> {
  protected override getMenuItems(): MenuItem[] {
    return [
      { label: "Set Receive Mode to Auto-accept", value: "auto" },
      { label: "Set Receive Mode to Require Approval", value: "manual" },
      { label: "Enable Skip Hidden Files", value: "enable-skip-hidden" },
      { label: "Disable Skip Hidden Files", value: "disable-skip-hidden" },
      { label: "Back to Menu", value: "back" },
    ];
  }

  protected override handleSelect(item: MenuItem): void {
    if (item.value === "auto" || item.value === "manual") {
      this.props.onModeChange(item.value);
    } else if (item.value === "enable-skip-hidden") {
      this.props.onSkipHiddenChange(true);
    } else if (item.value === "disable-skip-hidden") {
      this.props.onSkipHiddenChange(false);
    } else if (item.value === "back") {
      this.props.onBack();
    }
  }

  override render() {
    return (
      <Box flexDirection="column">
        <Text>Settings</Text>
        <Text>
          Current Receive Mode:{" "}
          {this.props.currentMode === "auto"
            ? "Auto-accept"
            : "Require Approval"}
        </Text>
        <Text>
          Skip Hidden Files: {this.props.skipHidden ? "Enabled" : "Disabled"}
        </Text>
        <CustomSelectInput
          id="settings"
          items={this.getMenuItems()}
          onSelect={(item) => this.handleSelect(item)}
        />
      </Box>
    );
  }
}

export default SettingsView;
