import React, { useState, createContext } from "react";

export const FocusContext = createContext<{
  focusedId: string | null;
  setFocus: (id: string) => void;
}>({
  focusedId: null,
  setFocus: () => {},
});

export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  return (
    <FocusContext.Provider value={{ focusedId, setFocus: setFocusedId }}>
      {children}
    </FocusContext.Provider>
  );
};
