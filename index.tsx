import React, { useState, createContext, useContext, useEffect } from "react";
import { render, Text, Box, useInput } from "ink";
import SelectInput from "ink-select-input";
import fs from "node:fs";
import path from "node:path";

const FocusContext = createContext<{
  focusedId: string | null;
  setFocus: (id: string) => void;
}>({
  focusedId: null,
  setFocus: () => {},
});

const FocusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  return (
    <FocusContext.Provider value={{ focusedId, setFocus: setFocusedId }}>
      {children}
    </FocusContext.Provider>
  );
};

const CustomSelectInput: React.FC<{
  id: string;
  items: any[];
  onSelect: (item: any) => void;
}> = ({ id, items, onSelect }) => {
  const { focusedId } = useContext(FocusContext);
  const isFocused = focusedId === id;

  return (
    <SelectInput items={items} onSelect={onSelect} isFocused={isFocused} />
  );
};

const MainMenu = ({
  onSelect,
  offeredFile,
}: {
  onSelect: (item: any) => void;
  offeredFile: string | null;
}) => {
  const items = [
    { label: "Send File", value: "send" },
    { label: "View Online Users/Shares", value: "receive" },
    { label: "Settings", value: "settings" },
  ];

  if (offeredFile) {
    items.push({ label: "Stop Offering", value: "stop" });
  }

  items.push({ label: "Exit", value: "exit" });

  return (
    <Box flexDirection="column">
      <Text>Welcome to Airdrop TUI</Text>
      <CustomSelectInput id="menu" items={items} onSelect={onSelect} />
    </Box>
  );
};

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

const Recipients = ({ onSelect }: { onSelect: (item: any) => void }) => {
  const items = [
    { label: "Share with Approved Users", value: "approved" },
    { label: "Broadcast to Everyone", value: "everyone" },
  ];

  return (
    <Box flexDirection="column">
      <Text>Select Recipients</Text>
      <CustomSelectInput id="recipients" items={items} onSelect={onSelect} />
    </Box>
  );
};

const ReceiveView = ({
  receiveMode,
  offeredFile,
  currentShare,
  onShareAction,
  onBack,
}: {
  receiveMode: "auto" | "manual";
  offeredFile: string | null;
  currentShare: { from: string; file: string; size: string } | null;
  onShareAction: (action: "accept" | "decline", share: any) => void;
  onBack: () => void;
}) => {
  const mockUsers = [
    { name: "Alice", approved: true, online: true },
    { name: "Bob", approved: false, online: true },
    { name: "Charlie", approved: true, online: false },
  ];

  const mockShares = [{ from: "Alice", file: "document.pdf", size: "2MB" }];

  const shareItems = mockShares
    .flatMap((share, index) => [
      {
        label: `Accept ${share.file} from ${share.from}`,
        value: { action: "accept", share, key: `accept-${index}` },
      },
      {
        label: `Decline ${share.file} from ${share.from}`,
        value: { action: "decline", share, key: `decline-${index}` },
      },
    ])
    .concat([
      {
        label: "Back to Menu",
        value: {
          action: "back",
          share: {
            from: "",
            file: "",
            size: "",
          },
          key: "back",
        },
      },
    ]);

  return (
    <Box flexDirection="column">
      {offeredFile && <Text>Offering: {offeredFile}</Text>}
      {currentShare && (
        <Text>
          Saving {currentShare.file} from {currentShare.from}...
        </Text>
      )}
      <Text>
        Receive Mode:{" "}
        {receiveMode === "auto" ? "Auto-accept" : "Require Approval"}
      </Text>
      <Text>Online Users:</Text>
      {mockUsers.map((user) => (
        <Text key={user.name}>
          {user.name} - {user.online ? "Online" : "Offline"} -{" "}
          {user.approved ? "Approved" : "Not Approved"}
        </Text>
      ))}
      <Text>Incoming Shares:</Text>
      {receiveMode === "manual" && mockShares.length > 0 && !currentShare ? (
        <CustomSelectInput
          id="receive"
          items={shareItems}
          onSelect={(item) => {
            if (item.value.action === "back") {
              onBack();
            } else {
              onShareAction(item.value.action, item.value.share);
            }
          }}
        />
      ) : (
        mockShares.map((share, i) => (
          <Text key={i}>
            {share.from} is sharing {share.file} ({share.size}) -{" "}
            {receiveMode === "auto" ? "[Auto-accepted]" : "[Accept] [Decline]"}
          </Text>
        ))
      )}
    </Box>
  );
};

const Settings = ({
  onModeChange,
  currentMode,
  onBack,
}: {
  onModeChange: (mode: "auto" | "manual") => void;
  currentMode: "auto" | "manual";
  onBack: () => void;
}) => {
  const items = [
    { label: "Set Receive Mode to Auto-accept", value: "auto" },
    { label: "Set Receive Mode to Require Approval", value: "manual" },
    { label: "Back to Menu", value: "back" },
  ];

  const handleSelect = (item: any) => {
    if (item.value === "auto" || item.value === "manual") {
      onModeChange(item.value);
    } else if (item.value === "back") {
      onBack();
    }
  };

  return (
    <Box flexDirection="column">
      <Text>Settings</Text>
      <Text>
        Current Receive Mode:{" "}
        {currentMode === "auto" ? "Auto-accept" : "Require Approval"}
      </Text>
      <CustomSelectInput id="settings" items={items} onSelect={handleSelect} />
    </Box>
  );
};

const ConfirmSave = ({
  selectedDir,
  onConfirm,
  currentShare,
}: {
  selectedDir: string;
  onConfirm: (action: "accept" | "reset" | "cancel") => void;
  currentShare: { from: string; file: string; size: string };
}) => {
  const items = [
    { label: `Accept: Save to ${selectedDir}`, value: "accept" },
    { label: `Reset: Save to ${process.cwd()}`, value: "reset" },
    { label: "Cancel", value: "cancel" },
  ];

  return (
    <Box flexDirection="column">
      <Text>
        Confirm save location for {currentShare.file} from {currentShare.from}
      </Text>
      <Text>Selected directory: {selectedDir}</Text>
      <CustomSelectInput
        id="confirm-save"
        items={items}
        onSelect={(item) => onConfirm(item.value)}
      />
    </Box>
  );
};

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

const App = () => {
  const [view, setView] = useState("menu");
  const [viewHistory, setViewHistory] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [receiveMode, setReceiveMode] = useState<"auto" | "manual">("manual");
  const [offeredFile, setOfferedFile] = useState<string | null>(null);
  const [currentShare, setCurrentShare] = useState<{
    from: string;
    file: string;
    size: string;
  } | null>(null);
  const [selectedDir, setSelectedDir] = useState<string | null>(null);
  const { setFocus } = useContext(FocusContext);

  useEffect(() => {
    if (view === "receive") {
      setFocus("receive");
    } else if (view === "save-share") {
      setFocus("save-share");
    } else if (view === "confirm-save") {
      setFocus("confirm-save");
    } else {
      setFocus(view);
    }
  }, [view, setFocus]);

  // Track view history for navigation
  useEffect(() => {
    if (view !== "menu") {
      setViewHistory((prev) => {
        const lastView = prev[prev.length - 1];
        if (lastView !== view) {
          return [...prev, view];
        }
        return prev;
      });
    }
  }, [view]);

  // Handle Esc key press to go back
  useInput((input, key) => {
    if (key.escape) {
      if (viewHistory.length > 0) {
        const previousView = viewHistory[viewHistory.length - 2] || "menu";
        setView(previousView);
        setViewHistory((prev) => prev.slice(0, -1));
      } else {
        setView("menu");
      }
    }
  });

  const handleShareAction = (action: "accept" | "decline", share: any) => {
    if (action === "accept") {
      setCurrentShare(share);
      setView("save-share");
    } else {
      // Decline, for now just log
      console.log(`Declined share: ${share.file} from ${share.from}`);
    }
  };

  const handleSaveDir = (dir: string) => {
    if (currentShare) {
      console.log(
        `Saving ${currentShare.file} from ${currentShare.from} to ${dir}`
      );
      // Mock save
      setCurrentShare(null);
      setViewHistory((prev) => [...prev, view]);
      setView("receive");
    }
  };

  const handleSelect = (item: any) => {
    if (item.value === "exit") {
      process.exit(0);
    } else if (item.value === "stop") {
      setOfferedFile(null);
    } else {
      setViewHistory((prev) => [...prev, view]);
      setView(item.value);
    }
  };

  const handleRecipientSelect = (item: any) => {
    // Mock offering file to network
    setOfferedFile(selectedFile);
    // Set receive mode based on sharing choice
    if (item.value === "approved") {
      setReceiveMode("manual");
    } else if (item.value === "everyone") {
      setReceiveMode("auto");
    }
    setViewHistory((prev) => [...prev, view]);
    setView("menu");
  };

  const renderLeftPanel = () => {
    if (view === "menu") {
      return <MainMenu onSelect={handleSelect} offeredFile={offeredFile} />;
    } else if (view === "send") {
      return (
        <FileExplorer
          onFileSelect={(file) => {
            setViewHistory((prev) => [...prev, view]);
            setSelectedFile(file);
            setView("recipients");
          }}
          onBack={() => {
            setViewHistory((prev) => prev.slice(0, -1));
            setView("menu");
          }}
        />
      );
    } else if (view === "recipients") {
      return <Recipients onSelect={handleRecipientSelect} />;
    } else if (view === "settings") {
      return (
        <Settings
          onModeChange={setReceiveMode}
          currentMode={receiveMode}
          onBack={() => {
            setViewHistory((prev) => prev.slice(0, -1));
            setView("menu");
          }}
        />
      );
    } else if (view === "save-share" && currentShare) {
      return (
        <SaveLocation onSaveDir={handleSaveDir} currentShare={currentShare} />
      );
    }
    return <Text>Left Panel</Text>;
  };

  return (
    <Box flexDirection="row" width="100%">
      <Box flexDirection="column" width="50%">
        {renderLeftPanel()}
      </Box>
      <Box
        flexDirection="column"
        width="50%"
        borderStyle="single"
        borderColor="blue">
        <ReceiveView
          receiveMode={receiveMode}
          offeredFile={offeredFile}
          currentShare={currentShare}
          onShareAction={handleShareAction}
          onBack={() => {
            setViewHistory((prev) => prev.slice(0, -1));
            setView("menu");
          }}
        />
      </Box>
    </Box>
  );
};

render(
  <FocusProvider>
    <App />
  </FocusProvider>
);
