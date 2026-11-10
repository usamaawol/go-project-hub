/**
 * DocuMind Image Verification & Sanitization Engine
 * 
 * Guarantees that:
 * 1. Broken, missing, invisible, or corrupt images are never added to presentations or PPTX.
 * 2. Remote URLs are verified and converted to stable Base64 data URLs.
 * 3. Formats unsupported by PowerPoint (like WebP or raw HTML errors) are caught and handled.
 * 4. Failed images are cleanly removed, triggering fallback to editable diagrams or clean text layouts.
 */

export interface ImageVerificationResult {
  valid: boolean;
  format?: "png" | "jpeg" | "svg+xml";
  dataUrl?: string;
  width?: number;
  height?: number;
  error?: string;
}

function decodeBase64Bytes(base64Data: string): Uint8Array | null {
  try {
    if (typeof Buffer !== "undefined") {
      return new Uint8Array(Buffer.from(base64Data, "base64"));
    }
    const bin = atob(base64Data);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/**
 * Inspects binary magic signature and pixel width/height for PNG and JPEG payloads.
 */
export function inspectRasterBytes(bytes: Uint8Array): {
  format?: "png" | "jpeg";
  width?: number;
  height?: number;
  error?: string;
} {
  if (!bytes || bytes.length < 24) {
    return { error: "Raster image buffer is truncated or too small." };
  }

  // PNG magic: 89 50 4E 47 0D 0A 1A 0A, IHDR width@16..19 height@20..23
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const width = ((bytes[16]! << 24) | (bytes[17]! << 16) | (bytes[18]! << 8) | bytes[19]!) >>> 0;
    const height = ((bytes[20]! << 24) | (bytes[21]! << 16) | (bytes[22]! << 8) | bytes[23]!) >>> 0;
    return { format: "png", width, height };
  }

  // JPEG magic: FF D8 FF -> scan SOF0..SOF3 frames for width & height
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = bytes[i + 1]!;
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3) {
        const height = ((bytes[i + 5]! << 8) | bytes[i + 6]!) >>> 0;
        const width = ((bytes[i + 7]! << 8) | bytes[i + 8]!) >>> 0;
        return { format: "jpeg", width, height };
      }
      const segLen = ((bytes[i + 2]! << 8) | bytes[i + 3]!) >>> 0;
      if (segLen < 2) break;
      i += 2 + segLen;
    }
    return { format: "jpeg" };
  }

  return { error: "Binary signature does not match valid PNG or JPEG headers." };
}

/**
 * Validates whether an SVG string is syntactically sound and non-empty.
 */
export function isValidSvgString(svg: string): boolean {
  if (!svg || typeof svg !== "string") return false;
  const trimmed = svg.trim();
  if (trimmed.length < 30) return false;
  const hasOpening = /<svg[\s>]/i.test(trimmed);
  const hasClosing = /<\/svg>/i.test(trimmed);
  return hasOpening && hasClosing;
}

/**
 * Validates a Base64 image data URL.
 */
export function validateBase64DataUrl(dataUrl: string): ImageVerificationResult {
  if (!dataUrl || typeof dataUrl !== "string") {
    return { valid: false, error: "Empty image data URL" };
  }

  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) {
    // Might be raw SVG or unencoded data URL
    if (dataUrl.startsWith("data:image/svg+xml")) {
      const commaIdx = dataUrl.indexOf(",");
      if (commaIdx > 0) {
        const raw = decodeURIComponent(dataUrl.slice(commaIdx + 1));
        if (isValidSvgString(raw)) {
          return { valid: true, format: "svg+xml", dataUrl };
        }
      }
    }
    return { valid: false, error: "Invalid data URL structure" };
  }

  const rawFormat = match[1]!.toLowerCase();
  const base64Data = match[2]!;

  // Minimum payload length check (a 1x1 png is ~68 bytes base64)
  if (base64Data.length < 50) {
    return { valid: false, error: "Image data is empty or too small" };
  }

  if (rawFormat === "svg+xml" || rawFormat === "svg") {
    try {
      const decoded = atob(base64Data);
      if (!isValidSvgString(decoded)) {
        return { valid: false, error: "Corrupted SVG XML payload" };
      }
      return { valid: true, format: "svg+xml", dataUrl };
    } catch {
      return { valid: false, error: "Malformed base64 SVG data" };
    }
  }

  if (rawFormat === "jpeg" || rawFormat === "jpg") {
    return { valid: true, format: "jpeg", dataUrl };
  }

  if (rawFormat === "png") {
    return { valid: true, format: "png", dataUrl };
  }

  // WebP is not supported natively in standard PowerPoint desktop
  if (rawFormat === "webp") {
    return {
      valid: false,
      error: "WebP format is not supported in PowerPoint; JPEG/PNG required.",
    };
  }

  return { valid: true, format: "png", dataUrl };
}

/**
 * Verifies any image source (remote URL, data URL, or SVG string).
 * If remote, downloads it, verifies HTTP 200, non-zero size, and encodes to stable data URL.
 */
export async function verifyAndSanitizeImage(
  urlOrData?: string,
  timeoutMs = 12000,
): Promise<ImageVerificationResult> {
  if (!urlOrData || typeof urlOrData !== "string") {
    return { valid: false, error: "No image provided" };
  }

  const trimmed = urlOrData.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Empty image string" };
  }

  // Case 1: Raw SVG string
  if (isValidSvgString(trimmed)) {
    const b64 = Buffer.from(trimmed, "utf-8").toString("base64");
    return {
      valid: true,
      format: "svg+xml",
      dataUrl: `data:image/svg+xml;base64,${b64}`,
    };
  }

  // Case 2: Base64 Data URL
  if (trimmed.startsWith("data:image/")) {
    return validateBase64DataUrl(trimmed);
  }

  // Case 3: Remote HTTP / HTTPS URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const res = await fetch(trimmed, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Accept: "image/png,image/jpeg,image/svg+xml,*/*",
        },
      });

      if (!res.ok) {
        return {
          valid: false,
          error: `Remote image fetch returned HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const contentType = res.headers.get("content-type") || "";
      if (
        !contentType.includes("image/") &&
        !contentType.includes("octet-stream") &&
        !contentType.includes("svg")
      ) {
        return {
          valid: false,
          error: `Remote URL returned non-image content-type: ${contentType}`,
        };
      }

      const buffer = await res.arrayBuffer();
      if (!buffer || buffer.byteLength < 80) {
        return {
          valid: false,
          error: "Remote image file is empty or corrupted (under 80 bytes).",
        };
      }

      const b64 = Buffer.from(buffer).toString("base64");
      const isJpeg = contentType.includes("jpeg") || contentType.includes("jpg");
      const isSvg = contentType.includes("svg");
      const mime = isSvg ? "image/svg+xml" : isJpeg ? "image/jpeg" : "image/png";
      const format = isSvg ? "svg+xml" : isJpeg ? "jpeg" : "png";

      return {
        valid: true,
        format,
        dataUrl: `data:${mime};base64,${b64}`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        valid: false,
        error: `Failed to download remote image: ${msg}`,
      };
    }
  }

  return { valid: false, error: "Unrecognized image format or URI scheme" };
}

/**
 * Strict slide visual gatekeeper: validates raster binary signatures & minimum usable resolution
 * (`>= 120px` unless SVG diagram), rejecting tracking pixels, broken HTML errors, and empty images.
 */
export async function verifySlideVisualAsset(
  urlOrData?: string,
  options?: { minDimensionPx?: number; timeoutMs?: number },
): Promise<ImageVerificationResult> {
  const minPx = options?.minDimensionPx ?? 120;
  const sanitized = await verifyAndSanitizeImage(urlOrData, options?.timeoutMs ?? 12000);
  if (!sanitized.valid || !sanitized.dataUrl) {
    return sanitized;
  }

  if (sanitized.format === "svg+xml") {
    const commaIdx = sanitized.dataUrl.indexOf(",");
    const payload = commaIdx > 0 ? sanitized.dataUrl.slice(commaIdx + 1) : "";
    let svgText = "";
    try {
      svgText = sanitized.dataUrl.includes(";base64,")
        ? new TextDecoder().decode(decodeBase64Bytes(payload) || new Uint8Array())
        : decodeURIComponent(payload);
    } catch {
      return { valid: false, error: "Corrupted SVG visual payload" };
    }
    if (!isValidSvgString(svgText) || /<script[\s>]/i.test(svgText)) {
      return { valid: false, error: "Unsafe or malformed SVG visual" };
    }
    return sanitized;
  }

  const match = sanitized.dataUrl.match(/^data:image\/(?:png|jpeg|jpg);base64,(.+)$/);
  if (!match) {
    return { valid: false, error: "Unsupported raster encoding for PowerPoint export" };
  }
  const bytes = decodeBase64Bytes(match[1]!);
  if (!bytes) {
    return { valid: false, error: "Failed to decode raster image bytes" };
  }
  const info = inspectRasterBytes(bytes);
  if (info.error) {
    return { valid: false, error: info.error };
  }
  if (
    typeof info.width === "number" &&
    typeof info.height === "number" &&
    (info.width < minPx || info.height < minPx)
  ) {
    return {
      valid: false,
      error: `Image dimensions ${info.width}x${info.height}px are below minimum slide visibility threshold (${minPx}px).`,
    };
  }

  return {
    ...sanitized,
    ...(typeof info.width === "number" ? { width: info.width } : {}),
    ...(typeof info.height === "number" ? { height: info.height } : {}),
  };
}
