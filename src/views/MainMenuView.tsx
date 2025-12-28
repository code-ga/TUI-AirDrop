import React from "react";
import { Text, Box } from "ink";
import { MenuView } from "../core/MenuView";
import type { MenuItem } from "../core/MenuView";
import CustomSelectInput from "../components/CustomSelectInput";

interface MainMenuProps {
  onSelect: (item: any) => void;
  offeredFile: string | null;
}

export class MainMenuView extends MenuView<MainMenuProps> {
  protected override getMenuItems(): MenuItem[] {
    const { offeredFile } = this.props;
    const items: MenuItem[] = [
      { label: "Send File", value: "send" },
      { label: "View Online Users/Shares", value: "receive" },
      { label: "Settings", value: "settings" },
    ];

    if (offeredFile) {
      items.push({ label: "Stop Offering", value: "stop" });
    }

    items.push({ label: "Exit", value: "exit" });
    return items;
  }

  protected override handleSelect(item: MenuItem): void {
    this.props.onSelect(item);
  }

  override render() {
    return (
      <Box flexDirection="column">
        <Text>Welcome to Airdrop TUI</Text>
        <CustomSelectInput
          id="menu"
          items={this.getMenuItems()}
          onSelect={(item) => this.handleSelect(item)}
        />
      </Box>
    );
  }
}

export default MainMenuView;
