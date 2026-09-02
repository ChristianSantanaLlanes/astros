import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ProgressPage } from "./ProgressPage";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("root missing");

const page = window.location.pathname.replace(/\/$/, "") || "/";

createRoot(root).render(
  <StrictMode>{page === "/progress" ? <ProgressPage /> : <App />}</StrictMode>,
);
