import React from "react";
import { Text, Box } from "ink";
import { MenuView } from "../core/MenuView";
import type { MenuItem } from "../core/MenuView";
import CustomSelectInput from "../components/CustomSelectInput";

interface RecipientsProps {
  onSelect: (item: any) => void;
}

export class RecipientsView extends MenuView<RecipientsProps> {
  protected override getMenuItems(): MenuItem[] {
    return [
      { label: "Share with Approved Users", value: "approved" },
      { label: "Broadcast to Everyone", value: "everyone" },
    ];
  }

  protected override handleSelect(item: MenuItem): void {
    this.props.onSelect(item);
  }

  override render() {
    return (
      <Box flexDirection="column">
        <Text>Select Recipients</Text>
        <CustomSelectInput
          id="recipients"
          items={this.getMenuItems()}
          onSelect={(item) => this.handleSelect(item)}
        />
      </Box>
    );
  }
}

export default RecipientsView;
