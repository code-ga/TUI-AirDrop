import React from "react";
import { render } from "ink";
import { FocusProvider } from "./src/contexts/FocusContext";
import App from "./src/App";

render(
  <FocusProvider>
    <App />
  </FocusProvider>
);
