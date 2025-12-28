import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type ViewName = "menu" | "send" | "recipients" | "receive" | "settings" | "save-share" | "confirm-save";

interface NavigationState {
  currentView: ViewName;
  history: ViewName[];
}

interface NavigationContextType {
  view: ViewName;
  push: (view: ViewName) => void;
  pop: () => void;
  reset: () => void;
}

export const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NavigationState>({
    currentView: "menu",
    history: ["menu"],
  });

  const push = (view: ViewName) => {
    setState((prev) => ({
      currentView: view,
      history: [...prev.history, view],
    }));
  };

  const pop = () => {
    setState((prev) => {
      if (prev.history.length <= 1) return prev;
      const newHistory = prev.history.slice(0, -1);
      const nextView = newHistory[newHistory.length - 1];
      return {
        currentView: nextView,
        history: newHistory,
      };
    });
  };

  const reset = () => {
    setState({ currentView: "menu", history: ["menu"] });
  };

  return (
    <NavigationContext.Provider value={{ view: state.currentView, push, pop, reset }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigator = () => {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("useNavigator must be used within NavigationProvider");
  return context;
};
