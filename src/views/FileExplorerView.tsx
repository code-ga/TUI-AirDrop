import React from "react";
import { Text, Box, useInput } from "ink";
import { DirectoryView } from "../core/DirectoryView";
import type { DirectoryState } from "../core/DirectoryView";
import CustomSelectInput from "../components/CustomSelectInput";

interface FileExplorerProps {
  onFileSelect: (file: string) => void;
  onBack: () => void;
  mode: 'file' | 'folder';
}

interface FileExplorerState extends DirectoryState {
  filter: string;
  highlightedItem: any | null;
}

const FilterHandler: React.FC<{
  onUpdate: (filter: string) => void;
  currentFilter: string;
  onEvent?: (input: string, key: any) => void;
}> = ({ onUpdate, currentFilter, onEvent }) => {
  useInput((input, key) => {
    if (onEvent) {
        onEvent(input, key);
        if (key.return || (input === ' ' && !currentFilter)) {
             // Let parent handle return or space if filter is empty (navigation/selection)
             // But here we are consuming input. 
             // Actually, useInput bubbles up or we can just run side effects?
             // Ink's useInput: if we don't return, it might bubble? No.
             // We just run logic.
        }
    }
    
    if (key.backspace || key.delete) {
      onUpdate(currentFilter.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta && !key.return) {
       // Allow space in filter, but prioritize selection if filter is empty
       if (input === ' ' && !currentFilter) {
           // Do nothing here, allow parent onEvent to handle selection
       } else {
           onUpdate(currentFilter + input);
       }
    } else if (key.escape && currentFilter) {
      onUpdate("");
    }
  });
  return null;
};

export class FileExplorerView extends DirectoryView<FileExplorerProps, FileExplorerState> {
  constructor( props: FileExplorerProps) {
    super(props);
    this.state = {
      currentDir: process.cwd(),
      filter: "",
      highlightedItem: null,
      items: []
    };
  }

  override render() {
    const allItems = this.getDirectoryItems();
    const filteredItems = (allItems || [])
      .filter(item => this.props.mode === 'folder' ? item.isDir : true)
      .filter(item => item.value !== ".." ||item.label.toLowerCase().includes(this.state.filter.toLowerCase()));

    return (
      <Box flexDirection="column" paddingX={1}>
        <FilterHandler 
          currentFilter={this.state.filter} 
          onUpdate={(filter) => this.setState({ filter })} 
          onEvent={(input, key) => {
             // Handle Space Selection for Folders
             // Only if filter is empty (prioritize filter typing if active)
             if (this.props.mode === 'folder' && input === ' ' && this.state.highlightedItem && !this.state.filter) {
                 const item = this.state.highlightedItem;
                 if (item.value !== ".." && item.isDir) {
                     this.props.onFileSelect(this.getFullPath(item.value));
                 }
             }
          }}
        />
        <Box borderStyle="round" borderColor="blue" flexDirection="column" paddingX={1}>
          <Text bold color="blue">File Explorer {this.props.mode === 'folder' ? '(Folder Mode)' : '(File Mode)'}</Text>
          <Text color="gray">{this.state.currentDir.length > 40 ? "..." + this.state.currentDir.slice(-37) : this.state.currentDir}</Text>
          <Box marginTop={1}>
            <Text>Search: </Text>
            <Text color="yellow">{this.state.filter || "(Type to search...)"}</Text>
          </Box>
        </Box>
        
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Items: {filteredItems.length} / {allItems.length}</Text>
          <CustomSelectInput
            id={this.props.mode === 'folder' ? 'send-folder' : 'send-file'}
            items={filteredItems}
            onHighlight={(item) => this.setState({ highlightedItem: item })}
            onSelect={(item) => {
              this.setState({ filter: "" }); // Reset filter on navigation
              this.handleDirectorySelect(item, this.props.mode === 'file' ? this.props.onFileSelect : undefined);
            }}
            limit={12} // Constrain height to prevent UI break
          />
        </Box>
        
        <Box marginTop={1} flexDirection="column">
          <Text color="gray">↑/↓: Navigate • Enter: {this.props.mode === 'folder' ? 'Open Folder' : 'Select File'}</Text>
          <Text color="gray">Type: Filter • Esc: Clear Filter</Text>
          {this.props.mode === 'folder' && (
              <Text color="green">SPACE: Select Highlighted Folder</Text>
          )}
          {this.props.mode === 'folder' && (
            <Text color="red">BY DEFAULT, SPACE SELECTS THE CURRENT FOLDER, AND CLI AUTO SKIP FOLDER START WITH ""."</Text>
            )}
        </Box>
      </Box>
    );
  }
}

export default FileExplorerView;
