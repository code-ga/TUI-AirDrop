import React from "react";
import { Text, Box } from "ink";
import { MenuView } from "../core/MenuView";
import type { MenuItem } from "../core/MenuView";
import CustomSelectInput from "../components/CustomSelectInput";

interface ConfirmSaveProps {
  selectedDir: string;
  onConfirm: (action: "accept" | "reset" | "cancel") => void;
  currentShare: { from: string; file: string; size: string };
}

export class ConfirmSaveView extends MenuView<ConfirmSaveProps> {
  protected override getMenuItems(): MenuItem[] {
    const { selectedDir } = this.props;
    return [
      { label: `Accept: Save to ${selectedDir}`, value: "accept" },
      { label: `Reset: Save to ${process.cwd()}`, value: "reset" },
      { label: "Cancel", value: "cancel" },
    ];
  }

  protected override handleSelect(item: MenuItem): void {
    this.props.onConfirm(item.value);
  }

  override render() {
    const { currentShare, selectedDir } = this.props;
    return (
      <Box flexDirection="column">
        <Text>
          Confirm save location for {currentShare.file} from {currentShare.from}
        </Text>
        <Text>Selected directory: {selectedDir}</Text>
        <CustomSelectInput
          id="confirm-save"
          items={this.getMenuItems()}
          onSelect={(item) => this.handleSelect(item)}
        />
      </Box>
    );
  }
}

export default ConfirmSaveView;
