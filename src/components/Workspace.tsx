import React from "react";
import { AppState, AppActions } from "../types";

interface Props {
  state: AppState;
  actions: AppActions;
}

export default function Workspace({ state, actions }: Props) {
  const { tab, sourceImage, gifFrames, generatedSlices } = state;
  const { 
    setTab, handleMouseDown, workspaceRef, canvasContainerRef, canvasRef, 
    transformRef, downloadSingle, t 
  } = actions;

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
        {!sourceImage && gifFrames.length === 0 && (
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

        {(sourceImage || gifFrames.length > 0) && (
          <div
            ref={canvasContainerRef}
            className="canvas-container"
            style={{
              transform: `translate(${transformRef.current.x}px, ${transformRef.current.y}px) scale(${transformRef.current.scale})`,
            }}
          >
            <canvas ref={canvasRef} />
          </div>
        )}

        {(sourceImage || gifFrames.length > 0) && (
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
