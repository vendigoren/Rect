export interface FileInfo {
  width: number;
  height: number;
  frames: number;
}

export interface Slice {
  dataURL: string;
  filename: string;
  framesCount: number;
  w: number;
  h: number;
}

export interface AppState {
  appMode: "gif2sprite" | "cutting";
  theme: string;
  file: File | null;
  fileName: string;
  fileInfo: FileInfo | null;
  sourceImage: HTMLImageElement | null;
  gifFrames: HTMLCanvasElement[];
  generatedSlices: Slice[];
  gifCols: number;
  autoGifCols: boolean;
  gridCols: number;
  gridRows: number;
  chunkSize: number;
  gifFrameWidth: number;
  gifFrameHeight: number;
  targetFrameWidth: number;
  targetFrameHeight: number;
  tab: "preview" | "results";
  status: { text: string; isError: boolean } | null;
  language: "en" | "pl";
  showSettings: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  isZipping?: boolean;
}

export interface AppActions {
  setAppMode: (m: "gif2sprite" | "cutting") => void;
  handleSwitchMode: (mode: "gif2sprite" | "cutting") => void;
  setAutoGifCols: (val: boolean) => void;
  setGifCols: (val: number) => void;
  handleGenerateGif: () => void;
  setGridCols: (val: number) => void;
  setGridRows: (val: number) => void;
  setTargetFrameWidth: (val: number) => void;
  setTargetFrameHeight: (val: number) => void;
  setChunkSize: (val: number) => void;
  detectGridLayout: (img: HTMLImageElement) => void;
  handleGenerateCut: () => void;
  handleDownloadAllZip: () => void;
  setTab: (t: "preview" | "results") => void;
  handleMouseDown: (e: any) => void;
  setShowSettings: (val: boolean) => void;
  changeLanguage: (lang: "en" | "pl") => void;
  handleDragOver: (e: any) => void;
  handleDragLeave: () => void;
  handleDrop: (e: any) => void;
  handleInputChange: (e: any) => void;
  changeTheme: (theme: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  workspaceRef: React.RefObject<HTMLDivElement | null>;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  transformRef: React.MutableRefObject<{ scale: number; x: number; y: number }>;
  downloadSingle: (dataURL: string, filename: string) => void;
  getExecutionPlan: () => any;
  t: any;
  showStatus: (text: string, isError?: boolean) => void;
}
