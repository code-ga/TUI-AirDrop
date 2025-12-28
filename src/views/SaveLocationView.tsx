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
      <Box flexDirection="column">
        <Text>
          Choose save location for {currentShare.file} from {currentShare.from}
        </Text>
        <Text>Current Directory: {this.state.currentDir}</Text>
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
        />
      </Box>
    );
  }
}

export default SaveLocationView;
