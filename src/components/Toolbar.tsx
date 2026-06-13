import React from "react";
import { AppState, AppActions } from "../types";

interface Props {
  state: AppState;
  actions: AppActions;
}

export default function Toolbar({ state, actions }: Props) {
  const { 
    appMode, fileInfo, gifCols, autoGifCols, gifFrames,
    sourceImage, gridCols, gridRows, targetFrameWidth, targetFrameHeight, chunkSize,
    generatedSlices, isZipping, status 
  } = state;
  
  const { 
    setAutoGifCols, setGifCols, handleGenerateGif, 
    setGridCols, setGridRows, setTargetFrameWidth, setTargetFrameHeight, 
    setChunkSize, detectGridLayout, handleGenerateCut, handleDownloadAllZip, 
    getExecutionPlan, t, showStatus 
  } = actions;

  return (
    <>
      {appMode === "gif2sprite" && (
        <div id="panel-gif2sprite">
          <div className="info-box" style={{ marginTop: "10px" }}>
            <div style={{ color: "#fff", marginBottom: "2px", fontWeight: "bold" }}>
              {t("gifInfoTitle")}
            </div>
            <ul>
              <li>
                <span>{t("detectedFrames")}:</span>
                <span className="text-highlight">{fileInfo?.frames || 0}</span>
              </li>
              <li>
                <span>{t("frameSize")}:</span>
                <span>{fileInfo ? `${fileInfo.width}x${fileInfo.height} px` : "---"}</span>
              </li>
            </ul>
          </div>

          <div className="imgui-header" style={{ marginTop: "10px" }}>
            {t("outputGridHeader")}
          </div>

          <div className="control-group" style={{ margin: "6px 0" }}>
            <span className="control-label">{t("autoLayout")}</span>
            <input
              type="checkbox"
              checked={autoGifCols}
              onChange={(e) => setAutoGifCols(e.target.checked)}
              style={{ cursor: "pointer", width: "16px", height: "16px" }}
            />
          </div>

          <div className="control-group">
            <span className="control-label" style={{ opacity: autoGifCols ? 0.5 : 1 }}>{t("columnCount")}</span>
            <input
              type="number"
              min="1"
              max={fileInfo?.frames || 100}
              value={gifCols}
              disabled={autoGifCols}
              onChange={(e) => setGifCols(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ opacity: autoGifCols ? 0.5 : 1 }}
            />
          </div>

          {fileInfo && (
            <div className="info-box" style={{ marginTop: "10px" }}>
              <div style={{ color: "#fff", marginBottom: "2px", fontWeight: "bold" }}>
                {t("resultSheetTitle")}
              </div>
              <ul>
                <li>
                  <span>{t("gridLayout")}:</span>
                  <span className="text-highlight">
                    {gifCols} x {Math.ceil(fileInfo.frames / gifCols)}
                  </span>
                </li>
                <li>
                  <span>{t("fileDimension")}:</span>
                  <span style={{ color: "#2ecc71", fontWeight: "bold" }}>
                    {gifCols * fileInfo.width} x {Math.ceil(fileInfo.frames / gifCols) * fileInfo.height} px
                  </span>
                </li>
              </ul>
            </div>
          )}

          <div style={{ marginTop: "15px" }}>
            <button
              id="btn-gen-gif"
              className="imgui-btn primary"
              onClick={handleGenerateGif}
              disabled={gifFrames.length === 0}
            >
              {t("btnGenerateSpritesheet")}
            </button>
          </div>
        </div>
      )}

      {appMode === "cutting" && (
        <div id="panel-cutting">
          <div className="imgui-header" style={{ marginTop: "10px" }}>
            {t("gridTitleSource")}
          </div>
          <div className="text-info" style={{ marginBottom: "8px" }}>
            {t("gridSubtitleSource")}
          </div>
          <div className="control-group">
            <span className="control-label">{t("colsX")}</span>
            <input
              type="number"
              min="1"
              value={gridCols}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value) || 1);
                setGridCols(val);
                if (sourceImage) {
                  setTargetFrameWidth(Math.round(sourceImage.width / val));
                }
              }}
            />
          </div>
          <div className="control-group" style={{ marginTop: "6px" }}>
            <span className="control-label">{t("rowsY")}</span>
            <input
              type="number"
              min="1"
              value={gridRows}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value) || 1);
                setGridRows(val);
                if (sourceImage) {
                  setTargetFrameHeight(Math.round(sourceImage.height / val));
                }
              }}
            />
          </div>

          <div className="control-group" style={{ marginTop: "10px", borderTop: "1px dashed var(--border-color)", paddingTop: "10px" }}>
            <div style={{ color: "#fff", marginBottom: "6px", fontWeight: "bold", fontSize: "11px" }}>
              {t("targetFrameSizeTitle")}
            </div>
            <div style={{ display: "flex", gap: "8px", width: "100%" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>{t("widthPx")}</span>
                <input
                  type="number"
                  min="1"
                  value={targetFrameWidth || ""}
                  placeholder="e.g. 498"
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 0);
                    setTargetFrameWidth(val);
                    if (sourceImage && val > 0) {
                      setGridCols(Math.max(1, Math.round(sourceImage.width / val)));
                    }
                  }}
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>{t("heightPx")}</span>
                <input
                  type="number"
                  min="1"
                  value={targetFrameHeight || ""}
                  placeholder="e.g. 278"
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 0);
                    setTargetFrameHeight(val);
                    if (sourceImage && val > 0) {
                      setGridRows(Math.max(1, Math.round(sourceImage.height / val)));
                    }
                  }}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: "10px" }}>
            <button
              type="button"
              className="imgui-btn"
              style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: "6px", 
                width: "100%", 
                padding: "6px",
                background: "rgba(56, 155, 242, 0.15)",
                border: "1px solid rgba(56, 155, 242, 0.4)",
                color: "#389bf2"
              }}
              onClick={() => {
                if (sourceImage) {
                  detectGridLayout(sourceImage);
                } else {
                  showStatus(t("statusSmartDetectNoImage"), true);
                }
              }}
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ width: "14px", height: "14px" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              {t("btnSmartDetect")}
            </button>
          </div>

          <div className="imgui-header" style={{ marginTop: "10px" }}>
            {t("packageDivisionTitle")}
          </div>
          <div className="control-group">
            <span className="control-label">{t("framesPerFile")}</span>
            <input
              type="number"
              min="1"
              value={chunkSize}
              onChange={(e) => setChunkSize(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ color: "#3498db", fontWeight: "bold" }}
            />
          </div>

          <div className="info-box" style={{ marginTop: "10px" }}>
            <div style={{ color: "#fff", marginBottom: "2px", fontWeight: "bold" }}>
              {t("outputPlanTitle")}
            </div>
            <ul>{getExecutionPlan()}</ul>
          </div>

          <div style={{ marginTop: "15px" }}>
            <button
              id="btn-gen-cut"
              className="imgui-btn primary"
              onClick={handleGenerateCut}
              disabled={!sourceImage}
            >
              {t("btnGeneratePackages")}
            </button>
          </div>
        </div>
      )}

      <div style={{ flexGrow: 1 }}></div>

      {generatedSlices.length > 0 && (
        <button
          id="download-all-btn"
          className="imgui-btn success"
          onClick={handleDownloadAllZip}
          disabled={isZipping}
          style={{ padding: "10px" }}
        >
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ width: "16px", height: "16px" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
          </svg>
          {isZipping ? t("btnZipping") : t("btnExportAllZip")}
        </button>
      )}

      {status && (
        <div id="status-msg" className={status.isError ? "status-err" : "status-ok"}>
          {status.text}
        </div>
      )}
    </>
  );
}
