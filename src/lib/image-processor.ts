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

  // 3. Standard image decoding via HTMLImageElement & Object URL
  return new Promise<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    hasAlpha: boolean;
  }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(sourceBlob);
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
      reject(new Error(`Failed to decode image data for format ${format}. The file may be corrupted.`));
    };

    img.src = objectUrl;
  });
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
 */
export async function encodeIco(
  canvasOrData: HTMLCanvasElement | IcoSourceData
): Promise<Blob> {
  let width: number;
  let height: number;
  let pngBytes: Uint8Array;

  if ("pngBytes" in canvasOrData) {
    width = canvasOrData.width > 256 ? 256 : canvasOrData.width;
    height = canvasOrData.height > 256 ? 256 : canvasOrData.height;
    pngBytes = canvasOrData.pngBytes;
  } else {
    // Convert canvas to PNG blob
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvasOrData.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))), "image/png");
    });
    pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
    width = canvasOrData.width > 256 ? 256 : canvasOrData.width;
    height = canvasOrData.height > 256 ? 256 : canvasOrData.height;
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
  view.setUint8(6, width === 256 ? 0 : width);
  view.setUint8(7, height === 256 ? 0 : height);
  view.setUint8(8, 0); // color count
  view.setUint8(9, 0); // reserved
  view.setUint16(10, 1, true); // color planes
  view.setUint16(12, 32, true); // bits per pixel
  view.setUint32(14, pngBytes.length, true); // size of image data
  view.setUint32(18, headerSize + entrySize, true); // offset of image data

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

  return {
    blob: outputBlob,
    format: targetFormat,
    mimeType: FORMAT_MIME_MAP[targetFormat] || outputBlob.type,
    width: targetWidth,
    height: targetHeight,
    warning,
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

  if (targetFormat === "BMP") {
    compressedBlob = encodeBmp(canvas, decoded.hasAlpha);
  } else if (targetFormat === "ICO") {
    compressedBlob = await encodeIco(canvas);
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
  };
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
