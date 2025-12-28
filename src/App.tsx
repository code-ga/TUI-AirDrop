import React, { useState, useContext, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { FocusContext } from "./contexts/FocusContext";
import MainMenuView from "./views/MainMenuView";
import FileExplorerView from "./views/FileExplorerView";
import RecipientsView from "./views/RecipientsView";
import ReceiveView from "./views/ReceiveView";
import SettingsView from "./views/SettingsView";
import SaveLocationView from "./views/SaveLocationView";
import { NavigationProvider, useNavigator } from "./core/Navigation";
import { NetworkManager } from "./core/NetworkManager";
import type { Peer } from "./core/NetworkManager";

const networkManager = new NetworkManager();

const AppContent = () => {
  const { view, push, pop, reset } = useNavigator();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [sharingApprovalMode, setSharingApprovalMode] = useState<"auto" | "manual">("manual");
  const [offeredFile, setOfferedFile] = useState<string | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [pendingDownloadRequests, setPendingDownloadRequests] = useState<any[]>([]);
  const [currentShare, setCurrentShare] = useState<{
    from: string;
    file: string;
    size: string | number;
  } | null>(null);
  const { setFocus } = useContext(FocusContext);

  useEffect(() => {
    setFocus(view);
  }, [view, setFocus]);

  useEffect(() => {
    networkManager.startDiscovery();
    
    networkManager.on("peerUpdate", (updatedPeers) => {
      setPeers(updatedPeers);
    });

    networkManager.on("fileRequest", ({ fromIp, fileName, approve }) => {
      setPendingDownloadRequests((prev) => [...prev, { fromIp, fileName, approve }]);
    });

    return () => networkManager.stopDiscovery();
  }, []);

  useEffect(() => {
    networkManager.sharingMode = sharingApprovalMode;
  }, [sharingApprovalMode]);

  useEffect(() => {
    networkManager.offering = offeredFile ? { filename: offeredFile.split(/[/\\]/).pop() || offeredFile, size: 0 } : null;
  }, [offeredFile]);

  useInput((input, key) => {
    if (key.escape) {
      pop();
    }
  });

  const handleShareAction = async (action: "accept" | "decline", data: any) => {
    if (action === "accept") {
      const { peer, file } = data;
      const token = await networkManager.requestFile(peer.ip, file.filename);
      if (token) {
        setCurrentShare({ from: peer.displayName, file: file.filename, size: file.size });
        push("save-share");
      } else {
        // Handle rejection or error
      }
    } else {
      // Handle decline (if we want to hide it)
    }
  };

  const handleSaveDir = (dir: string) => {
    if (currentShare) {
      console.log(`Saving ${currentShare.file} from ${currentShare.from} to ${dir}`);
      setCurrentShare(null);
      push("receive");
    }
  };

  const handleSelect = (item: any) => {
    if (item.value === "exit") {
      process.exit(0);
    } else if (item.value === "stop") {
      setOfferedFile(null);
    } else {
      push(item.value);
    }
  };

  const handleRecipientSelect = (item: any) => {
    setOfferedFile(selectedFile);
    if (item.value === "approved") {
      setSharingApprovalMode("manual");
    } else if (item.value === "everyone") {
      setSharingApprovalMode("auto");
    }
    reset();
  };

  const renderLeftPanel = () => {
    if (view === "menu") {
      return <MainMenuView onSelect={handleSelect} offeredFile={offeredFile} />;
    } else if (view === "send") {
      return (
        <FileExplorerView
          onFileSelect={(file) => {
            setSelectedFile(file);
            push("recipients");
          }}
          onBack={pop}
        />
      );
    } else if (view === "recipients") {
      return <RecipientsView onSelect={handleRecipientSelect} />;
    } else if (view === "settings") {
      return (
        <SettingsView
          onModeChange={setSharingApprovalMode}
          currentMode={sharingApprovalMode}
          onBack={pop}
        />
      );
    } else if (view === "save-share" && currentShare) {
      return (
        <SaveLocationView onSaveDir={handleSaveDir} currentShare={currentShare} />
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
          sharingApprovalMode={sharingApprovalMode}
          offeredFile={offeredFile}
          peers={peers}
          pendingDownloadRequests={pendingDownloadRequests}
          currentShare={currentShare}
          onShareAction={handleShareAction}
          onDownloadApproval={(req) => {
            req.approve(true);
            setPendingDownloadRequests(prev => prev.filter(r => r !== req));
          }}
          onBack={pop}
        />
      </Box>
    </Box>
  );
};

const App = () => (
  <NavigationProvider>
    <AppContent />
  </NavigationProvider>
);

export default App;
