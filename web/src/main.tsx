import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { FluentProvider } from "@fluentui/react-components";
import { theme } from "./theme";
import { AuthProvider } from "./auth";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FluentProvider theme={theme} style={{ background: "transparent" }}>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}><AuthProvider><App /></AuthProvider></BrowserRouter>
    </FluentProvider>
  </StrictMode>,
);
