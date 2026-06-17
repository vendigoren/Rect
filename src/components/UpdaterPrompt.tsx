import React, { useState, useEffect } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useLanguage } from "../hooks/useLanguage";

export default function UpdaterPrompt({ manual = false }: { manual?: boolean }) {
  const [update, setUpdate] = useState<Update | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [noUpdateFound, setNoUpdateFound] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    async function checkForUpdates() {
      try {
        const _update = await check();
        if (_update) {
          setUpdate(_update);
        } else if (manual) {
          setNoUpdateFound(true);
        }
      } catch (err: any) {
        if (manual) setError(t("updaterFailedCheck"));
      }
    }
    checkForUpdates();
  }, [manual, t]);

  if (noUpdateFound && !hidden) {
    return (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)" }}>
        <div style={{ backgroundColor: "var(--bg-panel)", padding: "30px", borderRadius: "12px", width: "300px", border: "1px solid var(--border-color)", textAlign: "center", color: "var(--text-primary)" }}>
          <h2 style={{ margin: "0 0 10px", fontSize: "18px" }}>{t("updaterUpToDate")}</h2>
          <p style={{ margin: "0 0 20px", fontSize: "14px", color: "var(--text-secondary)" }}>{t("updaterLatestVersion")}</p>
          <button onClick={() => setHidden(true)} style={{ padding: "8px 20px", background: "var(--accent-color)", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}>{t("updaterClose")}</button>
        </div>
      </div>
    );
  }

  if (!update || hidden) return null;

  const handleUpdate = async () => {
    setIsUpdating(true);
    setError(null);
    try {
      let downloaded = 0;
      let contentLength = 0;
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case 'Finished':
            setProgress(100);
            break;
        }
      });
      await relaunch();
    } catch (err: any) {
      setError(t("updaterFailedInstall"));
      setIsUpdating(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999,
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        backgroundColor: "var(--bg-panel)",
        padding: "30px",
        borderRadius: "12px",
        width: "400px",
        border: "1px solid var(--border-color)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        color: "var(--text-primary)"
      }}>
        <h2 style={{ margin: 0, fontSize: "20px" }}>{t("updaterNewAvailable")}</h2>
        <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
          {t("updaterNewAvailableDesc", { version: update.version })}
        </p>
        
        {update.body && (
          <div style={{
            backgroundColor: "rgba(0,0,0,0.2)",
            padding: "10px",
            borderRadius: "6px",
            fontSize: "12px",
            maxHeight: "100px",
            overflowY: "auto"
          }}>
            {update.body}
          </div>
        )}

        {error && (
          <div style={{ color: "#ff4757", fontSize: "12px", padding: "8px", backgroundColor: "rgba(255,71,87,0.1)", borderRadius: "4px" }}>
            {error}
          </div>
        )}

        {isUpdating ? (
          <div>
            <div style={{ fontSize: "12px", marginBottom: "8px" }}>{t("updaterDownloading", { progress })}</div>
            <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", backgroundColor: "var(--accent-color)", transition: "width 0.2s" }} />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
            <button
              onClick={() => setHidden(true)}
              style={{
                flex: 1,
                padding: "10px",
                background: "transparent",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              {t("updaterSkip")}
            </button>
            <button
              onClick={handleUpdate}
              style={{
                flex: 1,
                padding: "10px",
                background: "var(--accent-color)",
                border: "none",
                color: "#fff",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              {t("updaterUpdateNow")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
