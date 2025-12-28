import React from "react";
import { Text, Box } from "ink";
import CustomSelectInput from "./CustomSelectInput";

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
        value: `accept|${index}`,
      },
      {
        label: `Decline ${share.file} from ${share.from}`,
        value: `decline|${index}`,
      },
    ])
    .concat([
      {
        label: "Back to Menu",
        value: "back",
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
            if (item.value === "back") {
              onBack();
            } else {
              const [action, indexStr] = item.value.split('|');
              const index = parseInt(indexStr, 10);
              const share = mockShares[index];
              onShareAction(action as "accept" | "decline", share);
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

export default ReceiveView;
