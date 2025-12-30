import React from "react";
import { Text, Box } from "ink";
import BigText from "ink-big-text";
import Gradient from "ink-gradient";
import { MenuView } from "../core/MenuView";
import type { MenuItem } from "../core/MenuView";
import CustomSelectInput from "../components/CustomSelectInput";

interface MainMenuProps {
  onSelect: (item: any) => void;
  offeredFile: string | null;
  localIps: string[];
  unreadCount: number;
}

export class MainMenuView extends MenuView<MainMenuProps> {
  protected override getMenuItems(): MenuItem[] {
    const { offeredFile, unreadCount } = this.props;
    const items: MenuItem[] = [
      { label: "🚀 Send File", value: "send-file" },
      { label: "📦 Send Folder", value: "send-folder" },
      {
        label: unreadCount > 0 ? `💬 Chat (${unreadCount} new)` : "💬 Chat",
        value: "chat",
      },
      { label: "📡 Wait for Transfer", value: "receive" },
      { label: "⚙️  Settings", value: "settings" },
      { label: "💡 Help", value: "help" },
    ];

    if (offeredFile) {
      items.push({ label: "🛑 Stop Offering", value: "stop" });
    }

    items.push({ label: "👋 Exit", value: "exit" });
    return items;
  }

  protected override handleSelect(item: MenuItem): void {
    this.props.onSelect(item);
  }

  override render() {
    const { localIps } = this.props;
    return (
      <Box flexDirection="column">
        <Gradient colors={["cyan", "magenta", "yellow"]}>
          <BigText text="TUI-AirDrop" />
        </Gradient>
        <Text dimColor>Your IP: {localIps.join(", ")}</Text>
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
