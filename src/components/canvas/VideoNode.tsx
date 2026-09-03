import { type Node, type NodeProps } from "@xyflow/react";
import type { CanvasNodeData } from "./canvasContext";
import { useCanvasRuntime } from "./canvasContext";
import { NodeHandles } from "./NodeHandles";
import { parseVideoUrl } from "./parseMediaUrl";

export function VideoNode({ id, data, selected }: NodeProps<Node<CanvasNodeData, "video">>) {
  const { assetUrls, onPatchNode, expandedId } = useCanvasRuntime();
  const blobUrl = data.assetId ? assetUrls[data.assetId] : undefined;
  const parsed = !blobUrl && data.url ? parseVideoUrl(data.url) : null;
  const embed = parsed && parsed.kind !== "file" ? parsed : null;
  const fileSrc = blobUrl ?? (parsed?.kind === "file" ? parsed.src : undefined);

  return (
    <div className={`canvas-node canvas-media canvas-video${selected ? " selected" : ""}${id === expandedId ? " dimmed" : ""}`}>
      <NodeHandles nodeId={id} />
      {embed ? (
        <iframe
          className="canvas-media-frame nodrag nopan"
          src={embed.src}
          title={data.title || "Vídeo"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : fileSrc ? (
        <video className="canvas-media-video nodrag nopan nowheel" src={fileSrc} controls playsInline />
      ) : (
        <div className="canvas-media-empty">Sin vídeo</div>
      )}
      <input
        className="canvas-node-caption nodrag nopan"
        placeholder="Pie de vídeo"
        aria-label="Pie de vídeo"
        value={data.title}
        onChange={(e) => onPatchNode(id, { title: e.target.value })}
      />
    </div>
  );
}
