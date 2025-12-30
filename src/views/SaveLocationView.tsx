import React from "react";
import { Text, Box } from "ink";
import { DirectoryView } from "../core/DirectoryView";
import CustomSelectInput from "../components/CustomSelectInput";

interface SaveLocationProps {
  onSaveDir: (dir: string) => void;
  currentShare: { from: string; file: string; size: string | number };
}

export class SaveLocationView extends DirectoryView<SaveLocationProps> {
  override render() {
    const { currentShare } = this.props;
    const items = this.getDirectoryItems(true); // showOnlyDirs = true

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box borderStyle="round" borderColor="green" flexDirection="column" paddingX={1}>
          <Text bold color="green">Select Download Folder</Text>
          <Text color="gray">{this.state.currentDir}</Text>
          <Box marginTop={1}>
            <Text>
              Downloading: <Text bold>{currentShare.file}</Text> ({currentShare.size} bytes)
            </Text>
          </Box>
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Folders: {items.length}</Text>
          <CustomSelectInput
            id="save-share"
            items={items}
            onSelect={(item) => {
              if (item.value !== ".." && item.isDir) {
                this.props.onSaveDir(this.getFullPath(item.value));
              } else {
                this.handleDirectorySelect(item);
              }
            }}
            limit={12}
          />
        </Box>
        
        <Box marginTop={1}>
          <Text color="gray">↑/↓: Navigate • Enter: Select/Open • ..: Go Up</Text>
        </Box>
      </Box>
    );
  }
}

export default SaveLocationView;
