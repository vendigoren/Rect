"use client";

import React, { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import { GifReader } from "omggif";
import { GIFEncoder, quantize } from "gifenc";

import Sidebar from "../components/Sidebar";
import Toolbar from "../components/Toolbar";
import Workspace from "../components/Workspace";
import CustomSelect from "../components/CustomSelect";
import { AppState, AppActions } from "../types";
import { useLanguage } from "../hooks/useLanguage";
import { useTheme } from "../hooks/useTheme";
import UpdaterPrompt from "../components/UpdaterPrompt";


interface FileInfo {
  width: number;
  height: number;
  frames: number;
}

interface Slice {
  dataURL: string;
  filename: string;
  framesCount: number;
  w: number;
  h: number;
}

interface AnimationFrame {
  id: string;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  name?: string;
}

function detectGridFromImage(
  img: HTMLImageElement,
  fileNameHint?: string
): { cols: number; rows: number } | null {
  const W = img.width;
  const H = img.height;
  if (W === 0 || H === 0) return null;

  if (fileNameHint) {
    const fMatch = fileNameHint.match(/\((\d+)f\)/i);
    if (fMatch) {
      const frameCount = parseInt(fMatch[1]);
      if (frameCount > 1) {
        let bestCols = frameCount;
        let bestRows = 1;
        let bestAspect = Infinity;
        for (let c = 1; c <= frameCount; c++) {
          if (frameCount % c !== 0) continue;
          const r = frameCount / c;
          if (W % c !== 0 || H % r !== 0) continue;
          const fw = W / c;
          const fh = H / r;
          if (fw < 8 || fh < 8) continue;
          const aspect = Math.abs(Math.log(fw / fh));
          if (aspect < bestAspect) {
            bestAspect = aspect;
            bestCols = c;
            bestRows = r;
          }
        }
        if (bestCols * bestRows === frameCount) {
          return { cols: bestCols, rows: bestRows };
        }
      }
    }

    const nmMatch = fileNameHint.match(/(\d{1,3})\s*[xX×]\s*(\d{1,3})/);
    if (nmMatch) {
      const c = parseInt(nmMatch[1]);
      const r = parseInt(nmMatch[2]);
      const fw = W / c;
      const fh = H / r;
      if (c >= 1 && r >= 1 && fw >= 16 && fh >= 16 && W % c === 0 && H % r === 0) {
        return { cols: c, rows: r };
      }
    }
  }

  try {
    const tempC = document.createElement("canvas");
    tempC.width = W;
    tempC.height = H;
    const tempCtx = tempC.getContext("2d");
    if (tempCtx) {
      tempCtx.drawImage(img, 0, 0);
      const d = tempCtx.getImageData(0, 0, W, H).data;
      if (W >= 3 && d.length >= 12 &&
          d[0] === 82 && d[1] === 69 && d[2] === 67 && d[3] === 255 &&
          d[4] === 84 && d[7] === 255 &&
          d[8] === 71 && d[11] === 255) {
        const c = d[5] + d[6] * 256;
        const r = d[9] + d[10] * 256;
        if (c >= 1 && r >= 1 && W % c === 0 && H % r === 0 && c * r > 1) {
          return { cols: c, rows: r };
        }
      }
    }
  } catch (_) {}

  return null;
}

export default function Home() {
  const [appMode, setAppMode] = useState<"conversion" | "editing">("conversion");
  const [conversionDir, setConversionDir] = useState<"gif2sprite" | "sprite2gif">("gif2sprite");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);

  const [connectFrames, setConnectFrames] = useState<{ file: File, img: HTMLImageElement, name: string }[]>([]);
  const [connectDelay, setConnectDelay] = useState(100);
  const [exportFrameCount, setExportFrameCount] = useState(30);

  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [gifFrames, setGifFrames] = useState<HTMLCanvasElement[]>([]);
  const [generatedSlices, setGeneratedSlices] = useState<Slice[]>([]);

  const [gifCols, setGifCols] = useState<number>(8);
  const [autoGifCols, setAutoGifCols] = useState<boolean>(true);

  const [gridCols, setGridCols] = useState<number>(10);
  const [gridRows, setGridRows] = useState<number>(5);
  const [chunkSize, setChunkSize] = useState<number>(20);
  const [gifFrameWidth, setGifFrameWidth] = useState<number>(0);
  const [gifFrameHeight, setGifFrameHeight] = useState<number>(0);
  const [targetFrameWidth, setTargetFrameWidth] = useState<number>(0);
  const [targetFrameHeight, setTargetFrameHeight] = useState<number>(0);

  const [editorFrames, setEditorFrames] = useState<AnimationFrame[]>([]);
  const [selectedFrameIds, setSelectedFrameIds] = useState<Set<string>>(new Set());
  const [historyStack, setHistoryStack] = useState<AnimationFrame[][]>([]);
  const [futureStack, setFutureStack] = useState<AnimationFrame[][]>([]);
  const [draggedFrameId, setDraggedFrameId] = useState<string | null>(null);
  const dragHoverIndexRef = useRef<number | null>(null);
  const isActuallyDraggingRef = useRef<boolean>(false);

  const [manualCheckTrigger, setManualCheckTrigger] = useState<number>(0);

  const [tab, setTab] = useState<"preview" | "results">("preview");

  useEffect(() => {
    if (appMode === "editing" && editorFrames.length > 0) {
      setExportFrameCount(prev => prev > editorFrames.length ? editorFrames.length : prev);
      setChunkSize(prev => prev > editorFrames.length ? editorFrames.length : prev);
    }
  }, [editorFrames.length, appMode]);

  const [status, setStatus] = useState<{ text: string; isError: boolean } | null>(null);

  const { language, changeLanguage, t } = useLanguage();
  const { theme, changeTheme } = useTheme();
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const transformRef = useRef({ scale: 1, x: 0, y: 0 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const updateTransformStyle = () => {
    const container = canvasContainerRef.current;
    if (container) {
      container.style.transform = `translate(${transformRef.current.x}px, ${transformRef.current.y}px) scale(${transformRef.current.scale})`;
    }
  };

  const stateRefs = useRef({ editorFrames, selectedFrameIds, draggedFrameId });
  useEffect(() => {
    stateRefs.current = { editorFrames, selectedFrameIds, draggedFrameId };
  }, [editorFrames, selectedFrameIds, draggedFrameId]);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const clickStartRef = useRef({ x: 0, y: 0 });
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const animatedPositionsRef = useRef<Record<string, { x: number; y: number; selectionProgress?: number }>>({});
  const animationFrameRef = useRef<number | null>(null);

  const showStatus = (text: string, isError = false) => {
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
    setStatus({ text, isError });
    statusTimeoutRef.current = setTimeout(() => {
      setStatus(null);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, []);

  const handleSwitchMode = (mode: "conversion" | "editing") => {
    if (appMode === mode) return;
    setAppMode(mode);
    setFile(null);
    setFileName("");
    setFileInfo(null);
    setSourceImage(null);
    setGifFrames([]);
    setGeneratedSlices([]);
    setConnectFrames([]);
    setEditorFrames([]);
    setSelectedFrameIds(new Set());
    setHistoryStack([]);
    setFutureStack([]);
    setTab("preview");
    showStatus(t("statusModeSwitched", { mode: mode === "conversion" ? t("tabSpritesheet") : t("tabCutter") }));
    transformRef.current = { scale: 1, x: 0, y: 0 };
    updateTransformStyle();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSwitchConversionDir = (dir: "gif2sprite" | "sprite2gif") => {
    if (conversionDir === dir) return;
    setConversionDir(dir);
    setFile(null);
    setFileName("");
    setFileInfo(null);
    setSourceImage(null);
    setGifFrames([]);
    setGeneratedSlices([]);
    setConnectFrames([]);
    setEditorFrames([]);
    setSelectedFrameIds(new Set());
    setHistoryStack([]);
    setFutureStack([]);
    setTab("preview");
    transformRef.current = { scale: 1, x: 0, y: 0 };
    updateTransformStyle();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const centerCanvas = (imgW: number, imgH: number) => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const containerW = workspace.clientWidth;
    const containerH = workspace.clientHeight;

    let scale = Math.min((containerW * 0.9) / imgW, (containerH * 0.9) / imgH);
    if (scale > 1) scale = 1;

    const x = (containerW - imgW * scale) / 2;
    const y = (containerH - imgH * scale) / 2;

    transformRef.current = { scale, x, y };
    updateTransformStyle();
  };

  useEffect(() => {
    if (appMode === "editing" && sourceImage) {
      setFileInfo({
        width: sourceImage.width,
        height: sourceImage.height,
        frames: Math.max(1, gridCols) * Math.max(1, gridRows)
      });
    }
  }, [gridCols, gridRows, appMode, sourceImage]);

  useEffect(() => {
    if (appMode === "conversion" && conversionDir === "gif2sprite" && fileInfo && autoGifCols) {
      const calculatedCols = Math.ceil(Math.sqrt(fileInfo.frames));
      setGifCols(calculatedCols);
    }
  }, [fileInfo, autoGifCols, appMode, conversionDir]);

  const handleLoadFile = async (loadedFile: File) => {
    setFile(loadedFile);
    setFileName(loadedFile.name);
    setGeneratedSlices([]);
    setTab("preview");

    if (appMode === "conversion" && conversionDir === "gif2sprite") {
      try {
        const arrayBuffer = await loadedFile.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        const gr = new GifReader(uint8);
        const framesCount = gr.numFrames();
        const w = gr.width;
        const h = gr.height;

        setFileInfo({ width: w, height: h, frames: framesCount });
        setGifFrameWidth(w);
        setGifFrameHeight(h);

        const framesList: HTMLCanvasElement[] = [];
        const frameData = new Uint8ClampedArray(w * h * 4);

        for (let i = 0; i < framesCount; i++) {
          gr.decodeAndBlitFrameRGBA(i, frameData);
          const imgData = new ImageData(frameData, w, h);

          const tempC = document.createElement("canvas");
          tempC.width = w;
          tempC.height = h;
          const tempCtx = tempC.getContext("2d");
          if (tempCtx) {
            tempCtx.putImageData(imgData, 0, 0);
            framesList.push(tempC);
          }
        }

        setGifFrames(framesList);
        setSourceImage(null);

        const calculatedCols = autoGifCols ? Math.ceil(Math.sqrt(framesCount)) : gifCols;
        const targetW = calculatedCols * w;
        const targetH = Math.ceil(framesCount / calculatedCols) * h;
        centerCanvas(targetW, targetH);

        showStatus(t("statusSuccessGifLoad"));
      } catch (err) {
        showStatus(t("statusErrorGifLoad"), true);
        console.error(err);
      }
    } else if (appMode === "editing") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          setSourceImage(img);
          setGifFrames([]);
          showStatus(t("statusSuccessImgLoad"));
          const grid = detectGridFromImage(img, loadedFile.name);
          const gc = grid ? grid.cols : 1;
          const gr = grid ? grid.rows : 1;
          setGridCols(gc);
          setGridRows(gr);
          const fw = Math.floor(img.width / gc);
          const fh = Math.floor(img.height / gr);
          const frames: AnimationFrame[] = [];
          for (let r = 0; r < gr; r++) {
            for (let c = 0; c < gc; c++) {
              const cv = document.createElement("canvas");
              cv.width = fw;
              cv.height = fh;
              const ctx2 = cv.getContext("2d")!;
              ctx2.clearRect(0, 0, fw, fh);
              ctx2.drawImage(img, c * fw, r * fh, fw, fh, 0, 0, fw, fh);
              frames.push({ id: crypto.randomUUID(), canvas: cv, width: fw, height: fh });
            }
          }
          setEditorFrames(frames);
          setSelectedFrameIds(new Set());
          setHistoryStack([]);
          setFutureStack([]);
          setExportFrameCount(frames.length);
          setChunkSize(frames.length);
          const cols2 = Math.ceil(Math.sqrt(frames.length));
          setTimeout(() => centerCanvas(cols2 * fw, Math.ceil(frames.length / cols2) * fh), 80);
          showStatus(t("statusEditorLoaded", { count: frames.length }));
        };
        img.onerror = () => showStatus(t("statusErrorImgLoad"), true);
        if (ev.target?.result) img.src = ev.target.result as string;
      };
      reader.readAsDataURL(loadedFile);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          setSourceImage(img);
          setGifFrames([]);
          centerCanvas(img.width, img.height);
          showStatus(t("statusSuccessImgLoad"));
          setTimeout(() => {
            detectGridLayout(img, loadedFile.name);
          }, 50);
        };
        img.onerror = () => {
          showStatus(t("statusErrorImgLoad"), true);
        };
        if (ev.target?.result) {
          img.src = ev.target.result as string;
        }
      };
      reader.readAsDataURL(loadedFile);
    }
  };

  const detectGridLayout = (img: HTMLImageElement, fileNameOverride?: string) => {
    if (!img) return;
    try {
      const W = img.width;
      const H = img.height;
      const effectiveFileName = fileNameOverride !== undefined ? fileNameOverride : fileName;

      if (effectiveFileName) {
        const match = effectiveFileName.match(/(\d{1,3})\s*[xX×]\s*(\d{1,3})/);
        if (match) {
          const parsedCols = parseInt(match[1]);
          const parsedRows = parseInt(match[2]);

          const fw = W / parsedCols;
          const fh = H / parsedRows;
          if (parsedCols >= 1 && parsedRows >= 1 && fw >= 16 && fh >= 16) {
            setGridCols(parsedCols);
            setGridRows(parsedRows);
            setTargetFrameWidth(Math.round(fw));
            setTargetFrameHeight(Math.round(fh));
            const totalF = parsedCols * parsedRows;
            setChunkSize(totalF <= 20 ? totalF : parsedCols);
            setExportFrameCount(totalF);
            showStatus(t("statusSmartDetectSuccess", { cols: parsedCols, rows: parsedRows }));
            return;
          }
        }
      }

      const tempC = document.createElement("canvas");
      tempC.width = W;
      tempC.height = H;
      const tempCtx = tempC.getContext("2d");
      if (!tempCtx) return;
      tempCtx.drawImage(img, 0, 0);

      const imgData = tempCtx.getImageData(0, 0, W, H);
      const data = imgData.data;

      if (W >= 3 && H >= 1 && data.length >= 12) {
        if (data[0] === 82 && data[1] === 69 && data[2] === 67 && data[3] === 255 &&
            data[4] === 84 && data[7] === 255 &&
            data[8] === 71 && data[11] === 255) {

          const parsedCols = data[5] + data[6] * 256;
          const parsedRows = data[9] + data[10] * 256;
          const fw = W / parsedCols;
          const fh = H / parsedRows;

          if (parsedCols >= 1 && parsedRows >= 1 && fw >= 1 && fh >= 1 && W % parsedCols === 0 && H % parsedRows === 0) {
            setGridCols(parsedCols);
            setGridRows(parsedRows);
            setTargetFrameWidth(Math.round(fw));
            setTargetFrameHeight(Math.round(fh));
            const totalF = parsedCols * parsedRows;
            setChunkSize(totalF <= 20 ? totalF : parsedCols);
            setExportFrameCount(totalF);
            showStatus(t("statusSmartDetectSuccess", { cols: parsedCols, rows: parsedRows }));
            return;
          }
        }
      }

      let hasAlpha = false;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          hasAlpha = true;
          break;
        }
      }

      const r0 = data[0];
      const g0 = data[1];
      const b0 = data[2];

      const isBgPixel = (idx: number) => {
        if (hasAlpha) {
          return data[idx + 3] < 10;
        } else {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          return Math.abs(r - r0) < 15 && Math.abs(g - g0) < 15 && Math.abs(b - b0) < 15;
        }
      };

      const emptyCols = new Array(W).fill(true);
      for (let x = 0; x < W; x++) {
        for (let y = 0; y < H; y++) {
          const idx = (y * W + x) * 4;
          if (!isBgPixel(idx)) { emptyCols[x] = false; break; }
        }
      }

      const emptyRows = new Array(H).fill(true);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const idx = (y * W + x) * 4;
          if (!isBgPixel(idx)) { emptyRows[y] = false; break; }
        }
      }

      const findGapPositions = (emptyArr: boolean[], total: number): number[] => {
        const gaps: number[] = [];
        let i = 1; 
        while (i < total - 1) {
          if (emptyArr[i]) {

            let start = i;
            while (i < total - 1 && emptyArr[i]) i++;
            gaps.push(Math.floor((start + i) / 2));
          } else {
            i++;
          }
        }
        return gaps;
      };

      const colGaps = findGapPositions(emptyCols, W);
      const rowGaps = findGapPositions(emptyRows, H);

      const findEvenSpacing = (gaps: number[], total: number): number => {
        if (gaps.length === 0) return 1;

        for (let n = gaps.length + 1; n >= 2; n--) {
          const expectedStep = total / n;
          if (expectedStep < 16) continue;
          let matched = 0;
          for (let i = 1; i < n; i++) {
            const expectedPos = Math.round(i * expectedStep);

            const tolerance = Math.max(3, Math.floor(expectedStep * 0.05));
            if (gaps.some(g => Math.abs(g - expectedPos) <= tolerance)) {
              matched++;
            }
          }

          if (matched >= (n - 1) * 0.7) {
            return n;
          }
        }
        return 1;
      };

      const gapCols = findEvenSpacing(colGaps, W);
      const gapRows = findEvenSpacing(rowGaps, H);

      if (gapCols > 1 || gapRows > 1) {
        const bestCols = Math.max(1, gapCols);
        const bestRows = Math.max(1, gapRows);
        setGridCols(bestCols);
        setGridRows(bestRows);
        setTargetFrameWidth(Math.round(W / bestCols));
        setTargetFrameHeight(Math.round(H / bestRows));
        const totalF = bestCols * bestRows;
        setChunkSize(totalF <= 20 ? totalF : bestCols);
        setExportFrameCount(totalF);
        showStatus(t("statusSmartDetectSuccess", { cols: bestCols, rows: bestRows }));
        return;
      }

      let bestCols = 1;
      let bestRows = 1;
      let bestFallbackScore = -Infinity;

      const maxDiv = 30;
      for (let c = 1; c <= Math.min(maxDiv, W); c++) {
        if (W % c !== 0) continue;
        const cellW = W / c;
        if (cellW < 32) continue; 

        for (let r = 1; r <= Math.min(maxDiv, H); r++) {
          if (H % r !== 0) continue;
          const cellH = H / r;
          if (cellH < 32) continue; 

          const aspect = Math.max(cellW / cellH, cellH / cellW);
          const aspectPenalty = -(aspect - 1) * 2; 

          const totalFrames = c * r;
          let countBonus = 0;
          if (totalFrames >= 4 && totalFrames <= 100) countBonus = 1;
          else if (totalFrames >= 2 && totalFrames <= 200) countBonus = 0.5;
          else countBonus = -1;

          const sizeBonus = Math.log2(cellW * cellH) * 0.1;

          let stdBonus = 0;
          if (cellW % 16 === 0 && cellH % 16 === 0) stdBonus += 0.2;
          if (cellW === cellH) stdBonus += 0.5; 

          const score = aspectPenalty + countBonus + sizeBonus + stdBonus;

          if (score > bestFallbackScore) {
            bestFallbackScore = score;
            bestCols = c;
            bestRows = r;
          }
        }
      }

      setGridCols(bestCols);
      setGridRows(bestRows);
      setTargetFrameWidth(Math.round(W / bestCols));
      setTargetFrameHeight(Math.round(H / bestRows));

      const totalF = bestCols * bestRows;
      if (totalF <= 20) {
        setChunkSize(totalF);
      } else {
        setChunkSize(bestCols);
      }
      setExportFrameCount(totalF);

      showStatus(t("statusSmartDetectSuccess", { cols: bestCols, rows: bestRows }));
    } catch (e) {
      console.error("Smart detect failed:", e);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (appMode === "conversion" && conversionDir === "sprite2gif") {
      const selectedFiles = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
      if (selectedFiles.length === 1) {
        await handleLoadFile(selectedFiles[0]);
      } else if (selectedFiles.length > 1) {
        await handleLoadConnectFiles(selectedFiles);
      }
    } else {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        await handleLoadFile(selectedFile);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleLoadConnectFiles = async (files: File[]) => {
    const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    
    const loadedFrames: { file: File, img: HTMLImageElement, name: string }[] = [];
    let sheetsDetected = 0;

    for (const file of sortedFiles) {
      try {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const grid = detectGridFromImage(img, file.name);

        if (grid && (grid.cols > 1 || grid.rows > 1)) {
          sheetsDetected++;
          const fw = Math.floor(img.width / grid.cols);
          const fh = Math.floor(img.height / grid.rows);

          for (let row = 0; row < grid.rows; row++) {
            for (let col = 0; col < grid.cols; col++) {
              const frameCanvas = document.createElement("canvas");
              frameCanvas.width = fw;
              frameCanvas.height = fh;
              const ctx = frameCanvas.getContext("2d");
              if (ctx) {
                ctx.clearRect(0, 0, fw, fh);
                ctx.drawImage(img, col * fw, row * fh, fw, fh, 0, 0, fw, fh);
              }
              const frameImg = new Image();
              frameImg.src = frameCanvas.toDataURL("image/png");
              await new Promise<void>(res => { frameImg.onload = () => res(); });
              loadedFrames.push({
                file,
                img: frameImg,
                name: `${file.name}_f${row * grid.cols + col + 1}`
              });
            }
          }
        } else {
          loadedFrames.push({ file, img, name: file.name });
        }
      } catch (err) {
        console.error("Failed to load file", file.name, err);
      }
    }
    
    setConnectFrames(loadedFrames);
    setExportFrameCount(loadedFrames.length);
    const label = sheetsDetected > 0
      ? `${loadedFrames.length} ${t("framesFromSheets", { sheets: sheetsDetected })}`
      : `${loadedFrames.length} frames loaded`;
    setFileName(label);
    showStatus(t("statusSuccessConnectLoaded", { count: loadedFrames.length }));

    if (loadedFrames.length > 0) {
      const fw = loadedFrames[0].img.naturalWidth;
      const fh = loadedFrames[0].img.naturalHeight;
      const total = loadedFrames.length;
      const cols = Math.ceil(Math.sqrt(total));
      const rows = Math.ceil(total / cols);
      setTimeout(() => centerCanvas(cols * fw, rows * fh), 50);
    }
  };

  useEffect(() => {
    const preventGlobal = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", preventGlobal);
    window.addEventListener("drop", preventGlobal);
    return () => {
      window.removeEventListener("dragover", preventGlobal);
      window.removeEventListener("drop", preventGlobal);
    };
  }, []);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (appMode === "conversion" && conversionDir === "sprite2gif") {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
      if (droppedFiles.length === 1) {
        await handleLoadFile(droppedFiles[0]);
      } else if (droppedFiles.length > 1) {
        await handleLoadConnectFiles(droppedFiles);
      }
    } else {
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        await handleLoadFile(droppedFile);
      }
    }
  };

  const pushHistory = (frames: AnimationFrame[]) => {
    setHistoryStack(prev => [...prev.slice(-50), frames]);
    setFutureStack([]);
  };

  const undoEditor = () => {
    setHistoryStack(prev => {
      if (prev.length === 0) return prev;
      const stack = [...prev];
      const prevState = stack.pop()!;
      setFutureStack(f => [editorFrames, ...f.slice(0, 49)]);
      setEditorFrames(prevState);
      return stack;
    });
  };

  const redoEditor = () => {
    setFutureStack(prev => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      setHistoryStack(h => [...h, editorFrames]);
      setEditorFrames(next);
      return rest;
    });
  };

  const toggleSelectFrame = (id: string, multi: boolean) => {
    setSelectedFrameIds(prev => {
      const next = new Set(multi ? prev : [] as string[]);
      if (prev.has(id) && multi) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelectedFrames = () => {
    if (selectedFrameIds.size === 0) return;
    pushHistory(editorFrames);
    setEditorFrames(prev => prev.filter(f => !selectedFrameIds.has(f.id)));
    setSelectedFrameIds(new Set());
  };


  const reorderFrame = (id: string, newIndex: number) => {
    setEditorFrames(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if (idx === -1 || idx === newIndex) return prev;
      pushHistory(prev);
      const frames = [...prev];
      const [moved] = frames.splice(idx, 1);
      
      let targetIndex = newIndex;
      frames.splice(targetIndex, 0, moved);
      return frames;
    });
  };



  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (appMode !== "editing") return;
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); undoEditor(); }
      if (e.ctrlKey && e.key === "y") { e.preventDefault(); redoEditor(); }
      if (e.key === "Delete" && selectedFrameIds.size > 0) { e.preventDefault(); deleteSelectedFrames(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [appMode, editorFrames, historyStack, futureStack, selectedFrameIds]);

  const handleEditorExportGif = async () => {
    if (editorFrames.length === 0) return;
    setIsExportingGif(true);
    try {
      const gif = GIFEncoder();
      const framesToExport = editorFrames.slice(0, exportFrameCount);
      for (const frame of framesToExport) {
        const ctx2 = frame.canvas.getContext("2d", { willReadFrequently: true })!;
        const { data } = ctx2.getImageData(0, 0, frame.width, frame.height);
        const { index, palette } = encodeFrameToGif(data, frame.width, frame.height);
        gif.writeFrame(index, frame.width, frame.height, { palette, delay: connectDelay, transparent: true, transparentIndex: 0 });
      }
      gif.finish();
      const bytes = gif.bytesView();
      const blob = new Blob([bytes], { type: "image/gif" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rect_edited.gif";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showStatus(t("statusExportSuccess"));
    } catch (err) {
      showStatus(t("statusExportError"), true);
      console.error(err);
    } finally {
      setIsExportingGif(false);
    }
  };

  const handleEditorGenerateCut = () => {
    if (editorFrames.length === 0) return;
    const fw = editorFrames[0].width;
    const fh = editorFrames[0].height;
    const size = Math.max(1, chunkSize);
    const slices: Slice[] = [];
    for (let i = 0; i < editorFrames.length; i += size) {
      const chunk = editorFrames.slice(i, i + size);
      const cols2 = Math.min(chunk.length, Math.max(1, gridCols));
      const rows2 = Math.ceil(chunk.length / cols2);
      const packCanvas = document.createElement("canvas");
      packCanvas.width = cols2 * fw;
      packCanvas.height = rows2 * fh;
      const pctx = packCanvas.getContext("2d")!;
      pctx.clearRect(0, 0, packCanvas.width, packCanvas.height);
      for (let j = 0; j < chunk.length; j++) {
        const col2 = j % cols2;
        const row2 = Math.floor(j / cols2);
        pctx.drawImage(chunk[j].canvas, col2 * fw, row2 * fh, fw, fh);
      }
      const ci = Math.floor(i / size);
      slices.push({
        dataURL: packCanvas.toDataURL("image/png"),
        filename: `pack_${ci + 1}_(${chunk.length}f).png`,
        framesCount: chunk.length,
        w: packCanvas.width,
        h: packCanvas.height
      });
    }
    setGeneratedSlices(slices);
    setTab("results");
    showStatus(t("statusSuccessGenerated", { count: slices.length }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    if (appMode === "conversion" && conversionDir === "gif2sprite") {
      if (gifFrames.length === 0 || !fileInfo) return;
      const w = fileInfo.width;
      const h = fileInfo.height;
      const cols = Math.max(1, gifCols);
      const rows = Math.ceil(gifFrames.length / cols);

      canvas.width = cols * w;
      canvas.height = rows * h;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      gifFrames.forEach((frame, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const x = c * w;
        const y = r * h;
        ctx.drawImage(frame, x, y);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        const fontSize = Math.max(10, Math.floor(h / 5));
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = Math.max(2, Math.floor(fontSize / 6));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.strokeText((idx + 1).toString(), x + 4, y + fontSize + 4);
        ctx.fillText((idx + 1).toString(), x + 4, y + fontSize + 4);
      });
    } else if (appMode === "conversion" && conversionDir === "sprite2gif" && sourceImage) {
      const w = sourceImage.width;
      const h = sourceImage.height;
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(sourceImage, 0, 0);
      const cols = Math.max(1, gridCols);
      const rows = Math.max(1, gridRows);
      const fw = w / cols;
      const fh = h / rows;
      if (fw <= 0 || fh <= 0) return;
      ctx.lineWidth = 1;
      let frameIndex = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * fw;
          const y = r * fh;
          if (frameIndex >= exportFrameCount) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(x, y, fw, fh);
          }
          ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, fw, fh);
          const fontSize = Math.max(10, Math.floor(fh / 5));
          ctx.fillStyle = "white";
          ctx.strokeStyle = "black";
          ctx.lineWidth = Math.max(2, Math.floor(fontSize / 6));
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.strokeText((frameIndex + 1).toString(), x + 4, y + fontSize + 4);
          ctx.fillText((frameIndex + 1).toString(), x + 4, y + fontSize + 4);
          frameIndex++;
        }
      }
    } else if (appMode === "conversion" && conversionDir === "sprite2gif" && connectFrames.length > 0) {
      const fw = connectFrames[0].img.naturalWidth;
      const fh = connectFrames[0].img.naturalHeight;
      const total = connectFrames.length;
      const cols = Math.ceil(Math.sqrt(total));
      const rows = Math.ceil(total / cols);
      canvas.width = cols * fw;
      canvas.height = rows * fh;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < total; i++) {
        const frame = connectFrames[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * fw;
        const y = row * fh;
        ctx.drawImage(frame.img, x, y, fw, fh);
        if (i >= exportFrameCount) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(x, y, fw, fh);
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, fw, fh);
        const fontSize = Math.max(10, Math.floor(Math.min(fw, fh) / 5));
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = Math.max(2, Math.floor(fontSize / 6));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.strokeText((i + 1).toString(), x + 4, y + fontSize + 4);
        ctx.fillText((i + 1).toString(), x + 4, y + fontSize + 4);
      }
    } else if (appMode === "editing") {
      if (editorFrames.length === 0) return;
      const fw = editorFrames[0].width;
      const fh = editorFrames[0].height;
      const total = editorFrames.length;
      const cols = Math.ceil(Math.sqrt(total));
      const rows = Math.ceil(total / cols);
      canvas.width = cols * fw;
      canvas.height = rows * fh;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const drawFrame = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const { editorFrames: currentEditorFrames, selectedFrameIds: currentSelectedFrameIds, draggedFrameId: currentDraggedFrameId } = stateRefs.current;

        let renderFrames = [...currentEditorFrames];
        let currentHoverIndex = dragHoverIndexRef.current;
        if (currentDraggedFrameId && currentHoverIndex !== null && isActuallyDraggingRef.current) {
          const draggedIdx = renderFrames.findIndex(f => f.id === currentDraggedFrameId);
          if (draggedIdx !== -1) {
            renderFrames.splice(draggedIdx, 1);
            let targetIndex = currentHoverIndex;
            renderFrames.splice(targetIndex, 0, { id: "PLACEHOLDER", placeholder: true } as any);
          }
        }

        const currentTotal = renderFrames.length;
        const targets: Record<string, {x: number, y: number, frame: any, placeholder?: boolean}> = {};
        for (let i = 0; i < currentTotal; i++) {
          const frame = renderFrames[i];
          const col = i % cols;
          const row = Math.floor(i / cols);
          targets[frame.id] = {
            x: col * fw,
            y: row * fh,
            frame: frame,
            placeholder: (frame as any).placeholder
          };
        }

        Object.keys(targets).forEach(id => {
          if (!animatedPositionsRef.current[id]) {
            animatedPositionsRef.current[id] = { x: targets[id].x, y: targets[id].y };
          }
        });
        
        Object.keys(animatedPositionsRef.current).forEach(id => {
          if (!targets[id]) delete animatedPositionsRef.current[id];
        });

        Object.keys(targets).forEach(id => {
          const target = targets[id];
          const current = animatedPositionsRef.current[id];
          
          const dx = target.x - current.x;
          const dy = target.y - current.y;
          
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            current.x += dx * 0.12;
            current.y += dy * 0.12;
          } else {
            current.x = target.x;
            current.y = target.y;
          }

          const targetSelected = currentSelectedFrameIds.has(id) ? 1 : 0;
          if (current.selectionProgress === undefined) {
            current.selectionProgress = targetSelected;
          }
          const dProgress = targetSelected - current.selectionProgress;
          if (Math.abs(dProgress) > 0.02) {
            current.selectionProgress += dProgress * 0.25;
          } else {
            current.selectionProgress = targetSelected;
          }
          const p = current.selectionProgress;

          const { x, y } = current;

          if (target.placeholder || (id === currentDraggedFrameId && isActuallyDraggingRef.current)) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(x, y, fw, fh);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            ctx.strokeRect(x, y, fw, fh);
          } else {
            ctx.drawImage(target.frame.canvas, x, y, fw, fh);
            
            const themeColors: Record<string, { fill: string, stroke: string, text: string }> = {
              azure: { fill: "rgba(0, 136, 204, 0.25)", stroke: "rgba(0, 136, 204, 1)", text: "#88ccff" },
              pearl: { fill: "rgba(226, 232, 240, 0.25)", stroke: "rgba(226, 232, 240, 1)", text: "#e2e8f0" },
              lavender: { fill: "rgba(155, 89, 182, 0.25)", stroke: "rgba(155, 89, 182, 1)", text: "#d7bde2" }
            };
            const colors = themeColors[theme] || themeColors.azure;

            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, fw, fh);

            if (p > 0) {
              ctx.globalAlpha = p;
              ctx.fillStyle = colors.fill;
              ctx.fillRect(x, y, fw, fh);
              ctx.strokeStyle = colors.stroke;
              ctx.lineWidth = 3;
              ctx.strokeRect(x + 1.5, y + 1.5, fw - 3, fh - 3);
              ctx.globalAlpha = 1;
            }
            
            const fontSize = Math.max(10, Math.floor(Math.min(fw, fh) / 5));
            ctx.strokeStyle = "black";
            ctx.lineWidth = Math.max(2, Math.floor(fontSize / 6));
            ctx.font = `bold ${fontSize}px sans-serif`;
            
            const displayIdx = renderFrames.findIndex(f => f.id === id) + 1;
            const txt = displayIdx.toString();
            const tx = x + 4;
            const ty = y + fontSize + 4;

            ctx.fillStyle = "white";
            ctx.strokeText(txt, tx, ty);
            ctx.fillText(txt, tx, ty);

            if (p > 0) {
              ctx.globalAlpha = p;
              ctx.fillStyle = colors.text;
              ctx.fillText(txt, tx, ty);
              ctx.globalAlpha = 1;
            }
          }
        });

        if (appMode === "editing") {
          animationFrameRef.current = requestAnimationFrame(drawFrame);
        }
      };

      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(drawFrame);

      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
    }
  }, [appMode, conversionDir, gifFrames, sourceImage, gridCols, gridRows, chunkSize, fileInfo, gifCols, connectFrames, exportFrameCount, theme, editorFrames.length]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const handleWheel = (e: WheelEvent) => {
      if (!sourceImage && gifFrames.length === 0 && connectFrames.length === 0 && editorFrames.length === 0) return;
      e.preventDefault();

      const zoomSensitivity = 0.001;
      const delta = e.deltaY * zoomSensitivity;

      const prev = transformRef.current;
      let newScale = prev.scale * (1 - delta);
      if (newScale < 0.05) newScale = 0.05;
      if (newScale > 10) newScale = 10;

      const rect = workspace.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newX = mouseX - (mouseX - prev.x) * (newScale / prev.scale);
      const newY = mouseY - (mouseY - prev.y) * (newScale / prev.scale);

      transformRef.current = { scale: newScale, x: newX, y: newY };
      updateTransformStyle();
    };

    workspace.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      workspace.removeEventListener("wheel", handleWheel);
    };
  }, [sourceImage, gifFrames, connectFrames, editorFrames]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sourceImage && gifFrames.length === 0 && connectFrames.length === 0 && editorFrames.length === 0) return;
    
    if (appMode === "editing" && editorFrames.length > 0 && e.target === canvasRef.current) {
      const workspace = workspaceRef.current;
      if (workspace) {
        const transform = transformRef.current;
        const rect = workspace.getBoundingClientRect();
        const canvasX = (e.clientX - rect.left - transform.x) / transform.scale;
        const canvasY = (e.clientY - rect.top - transform.y) / transform.scale;
        const fw = editorFrames[0].width;
        const fh = editorFrames[0].height;
        const cols = Math.ceil(Math.sqrt(editorFrames.length));
        const col = Math.floor(canvasX / fw);
        const row = Math.floor(canvasY / fh);
        if (col >= 0 && row >= 0 && col < cols) {
          const idx = row * cols + col;
          if (idx >= 0 && idx < editorFrames.length) {
            const frameX = col * fw;
            const frameY = row * fh;
            dragOffsetRef.current = { x: canvasX - frameX, y: canvasY - frameY };
            clickStartRef.current = { x: e.clientX, y: e.clientY };

            isActuallyDraggingRef.current = false;
            setDraggedFrameId(editorFrames[idx].id);
            dragHoverIndexRef.current = idx;
            return;
          }
        }
      }
    }

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - transformRef.current.x,
      y: e.clientY - transformRef.current.y
    };
  };

  useEffect(() => {
    if (draggedFrameId) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const workspace = workspaceRef.current;
        if (!workspace) return;
        const transform = transformRef.current;
        const rect = workspace.getBoundingClientRect();
        const canvasX = (e.clientX - rect.left - transform.x) / transform.scale;
        const canvasY = (e.clientY - rect.top - transform.y) / transform.scale;
        const fw = editorFrames[0].width;
        const fh = editorFrames[0].height;
        const cols = Math.ceil(Math.sqrt(editorFrames.length));
        
        const dx = e.clientX - clickStartRef.current.x;
        const dy = e.clientY - clickStartRef.current.y;
        
        if (!isActuallyDraggingRef.current && Math.hypot(dx, dy) > 5) {
          isActuallyDraggingRef.current = true;
        }

        if (!isActuallyDraggingRef.current) return;

        const draggedCenterX = canvasX - dragOffsetRef.current.x + fw / 2;
        const draggedCenterY = canvasY - dragOffsetRef.current.y + fh / 2;

        let col = Math.floor(draggedCenterX / fw);
        let row = Math.floor(draggedCenterY / fh);
        
        if (col < 0) col = 0;
        if (col >= cols) col = cols - 1;
        if (row < 0) row = 0;
        
        let idx = row * cols + col;
        if (idx >= editorFrames.length) idx = editorFrames.length - 1;
        if (idx < 0) idx = 0;
        
        dragHoverIndexRef.current = idx;

        const dragger = document.getElementById("frame-dragger");
        if (dragger && editorFrames.length > 0) {
          dragger.style.opacity = "1";
          dragger.style.transform = `translate(${canvasX - dragOffsetRef.current.x}px, ${canvasY - dragOffsetRef.current.y}px)`;
        }
      };

      const handleGlobalMouseUp = (e: MouseEvent) => {
        if (!isActuallyDraggingRef.current && draggedFrameId) {
           toggleSelectFrame(draggedFrameId, e.ctrlKey || e.shiftKey || e.metaKey);
        } else if (dragHoverIndexRef.current !== null && draggedFrameId) {
          const workspace = workspaceRef.current;
          if (workspace) {
            const transform = transformRef.current;
            const rect = workspace.getBoundingClientRect();
            const canvasX = (e.clientX - rect.left - transform.x) / transform.scale;
            const canvasY = (e.clientY - rect.top - transform.y) / transform.scale;
            animatedPositionsRef.current[draggedFrameId] = {
              x: canvasX - dragOffsetRef.current.x,
              y: canvasY - dragOffsetRef.current.y
            };
          }

          const originalIdx = editorFrames.findIndex(f => f.id === draggedFrameId);
          if (originalIdx !== dragHoverIndexRef.current) {
            reorderFrame(draggedFrameId, dragHoverIndexRef.current);
          }
        }
        isActuallyDraggingRef.current = false;
        setDraggedFrameId(null);
        dragHoverIndexRef.current = null;
      };

      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleGlobalMouseMove);
        window.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    } else if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        transformRef.current.x = e.clientX - dragStartRef.current.x;
        transformRef.current.y = e.clientY - dragStartRef.current.y;
        updateTransformStyle();
      };
      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleGlobalMouseMove);
        window.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, [isDragging, draggedFrameId, editorFrames]);

  const handleGenerateGif = () => {
    if (gifFrames.length === 0 || !fileInfo) {
      showStatus(t("statusNoGifLoaded"), true);
      return;
    }

    const w = fileInfo.width;
    const h = fileInfo.height;
    const cols = Math.max(1, gifCols);
    const rows = Math.ceil(gifFrames.length / cols);

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = cols * w;
    tempCanvas.height = rows * h;
    const tCtx = tempCanvas.getContext("2d");
    if (!tCtx) return;

    gifFrames.forEach((frame, idx) => {
      const c = idx % cols;
      const r = Math.floor(idx / cols);
      tCtx.drawImage(frame, c * w, r * h);
    });

    const imgData = tCtx.getImageData(0, 0, 3, 1);

    imgData.data[0] = 82; imgData.data[1] = 69; imgData.data[2] = 67; imgData.data[3] = 255;

    imgData.data[4] = 84; imgData.data[5] = cols % 256; imgData.data[6] = Math.floor(cols / 256); imgData.data[7] = 255;

    imgData.data[8] = 71; imgData.data[9] = rows % 256; imgData.data[10] = Math.floor(rows / 256); imgData.data[11] = 255;
    tCtx.putImageData(imgData, 0, 0);

    const dataURL = tempCanvas.toDataURL("image/png");
    const name = `spritesheet_grid_${cols}x${rows}.png`;

    setGeneratedSlices([
      {
        dataURL,
        filename: name,
        framesCount: gifFrames.length,
        w: tempCanvas.width,
        h: tempCanvas.height
      }
    ]);

    setTab("results");
    showStatus(t("statusSuccessGifGen", { cols, rows }));
  };

  const handleGenerateCut = () => {
    if (!sourceImage) {
      showStatus(t("statusNoSpritesheetLoaded"), true);
      return;
    }

    const slices: Slice[] = [];
    const cols = Math.max(1, gridCols);
    const rows = Math.max(1, gridRows);
    const size = Math.max(1, chunkSize);

    const fw = sourceImage.width / cols;
    const fh = sourceImage.height / rows;

    if (fw <= 0 || fh <= 0) return;

    const allFrames = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        allFrames.push({ c, r });
      }
    }

    const chunks = [];
    for (let i = 0; i < allFrames.length; i += size) {
      chunks.push(allFrames.slice(i, i + size));
    }

    const tempCanvas = document.createElement("canvas");
    const tCtx = tempCanvas.getContext("2d");
    if (!tCtx) return;

    const drawW = Math.floor(fw);
    const drawH = Math.floor(fh);

    chunks.forEach((chunk, chunkIndex) => {
      const newCols = Math.min(cols, chunk.length);
      const newRows = Math.ceil(chunk.length / newCols);

      tempCanvas.width = newCols * drawW;
      tempCanvas.height = newRows * drawH;
      tCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

      chunk.forEach((frame, idx) => {
        const srcX = Math.floor(frame.c * fw);
        const srcY = Math.floor(frame.r * fh);

        const destC = idx % newCols;
        const destR = Math.floor(idx / newCols);
        const destX = destC * drawW;
        const destY = destR * drawH;

        tCtx.drawImage(
          sourceImage,
          srcX,
          srcY,
          drawW,
          drawH,
          destX,
          destY,
          drawW,
          drawH
        );
      });

      const dataURL = tempCanvas.toDataURL("image/png");
      const filename = `pack_${chunkIndex + 1}_(${chunk.length}f).png`;

      slices.push({
        dataURL,
        filename,
        framesCount: chunk.length,
        w: tempCanvas.width,
        h: tempCanvas.height
      });
    });

    setGeneratedSlices(slices);
    setTab("results");
    showStatus(t("statusSuccessCutGen", { count: slices.length }));
  };

  const [isZipping, setIsZipping] = useState(false);
  const handleDownloadAllZip = async () => {
    if (generatedSlices.length === 0) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();
      generatedSlices.forEach(slice => {
        const base64Data = slice.dataURL.split(",")[1];
        zip.file(slice.filename, base64Data, { base64: true });
      });

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rect_export.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showStatus(t("statusSuccessZipDownloaded"));
    } catch (err) {
      showStatus(t("statusErrorZip"), true);
      console.error(err);
    } finally {
      setIsZipping(false);
    }
  };

  const encodeFrameToGif = (data: Uint8ClampedArray, width: number, height: number) => {
    const pixelCount = width * height;

    const opaquePixels: number[] = [];
    for (let i = 0; i < pixelCount; i++) {
      const a = data[i * 4 + 3];
      if (a >= 128) {
        opaquePixels.push(i);
      }
    }

    const opaqueData = new Uint8ClampedArray(Math.max(opaquePixels.length, 1) * 4);
    for (let j = 0; j < opaquePixels.length; j++) {
      const si = opaquePixels[j] * 4;
      const di = j * 4;
      opaqueData[di]     = data[si];
      opaqueData[di + 1] = data[si + 1];
      opaqueData[di + 2] = data[si + 2];
      opaqueData[di + 3] = 255;
    }

    const maxColors = Math.min(255, Math.max(2, opaquePixels.length > 0 ? 255 : 2));
    const rawPalette: number[][] = opaquePixels.length > 0
      ? quantize(opaqueData, maxColors, { format: "rgb565" })
      : [[0, 0, 0]];

    const palette: number[][] = [[0, 0, 0], ...rawPalette];

    const index = new Uint8Array(pixelCount);
    for (let i = 0; i < pixelCount; i++) {
      const a = data[i * 4 + 3];
      if (a < 128) {
        index[i] = 0;
      } else {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        let bestIdx = 1;
        let bestDist = Infinity;
        for (let p = 1; p < palette.length; p++) {
          const pr = palette[p][0];
          const pg = palette[p][1];
          const pb = palette[p][2];
          const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = p;
          }
        }
        index[i] = bestIdx;
      }
    }

    return { index, palette };
  };

  const handleGenerateConnectGif = async () => {
    if (connectFrames.length === 0 && !sourceImage) return;
    setIsExportingGif(true);
    
    try {
      const gif = GIFEncoder();
      
      if (connectFrames.length > 0) {
        const framesToExport = connectFrames.slice(0, exportFrameCount);
        for (const frame of framesToExport) {
          const canvas = document.createElement("canvas");
          canvas.width = frame.img.naturalWidth;
          canvas.height = frame.img.naturalHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) continue;
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(frame.img, 0, 0);
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          const { index, palette } = encodeFrameToGif(data, canvas.width, canvas.height);
          gif.writeFrame(index, canvas.width, canvas.height, { palette, delay: connectDelay, transparent: true, transparentIndex: 0 });
        }
      } else if (sourceImage) {
        const fw = Math.floor(sourceImage.width / Math.max(1, gridCols));
        const fh = Math.floor(sourceImage.height / Math.max(1, gridRows));
        const totalFrames = Math.max(1, gridCols) * Math.max(1, gridRows);
        const limit = Math.min(totalFrames, exportFrameCount);
        
        for (let i = 0; i < limit; i++) {
          const c = i % Math.max(1, gridCols);
          const r = Math.floor(i / Math.max(1, gridCols));
          const srcX = c * fw;
          const srcY = r * fh;
          
          const canvas = document.createElement("canvas");
          canvas.width = fw;
          canvas.height = fh;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) continue;
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(sourceImage, srcX, srcY, fw, fh, 0, 0, fw, fh);
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          const { index, palette } = encodeFrameToGif(data, canvas.width, canvas.height);
          gif.writeFrame(index, canvas.width, canvas.height, { palette, delay: connectDelay, transparent: true, transparentIndex: 0 });
        }
      }
      
      gif.finish();
      const bytes = gif.bytesView();
      
      const blob = new Blob([bytes], { type: "image/gif" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rect_connected.gif";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showStatus(t("statusExportSuccess"));
    } catch (err) {
      showStatus(t("statusExportError"), true);
      console.error(err);
    } finally {
      setIsExportingGif(false);
    }
  };

  const [isExportingGif, setIsExportingGif] = useState(false);
  const handleExportAsGif = async () => {
    if (generatedSlices.length === 0) return;
    setIsExportingGif(true);

    try {
      const gif = GIFEncoder();
      
      for (const slice of generatedSlices) {
        const img = new Image();
        img.src = slice.dataURL;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        
        const canvas = document.createElement("canvas");
        canvas.width = slice.w;
        canvas.height = slice.h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) continue;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, slice.w, slice.h);
        
        const { index, palette } = encodeFrameToGif(data, slice.w, slice.h);
        gif.writeFrame(index, slice.w, slice.h, { palette, delay: 100, transparent: true, transparentIndex: 0 });
      }
      
      gif.finish();
      const bytes = gif.bytesView();
      
      const blob = new Blob([bytes], { type: "image/gif" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rect_animated.gif";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showStatus(t("statusExportSuccess"));
    } catch (err) {
      showStatus(t("statusExportError"), true);
      console.error(err);
    } finally {
      setIsExportingGif(false);
    }
  };

  const downloadSingle = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };



  const appState: AppState = {
    appMode, conversionDir, file, fileName, fileInfo, sourceImage, gifFrames, generatedSlices,
    gifCols, autoGifCols, gridCols, gridRows, chunkSize, gifFrameWidth, gifFrameHeight,
    targetFrameWidth, targetFrameHeight, tab, status, language, theme, showSettings,
    isDragging, isDragOver, isZipping, isExportingGif, connectFrames, connectDelay,
    exportFrameCount, transformRef,
    editorFrames, selectedFrameIds, historyStack, futureStack, draggedFrameId
  };

  const appActions: AppActions = {
    setAppMode, handleSwitchMode, setConversionDir: handleSwitchConversionDir, setAutoGifCols, setGifCols, handleGenerateGif,
    setGridCols, setGridRows, setTargetFrameWidth, setTargetFrameHeight, setChunkSize,
    detectGridLayout, handleGenerateCut, handleDownloadAllZip, handleExportAsGif, setTab, handleMouseDown,
    setShowSettings, changeLanguage, changeTheme, handleDragOver, handleDragLeave, handleDrop,
    handleInputChange, fileInputRef, workspaceRef, canvasContainerRef, canvasRef,
    transformRef, downloadSingle, t, showStatus, setConnectDelay, setExportFrameCount,
    handleGenerateConnectGif, undoEditor, redoEditor, toggleSelectFrame, deleteSelectedFrames,
    reorderFrame, setDraggedFrameId, handleEditorExportGif, handleEditorGenerateCut
  };

  return (
    <div className="desktop">
      <UpdaterPrompt key={manualCheckTrigger} manual={manualCheckTrigger > 0} />
      <div className="imgui-window sidebar">
        <div className="imgui-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{t("sidebarTitle")}</span>
          <button 
            className="settings-btn-icon" 
            onClick={() => setShowSettings(true)}
            title={t("settingsTitle")}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              fontSize: "16px",
              padding: "0 4px",
              display: "flex",
              alignItems: "center"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
        <div className="imgui-content">
          <Sidebar state={appState} actions={appActions} />
          <Toolbar state={appState} actions={appActions} />
        </div>
      </div>
      
      <Workspace state={appState} actions={appActions} />

      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="imgui-window settings-modal" onClick={(e) => e.stopPropagation()} style={{ overflow: "visible" }}>
            <div className="imgui-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{t("settingsTitle")}</span>
              <button 
                className="close-btn" 
                onClick={() => setShowSettings(false)}
                style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "20px", fontWeight: "bold", padding: "0 5px", lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <div className="imgui-content" style={{ padding: "15px", overflow: "visible" }}>
              <div className="control-group" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                <span className="control-label" style={{ minWidth: "120px" }}>{t("settingsLanguageLabel")}</span>
                <CustomSelect
                  value={language}
                  onChange={(val) => changeLanguage(val as "en" | "pl")}
                  options={[
                    { value: "en", label: "English" },
                    { value: "pl", label: "Polski" }
                  ]}
                />
              </div>
              <div className="control-group" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginTop: "10px" }}>
                <span className="control-label" style={{ minWidth: "120px" }}>{t("settingsThemeLabel")}</span>
                <CustomSelect
                  value={theme}
                  onChange={(val) => changeTheme(val)}
                  options={[
                    { value: "azure", label: t("themeAzure") },
                    { value: "pearl", label: t("themePearl") },
                    { value: "lavender", label: t("themeLavender") }
                  ]}
                />
              </div>
              <div style={{ marginTop: "20px", paddingTop: "15px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{t("settingsVersionLabel")}</span>
                  <span style={{ fontSize: "14px", fontWeight: "bold" }}>v1.0.4</span>
                </div>
                <button 
                  className="imgui-btn" 
                  onClick={() => setManualCheckTrigger(prev => prev + 1)}
                  style={{ padding: "5px 15px", background: "rgba(255,255,255,0.05)", width: "auto", whiteSpace: "nowrap", flexShrink: 0, marginLeft: "15px" }}
                >
                  {t("settingsCheckUpdates")}
                </button>
              </div>
              <div style={{ marginTop: "15px", display: "flex", justifyContent: "flex-end" }}>
                <button className="imgui-btn primary" onClick={() => setShowSettings(false)} style={{ padding: "5px 15px" }}>
                  {t("settingsSaveBtn")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
