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

export interface AnimationFrame {
  id: string;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  name?: string;
}

export interface AppState {
  language: string;
  theme: string;
  showSettings: boolean;
  appMode: "conversion" | "editing";
  conversionDir: "gif2sprite" | "sprite2gif";
  file: File | null;
  fileName: string;
  fileInfo: FileInfo | null;
  sourceImage: HTMLImageElement | null;
  gifFrames: HTMLCanvasElement[];
  generatedSlices: { filename: string; dataURL: string; w: number; h: number; framesCount: number }[];
  isZipping: boolean;
  isExportingGif: boolean;
  
  gifCols: number;
  autoGifCols: boolean;
  
  gridCols: number;
  gridRows: number;
  targetFrameWidth: number;
  targetFrameHeight: number;
  chunkSize: number;
  
  connectFrames: { file: File, img: HTMLImageElement, name: string }[];
  connectDelay: number;
  exportFrameCount: number;

  editorFrames: AnimationFrame[];
  selectedFrameIds: Set<string>;
  historyStack: AnimationFrame[][];
  futureStack: AnimationFrame[][];
  draggedFrameId: string | null;

  tab: "preview" | "results";
  
  gifFrameWidth: number;
  gifFrameHeight: number;
  
  isDragging: boolean;
  isDragOver: boolean;

  status: { text: string; isError: boolean } | null;
  transformRef: React.MutableRefObject<{ scale: number; x: number; y: number }>;
}

export interface AppActions {
  setAppMode: React.Dispatch<React.SetStateAction<"conversion" | "editing">>;
  handleSwitchMode: (mode: "conversion" | "editing") => void;
  setConversionDir: (dir: "gif2sprite" | "sprite2gif") => void;
  setAutoGifCols: (b: boolean) => void;
  setGifCols: (n: number) => void;
  handleGenerateGif: () => void;
  setGridCols: (n: number) => void;
  setGridRows: (n: number) => void;
  setTargetFrameWidth: (n: number) => void;
  setTargetFrameHeight: (n: number) => void;
  setChunkSize: (n: number) => void;
  detectGridLayout: (img: HTMLImageElement) => void;
  handleGenerateCut: () => void;
  handleDownloadAllZip: () => void;
  handleExportAsGif: () => void;
  setConnectDelay: (n: number) => void;
  setExportFrameCount: (n: number) => void;
  handleGenerateConnectGif: () => void;
  undoEditor: () => void;
  redoEditor: () => void;
  toggleSelectFrame: (id: string, multi: boolean) => void;
  deleteSelectedFrames: () => void;
  reorderFrame: (id: string, newIndex: number) => void;
  setDraggedFrameId: (id: string | null) => void;
  handleEditorExportGif: () => void;
  handleEditorGenerateCut: () => void;
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
  t: any;
  showStatus: (text: string, isError?: boolean) => void;
}

