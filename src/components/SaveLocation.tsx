import React, { useState } from "react";
import { Text, Box } from "ink";
import CustomSelectInput from "./CustomSelectInput";
import fs from "node:fs";
import path from "node:path";

const SaveLocation = ({
  onSaveDir,
  currentShare,
}: {
  onSaveDir: (dir: string) => void;
  currentShare: { from: string; file: string; size: string };
}) => {
  const [currentDir, setCurrentDir] = useState(process.cwd());
  const [selectedDir, setSelectedDir] = useState<string | null>(null);

  const getItems = () => {
    try {
      const items = fs
        .readdirSync(currentDir)
        .map((name) => {
          try {
            const fullPath = path.join(currentDir, name);
            const isDir = fs.statSync(fullPath).isDirectory();
            if (isDir) {
              return { label: `${name}/`, value: name, isDir };
            }
          } catch {}
          return null;
        })
        .filter((item) => item !== null) as any[];
      return [{ label: ".. (Go Back)", value: "..", isDir: false }, ...items];
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
      setSelectedDir(path.join(currentDir, item.value));

      // Confirm save location
      onSaveDir(path.join(currentDir, item.value));
    }
    // Do nothing for non-dirs
  };

  return (
    <Box flexDirection="column">
      <Text>
        Choose save location for {currentShare.file} from {currentShare.from}
      </Text>
      <Text>Current Directory: {currentDir}</Text>
      <CustomSelectInput
        id="save-share"
        items={items}
        onSelect={handleSelect}
      />
    </Box>
  );
};

export default SaveLocation;
