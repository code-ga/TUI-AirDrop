import React from "react";
import { Text, Box } from "ink";
import { DirectoryView } from "../core/DirectoryView";
import CustomSelectInput from "../components/CustomSelectInput";

interface FileExplorerProps {
  onFileSelect: (file: string) => void;
  onBack: () => void;
}

export class FileExplorerView extends DirectoryView<FileExplorerProps> {
  override render() {
    const items = this.getDirectoryItems();

    return (
      <Box flexDirection="column">
        <Text>Current Directory: {this.state.currentDir}</Text>
        <CustomSelectInput
          id="send"
          items={items}
          onSelect={(item) => this.handleDirectorySelect(item, this.props.onFileSelect)}
        />
      </Box>
    );
  }
}

export default FileExplorerView;
