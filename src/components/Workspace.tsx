import React, { useEffect, useState, useRef } from "react";
import { AppState, AppActions } from "../types";

interface Props {
  state: AppState;
  actions: AppActions;
}

export default function Workspace({ state, actions }: Props) {
  const { appMode, conversionDir, tab, sourceImage, gifFrames, generatedSlices, connectFrames, exportFrameCount, connectDelay, gridCols, gridRows, editorFrames } = state;
  const { 
    setTab, handleMouseDown, workspaceRef, canvasContainerRef, canvasRef, 
    transformRef, downloadSingle, t 
  } = actions;

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [previewFrame, setPreviewFrame] = useState(0);
  const [workspaceViewMode, setWorkspaceViewMode] = useState<"grid" | "preview">("grid");

  useEffect(() => {
    setWorkspaceViewMode("grid");
  }, [sourceImage, connectFrames.length]);

  useEffect(() => {
    setWorkspaceViewMode("grid");
  }, [appMode, conversionDir, sourceImage, connectFrames.length, gifFrames.length, editorFrames.length]);

  useEffect(() => {
    let limit = 0;
    if (appMode === "conversion") {
      if (conversionDir === "sprite2gif") {
        const total = connectFrames.length > 0 ? connectFrames.length : (sourceImage ? gridCols * gridRows : 0);
        limit = Math.max(1, Math.min(total, exportFrameCount));
      } else {
        limit = gifFrames.length;
      }
    } else if (appMode === "editing") {
      limit = editorFrames.length;
    }

    if (limit <= 0) return;

    const interval = setInterval(() => {
      setPreviewFrame(prev => (prev + 1) % limit);
    }, connectDelay);
    
    return () => clearInterval(interval);
  }, [appMode, conversionDir, connectFrames.length, sourceImage, gridCols, gridRows, exportFrameCount, connectDelay, gifFrames.length, editorFrames.length]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (appMode === "conversion") {
      if (conversionDir === "sprite2gif") {
        const total = connectFrames.length > 0 ? connectFrames.length : (sourceImage ? gridCols * gridRows : 0);
        const limit = Math.max(1, Math.min(total, exportFrameCount));
        if (limit <= 0) return;
        const currentIdx = previewFrame % limit;

        if (connectFrames.length > 0) {
          const frame = connectFrames[currentIdx];
          if (!frame || !frame.img) return;
          canvas.width = frame.img.naturalWidth;
          canvas.height = frame.img.naturalHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(frame.img, 0, 0);
        } else if (sourceImage) {
          const fw = sourceImage.width / Math.max(1, gridCols);
          const fh = sourceImage.height / Math.max(1, gridRows);
          canvas.width = fw;
          canvas.height = fh;
          
          const c = currentIdx % Math.max(1, gridCols);
          const r = Math.floor(currentIdx / Math.max(1, gridCols));
          const x = c * fw;
          const y = r * fh;
          
          ctx.clearRect(0, 0, fw, fh);
          ctx.drawImage(sourceImage, x, y, fw, fh, 0, 0, fw, fh);
        }
      } else {
        if (gifFrames.length === 0) return;
        const currentIdx = previewFrame % gifFrames.length;
        const frame = gifFrames[currentIdx];
        if (!frame) return;
        canvas.width = frame.width;
        canvas.height = frame.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(frame, 0, 0);
      }
    } else if (appMode === "editing") {
      if (editorFrames.length === 0) return;
      const currentIdx = previewFrame % editorFrames.length;
      const frame = editorFrames[currentIdx];
      if (!frame || !frame.canvas) return;
      canvas.width = frame.width;
      canvas.height = frame.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(frame.canvas, 0, 0);
    }
  }, [previewFrame, appMode, conversionDir, connectFrames, sourceImage, gridCols, gridRows, exportFrameCount, gifFrames, editorFrames]);

  const hasLoadedContent = 
    (appMode === "conversion" && conversionDir === "sprite2gif" && (sourceImage !== null || connectFrames.length > 0)) ||
    (appMode === "conversion" && conversionDir === "gif2sprite" && gifFrames.length > 0) ||
    (appMode === "editing" && editorFrames.length > 0);

  return (
    <div className="imgui-window main-view">
      <div className="imgui-title">
        <span>{t("workspaceTitle")}</span>
      </div>

      <div className="imgui-tabs">
        <div
          className={`imgui-tab ${tab === "preview" ? "active" : ""}`}
          onClick={() => setTab("preview")}
        >
          {t("tabVisualizer")}
        </div>
        <div
          className={`imgui-tab ${tab === "results" ? "active" : ""}`}
          onClick={() => setTab("results")}
        >
          {t("tabResults")} ({generatedSlices.length})
        </div>
      </div>

      <div
        id="preview-view"
        className="workspace"
        ref={workspaceRef}
        onMouseDown={handleMouseDown}
        style={{ display: tab === "preview" ? "flex" : "none" }}
      >
        {!sourceImage && gifFrames.length === 0 && connectFrames.length === 0 && editorFrames.length === 0 && (
          <div className="empty-state empty-text">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ width: "48px", height: "48px", opacity: 0.2, marginBottom: "8px" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{t("emptyWorkspace")}</span>
          </div>
        )}

        {(sourceImage || gifFrames.length > 0 || connectFrames.length > 0 || editorFrames.length > 0) && (
          <div
            ref={canvasContainerRef}
            className="canvas-container"
            style={{
              position: "relative",
              transform: `translate(${transformRef.current.x}px, ${transformRef.current.y}px) scale(${transformRef.current.scale})`,
              transformOrigin: "0 0",
              display: (workspaceViewMode === "preview" && hasLoadedContent) ? "none" : "block"
            }}
          >
            <canvas ref={canvasRef} />
            {appMode === "editing" && state.draggedFrameId && (
              <div
                id="frame-dragger"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  pointerEvents: "none",
                  zIndex: 9999,
                  willChange: "transform, opacity",
                  opacity: 0,
                  transform: "translate(-9999px, -9999px)"
                }}
              >
                {(() => {
                  const frame = state.editorFrames.find(f => f.id === state.draggedFrameId);
                  if (!frame) return null;
                  return (
                    <div style={{
                      animation: "lift 0.15s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
                      opacity: 0.85,
                      boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                      border: "2px solid var(--accent)",
                      borderRadius: "2px",
                      overflow: "hidden"
                    }}>
                      <img 
                        src={frame.canvas.toDataURL()} 
                        style={{ 
                          width: `${frame.width}px`, 
                          height: `${frame.height}px`, 
                          display: "block", 
                          imageRendering: "pixelated" 
                        }} 
                      />
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {workspaceViewMode === "preview" && hasLoadedContent && (
          <div className="preview-mode-container" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 5
          }}>
            <div style={{
              background: "var(--panel-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px"
            }}>
              <div style={{ color: "var(--accent)", fontSize: "14px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1.5px" }}>
                {t("livePreview")}
              </div>
              <div style={{ width: "300px", height: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <canvas ref={previewCanvasRef} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", imageRendering: "pixelated" }} />
              </div>
            </div>
          </div>
        )}

        {hasLoadedContent && (
          <div style={{
            position: "absolute",
            bottom: "45px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            display: "flex",
            gap: "12px",
            alignItems: "center"
          }}>
            <button
              onClick={() => setWorkspaceViewMode("grid")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                padding: "6px 12px",
                cursor: "pointer",
                borderRadius: "20px",
                background: workspaceViewMode === "grid" ? "rgba(255, 255, 255, 0.12)" : "rgba(17, 20, 26, 0.8)",
                border: workspaceViewMode === "grid" ? "1px solid rgba(255, 255, 255, 0.45)" : "1px solid var(--border-color)",
                color: workspaceViewMode === "grid" ? "#fff" : "var(--text-muted)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                backdropFilter: "blur(10px)",
                transition: "all 0.2s ease"
              }}
            >
              <span>←</span>
              <span>{t("workspaceViewGrid")}</span>
            </button>
            <button
              onClick={() => setWorkspaceViewMode("preview")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                padding: "6px 12px",
                cursor: "pointer",
                borderRadius: "20px",
                background: workspaceViewMode === "preview" ? "rgba(255, 255, 255, 0.12)" : "rgba(17, 20, 26, 0.8)",
                border: workspaceViewMode === "preview" ? "1px solid rgba(255, 255, 255, 0.45)" : "1px solid var(--border-color)",
                color: workspaceViewMode === "preview" ? "#fff" : "var(--text-muted)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                backdropFilter: "blur(10px)",
                transition: "all 0.2s ease"
              }}
            >
              <span>{t("workspaceViewPreview")}</span>
              <span>→</span>
            </button>
          </div>
        )}

        {(sourceImage || gifFrames.length > 0 || connectFrames.length > 0 || editorFrames.length > 0) && (
          <div className="hint" style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
            {t("workspaceHint")}
          </div>
        )}
      </div>

      <div
        id="results-view"
        className="results-grid"
        style={{ display: tab === "results" ? "grid" : "none" }}
      >
        {generatedSlices.map((slice, index) => (
          <div key={`slice-${index}`} className="result-card">
            <div className="result-img-wrapper">
              <img src={slice.dataURL} alt={slice.filename} />
            </div>
            <div className="result-info">
              <div style={{ color: "#fff", fontWeight: "bold", marginBottom: "2px" }}>
                {slice.filename}
              </div>
              <div>
                <span>{t("resultCardFrames")}</span>
                <span style={{ color: "#3498db" }}>{slice.framesCount}</span>
              </div>
              <div>
                <span>{t("resultCardDimensions")}</span>
                <span>{slice.w}x{slice.h}</span>
              </div>
            </div>
            <button
              className="imgui-btn primary"
              style={{ marginTop: "auto" }}
              onClick={() => downloadSingle(slice.dataURL, slice.filename)}
            >
              {t("downloadPngBtn")}
            </button>
          </div>
        ))}
        {generatedSlices.length === 0 && (
          <div className="empty-text" style={{ gridColumn: "1 / -1", textAlign: "center", position: "static", transform: "none", marginTop: "100px" }}>
            {t("emptyResults")}
          </div>
        )}
      </div>
    </div>
  );
}

