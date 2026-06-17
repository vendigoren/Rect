import React from "react";
import { AppState, AppActions } from "../types";

interface Props {
  state: AppState;
  actions: AppActions;
}

export default function Toolbar({ state, actions }: Props) {
  const { 
    appMode, conversionDir, fileInfo, gifCols, autoGifCols, gifFrames,
    sourceImage, gridCols, gridRows, chunkSize,
    generatedSlices, isZipping, isExportingGif, connectFrames, connectDelay, exportFrameCount,
    editorFrames, selectedFrameIds, historyStack, futureStack, status
  } = state;
  
  const { 
    setConversionDir, setAutoGifCols, setGifCols, handleGenerateGif, 
    setGridCols, setGridRows, setTargetFrameWidth, setTargetFrameHeight, 
    setChunkSize, detectGridLayout, handleGenerateCut, handleDownloadAllZip, handleExportAsGif,
    setConnectDelay, setExportFrameCount, handleGenerateConnectGif,
    undoEditor, redoEditor, deleteSelectedFrames,
    handleEditorExportGif, handleEditorGenerateCut,
    t, showStatus 
  } = actions;

  return (
    <>      {appMode === "conversion" && (
        <div id="panel-conversion">          <div style={{ display: "flex", gap: "4px", marginTop: "10px", marginBottom: "8px" }}>
            <button
              className={`imgui-btn${conversionDir === "gif2sprite" ? " primary" : ""}`}
              style={{ flex: 1, fontSize: "11px", padding: "5px 4px" }}
              onClick={() => setConversionDir("gif2sprite")}
            >
              {t("conversionSubGif2Sprite")}
            </button>
            <button
              className={`imgui-btn${conversionDir === "sprite2gif" ? " primary" : ""}`}
              style={{ flex: 1, fontSize: "11px", padding: "5px 4px" }}
              onClick={() => setConversionDir("sprite2gif")}
            >
              {t("conversionSubSprite2Gif")}
            </button>
          </div>          {conversionDir === "gif2sprite" && (
            <>
              <div className="info-box">
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
            </>
          )}          {conversionDir === "sprite2gif" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>              <div className="info-box">
                <div style={{ color: "#fff", marginBottom: "2px", fontWeight: "bold" }}>
                  {t("pngInfoTitle")}
                </div>
                <ul>
                  <li>
                    <span>{t("detectedFrames")}:</span>
                    <span className="text-highlight">
                      {connectFrames.length > 0 ? connectFrames.length : (sourceImage ? gridCols * gridRows : 0)}
                    </span>
                  </li>
                  <li>
                    <span>{t("frameSize")}:</span>
                    <span>
                      {connectFrames.length > 0
                        ? `${connectFrames[0].img.naturalWidth}x${connectFrames[0].img.naturalHeight} px`
                        : sourceImage
                          ? `${Math.round(sourceImage.width / Math.max(1, gridCols))}x${Math.round(sourceImage.height / Math.max(1, gridRows))} px`
                          : "---"}
                    </span>
                  </li>
                </ul>
              </div>              {sourceImage && (
                <>
                  <div className="imgui-header">{t("gridTitleSource")}</div>
                  <div className="text-info" style={{ marginBottom: "4px" }}>
                    {t("gridSubtitleSource")}
                  </div>
                  <div className="control-group">
                    <span className="control-label">{t("colsX")}</span>
                    <input
                      type="number" min="1" value={gridCols}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setGridCols(val);
                        if (sourceImage) setTargetFrameWidth(Math.round(sourceImage.width / val));
                      }}
                    />
                  </div>
                  <div className="control-group" style={{ marginTop: "4px" }}>
                    <span className="control-label">{t("rowsY")}</span>
                    <input
                      type="number" min="1" value={gridRows}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setGridRows(val);
                        if (sourceImage) setTargetFrameHeight(Math.round(sourceImage.height / val));
                      }}
                    />
                  </div>
                  <div style={{ marginTop: "6px" }}>
                    <button
                      type="button" className="imgui-btn primary"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", width: "100%", padding: "6px", color: "#ffffff" }}
                      onClick={() => {
                        if (sourceImage) detectGridLayout(sourceImage);
                        else showStatus(t("statusSmartDetectNoImage"), true);
                      }}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: "14px", height: "14px" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      {t("btnSmartDetect")}
                    </button>
                  </div>
                </>
              )}

              <div className="imgui-header" style={{ marginTop: "6px" }}>{t("settingsTitle", { defaultValue: "Settings" })}</div>
              <div className="control-group">
                <span className="control-label">{t("delayMs")}</span>
                <input
                  type="number" min="10" max="5000" step="10" value={connectDelay}
                  onChange={(e) => setConnectDelay(Math.max(10, parseInt(e.target.value) || 100))}
                />
              </div>
              <div className="control-group" style={{ marginTop: "6px" }}>
                <span className="control-label">{t("framesLimit")}</span>
                <input
                  type="number" min="1" value={exportFrameCount}
                  onChange={(e) => setExportFrameCount(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>
          )}
        </div>
      )}      {appMode === "editing" && (
        <div id="panel-editing">          <div className="info-box" style={{ marginTop: "10px" }}>
            <ul>
              <li>
                <span>{t("editorFrameCount")}:</span>
                <span className="text-highlight">{editorFrames.length}</span>
              </li>
              {selectedFrameIds.size > 0 && (
                <li>
                  <span>Zaznaczone:</span>
                  <span className="text-highlight">{selectedFrameIds.size}</span>
                </li>
              )}
              <li>
                <span>Historia:</span>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>{historyStack.length} kroków</span>
              </li>
            </ul>
          </div>          <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
            <button
              className="imgui-btn"
              style={{ flex: 1, fontSize: "11px", gap: "8px" }}
              onClick={undoEditor}
              disabled={historyStack.length === 0}
              title="Ctrl+Z"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: "14px", height: "14px" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              {t("editorUndo")}
            </button>
            <button
              className="imgui-btn"
              style={{ flex: 1, fontSize: "11px", gap: "8px" }}
              onClick={redoEditor}
              disabled={futureStack.length === 0}
              title="Ctrl+Y"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: "14px", height: "14px" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
              {t("editorRedo")}
            </button>
          </div>          <div style={{ marginTop: "6px" }}>
            <button
              className="imgui-btn"
              style={{ 
                width: "100%", 
                gap: "8px",
                "--btn-bg": "rgba(224, 49, 49, 0.15)",
                "--border-color": "rgba(250, 82, 82, 0.4)",
                "--text-color": "#ff8787",
                "--btn-hover": "rgba(224, 49, 49, 0.3)",
                "--btn-active": "rgba(224, 49, 49, 0.4)"
              } as React.CSSProperties}
              onClick={deleteSelectedFrames}
              disabled={selectedFrameIds.size === 0}
              title="Delete"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: "14px", height: "14px" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {t("editorDeleteSelected")} {selectedFrameIds.size > 0 ? `(${selectedFrameIds.size})` : ""}
            </button>
          </div>

          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "4px", textAlign: "center" }}>
            {t("editorSelectHint")}
          </div>          {editorFrames.length > 0 && (
            <>
              <div className="imgui-header" style={{ marginTop: "10px" }}>
                {t("packageDivisionTitle")}
              </div>

              <div className="control-group">
                <span className="control-label">{t("framesPerFile")}</span>
                <input
                  type="number" min="1" value={chunkSize}
                  onChange={(e) => setChunkSize(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ color: "var(--accent)", fontWeight: "bold" }}
                />
              </div>

              <div className="control-group" style={{ marginTop: "6px" }}>
                <span className="control-label">{t("framesLimit")}</span>
                <input
                  type="number" min="1" value={exportFrameCount}
                  onChange={(e) => setExportFrameCount(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>

              <div style={{ marginTop: "10px" }}>
                <button
                  className="imgui-btn primary"
                  style={{ width: "100%", fontSize: "11px", padding: "8px" }}
                  onClick={handleEditorGenerateCut}
                  disabled={editorFrames.length === 0}
                >
                  {t("btnGeneratePackages")}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ flexGrow: 1 }}></div>      {generatedSlices.length > 0 && (
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="imgui-btn"
            onClick={handleExportAsGif}
            disabled={isExportingGif || isZipping}
            style={{ padding: "10px 15px", display: "flex", alignItems: "center", gap: "5px" }}
          >
            {isExportingGif ? t("exportingGif") : t("btnExportGif")}
          </button>
          <button
            id="download-all-btn"
            className="imgui-btn success"
            onClick={handleDownloadAllZip}
            disabled={isZipping || isExportingGif}
            style={{ padding: "10px" }}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: "16px", height: "16px" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
            </svg>
            {isZipping ? t("btnZipping") : t("btnExportAllZip")}
          </button>
        </div>
      )}      {appMode === "conversion" && conversionDir === "sprite2gif" && ((connectFrames && connectFrames.length > 0) || sourceImage) && (
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="imgui-btn primary"
            onClick={handleGenerateConnectGif}
            disabled={isExportingGif}
            style={{ padding: "10px 15px", display: "flex", alignItems: "center", gap: "5px", width: "100%", justifyContent: "center" }}
          >
            {isExportingGif ? t("exportingGif") : t("btnExportGif")}
          </button>
        </div>
      )}

      {status && (
        <div id="status-msg" className={status.isError ? "status-err" : "status-ok"}>
          {status.text}
        </div>
      )}
    </>
  );
}
