"use client";

import React, { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import { GifReader } from "omggif";

const groupColors = [
  "rgba(41, 128, 185, 0.5)",   // Blue
  "rgba(39, 174, 96, 0.5)",    // Green
  "rgba(211, 84, 0, 0.5)",     // Orange
  "rgba(142, 68, 173, 0.5)",   // Purple
  "rgba(192, 57, 43, 0.5)",    // Red
  "rgba(22, 160, 133, 0.5)",   // Teal
  "rgba(243, 156, 18, 0.5)"    // Yellow
];

import { translations } from "../utils/i18n";
import Sidebar from "../components/Sidebar";
import Toolbar from "../components/Toolbar";
import Workspace from "../components/Workspace";
import { AppState, AppActions } from "../types";
import { useLanguage } from "../hooks/useLanguage";


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

export default function Home() {
  const [appMode, setAppMode] = useState<"gif2sprite" | "cutting">("gif2sprite");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);

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

  const [tab, setTab] = useState<"preview" | "results">("preview");

  const [status, setStatus] = useState<{ text: string; isError: boolean } | null>(null);

  const { language, changeLanguage, t } = useLanguage();
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

  const workspaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleSwitchMode = (mode: "gif2sprite" | "cutting") => {
    if (appMode === mode) return;
    setAppMode(mode);
    setFile(null);
    setFileName("");
    setFileInfo(null);
    setSourceImage(null);
    setGifFrames([]);
    setGeneratedSlices([]);
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
    if (appMode === "cutting" && sourceImage) {
      setFileInfo({
        width: sourceImage.width,
        height: sourceImage.height,
        frames: Math.max(1, gridCols) * Math.max(1, gridRows)
      });
    }
  }, [gridCols, gridRows, appMode, sourceImage]);

  useEffect(() => {
    if (appMode === "gif2sprite" && fileInfo && autoGifCols) {
      const calculatedCols = Math.ceil(Math.sqrt(fileInfo.frames));
      setGifCols(calculatedCols);
    }
  }, [fileInfo, autoGifCols, appMode]);

  const handleLoadFile = async (loadedFile: File) => {
    setFile(loadedFile);
    setFileName(loadedFile.name);
    setGeneratedSlices([]);
    setTab("preview");

    if (appMode === "gif2sprite") {
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
            detectGridLayout(img);
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

  const detectGridLayout = (img: HTMLImageElement) => {
    if (!img) return;
    try {
      const W = img.width;
      const H = img.height;

      if (fileName) {
        const match = fileName.match(/(\d{1,3})\s*[xX×]\s*(\d{1,3})/);
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
        let i = 1; // skip edge
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
        if (cellW < 32) continue; // frames should be at least 32px wide

        for (let r = 1; r <= Math.min(maxDiv, H); r++) {
          if (H % r !== 0) continue;
          const cellH = H / r;
          if (cellH < 32) continue; // frames should be at least 32px tall

          const aspect = Math.max(cellW / cellH, cellH / cellW);
          const aspectPenalty = -(aspect - 1) * 2; // 0 for square, negative for non-square

          const totalFrames = c * r;
          let countBonus = 0;
          if (totalFrames >= 4 && totalFrames <= 100) countBonus = 1;
          else if (totalFrames >= 2 && totalFrames <= 200) countBonus = 0.5;
          else countBonus = -1;

          const sizeBonus = Math.log2(cellW * cellH) * 0.1;

          let stdBonus = 0;
          if (cellW % 16 === 0 && cellH % 16 === 0) stdBonus += 0.2;
          if (cellW === cellH) stdBonus += 0.5; // extra for perfect squares

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

      showStatus(t("statusSmartDetectSuccess", { cols: bestCols, rows: bestRows }));
    } catch (e) {
      console.error("Smart detect failed:", e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const loadedFile = e.target.files?.[0];
    if (loadedFile) {
      handleLoadFile(loadedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await handleLoadFile(droppedFile);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    if (appMode === "gif2sprite") {
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

        const fontSize = Math.max(9, Math.floor(h / 5));
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
        ctx.lineWidth = 2;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.strokeText((idx + 1).toString(), x + 6, y + fontSize + 4);
        ctx.fillText((idx + 1).toString(), x + 6, y + fontSize + 4);
      });
    } else if (appMode === "cutting") {
      if (!sourceImage) return;
      const w = sourceImage.width;
      const h = sourceImage.height;
      canvas.width = w;
      canvas.height = h;

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(sourceImage, 0, 0);

      const cols = Math.max(1, gridCols);
      const rows = Math.max(1, gridRows);
      const size = Math.max(1, chunkSize);

      const fw = w / cols;
      const fh = h / rows;

      if (fw <= 0 || fh <= 0) return;

      ctx.lineWidth = Math.max(1, Math.floor(w / 600));
      let frameIndex = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * fw;
          const y = r * fh;
          const groupIndex = Math.floor(frameIndex / size);

          ctx.fillStyle = groupColors[groupIndex % groupColors.length];
          ctx.fillRect(x, y, fw, fh);

          ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          ctx.strokeRect(x, y, fw, fh);

          const fontSize = Math.max(10, Math.floor(fh / 4));
          ctx.fillStyle = "white";
          ctx.strokeStyle = "black";
          ctx.lineWidth = Math.max(2, Math.floor(fontSize / 6));
          ctx.font = `bold ${fontSize}px sans-serif`;

          const textX = x + fw / 2 - fontSize / 2.5;
          const textY = y + fh / 2 + fontSize / 3;

          ctx.strokeText((frameIndex + 1).toString(), textX, textY);
          ctx.fillText((frameIndex + 1).toString(), textX, textY);

          frameIndex++;
        }
      }
    }
  }, [appMode, gifFrames, sourceImage, gridCols, gridRows, chunkSize, fileInfo, gifCols]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const handleWheel = (e: WheelEvent) => {
      if (!sourceImage && gifFrames.length === 0) return;
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
  }, [sourceImage, gifFrames]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sourceImage && gifFrames.length === 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - transformRef.current.x,
      y: e.clientY - transformRef.current.y
    };
  };

  useEffect(() => {
    if (!isDragging) return;

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
  }, [isDragging]);

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

  const downloadSingle = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };

  const getExecutionPlan = () => {
    if (appMode !== "cutting" || !fileInfo || !sourceImage) {
      return <li>{t("waitingForImage")}</li>;
    }
    const totalFrames = Math.max(1, gridCols) * Math.max(1, gridRows);
    const numFullChunks = Math.floor(totalFrames / chunkSize);
    const remainder = totalFrames % chunkSize;

    const items = [];
    let fileCount = 1;

    for (let i = 0; i < numFullChunks; i++) {
      items.push(
        <li key={`chunk-${i}`}>
          <span>{t("execPlanPackage", { index: fileCount })}</span>
          <span style={{ color: "#3498db", fontWeight: "bold" }}>{chunkSize} {language === "pl" ? "klatek" : "frames"}</span>
        </li>
      );
      fileCount++;
    }

    if (remainder > 0) {
      items.push(
        <li key="remainder">
          <span>{t("execPlanPackage", { index: fileCount })}</span>
          <span style={{ color: "#e67e22", fontWeight: "bold" }}>{remainder} {language === "pl" ? "klatek" : "frames"}</span>
        </li>
      );
    }

    items.push(
      <li key="total" style={{ marginTop: "6px", borderTop: "1px solid var(--border-color)", paddingTop: "6px", color: "#fff", fontWeight: "bold" }}>
        <span>{t("execPlanTotal")}</span>
        <span>{totalFrames}</span>
      </li>
    );

    return items;
  };


  const appState: AppState = {
    appMode, file, fileName, fileInfo, sourceImage, gifFrames, generatedSlices,
    gifCols, autoGifCols, gridCols, gridRows, chunkSize, gifFrameWidth, gifFrameHeight,
    targetFrameWidth, targetFrameHeight, tab, status, language, showSettings,
    isDragging, isDragOver, isZipping
  };

  const appActions: AppActions = {
    setAppMode, handleSwitchMode, setAutoGifCols, setGifCols, handleGenerateGif,
    setGridCols, setGridRows, setTargetFrameWidth, setTargetFrameHeight, setChunkSize,
    detectGridLayout, handleGenerateCut, handleDownloadAllZip, setTab, handleMouseDown,
    setShowSettings, changeLanguage, handleDragOver, handleDragLeave, handleDrop,
    handleInputChange, fileInputRef, workspaceRef, canvasContainerRef, canvasRef,
    transformRef, downloadSingle, getExecutionPlan, t, showStatus
  };

  return (
    <div className="desktop">
      <div className="imgui-window sidebar">
        <Sidebar state={appState} actions={appActions} />
        <div className="imgui-content" style={{ paddingTop: 0, marginTop: "-10px" }}>
          <Toolbar state={appState} actions={appActions} />
        </div>
      </div>
      
      <Workspace state={appState} actions={appActions} />

      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="imgui-window settings-modal" onClick={(e) => e.stopPropagation()}>
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
            <div className="imgui-content" style={{ padding: "15px" }}>
              <div className="control-group" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                <span className="control-label" style={{ minWidth: "120px" }}>{t("settingsLanguageLabel")}</span>
                <select
                  value={language}
                  onChange={(e) => changeLanguage(e.target.value as "en" | "pl")}
                  className="imgui-select"
                  style={{ background: "#161b22", color: "#fff", border: "1px solid var(--border-color)", padding: "4px 8px", borderRadius: "3px", cursor: "pointer", outline: "none" }}
                >
                  <option value="en">English</option>
                  <option value="pl">Polski</option>
                </select>
              </div>
              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
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
