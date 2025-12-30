import React from "react";
import { Text, Box } from "ink";
import { BaseView } from "../core/BaseView";
import CustomSelectInput from "../components/CustomSelectInput";

interface HelpViewProps {
  onBack: () => void;
}

export class HelpView extends BaseView<HelpViewProps> {
  override render() {
    const { onBack } = this.props;

    const menuItems = [
      {
        key: "back",
        label: "Back to Menu",
        value: "back",
      },
    ];

    return (
      <Box flexDirection="column">
        <Text bold underline>
          Bean-CLI Help
        </Text>
        <Box marginTop={1} flexDirection="column">
          <Text>
            <Text bold>Overview:</Text> Bean-CLI allows sending and receiving
            files over local network via terminal.
          </Text>
          <Text>
            <Text bold>Navigation:</Text> Use arrow keys to navigate menus,
            Enter to select, Esc to go back.
          </Text>
          <Text>
            <Text bold>Sending files:</Text> From main menu, select "Send Files"{" "}
            {"->"} Choose files/directories using FileExplorerView {"->"} Select
            recipients from discovered peers {"->"} Confirm transfer.
          </Text>
          <Text>
            <Text bold>Receiving files:</Text> Select "Receive Files" {"->"} App
            listens for incoming requests {"->"} Approve/deny in ReceiveView{" "}
            {"->"} Choose save location.
          </Text>
          <Text>
            <Text bold>Settings:</Text> Access settings for display name, etc.
          </Text>
          <Text>
            <Text bold>Discovery:</Text> The app broadcasts on UDP port 8888;
            ensure firewall allows ports 8888 (UDP), 8889 (TCP control), 5556
            (TCP transfer).
          </Text>
          <Text>
            <Text bold>Troubleshooting:</Text> If no peers, check network; for
            transfers, ensure same chunk size (64KB).
          </Text>
        </Box>
        <Box marginTop={2}>
          <CustomSelectInput
            id="help"
            items={menuItems}
            onSelect={(item) => {
              if (item.value === "back") {
                onBack();
              }
            }}
          />
        </Box>
      </Box>
    );
  }
}

export default HelpView;
