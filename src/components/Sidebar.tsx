import React from "react";
import { AppState, AppActions } from "../types";

interface Props {
  state: AppState;
  actions: AppActions;
}

export default function Sidebar({ state, actions }: Props) {
  const { appMode, fileName, fileInfo, isDragOver } = state;
  const { handleSwitchMode, handleDragOver, handleDragLeave, handleDrop, fileInputRef, handleInputChange, t, setShowSettings } = actions;

  return (
    <>
      <div className="mode-tabs" style={{ marginTop: "10px" }}>
          <div
            className={`mode-tab ${appMode === "gif2sprite" ? "active" : ""}`}
            onClick={() => handleSwitchMode("gif2sprite")}
          >
            {t("tabSpritesheet")}
          </div>
          <div
            className={`mode-tab ${appMode === "cutting" ? "active" : ""}`}
            onClick={() => handleSwitchMode("cutting")}
          >
            {t("tabCutter")}
          </div>
        </div>

        <div className="imgui-header">{t("fileInputHeader")}</div>
        <label
          htmlFor="fileInput"
          className={`file-drop ${isDragOver ? "dragover" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <svg
            className="w-8 h-8 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ width: "32px", height: "32px", opacity: 0.5, marginBottom: "4px" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <div>{fileName || t("dragDropChooseFile")}</div>
          <div className="text-info">
            {appMode === "gif2sprite" ? t("dragDropHintGif") : t("dragDropHintImg")}
          </div>
        </label>
        <input
          id="fileInput"
          type="file"
          ref={fileInputRef}
          onChange={handleInputChange}
          style={{ display: "none" }}
          accept={appMode === "gif2sprite" ? "image/gif" : "image/png, image/jpeg"}
        />
        <button className="imgui-btn" onClick={() => fileInputRef.current?.click()} style={{ marginTop: "-6px" }}>
          {t("browseFiles")}
        </button>

        {fileInfo && (
          <div className="text-info" style={{ display: "block", textAlign: "center", background: "#0d1015", padding: "6px", borderRadius: "3px", border: "1px solid var(--border-color)" }}>
            {t("sourceResolution")}: <span className="text-highlight">{fileInfo.width}</span> x <span className="text-highlight">{fileInfo.height}</span> px
          </div>
        )}
    </>
  );
}
