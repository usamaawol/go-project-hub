import { describe, it, expect } from "bun:test";
import {
  detectImageFormat,
  formatSupportsTransparency,
  encodeBmp,
  encodeIco,
  parseIcoMetadata,
  compressPng,
  optimizeSvg,
  createImagesZip,
  generateImagePreviewUrl,
  FORMAT_EXT_MAP,
  FORMAT_MIME_MAP,
  type SupportedImageFormat,
} from "@/lib/image-processor";

describe("DocuMind Image Converter & Compressor Verification", () => {
  describe("Format Detection via Magic Bytes & Extension", () => {
    it("detects PNG by magic bytes", async () => {
      // 89 50 4E 47 0D 0A 1A 0A
      const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
      const blob = new Blob([bytes], { type: "application/octet-stream" });
      const format = await detectImageFormat(blob, "unknown_file");
      expect(format).toBe("PNG");
    });

    it("detects JPEG by magic bytes", async () => {
      // FF D8 FF
      const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      const blob = new Blob([bytes], { type: "application/octet-stream" });
      const format = await detectImageFormat(blob, "photo_without_ext");
      expect(format).toBe("JPG");
    });

    it("detects GIF by magic bytes", async () => {
      // GIF89a
      const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00]);
      const blob = new Blob([bytes], { type: "application/octet-stream" });
      const format = await detectImageFormat(blob, "graphic");
      expect(format).toBe("GIF");
    });

    it("detects WebP by magic bytes", async () => {
      // RIFF....WEBP
      const bytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x20, 0x00, 0x00, 0x00, // size
        0x57, 0x45, 0x42, 0x50, // WEBP
        0x56, 0x50, 0x38, 0x20, // VP8
      ]);
      const blob = new Blob([bytes], { type: "application/octet-stream" });
      const format = await detectImageFormat(blob, "web-asset");
      expect(format).toBe("WEBP");
    });

    it("detects BMP by magic bytes", async () => {
      // BM
      const bytes = new Uint8Array([0x42, 0x4d, 0x36, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      const blob = new Blob([bytes], { type: "application/octet-stream" });
      const format = await detectImageFormat(blob, "sample");
      expect(format).toBe("BMP");
    });

    it("detects TIFF (little endian and big endian) by magic bytes", async () => {
      // Little Endian: II * \0
      const leBytes = new Uint8Array([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]);
      const leBlob = new Blob([leBytes]);
      expect(await detectImageFormat(leBlob, "le_file")).toBe("TIFF");

      // Big Endian: MM \0 *
      const beBytes = new Uint8Array([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08]);
      const beBlob = new Blob([beBytes]);
      expect(await detectImageFormat(beBlob, "be_file")).toBe("TIFF");
    });

    it("detects ICO by magic bytes", async () => {
      // 00 00 01 00
      const bytes = new Uint8Array([0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x20, 0x20]);
      const blob = new Blob([bytes]);
      expect(await detectImageFormat(blob, "favicon")).toBe("ICO");
    });

    it("detects AVIF by ftyp box in header", async () => {
      const bytes = new Uint8Array([
        0x00, 0x00, 0x00, 0x1c, // box size
        0x66, 0x74, 0x79, 0x70, // 'ftyp'
        0x61, 0x76, 0x69, 0x66, // 'avif'
        0x00, 0x00, 0x00, 0x00,
      ]);
      const blob = new Blob([bytes]);
      expect(await detectImageFormat(blob, "asset")).toBe("AVIF");
    });

    it("detects HEIC by ftypheic header", async () => {
      const bytes = new Uint8Array([
        0x00, 0x00, 0x00, 0x18,
        0x66, 0x74, 0x79, 0x70, // 'ftyp'
        0x68, 0x65, 0x69, 0x63, // 'heic'
        0x00, 0x00, 0x00, 0x00,
      ]);
      const blob = new Blob([bytes]);
      expect(await detectImageFormat(blob, "iphone_photo")).toBe("HEIC");
    });

    it("detects SVG by text markup inspection", async () => {
      const svgText = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="red" /></svg>`;
      const blob = new Blob([svgText], { type: "image/svg+xml" });
      expect(await detectImageFormat(blob, "icon.xml")).toBe("SVG");
    });

    it("falls back to file extension when magic bytes are ambiguous", async () => {
      const dummyBlob = new Blob([new Uint8Array([0x12, 0x34, 0x56, 0x78])]);
      expect(await detectImageFormat(dummyBlob, "picture.png")).toBe("PNG");
      expect(await detectImageFormat(dummyBlob, "picture.jpg")).toBe("JPG");
      expect(await detectImageFormat(dummyBlob, "picture.jpeg")).toBe("JPG");
      expect(await detectImageFormat(dummyBlob, "picture.webp")).toBe("WEBP");
      expect(await detectImageFormat(dummyBlob, "picture.avif")).toBe("AVIF");
      expect(await detectImageFormat(dummyBlob, "picture.bmp")).toBe("BMP");
      expect(await detectImageFormat(dummyBlob, "picture.gif")).toBe("GIF");
      expect(await detectImageFormat(dummyBlob, "picture.tif")).toBe("TIFF");
      expect(await detectImageFormat(dummyBlob, "picture.tiff")).toBe("TIFF");
      expect(await detectImageFormat(dummyBlob, "picture.heic")).toBe("HEIC");
      expect(await detectImageFormat(dummyBlob, "picture.heif")).toBe("HEIC");
      expect(await detectImageFormat(dummyBlob, "picture.ico")).toBe("ICO");
      expect(await detectImageFormat(dummyBlob, "picture.svg")).toBe("SVG");
    });
  });

  describe("Transparency Capabilities & Metadata Mapping", () => {
    it("correctly identifies formats that support alpha transparency", () => {
      expect(formatSupportsTransparency("PNG")).toBe(true);
      expect(formatSupportsTransparency("WEBP")).toBe(true);
      expect(formatSupportsTransparency("AVIF")).toBe(true);
      expect(formatSupportsTransparency("SVG")).toBe(true);
      expect(formatSupportsTransparency("ICO")).toBe(true);
      expect(formatSupportsTransparency("TIFF")).toBe(true);
      expect(formatSupportsTransparency("GIF")).toBe(true);
    });

    it("correctly identifies formats that do not support transparency (requiring background fill)", () => {
      expect(formatSupportsTransparency("JPG")).toBe(false);
      expect(formatSupportsTransparency("BMP")).toBe(false);
    });

    it("has valid MIME types and file extensions for all 10 formats", () => {
      const formats: SupportedImageFormat[] = [
        "PNG", "JPG", "WEBP", "AVIF", "BMP", "GIF", "TIFF", "HEIC", "ICO", "SVG"
      ];
      for (const fmt of formats) {
        expect(FORMAT_EXT_MAP[fmt]).toBeDefined();
        expect(FORMAT_EXT_MAP[fmt].length).toBeGreaterThan(0);
        expect(FORMAT_MIME_MAP[fmt]).toBeDefined();
        expect(FORMAT_MIME_MAP[fmt]).toContain("/");
      }
    });
  });

  describe("Pure JavaScript Encoders (BMP & ICO)", () => {
    it("encodes valid 24-bit uncompressed Windows BMP", () => {
      const width = 2;
      const height = 2;
      // 2x2 red image
      const rgba = new Uint8ClampedArray([
        255, 0, 0, 255,   255, 0, 0, 255,
        255, 0, 0, 255,   255, 0, 0, 255,
      ]);
      const bmpBlob = encodeBmp({ width, height, data: rgba }, false);
      expect(bmpBlob.type).toBe("image/bmp");
      expect(bmpBlob.size).toBeGreaterThan(54); // Header is 54 bytes
    });

    it("encodes valid 32-bit BMP with alpha channel", () => {
      const width = 4;
      const height = 4;
      const rgba = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < rgba.length; i += 4) {
        rgba[i] = 0;     // R
        rgba[i + 1] = 255; // G
        rgba[i + 2] = 0; // B
        rgba[i + 3] = 128; // Alpha 50%
      }
      const bmpBlob = encodeBmp({ width, height, data: rgba }, true);
      expect(bmpBlob.type).toBe("image/bmp");
      expect(bmpBlob.size).toBe(54 + width * height * 4); // 54 header + 32-bit pixels
    });

    it("encodes valid Windows ICO container with embedded PNG", async () => {
      const pngPayload1 = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02]);
      
      const icoBlob = await encodeIco({
        width: 16,
        height: 16,
        pngBytes: pngPayload1,
      });

      expect(icoBlob.type).toBe("image/x-icon");
      // Header: 6 bytes + 1 * 16 bytes directory + payload size
      const expectedSize = 6 + 16 + pngPayload1.length;
      expect(icoBlob.size).toBe(expectedSize);

      const buffer = await icoBlob.arrayBuffer();
      const meta = parseIcoMetadata(buffer);
      expect(meta.count).toBe(1);
      expect(meta.bestWidth).toBe(16);
      expect(meta.bestHeight).toBe(16);
      expect(meta.isPng).toBe(true);
    });

    it("clamps oversized dimensions to ICO 256px specification limit and encodes 0 byte for 256", async () => {
      const pngPayload = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x0a, 0x0b]);

      // When input is 1920x1080 (e.g. screenshot), ICO entry must clamp to <= 256x256
      const icoBlob = await encodeIco({
        width: 1920,
        height: 1080,
        pngBytes: pngPayload,
      });

      const buffer = await icoBlob.arrayBuffer();
      const view = new DataView(buffer);

      // In ICO directory entry (offset 6 and 7): 0 denotes 256 pixels
      expect(view.getUint8(6)).toBe(0); // width clamped to 256 -> stored as 0
      expect(view.getUint8(7)).toBe(0); // height clamped to 256 -> stored as 0

      const meta = parseIcoMetadata(buffer);
      expect(meta.bestWidth).toBe(256);
      expect(meta.bestHeight).toBe(256);
      expect(meta.isPng).toBe(true);
    });

    it("parses classic Windows DIB icon metadata correctly", async () => {
      // Construct a valid classic 16x16 32-bit DIB ICO container
      const dibHeaderSize = 40;
      const xorSize = 16 * 16 * 4; // 1024 bytes
      const andStride = Math.floor((16 + 31) / 32) * 4; // 4 bytes per row
      const andSize = andStride * 16; // 64 bytes
      const dibPayloadSize = dibHeaderSize + xorSize + andSize;

      const totalSize = 6 + 16 + dibPayloadSize;
      const buffer = new ArrayBuffer(totalSize);
      const view = new DataView(buffer);

      // ICONDIR
      view.setUint16(0, 0, true);
      view.setUint16(2, 1, true); // type = ICO
      view.setUint16(4, 1, true); // 1 image

      // ICONDIRENTRY
      view.setUint8(6, 16); // width
      view.setUint8(7, 16); // height
      view.setUint16(10, 1, true); // planes
      view.setUint16(12, 32, true); // bpp
      view.setUint32(14, dibPayloadSize, true);
      view.setUint32(18, 22, true); // offset = 6 + 16

      // BITMAPINFOHEADER at offset 22
      const dibOffset = 22;
      view.setUint32(dibOffset, 40, true); // biSize
      view.setInt32(dibOffset + 4, 16, true); // biWidth
      view.setInt32(dibOffset + 8, 32, true); // biHeight (32 = 2 * 16 for XOR + AND)
      view.setUint16(dibOffset + 12, 1, true); // biPlanes
      view.setUint16(dibOffset + 14, 32, true); // biBitCount

      const meta = parseIcoMetadata(buffer);
      expect(meta.count).toBe(1);
      expect(meta.bestWidth).toBe(16);
      expect(meta.bestHeight).toBe(16);
      expect(meta.bestBpp).toBe(32);
      expect(meta.isPng).toBe(false); // correctly identifies as DIB, not PNG
    });

    it("generates fallback preview URLs for standard web formats", async () => {
      const pngBlob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00])], { type: "image/png" });
      const previewUrl = await generateImagePreviewUrl(pngBlob, "PNG");
      expect(typeof previewUrl).toBe("string");
      expect(previewUrl.startsWith("blob:")).toBe(true);
    });
  });

  describe("Lossless SVG Optimization", () => {
    it("safely minifies SVG markup without destroying elements or rasterizing", async () => {
      const rawSvg = `
        <?xml version="1.0" encoding="utf-8"?>
        <!-- Generator: Adobe Illustrator 26.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
        <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
             xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
             x="0px" y="0px" viewBox="0 0 500 500" style="enable-background:new 0 0 500 500;" xml:space="preserve">
          <!-- Main circle graphic -->
          <metadata>
            <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
              <cc:Work rdf:about="">
                <dc:format>image/svg+xml</dc:format>
              </cc:Work>
            </rdf:RDF>
          </metadata>
          <g inkscape:groupmode="layer" inkscape:label="Artwork">
            <circle cx="250" cy="250" r="150" fill="#3B82F6" stroke="#1D4ED8" stroke-width="4" />
            <path d="M 200 200 L 300 200 L 250 300 Z" fill="#FFFFFF" />
          </g>
        </svg>
      `;

      const inputBlob = new Blob([rawSvg], { type: "image/svg+xml" });
      const optimizedBlob = await optimizeSvg(inputBlob);

      const optimizedText = await optimizedBlob.text();

      // Comments removed
      expect(optimizedText.includes("Adobe Illustrator")).toBe(false);
      expect(optimizedText.includes("Main circle graphic")).toBe(false);

      // Metadata removed
      expect(optimizedText.includes("<metadata>")).toBe(false);
      expect(optimizedText.includes("</metadata>")).toBe(false);

      // Inkscape junk removed
      expect(optimizedText.includes("inkscape:label")).toBe(false);

      // Essential SVG vectors preserved!
      expect(optimizedText.includes("<svg")).toBe(true);
      expect(optimizedText.includes("viewBox=")).toBe(true);
      expect(optimizedText.includes("<circle")).toBe(true);
      expect(optimizedText.includes("<path")).toBe(true);
      expect(optimizedText.includes("#3B82F6")).toBe(true);

      // Genuine file size reduction achieved
      expect(optimizedBlob.size).toBeLessThan(inputBlob.size);
    });
  });

  describe("Batch ZIP Packaging", () => {
    it("packages multiple image blobs into a valid ZIP file", async () => {
      const entry1 = {
        filename: "image1.png",
        blob: new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x01, 0x02, 0x03])], { type: "image/png" }),
      };
      const entry2 = {
        filename: "image2.webp",
        blob: new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x04, 0x05, 0x06])], { type: "image/webp" }),
      };

      const zipBlob = await createImagesZip([entry1, entry2]);
      expect(zipBlob.type).toBe("application/zip");
      expect(zipBlob.size).toBeGreaterThan(100);

      const buffer = await zipBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // ZIP magic bytes: PK\x03\x04 (0x50 0x4B 0x03 0x04)
      expect(bytes[0]).toBe(0x50);
      expect(bytes[1]).toBe(0x4b);
      expect(bytes[2]).toBe(0x03);
      expect(bytes[3]).toBe(0x04);
    });
  });

  describe("Intelligent PNG Image Compression & Quantization", () => {
    it("compresses PNG with TinyPNG-style color quantization reducing size by > 60%", async () => {
      const width = 100;
      const height = 100;
      const data = new Uint8ClampedArray(width * height * 4);
      // Create multi-color image with gradient
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          data[idx] = (x * 2.5) % 256;
          data[idx + 1] = (y * 2.5) % 256;
          data[idx + 2] = (x + y) % 256;
          data[idx + 3] = x < 20 ? 128 : 255; // Semi-transparent area
        }
      }

      const rawByteLength = data.byteLength; // 40,000 bytes
      const compressed = await compressPng({ width, height, data }, { profile: "recommended" });

      expect(compressed.type).toBe("image/png");
      expect(compressed.size).toBeLessThan(rawByteLength * 0.35); // at least 65% smaller than raw
      expect(compressed.size).toBeGreaterThan(0);

      // Verify magic bytes of output are valid PNG
      const buf = await compressed.arrayBuffer();
      const u8 = new Uint8Array(buf);
      expect(u8[0]).toBe(0x89);
      expect(u8[1]).toBe(0x50);
      expect(u8[2]).toBe(0x4e);
      expect(u8[3]).toBe(0x47);
    });

    it("supports lossless PNG compression and preserves bit-exact alpha", async () => {
      const width = 32;
      const height = 32;
      const data = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 120;
        data[i + 1] = 200;
        data[i + 2] = 255;
        data[i + 3] = (i / 4) % 256; // gradient alpha
      }

      const losslessBlob = await compressPng({ width, height, data }, { lossless: true });
      expect(losslessBlob.type).toBe("image/png");
      expect(losslessBlob.size).toBeGreaterThan(0);

      const UPNG = (await import("@pdf-lib/upng")).default;
      const decoded = UPNG.decode(await losslessBlob.arrayBuffer());
      expect(decoded.width).toBe(width);
      expect(decoded.height).toBe(height);
      const rgbaBack = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
      expect(rgbaBack[3]).toBe(data[3]); // alpha preserved exactly
    });

    it("compresses tighter with max_compression compared to high_quality", async () => {
      const width = 80;
      const height = 80;
      const data = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = (i * 3) % 256;
        data[i + 1] = (i * 7) % 256;
        data[i + 2] = (i * 11) % 256;
        data[i + 3] = 255;
      }

      const hq = await compressPng({ width, height, data }, { profile: "high_quality" });
      const maxComp = await compressPng({ width, height, data }, { profile: "max_compression" });

      expect(maxComp.size).toBeLessThanOrEqual(hq.size);
    });
  });
});
