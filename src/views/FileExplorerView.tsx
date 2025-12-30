import React from "react";
import { Text, Box, useInput } from "ink";
import { DirectoryView } from "../core/DirectoryView";
import type { DirectoryState } from "../core/DirectoryView";
import CustomSelectInput from "../components/CustomSelectInput";

interface FileExplorerProps {
  onFileSelect: (file: string) => void;
  onBack: () => void;
}

interface FileExplorerState extends DirectoryState {
  filter: string;
}

const FilterHandler: React.FC<{
  onUpdate: (filter: string) => void;
  currentFilter: string;
}> = ({ onUpdate, currentFilter }) => {
  useInput((input, key) => {
    if (key.backspace || key.delete) {
      onUpdate(currentFilter.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta && !key.return) {
      onUpdate(currentFilter + input);
    } else if (key.escape && currentFilter) {
      onUpdate("");
    }
  });
  return null;
};

export class FileExplorerView extends DirectoryView<FileExplorerProps, FileExplorerState> {
  constructor(props: FileExplorerProps) {
    super(props);
    this.state = {
      currentDir: process.cwd(),
      filter: "",
    };
  }

  override render() {
    const allItems = this.getDirectoryItems();
    const filteredItems = allItems.filter(item => 
      item.value === ".." || 
      item.label.toLowerCase().includes(this.state.filter.toLowerCase())
    );

    return (
      <Box flexDirection="column" paddingX={1}>
        <FilterHandler 
          currentFilter={this.state.filter} 
          onUpdate={(filter) => this.setState({ filter })} 
        />
        <Box borderStyle="round" borderColor="blue" flexDirection="column" paddingX={1}>
          <Text bold color="blue">File Explorer</Text>
          <Text color="gray">{this.state.currentDir.length > 40 ? "..." + this.state.currentDir.slice(-37) : this.state.currentDir}</Text>
          <Box marginTop={1}>
            <Text>Search: </Text>
            <Text color="yellow">{this.state.filter || "(Type to search...)"}</Text>
          </Box>
        </Box>
        
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Items: {filteredItems.length} / {allItems.length}</Text>
          <CustomSelectInput
            id="send"
            items={filteredItems}
            onSelect={(item) => {
              this.setState({ filter: "" }); // Reset filter on navigation
              this.handleDirectorySelect(item, this.props.onFileSelect);
            }}
            limit={12} // Constrain height to prevent UI break
          />
        </Box>
        
        <Box marginTop={1}>
          <Text color="gray">↑/↓: Navigate • Enter: Select • Type: Filter • Esc: Clear Filter</Text>
        </Box>
      </Box>
    );
  }
}

export default FileExplorerView;
