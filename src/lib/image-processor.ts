import JSZip from "jszip";

export type SupportedImageFormat =
  | "PNG"
  | "JPG"
  | "JPEG"
  | "WEBP"
  | "AVIF"
  | "BMP"
  | "GIF"
  | "TIFF"
  | "HEIC"
  | "ICO"
  | "SVG";

export interface ImageConversionOptions {
  targetFormat: SupportedImageFormat;
  quality?: number; // 0.1 to 1.0 (default 0.90)
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
  backgroundColor?: string; // Hex e.g. "#ffffff" for transparent source -> JPG
  stripMetadata?: boolean;
}

export interface ImageConversionItemResult {
  id: string;
  file: File;
  originalName: string;
  originalFormat: SupportedImageFormat;
  originalSizeBytes: number;
  originalWidth: number;
  originalHeight: number;
  originalUrl: string;
  convertedBlob?: Blob;
  convertedUrl?: string;
  convertedFormat?: SupportedImageFormat;
  convertedSizeBytes?: number;
  convertedWidth?: number;
  convertedHeight?: number;
  status: "idle" | "processing" | "success" | "error";
  errorMessage?: string;
  warningMessage?: string;
}

export type ImageCompressionProfile =
  | "recommended"
  | "high_quality"
  | "balanced"
  | "max_compression"
  | "custom";

export interface ImageCompressionOptions {
  profile: ImageCompressionProfile;
  quality?: number; // 10 to 100
  maxWidth?: number;
  maxHeight?: number;
  resizePercentage?: number; // 25 to 100
  outputFormat?: SupportedImageFormat | "original";
  stripMetadata?: boolean;
  lossless?: boolean;
}

export interface ImageCompressionItemResult {
  id: string;
  file: File;
  originalName: string;
  originalFormat: SupportedImageFormat;
  originalSizeBytes: number;
  originalWidth: number;
  originalHeight: number;
  originalUrl: string;
  compressedBlob?: Blob;
  compressedUrl?: string;
  compressedFormat?: SupportedImageFormat;
  compressedSizeBytes?: number;
  compressedWidth?: number;
  compressedHeight?: number;
  reductionBytes?: number;
  reductionPercent?: number;
  status: "idle" | "processing" | "success" | "error";
  errorMessage?: string;
  warningMessage?: string;
}

export const FORMAT_MIME_MAP: Record<SupportedImageFormat, string> = {
  PNG: "image/png",
  JPG: "image/jpeg",
  JPEG: "image/jpeg",
  WEBP: "image/webp",
  AVIF: "image/avif",
  BMP: "image/bmp",
  GIF: "image/gif",
  TIFF: "image/tiff",
  HEIC: "image/heic",
  ICO: "image/x-icon",
  SVG: "image/svg+xml",
};

export const FORMAT_EXT_MAP: Record<SupportedImageFormat, string> = {
  PNG: "png",
  JPG: "jpg",
  JPEG: "jpg",
  WEBP: "webp",
  AVIF: "avif",
  BMP: "bmp",
  GIF: "gif",
  TIFF: "tiff",
  HEIC: "heic",
  ICO: "ico",
  SVG: "svg",
};

/**
 * Checks if a format supports transparent pixels (alpha channel).
 */
export function formatSupportsTransparency(format: SupportedImageFormat): boolean {
  return ["PNG", "WEBP", "AVIF", "GIF", "ICO", "SVG", "TIFF"].includes(format);
}

/**
 * Detects image format from magic bytes and filename extension.
 */
export async function detectImageFormat(file: File | Blob, filename?: string): Promise<SupportedImageFormat> {
  const name = (filename || (file instanceof File ? file.name : "")).toLowerCase();

  try {
    const slice = await file.slice(0, 32).arrayBuffer();
    const bytes = new Uint8Array(slice);

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return "PNG";
    }

    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return "JPG";
    }

    // GIF: GIF87a or GIF89a (47 49 46 38)
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      return "GIF";
    }

    // WebP: RIFF ... WEBP
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return "WEBP";
    }

    // BMP: 42 4D (BM)
    if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
      return "BMP";
    }

    // TIFF: II*. (49 49 2A 00) or MM.* (4D 4D 00 2A)
    if (
      (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a)
    ) {
      return "TIFF";
    }

    // ICO: 00 00 01 00
    if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
      return "ICO";
    }

    // ISO Media / ftyp (AVIF / HEIC)
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      const ftypSub = String.fromCharCode(...bytes.slice(8, 12));
      if (ftypSub.startsWith("avif") || ftypSub.startsWith("avis")) {
        return "AVIF";
      }
      if (
        ftypSub.startsWith("heic") ||
        ftypSub.startsWith("heix") ||
        ftypSub.startsWith("mif1") ||
        ftypSub.startsWith("msf1") ||
        ftypSub.startsWith("hevc")
      ) {
        return "HEIC";
      }
    }

    // SVG check
    const textSnippet = new TextDecoder().decode(bytes).toLowerCase();
    if (textSnippet.includes("<svg") || textSnippet.startsWith("<?xml")) {
      return "SVG";
    }
  } catch (err) {
    console.warn("Magic byte detection error:", err);
  }

  // Fallback to extension or file type
  if (name.endsWith(".png")) return "PNG";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "JPG";
  if (name.endsWith(".webp")) return "WEBP";
  if (name.endsWith(".avif")) return "AVIF";
  if (name.endsWith(".bmp")) return "BMP";
  if (name.endsWith(".gif")) return "GIF";
  if (name.endsWith(".tiff") || name.endsWith(".tif")) return "TIFF";
  if (name.endsWith(".heic") || name.endsWith(".heif")) return "HEIC";
  if (name.endsWith(".ico")) return "ICO";
  if (name.endsWith(".svg")) return "SVG";

  if (file.type === "image/png") return "PNG";
  if (file.type === "image/jpeg") return "JPG";
  if (file.type === "image/webp") return "WEBP";
  if (file.type === "image/avif") return "AVIF";
  if (file.type === "image/bmp") return "BMP";
  if (file.type === "image/gif") return "GIF";
  if (file.type.includes("tiff")) return "TIFF";
  if (file.type.includes("heic") || file.type.includes("heif")) return "HEIC";
  if (file.type.includes("icon")) return "ICO";
  if (file.type.includes("svg")) return "SVG";

  return "PNG";
}

/**
 * Decodes an input file / blob into a canvas element and raw image metadata.
 */
export async function decodeToCanvas(
  file: File | Blob,
  format: SupportedImageFormat,
): Promise<{
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  hasAlpha: boolean;
}> {
  if (typeof document === "undefined") {
    throw new Error("Image decoding requires browser environment.");
  }

  // 1. TIFF handling using UTIF
  if (format === "TIFF") {
    try {
      const UTIF = (await import("utif")).default;
      const buffer = await file.arrayBuffer();
      const ifds = UTIF.decode(buffer);
      if (ifds.length > 0) {
        const firstPage = ifds[0]!;
        UTIF.decodeImage(buffer, firstPage);
        const rgba = UTIF.toRGBA8(firstPage);

        const canvas = document.createElement("canvas");
        canvas.width = firstPage.width;
        canvas.height = firstPage.height;
        const ctx = canvas.getContext("2d")!;
        const imgData = ctx.createImageData(canvas.width, canvas.height);
        imgData.data.set(rgba);
        ctx.putImageData(imgData, 0, 0);

        return {
          canvas,
          ctx,
          width: canvas.width,
          height: canvas.height,
          hasAlpha: true,
        };
      }
    } catch (e) {
      console.warn("TIFF UTIF decoding fallback:", e);
    }
  }

  // 2. HEIC / HEIF handling using heic2any
  let sourceBlob: Blob = file;
  if (format === "HEIC") {
    try {
      const heic2any = (await import("heic2any")).default;
      const converted = await heic2any({
        blob: file,
        toType: "image/png",
      });
      sourceBlob = Array.isArray(converted) ? converted[0]! : converted;
    } catch (e) {
      console.warn("heic2any decoding fallback:", e);
    }
  }

  // 3. ICO handling via pure-JS container & DIB/PNG decoder
  // Browsers (especially Chromium on Linux) do not decode ICO blob URLs via HTMLImageElement
  if (format === "ICO") {
    try {
      return await decodeIcoToCanvas(file);
    } catch (icoErr) {
      console.warn("decodeIcoToCanvas fallback to HTMLImageElement:", icoErr);
    }
  }

  // 4. Standard image decoding via HTMLImageElement & Object URL
  return decodeImageBlob(sourceBlob, format);
}

/**
 * Decodes an image blob into a canvas using an HTMLImageElement and Object URL.
 */
function decodeImageBlob(
  blob: Blob,
  formatLabel?: string,
): Promise<{
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  hasAlpha: boolean;
}> {
  return new Promise<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    hasAlpha: boolean;
  }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        reject(new Error("Unable to create canvas 2D rendering context."));
        return;
      }

      ctx.drawImage(img, 0, 0);

      // Check if image contains alpha transparency
      let hasAlpha = false;
      try {
        const imgData = ctx.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100));
        for (let i = 3; i < imgData.data.length; i += 4) {
          if (imgData.data[i]! < 255) {
            hasAlpha = true;
            break;
          }
        }
      } catch {}

      resolve({
        canvas,
        ctx,
        width: canvas.width,
        height: canvas.height,
        hasAlpha,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to decode image data for format ${formatLabel || "unknown"}. The file may be corrupted.`));
    };

    img.src = objectUrl;
  });
}

export interface IcoMetadata {
  count: number;
  bestWidth: number;
  bestHeight: number;
  bestBpp: number;
  isPng: boolean;
  byteLength: number;
}

/**
 * Inspects an ICO file buffer and extracts header and best image metadata.
 */
export function parseIcoMetadata(buffer: ArrayBuffer): IcoMetadata {
  if (buffer.byteLength < 6) {
    throw new Error("Invalid ICO file: file too small.");
  }
  const view = new DataView(buffer);
  const reserved = view.getUint16(0, true);
  const type = view.getUint16(2, true);
  const count = view.getUint16(4, true);

  if (reserved !== 0 || (type !== 1 && type !== 2) || count < 1) {
    throw new Error("Invalid ICO header: expected reserved 0 and type 1 or 2.");
  }

  let bestW = 0;
  let bestH = 0;
  let bestBpp = 0;
  let bestOffset = 0;

  for (let i = 0; i < count; i++) {
    const entryOffset = 6 + i * 16;
    if (entryOffset + 16 > buffer.byteLength) break;
    const wByte = view.getUint8(entryOffset);
    const hByte = view.getUint8(entryOffset + 1);
    const planes = view.getUint16(entryOffset + 4, true);
    const bpp = view.getUint16(entryOffset + 6, true) || (planes * 32);
    const imageOffset = view.getUint32(entryOffset + 12, true);

    const w = wByte === 0 ? 256 : wByte;
    const h = hByte === 0 ? 256 : hByte;

    if (w * h >= bestW * bestH) {
      bestW = w;
      bestH = h;
      bestBpp = bpp;
      bestOffset = imageOffset;
    }
  }

  let isPng = false;
  if (bestOffset + 8 <= buffer.byteLength) {
    const u8 = new Uint8Array(buffer, bestOffset, 8);
    if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) {
      isPng = true;
    }
  }

  return {
    count,
    bestWidth: bestW,
    bestHeight: bestH,
    bestBpp: bestBpp,
    isPng,
    byteLength: buffer.byteLength,
  };
}

/**
 * Decodes a Windows ICO file buffer into a canvas.
 * Supports modern PNG-compressed ICO entries and classic Windows DIB entries (32-bit, 24-bit, 8/4/1-bit).
 */
export async function decodeIcoToCanvas(
  fileOrBlob: File | Blob
): Promise<{
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  hasAlpha: boolean;
}> {
  const buffer = await fileOrBlob.arrayBuffer();
  if (buffer.byteLength < 6) {
    throw new Error("Invalid ICO file: file too small.");
  }

  const view = new DataView(buffer);
  const reserved = view.getUint16(0, true);
  const type = view.getUint16(2, true);
  const count = view.getUint16(4, true);

  if (reserved !== 0 || (type !== 1 && type !== 2) || count < 1) {
    throw new Error("Invalid ICO header: expected reserved 0 and type 1 or 2.");
  }

  interface IcoEntry {
    width: number;
    height: number;
    bpp: number;
    bytesInRes: number;
    imageOffset: number;
  }

  const entries: IcoEntry[] = [];
  for (let i = 0; i < count; i++) {
    const entryOffset = 6 + i * 16;
    if (entryOffset + 16 > buffer.byteLength) break;

    const wByte = view.getUint8(entryOffset);
    const hByte = view.getUint8(entryOffset + 1);
    const planes = view.getUint16(entryOffset + 4, true);
    const bpp = view.getUint16(entryOffset + 6, true);
    const bytesInRes = view.getUint32(entryOffset + 8, true);
    const imageOffset = view.getUint32(entryOffset + 12, true);

    entries.push({
      width: wByte === 0 ? 256 : wByte,
      height: hByte === 0 ? 256 : hByte,
      bpp: bpp || (planes * 32),
      bytesInRes,
      imageOffset,
    });
  }

  if (entries.length === 0) {
    throw new Error("No valid icon directory entries found in ICO.");
  }

  // Pick the highest-resolution entry
  entries.sort((a, b) => (b.width * b.height) - (a.width * a.height));
  const best = entries[0]!;

  if (best.imageOffset >= buffer.byteLength) {
    throw new Error("Icon image offset exceeds file size.");
  }

  const slice = buffer.slice(best.imageOffset, Math.min(buffer.byteLength, best.imageOffset + best.bytesInRes));
  const sliceBytes = new Uint8Array(slice);

  // Check if image slice is a PNG (starts with \x89PNG\r\n\x1a\n)
  if (
    sliceBytes.length >= 8 &&
    sliceBytes[0] === 0x89 &&
    sliceBytes[1] === 0x50 &&
    sliceBytes[2] === 0x4e &&
    sliceBytes[3] === 0x47
  ) {
    const pngBlob = new Blob([slice], { type: "image/png" });
    return decodeImageBlob(pngBlob, "PNG (ICO)");
  }

  // Windows DIB entry
  return decodeDibToCanvas(sliceBytes, best.width, best.height);
}

/**
 * Decodes raw DIB (Device Independent Bitmap) bytes from an ICO entry into a Canvas.
 */
function decodeDibToCanvas(
  bytes: Uint8Array,
  fallbackWidth: number,
  fallbackHeight: number
): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  hasAlpha: boolean;
} {
  if (bytes.length < 40) {
    throw new Error("Invalid DIB header in ICO file: header size less than 40 bytes.");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerSize = view.getUint32(0, true);
  const dibWidth = view.getInt32(4, true);
  const dibHeight = view.getInt32(8, true);
  const bpp = view.getUint16(14, true);
  const colorsUsed = view.getUint32(32, true);

  // In ICO files, dibHeight is the sum of XOR mask height + AND mask height, so actual icon height is dibHeight / 2
  const isTopDown = dibHeight < 0;
  const absHeight = Math.abs(dibHeight);
  const width = dibWidth > 0 ? dibWidth : fallbackWidth;
  const height = dibHeight !== 0 ? Math.floor(absHeight / 2) : fallbackHeight;

  if (width <= 0 || height <= 0) {
    throw new Error("Invalid dimensions in ICO DIB header.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not initialize canvas 2D context.");

  const imgData = ctx.createImageData(width, height);
  const out = imgData.data;

  // Palette handling for <= 8 bpp
  const paletteOffset = headerSize;
  let numColors = 0;
  if (bpp <= 8) {
    numColors = colorsUsed > 0 ? colorsUsed : (1 << bpp);
  }

  const xorOffset = headerSize + numColors * 4;
  let hasAlpha = false;

  if (bpp === 32) {
    const rowStride = width * 4;
    const andStride = Math.floor((width + 31) / 32) * 4;
    const andOffset = xorOffset + height * rowStride;

    // First pass: detect if 32-bit XOR bitmap has explicit alpha
    let anyExplicitAlpha = false;
    for (let y = 0; y < height; y++) {
      const srcRow = isTopDown ? xorOffset + y * rowStride : xorOffset + (height - 1 - y) * rowStride;
      if (srcRow + rowStride > bytes.length) break;
      for (let x = 0; x < width; x++) {
        if (bytes[srcRow + x * 4 + 3]! > 0) {
          anyExplicitAlpha = true;
          break;
        }
      }
      if (anyExplicitAlpha) break;
    }

    // Render 32bpp pixels
    for (let y = 0; y < height; y++) {
      const srcRow = isTopDown ? xorOffset + y * rowStride : xorOffset + (height - 1 - y) * rowStride;
      const andRow = isTopDown ? andOffset + y * andStride : andOffset + (height - 1 - y) * andStride;

      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;
        if (srcRow + x * 4 + 3 < bytes.length) {
          const b = bytes[srcRow + x * 4]!;
          const g = bytes[srcRow + x * 4 + 1]!;
          const r = bytes[srcRow + x * 4 + 2]!;
          let a = bytes[srcRow + x * 4 + 3]!;

          // If no explicit alpha was provided, use 1-bit AND mask for transparency
          if (!anyExplicitAlpha && andRow < bytes.length) {
            const byteIdx = andRow + Math.floor(x / 8);
            if (byteIdx < bytes.length) {
              const bit = (bytes[byteIdx]! >> (7 - (x % 8))) & 1;
              a = bit === 1 ? 0 : 255;
            } else {
              a = 255;
            }
          }

          if (a < 255) hasAlpha = true;

          out[outIdx] = r;
          out[outIdx + 1] = g;
          out[outIdx + 2] = b;
          out[outIdx + 3] = a;
        }
      }
    }
  } else if (bpp === 24) {
    const xorStride = Math.floor((24 * width + 31) / 32) * 4;
    const andStride = Math.floor((width + 31) / 32) * 4;
    const andOffset = xorOffset + height * xorStride;

    for (let y = 0; y < height; y++) {
      const srcRow = isTopDown ? xorOffset + y * xorStride : xorOffset + (height - 1 - y) * xorStride;
      const andRow = isTopDown ? andOffset + y * andStride : andOffset + (height - 1 - y) * andStride;

      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;
        const b = srcRow + x * 3 < bytes.length ? bytes[srcRow + x * 3]! : 0;
        const g = srcRow + x * 3 + 1 < bytes.length ? bytes[srcRow + x * 3 + 1]! : 0;
        const r = srcRow + x * 3 + 2 < bytes.length ? bytes[srcRow + x * 3 + 2]! : 0;

        let a = 255;
        if (andRow < bytes.length) {
          const byteIdx = andRow + Math.floor(x / 8);
          if (byteIdx < bytes.length) {
            const bit = (bytes[byteIdx]! >> (7 - (x % 8))) & 1;
            a = bit === 1 ? 0 : 255;
          }
        }

        if (a < 255) hasAlpha = true;

        out[outIdx] = r;
        out[outIdx + 1] = g;
        out[outIdx + 2] = b;
        out[outIdx + 3] = a;
      }
    }
  } else if (bpp === 8 || bpp === 4 || bpp === 1) {
    const xorStride = Math.floor((bpp * width + 31) / 32) * 4;
    const andStride = Math.floor((width + 31) / 32) * 4;
    const andOffset = xorOffset + height * xorStride;

    for (let y = 0; y < height; y++) {
      const srcRow = isTopDown ? xorOffset + y * xorStride : xorOffset + (height - 1 - y) * xorStride;
      const andRow = isTopDown ? andOffset + y * andStride : andOffset + (height - 1 - y) * andStride;

      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;
        let colorIdx = 0;

        if (bpp === 8) {
          const bytePos = srcRow + x;
          if (bytePos < bytes.length) colorIdx = bytes[bytePos]!;
        } else if (bpp === 4) {
          const bytePos = srcRow + Math.floor(x / 2);
          if (bytePos < bytes.length) {
            const byteVal = bytes[bytePos]!;
            colorIdx = (x % 2 === 0) ? (byteVal >> 4) & 0x0f : byteVal & 0x0f;
          }
        } else if (bpp === 1) {
          const bytePos = srcRow + Math.floor(x / 8);
          if (bytePos < bytes.length) {
            colorIdx = (bytes[bytePos]! >> (7 - (x % 8))) & 0x01;
          }
        }

        const palPos = paletteOffset + colorIdx * 4;
        const b = palPos < bytes.length ? bytes[palPos]! : 0;
        const g = palPos + 1 < bytes.length ? bytes[palPos + 1]! : 0;
        const r = palPos + 2 < bytes.length ? bytes[palPos + 2]! : 0;

        let a = 255;
        if (andRow < bytes.length) {
          const byteIdx = andRow + Math.floor(x / 8);
          if (byteIdx < bytes.length) {
            const bit = (bytes[byteIdx]! >> (7 - (x % 8))) & 1;
            a = bit === 1 ? 0 : 255;
          }
        }

        if (a < 255) hasAlpha = true;

        out[outIdx] = r;
        out[outIdx + 1] = g;
        out[outIdx + 2] = b;
        out[outIdx + 3] = a;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  return {
    canvas,
    ctx,
    width,
    height,
    hasAlpha,
  };
}

export interface BmpSourceData {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

export interface IcoSourceData {
  width: number;
  height: number;
  pngBytes: Uint8Array;
}

/**
 * Encodes canvas pixel data to a 24-bit or 32-bit BMP file blob.
 */
export function encodeBmp(
  canvasOrData: HTMLCanvasElement | BmpSourceData,
  includeAlpha: boolean = false
): Blob {
  let width: number;
  let height: number;
  let data: Uint8ClampedArray | Uint8Array;

  if ("data" in canvasOrData) {
    width = canvasOrData.width;
    height = canvasOrData.height;
    data = canvasOrData.data;
  } else {
    const ctx = canvasOrData.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas context unavailable for BMP encoding.");
    width = canvasOrData.width;
    height = canvasOrData.height;
    data = ctx.getImageData(0, 0, width, height).data;
  }

  const bitsPerPixel = includeAlpha ? 32 : 24;
  const bytesPerPixel = bitsPerPixel / 8;
  const rowSize = Math.floor((bitsPerPixel * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // BITMAPFILEHEADER (14 bytes)
  view.setUint16(0, 0x4d42, true); // 'BM'
  view.setUint32(2, fileSize, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint32(10, 54, true); // pixel data offset

  // BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // Bottom-up
  view.setUint16(26, 1, true); // planes
  view.setUint16(28, bitsPerPixel, true);
  view.setUint32(30, 0, true); // BI_RGB
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 2835, true); // 72 DPI
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  // Write pixel rows bottom-up
  const uint8 = new Uint8Array(buffer);
  let offset = 54;

  for (let y = height - 1; y >= 0; y--) {
    let rowOffset = offset;
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4;
      const r = data[srcIndex]!;
      const g = data[srcIndex + 1]!;
      const b = data[srcIndex + 2]!;
      const a = data[srcIndex + 3]!;

      // BMP stores in BGR order
      uint8[rowOffset++] = b;
      uint8[rowOffset++] = g;
      uint8[rowOffset++] = r;
      if (includeAlpha) {
        uint8[rowOffset++] = a;
      }
    }
    offset += rowSize;
  }

  return new Blob([buffer], { type: "image/bmp" });
}

/**
 * Encodes canvas into Windows Icon format (.ico) with embedded PNG.
 * Windows ICO standard requires icon dimensions <= 256x256.
 * If dimensions exceed 256, it is scaled down proportionally with high-quality smoothing.
 */
export async function encodeIco(
  canvasOrData: HTMLCanvasElement | IcoSourceData
): Promise<Blob> {
  let width: number;
  let height: number;
  let pngBytes: Uint8Array;

  if ("pngBytes" in canvasOrData) {
    width = Math.min(256, Math.max(1, canvasOrData.width));
    height = Math.min(256, Math.max(1, canvasOrData.height));
    pngBytes = canvasOrData.pngBytes;
  } else {
    let srcCanvas = canvasOrData;
    // Scale down if dimensions exceed ICO 256px limit
    if (canvasOrData.width > 256 || canvasOrData.height > 256) {
      const scale = 256 / Math.max(canvasOrData.width, canvasOrData.height);
      const targetW = Math.max(1, Math.round(canvasOrData.width * scale));
      const targetH = Math.max(1, Math.round(canvasOrData.height * scale));

      const scaledCanvas = document.createElement("canvas");
      scaledCanvas.width = targetW;
      scaledCanvas.height = targetH;
      const scaledCtx = scaledCanvas.getContext("2d");
      if (scaledCtx) {
        scaledCtx.imageSmoothingEnabled = true;
        scaledCtx.imageSmoothingQuality = "high";
        scaledCtx.drawImage(canvasOrData, 0, 0, targetW, targetH);
        srcCanvas = scaledCanvas;
      }
    }

    width = srcCanvas.width;
    height = srcCanvas.height;

    // Convert canvas to optimized PNG blob via compressPng
    let pngBlob: Blob;
    try {
      pngBlob = await compressPng(srcCanvas, { profile: "recommended", maxColors: 256 });
    } catch {
      pngBlob = await new Promise<Blob>((resolve, reject) => {
        srcCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("PNG encoding failed for ICO"))),
          "image/png"
        );
      });
    }
    pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
  }

  const headerSize = 6;
  const entrySize = 16;
  const totalSize = headerSize + entrySize + pngBytes.length;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // ICONDIR (6 bytes)
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // 1 = icon
  view.setUint16(4, 1, true); // count of images

  // ICONDIRENTRY (16 bytes)
  // In ICO header: 0 denotes 256 pixels
  view.setUint8(6, width >= 256 ? 0 : width);
  view.setUint8(7, height >= 256 ? 0 : height);
  view.setUint8(8, 0); // color count
  view.setUint8(9, 0); // reserved
  view.setUint16(10, 1, true); // color planes
  view.setUint16(12, 32, true); // bits per pixel
  view.setUint32(14, pngBytes.length, true); // size of image data
  view.setUint32(18, headerSize + entrySize, true); // offset of image data (22)

  // Copy PNG bytes
  const uint8 = new Uint8Array(buffer);
  uint8.set(pngBytes, headerSize + entrySize);

  return new Blob([buffer], { type: "image/x-icon" });
}

/**
 * Encodes canvas to SVG by embedding image as high-resolution data URI.
 */
export function encodeSvgWrapper(canvas: HTMLCanvasElement): Blob {
  const dataUrl = canvas.toDataURL("image/png");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${canvas.width} ${canvas.height}" width="${canvas.width}" height="${canvas.height}">
  <image width="${canvas.width}" height="${canvas.height}" xlink:href="${dataUrl}" />
</svg>`;
  return new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
}

export interface PngCompressionOptions {
  profile?: ImageCompressionProfile;
  quality?: number; // 10..100
  lossless?: boolean;
  maxColors?: number;
}

export interface PngSourceData {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

/**
 * Compresses PNG images using color quantization and DEFLATE filter optimization via UPNG.
 * Produces TinyPNG-grade file size reduction (50-80% smaller) while preserving alpha transparency.
 */
export async function compressPng(
  canvasOrData: HTMLCanvasElement | PngSourceData,
  options: PngCompressionOptions = {},
): Promise<Blob> {
  const UPNG = (await import("@pdf-lib/upng")).default;
  let width: number;
  let height: number;
  let rgba: Uint8ClampedArray | Uint8Array;

  if ("data" in canvasOrData) {
    width = canvasOrData.width;
    height = canvasOrData.height;
    rgba = canvasOrData.data;
  } else {
    const ctx = canvasOrData.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not initialize 2D context for PNG compression.");
    width = canvasOrData.width;
    height = canvasOrData.height;
    rgba = ctx.getImageData(0, 0, width, height).data;
  }

  const arrayBuffer = rgba.buffer.slice(rgba.byteOffset, rgba.byteOffset + rgba.byteLength);

  let cnum = 256;

  if (options.lossless) {
    cnum = 0; // Pure lossless PNG optimization
  } else if (options.profile === "high_quality") {
    cnum = 256; // 256 colors provides high visual fidelity
  } else if (options.profile === "balanced" || options.profile === "recommended") {
    cnum = 256; // 256 colors provides standard 50-75% size reduction
  } else if (options.profile === "max_compression") {
    cnum = 128; // Aggressive palette reduction (70-85%)
  } else if (options.profile === "custom") {
    if (typeof options.quality === "number") {
      if (options.quality >= 98) {
        cnum = 0;
      } else {
        cnum = Math.max(16, Math.min(256, Math.round((options.quality / 100) * 256)));
      }
    }
  }

  if (typeof options.maxColors === "number") {
    cnum = Math.max(16, Math.min(256, options.maxColors));
  }

  let buffer: ArrayBuffer;
  try {
    buffer = UPNG.encode([arrayBuffer], width, height, cnum);
  } catch (err) {
    console.warn("UPNG quantization failed, attempting lossless encode:", err);
    buffer = UPNG.encode([arrayBuffer], width, height, 0);
  }

  return new Blob([buffer], { type: "image/png" });
}

/**
 * Losslessly optimizes SVG markup, removing metadata and comments while strictly preserving all graphics.
 */
export async function optimizeSvg(file: File | Blob): Promise<Blob> {
  const text = await file.text();

  let optimized = text
    // Remove comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Remove XML processing instruction
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    // Remove DOCTYPE
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    // Remove Inkscape / Illustrator / Corel metadata tags
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, "")
    .replace(/<rdf:RDF[\s\S]*?<\/rdf:RDF>/gi, "")
    // Remove editor attributes
    .replace(/\s+(sodipodi:[a-z0-9_-]+|inkscape:[a-z0-9_-]+)="[^"]*"/gi, "")
    .replace(/\s+(xmlns:sodipodi|xmlns:inkscape)="[^"]*"/gi, "")
    // Collapse multi-spaces and empty lines
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  // Ensure valid SVG root
  if (!optimized.startsWith("<svg") && optimized.includes("<svg")) {
    const idx = optimized.indexOf("<svg");
    optimized = optimized.substring(idx);
  }

  return new Blob([optimized], { type: "image/svg+xml;charset=utf-8" });
}

/**
 * Converts any supported image into any other target format.
 */
export async function convertImage(
  file: File | Blob,
  options: ImageConversionOptions,
  filename?: string,
): Promise<{
  blob: Blob;
  format: SupportedImageFormat;
  mimeType: string;
  width: number;
  height: number;
  warning?: string;
}> {
  const sourceFormat = await detectImageFormat(file, filename);
  const targetFormat = options.targetFormat;
  const quality = typeof options.quality === "number" ? Math.max(0.1, Math.min(1.0, options.quality)) : 0.90;

  // 1. If both are SVG and no resize requested, optimize SVG directly
  if (sourceFormat === "SVG" && targetFormat === "SVG" && !options.width && !options.height) {
    const optBlob = await optimizeSvg(file);
    return {
      blob: optBlob,
      format: "SVG",
      mimeType: "image/svg+xml",
      width: 0,
      height: 0,
    };
  }

  // 2. Decode source into Canvas
  const decoded = await decodeToCanvas(file, sourceFormat);

  // 3. Compute target dimensions
  let targetWidth = decoded.width;
  let targetHeight = decoded.height;

  if (options.width && options.height) {
    if (options.maintainAspectRatio) {
      const ratio = Math.min(options.width / decoded.width, options.height / decoded.height);
      targetWidth = Math.max(1, Math.round(decoded.width * ratio));
      targetHeight = Math.max(1, Math.round(decoded.height * ratio));
    } else {
      targetWidth = Math.max(1, options.width);
      targetHeight = Math.max(1, options.height);
    }
  } else if (options.width) {
    const ratio = options.width / decoded.width;
    targetWidth = options.width;
    targetHeight = Math.max(1, Math.round(decoded.height * ratio));
  } else if (options.height) {
    const ratio = options.height / decoded.height;
    targetHeight = options.height;
    targetWidth = Math.max(1, Math.round(decoded.width * ratio));
  }

  // 4. Render onto target canvas
  const renderCanvas = document.createElement("canvas");
  renderCanvas.width = targetWidth;
  renderCanvas.height = targetHeight;
  const ctx = renderCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not initialize 2D context for conversion.");

  // Handle transparency vs background color
  const needsBackground = (targetFormat === "JPG" || targetFormat === "JPEG") && decoded.hasAlpha;
  let warning: string | undefined = undefined;

  if (needsBackground) {
    const bgColor = options.backgroundColor || "#ffffff";
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    warning = `JPEG does not support alpha transparency. Transparent regions were filled with background color (${bgColor}).`;
  } else {
    ctx.clearRect(0, 0, targetWidth, targetHeight);
  }

  ctx.drawImage(decoded.canvas, 0, 0, targetWidth, targetHeight);

  // 5. Encode to target format
  let outputBlob: Blob;

  if (targetFormat === "BMP") {
    outputBlob = encodeBmp(renderCanvas, formatSupportsTransparency(targetFormat) && !needsBackground);
  } else if (targetFormat === "ICO") {
    outputBlob = await encodeIco(renderCanvas);
  } else if (targetFormat === "SVG") {
    outputBlob = encodeSvgWrapper(renderCanvas);
  } else if (targetFormat === "PNG") {
    try {
      outputBlob = await compressPng(renderCanvas, {
        profile: "recommended",
        quality: Math.round(quality * 100),
        lossless: quality >= 0.95,
      });
    } catch {
      outputBlob = await new Promise<Blob>((resolve, reject) => {
        renderCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))), "image/png");
      });
    }
  } else {
    const targetMime = FORMAT_MIME_MAP[targetFormat] || "image/png";

    outputBlob = await new Promise<Blob>((resolve, reject) => {
      renderCanvas.toBlob(
        (b) => {
          if (!b) {
            reject(new Error(`Failed to encode canvas to ${targetFormat}.`));
            return;
          }
          // If AVIF is unsupported by browser canvas, fallback to WebP
          if (targetFormat === "AVIF" && b.type !== "image/avif") {
            renderCanvas.toBlob(
              (fallbackB) => {
                if (fallbackB) {
                  warning = "AVIF encoding is unsupported by this browser engine. Converted to WebP fallback.";
                  resolve(fallbackB);
                } else {
                  resolve(b);
                }
              },
              "image/webp",
              quality,
            );
            return;
          }
          resolve(b);
        },
        targetMime,
        quality,
      );
    });
  }

  let previewDataUrl: string | undefined = undefined;
  try {
    previewDataUrl = renderCanvas.toDataURL("image/png");
  } catch (err) {
    console.warn("Could not generate preview data URL:", err);
  }

  return {
    blob: outputBlob,
    format: targetFormat,
    mimeType: FORMAT_MIME_MAP[targetFormat] || outputBlob.type,
    width: targetWidth,
    height: targetHeight,
    warning,
    previewDataUrl,
  };
}

/**
 * Intelligently compresses an image while preserving content and visual quality.
 */
export async function compressImage(
  file: File | Blob,
  options: ImageCompressionOptions,
  filename?: string,
): Promise<{
  blob: Blob;
  format: SupportedImageFormat;
  mimeType: string;
  width: number;
  height: number;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  reductionBytes: number;
  reductionPercent: number;
  warning?: string;
  previewDataUrl?: string;
}> {
  const originalSizeBytes = file.size;
  const format = await detectImageFormat(file, filename);

  // Profile presets mapping
  let quality = 0.82; // 0.1 to 1.0
  let scaleRatio = 1.0;

  if (options.profile === "high_quality") {
    quality = 0.90;
    scaleRatio = 1.0;
  } else if (options.profile === "balanced") {
    quality = 0.74;
    scaleRatio = 1.0;
  } else if (options.profile === "max_compression") {
    quality = 0.58;
    scaleRatio = 0.90;
  } else if (options.profile === "custom") {
    if (typeof options.quality === "number") {
      quality = Math.max(0.1, Math.min(1.0, options.quality / 100));
    }
    if (typeof options.resizePercentage === "number") {
      scaleRatio = Math.max(0.25, Math.min(1.0, options.resizePercentage / 100));
    }
  } else {
    // "recommended" format-aware settings
    if (format === "JPG" || format === "JPEG") {
      quality = 0.78;
    } else if (format === "WEBP") {
      quality = 0.75;
    } else if (format === "AVIF") {
      quality = 0.70;
    } else {
      quality = 0.85;
    }
  }

  // 1. SVG: Lossless markup optimization without rasterization
  if (format === "SVG") {
    const optBlob = await optimizeSvg(file);
    const compressedSizeBytes = optBlob.size;
    const reductionBytes = Math.max(0, originalSizeBytes - compressedSizeBytes);
    const reductionPercent = Math.round((reductionBytes / originalSizeBytes) * 100);

    return {
      blob: optBlob,
      format: "SVG",
      mimeType: "image/svg+xml",
      width: 0,
      height: 0,
      originalSizeBytes,
      compressedSizeBytes,
      reductionBytes,
      reductionPercent,
    };
  }

  // 2. Decode image to canvas
  const decoded = await decodeToCanvas(file, format);

  // 3. Compute target dimensions (never upscale!)
  let targetWidth = Math.round(decoded.width * scaleRatio);
  let targetHeight = Math.round(decoded.height * scaleRatio);

  if (options.maxWidth && targetWidth > options.maxWidth) {
    const ratio = options.maxWidth / targetWidth;
    targetWidth = options.maxWidth;
    targetHeight = Math.max(1, Math.round(targetHeight * ratio));
  }

  if (options.maxHeight && targetHeight > options.maxHeight) {
    const ratio = options.maxHeight / targetHeight;
    targetHeight = options.maxHeight;
    targetWidth = Math.max(1, Math.round(targetWidth * ratio));
  }

  // 4. Render to target canvas
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not initialize canvas context for compression.");

  if (!formatSupportsTransparency(format)) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  } else {
    ctx.clearRect(0, 0, targetWidth, targetHeight);
  }

  ctx.drawImage(decoded.canvas, 0, 0, targetWidth, targetHeight);

  // 5. Format-specific encoding
  const targetFormat =
    options.outputFormat && options.outputFormat !== "original" ? options.outputFormat : format;

  let compressedBlob: Blob;
  let warning: string | undefined = undefined;

  if (targetFormat === "PNG") {
    let pngBlob = await compressPng(canvas, {
      profile: options.profile,
      quality: options.quality,
      lossless: options.lossless,
    });

    // If result didn't shrink and not lossless/high_quality, adaptively try tighter quantization
    if (pngBlob.size >= originalSizeBytes && options.profile !== "high_quality" && !options.lossless) {
      for (const maxColors of [128, 64, 32]) {
        try {
          const tighter = await compressPng(canvas, {
            profile: options.profile,
            maxColors,
          });
          if (tighter.size < originalSizeBytes) {
            pngBlob = tighter;
            break;
          }
        } catch {}
      }
    }

    compressedBlob = pngBlob;
  } else if (targetFormat === "JPG" || targetFormat === "JPEG") {
    const mime = "image/jpeg";
    let targetQuality = quality;

    let jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("JPEG encoding failed"))), mime, targetQuality);
    });

    // Adaptive pass if size didn't reduce
    if (jpegBlob.size >= originalSizeBytes && options.profile !== "high_quality" && targetQuality > 0.40) {
      const tighterQuality = Math.max(0.40, targetQuality - 0.18);
      const tighterBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => (b ? resolve(b) : resolve(jpegBlob)), mime, tighterQuality);
      });
      if (tighterBlob.size < originalSizeBytes) {
        jpegBlob = tighterBlob;
      }
    }

    compressedBlob = jpegBlob;
  } else if (targetFormat === "WEBP") {
    const mime = "image/webp";
    let targetQuality = quality;

    let webpBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("WebP encoding failed"))), mime, targetQuality);
    });

    if (webpBlob.size >= originalSizeBytes && options.profile !== "high_quality" && targetQuality > 0.35) {
      const tighterQuality = Math.max(0.35, targetQuality - 0.18);
      const tighterBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => (b ? resolve(b) : resolve(webpBlob)), mime, tighterQuality);
      });
      if (tighterBlob.size < originalSizeBytes) {
        webpBlob = tighterBlob;
      }
    }

    compressedBlob = webpBlob;
  } else if (targetFormat === "BMP") {
    compressedBlob = encodeBmp(canvas, decoded.hasAlpha);
  } else if (targetFormat === "ICO") {
    compressedBlob = await encodeIco(canvas);
  } else if (targetFormat === "TIFF") {
    try {
      const UTIF = (await import("utif")).default;
      const ctxTiff = canvas.getContext("2d", { willReadFrequently: true });
      if (ctxTiff) {
        const rgba = ctxTiff.getImageData(0, 0, canvas.width, canvas.height).data;
        const tiffBytes = UTIF.encodeImage(rgba, canvas.width, canvas.height);
        compressedBlob = new Blob([tiffBytes], { type: "image/tiff" });
      } else {
        throw new Error("Canvas context unavailable");
      }
    } catch {
      compressedBlob = await compressPng(canvas, { profile: options.profile, quality: options.quality });
    }
  } else {
    const mime = FORMAT_MIME_MAP[targetFormat] || "image/jpeg";
    compressedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) {
            reject(new Error("Image compression encoding failed."));
            return;
          }
          resolve(b);
        },
        mime,
        quality,
      );
    });
  }

  // 6. Honest byte comparison
  let finalBlob = compressedBlob;
  let compressedSizeBytes = compressedBlob.size;

  // If compression produced a larger file and user didn't request resize or format shift,
  // retain original file to prevent inflating size
  if (compressedSizeBytes >= originalSizeBytes && targetFormat === format && scaleRatio === 1.0) {
    finalBlob = file;
    compressedSizeBytes = originalSizeBytes;
    warning = "Image is already optimally compressed. Original file preserved without degradation.";
  }

  const reductionBytes = Math.max(0, originalSizeBytes - compressedSizeBytes);
  const reductionPercent = Math.max(
    0,
    Math.round(((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100),
  );

  let previewDataUrl: string | undefined = undefined;
  try {
    previewDataUrl = canvas.toDataURL("image/png");
  } catch (err) {
    console.warn("Could not generate preview data URL:", err);
  }

  return {
    blob: finalBlob,
    format: targetFormat,
    mimeType: FORMAT_MIME_MAP[targetFormat] || finalBlob.type,
    width: targetWidth,
    height: targetHeight,
    originalSizeBytes,
    compressedSizeBytes,
    reductionBytes,
    reductionPercent,
    warning,
    previewDataUrl,
  };
}

/**
 * Generates a displayable preview Data URL or Object URL for any image format.
 * Formats like ICO, TIFF, and HEIC cannot be rendered by native <img> tags in standard browsers,
 * so this decodes them to canvas and exports a PNG Data URL for seamless visual preview.
 */
export async function generateImagePreviewUrl(
  fileOrBlob: File | Blob,
  format?: SupportedImageFormat,
): Promise<string> {
  const resolvedFormat = format || (await detectImageFormat(fileOrBlob));

  if (resolvedFormat === "ICO" || resolvedFormat === "TIFF" || resolvedFormat === "HEIC") {
    try {
      const decoded = await decodeToCanvas(fileOrBlob, resolvedFormat);
      return decoded.canvas.toDataURL("image/png");
    } catch (e) {
      console.warn(`Could not generate canvas preview for ${resolvedFormat}:`, e);
      return URL.createObjectURL(fileOrBlob);
    }
  }

  return URL.createObjectURL(fileOrBlob);
}

/**
 * Bundles multiple converted or compressed images into a single ZIP archive.
 */
export async function createImagesZip(
  items: { filename: string; blob: Blob }[],
): Promise<Blob> {
  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const item of items) {
    let name = item.filename;
    let counter = 1;
    while (usedNames.has(name)) {
      const parts = item.filename.split(".");
      const ext = parts.pop() || "";
      const base = parts.join(".");
      name = `${base}_${counter}.${ext}`;
      counter++;
    }
    usedNames.add(name);
    zip.file(name, item.blob);
  }

  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
