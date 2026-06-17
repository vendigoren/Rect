declare module 'gifenc' {
  export function GIFEncoder(): any;
  export function quantize(data: Uint8ClampedArray | Uint8Array, maxColors: number, options?: any): any;
  export function applyPalette(data: Uint8ClampedArray | Uint8Array, palette: any, format?: string): any;
}