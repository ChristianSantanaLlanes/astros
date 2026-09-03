import { createContext, useContext } from "react";
import type { Idea } from "../../types";

export type CanvasNodeData = {
  ideaId: string;
  title: string;
  body: string;
  linkedIdeaId?: string;
  assetId?: string;
  url?: string;
};

export type CanvasRuntime = {
  ideas: Idea[];
  currentIdeaId: string;
  expandedId: string | null;
  assetUrls: Record<string, string>;
  onOpenIdea: (id: string) => void;
  onPatchNode: (id: string, patch: Partial<CanvasNodeData>) => void;
  onExpandNode: (id: string) => void;
};

export const CanvasRuntimeContext = createContext<CanvasRuntime | null>(null);

export function useCanvasRuntime(): CanvasRuntime {
  const ctx = useContext(CanvasRuntimeContext);
  if (!ctx) throw new Error("CanvasRuntimeContext missing");
  return ctx;
}
