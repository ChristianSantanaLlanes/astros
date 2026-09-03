import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Landing } from "./Landing";
import { ProgressPage } from "./ProgressPage";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("root missing");

const page = window.location.pathname.replace(/\/$/, "") || "/";

function Page() {
  if (page === "/progress") return <ProgressPage />;
  if (page === "/app") return <App />;
  return <Landing />;
}

createRoot(root).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
