import React, { useState } from "react";
import { Text, Box } from "ink";
import CustomSelectInput from "./CustomSelectInput";
import fs from "node:fs";
import path from "node:path";

const FileExplorer = ({
  onFileSelect,
  onBack,
}: {
  onFileSelect: (file: string) => void;
  onBack: () => void;
}) => {
  const [currentDir, setCurrentDir] = useState(process.cwd());

  const getItems = () => {
    try {
      return [{ label: ".. (Go Back)", value: ".." }].concat(
        fs.readdirSync(currentDir).map((name) => {
          try {
            const fullPath = path.join(currentDir, name);
            const isDir = fs.statSync(fullPath).isDirectory();
            return { label: `${name}${isDir ? "/" : ""}`, value: name, isDir };
          } catch {
            return {
              label: `${name} (access error)`,
              value: name,
              isDir: false,
            };
          }
        })
      );
    } catch {
      return [{ label: "Error reading directory", value: "error" }];
    }
  };

  const items = getItems();

  const handleSelect = (item: any) => {
    if (item.value === "..") {
      const parent = path.dirname(currentDir);
      if (parent !== currentDir) setCurrentDir(parent);
    } else if (item.isDir) {
      setCurrentDir(path.join(currentDir, item.value));
    } else {
      onFileSelect(path.join(currentDir, item.value));
    }
  };

  return (
    <Box flexDirection="column">
      <Text>Current Directory: {currentDir}</Text>
      <CustomSelectInput id="send" items={items} onSelect={handleSelect} />
    </Box>
  );
};

export default FileExplorer;
