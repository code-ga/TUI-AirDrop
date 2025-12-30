import React from "react";
import { Text, Box } from "ink";
import { BaseView } from "../core/BaseView";
import CustomSelectInput from "../components/CustomSelectInput";

import type { Peer, FileRequest } from "../core/NetworkManager";

interface ReceiveViewProps {
  sharingApprovalMode: "auto" | "manual";
  offeredFile: string | null;
  peers: Peer[];
  pendingDownloadRequests: FileRequest[];
  currentShare: { from: string; file: string; size: string | number } | null;
  onShareAction: (action: "accept" | "decline", share: any) => void;
  onDownloadApproval: (request: FileRequest, approved: boolean) => void;
  onBack: () => void;
}

export class ReceiveView extends BaseView<ReceiveViewProps> {
  override render() {
    const {
      sharingApprovalMode,
      offeredFile,
      peers,
      pendingDownloadRequests,
      currentShare,
      onShareAction,
      onDownloadApproval,
      onBack,
    } = this.props;

    const menuItems: any[] = (peers
      .filter((p) => p.offering)
      .flatMap((peer, index) => [
        {
          key: `accept-${peer.ip}-${index}`,
          label: `[Get] ${peer.offering!.filename} from ${peer.displayName}`,
          value: { type: "incoming", action: "accept", data: { peer, file: peer.offering } },
        },
      ]) as any[])
      .concat(
        pendingDownloadRequests.flatMap((req, index) => [
          {
            key: `approve-${req.fromIp}-${index}`,
            label: `[Approve] ${req.fromIp} wanting ${req.fileName}`,
            value: { type: "outgoing", action: "approve", request: req },
          },
          {
            key: `deny-${req.fromIp}-${index}`,
            label: `[Deny] ${req.fromIp} wanting ${req.fileName}`,
            value: { type: "outgoing", action: "deny", request: req },
          },
        ])
      )
      .concat([
        {
          key: "back",
          label: "Back to Menu",
          value: {
            type: "system",
            action: "back",
          },
        },
      ]);

    return (
      <Box flexDirection="column">
        {offeredFile && (
          <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
            <Text bold>My Shared File:</Text>
            <Text>{offeredFile}</Text>
            <Text color="gray">
              Mode: {sharingApprovalMode === "auto" ? "Broadcast" : "Restricted"}
            </Text>
          </Box>
        )}

        {currentShare && (
          <Text color="green">
            Downloading {currentShare.file} from {currentShare.from}...
          </Text>
        )}

        <Box marginTop={1}>
          <Text underline>Network Activity</Text>
        </Box>

        <Text color="gray">Online Users: {peers.length}</Text>
        
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Action Required:</Text>
          {menuItems.length > 1 ? (
            <CustomSelectInput
              id="receive"
              items={menuItems}
              onSelect={(item) => {
                const { type, action, data, request } = item.value;
                if (action === "back") {
                  onBack();
                } else if (type === "incoming") {
                  onShareAction(action, data);
                } else if (type === "outgoing") {
                  onDownloadApproval(request, action === "approve");
                }
              }}
            />
          ) : (
            <Text italic color="gray"> No pending actions</Text>
          )}
        </Box>

        {pendingDownloadRequests.length > 0 && sharingApprovalMode === "auto" && (
          <Text color="yellow">Auto-approving download requests...</Text>
        )}
      </Box>
    );
  }
}

export default ReceiveView;
