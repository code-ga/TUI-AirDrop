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
import type { Peer, FileRequest, TransferReadyInfo } from "./core/NetworkManager";
import type { TransferInfo } from "./core/TransferManager";
import TransferProgressView from "./components/TransferProgressView";
import SavePathPrompt from "./components/SavePathPrompt";

const networkManager = new NetworkManager();

const AppContent = () => {
  const { view, push, pop, reset } = useNavigator();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [sharingApprovalMode, setSharingApprovalMode] = useState<"auto" | "manual">("manual");
  const [offeredFile, setOfferedFile] = useState<string | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [pendingDownloadRequests, setPendingDownloadRequests] = useState<FileRequest[]>([]);
  const [pendingTransfer, setPendingTransfer] = useState<TransferReadyInfo | null>(null);
  const [activeTransfers, setActiveTransfers] = useState<TransferInfo[]>([]);
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
    
    networkManager.on("peerUpdate", (updatedPeers: Peer[]) => {
      // if peer is already in the list, update it, else add it
      setPeers(prev => {
        const updated = [...prev];
        updatedPeers.forEach(peer => {
          const index = updated.findIndex(p => p.ip === peer.ip);
          if (index !== -1) {
            updated[index] = peer;
          } else {
            updated.push(peer);
          }
        });
        return updated;
      });
    });

    networkManager.on("fileRequest", (req: FileRequest) => {
      setPendingDownloadRequests((prev) => [...prev, req]);
    });

    networkManager.on("transferProgress", (info: TransferInfo) => {
      setActiveTransfers((prev) => {
        const index = prev.findIndex((t) => t.filename === info.filename);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = info;
          return updated;
        }
        return [...prev, info];
      });
    });

    networkManager.on("transferComplete", (info) => {
      setActiveTransfers((prev) => prev.filter((t) => t.filename !== info.filename));
      // Show completion notification
    });

    networkManager.on("transferError", (info) => {
      setActiveTransfers((prev) => {
        const index = prev.findIndex((t) => t.filename === info.filename);
        if (index !== -1) {
          const updated = [...prev];
          if (updated[index]) updated[index] = { 
            ...updated[index], 
            status: "error" as const, 
            error: info.error 
          };
          return updated;
        }
        return prev;
      });
    });

    return () => networkManager.stopDiscovery();
  }, []);

  useEffect(() => {
    networkManager.sharingMode = sharingApprovalMode;
  }, [sharingApprovalMode]);

  useEffect(() => {
    networkManager.offering = offeredFile ? { filename: offeredFile.split(/[/\\]/).pop() || offeredFile, size: 0, filePath: offeredFile } : null;
  }, [offeredFile]);

  useInput((input, key) => {
    if (key.escape) {
      pop();
    }
  });

  const handleShareAction = async (action: "accept" | "decline", data: any) => {
    if (action === "accept") {
      const { peer, file } = data;
      const transferInfo = await networkManager.requestFile(peer.ip, file.filename);
      if (transferInfo) {
        setPendingTransfer(transferInfo);
        setCurrentShare({ from: peer.displayName, file: file.filename, size: transferInfo.size });
      } else {
        // Handle rejection or error
      }
    } else {
      // Handle decline (if we want to hide it)
    }
  };

  const handleSaveDir = async (dir: string) => {
    if (currentShare && pendingTransfer) {
      const savePath = `${dir}/${pendingTransfer.filename}`;
      try {
        // Start the download
        await networkManager.downloadFile(pendingTransfer, savePath);
        setCurrentShare(null);
        setPendingTransfer(null);
        reset();
      } catch (error) {
        console.error("Download error:", error);
      }
    }
  };

  const handleSavePathConfirm = async (path: string) => {
    if (pendingTransfer) {
      try {
        await networkManager.downloadFile(pendingTransfer, path);
        setPendingTransfer(null);
        setCurrentShare(null);
      } catch (error) {
        console.error("Download error:", error);
      }
    }
  };

  const handleSavePathCancel = () => {
    setPendingTransfer(null);
    setCurrentShare(null);
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
        
        {/* Save Path Prompt */}
        {pendingTransfer && (
          <SavePathPrompt
            filename={pendingTransfer.filename}
            size={pendingTransfer.size}
            defaultPath={`./Downloads/${pendingTransfer.filename}`}
            onConfirm={handleSavePathConfirm}
            onCancel={handleSavePathCancel}
          />
        )}

        {/* Active Transfers */}
        {activeTransfers.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold underline>Active Transfers</Text>
            {activeTransfers.map((transfer) => (
              <Box key={transfer.filename} marginTop={1}>
                <TransferProgressView
                  filename={transfer.filename}
                  progress={transfer.progress}
                  size={transfer.size}
                  speed={transfer.speed}
                  status={transfer.status}
                  error={transfer.error}
                />
              </Box>
            ))}
          </Box>
        )}

        {/* Receive View */}
        <ReceiveView
          sharingApprovalMode={sharingApprovalMode}
          offeredFile={offeredFile}
          peers={peers}
          pendingDownloadRequests={pendingDownloadRequests}
          currentShare={currentShare}
          onShareAction={handleShareAction}
          onDownloadApproval={(req, approved) => {
            req.approve(approved);
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
