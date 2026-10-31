import React, { useState, useRef } from "react";
import {
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  Sliders,
  Maximize2,
  Trash2,
  Archive,
  Layers,
  ArrowRight,
  Info,
  Check,
  Palette,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  detectImageFormat,
  convertImage,
  createImagesZip,
  formatSupportsTransparency,
  FORMAT_EXT_MAP,
  type SupportedImageFormat,
} from "@/lib/image-processor";

export interface ImageFileQueueItem {
  id: string;
  file: File;
  originalName: string;
  originalFormat: SupportedImageFormat;
  originalSizeBytes: number;
  originalUrl: string;
  width?: number;
  height?: number;
  hasAlpha?: boolean;
  status: "pending" | "processing" | "success" | "error";
  convertedBlob?: Blob;
  convertedUrl?: string;
  convertedFormat?: SupportedImageFormat;
  convertedSizeBytes?: number;
  convertedWidth?: number;
  convertedHeight?: number;
  warning?: string;
  errorMessage?: string;
}

const AVAILABLE_TARGET_FORMATS: { format: SupportedImageFormat; label: string; desc: string; supportsAlpha: boolean }[] = [
  { format: "PNG", label: "PNG", desc: "Lossless with full alpha transparency", supportsAlpha: true },
  { format: "JPG", label: "JPG / JPEG", desc: "Universal photo format, standard compression", supportsAlpha: false },
  { format: "WEBP", label: "WebP", desc: "Modern web standard with high compression", supportsAlpha: true },
  { format: "AVIF", label: "AVIF", desc: "Next-gen ultra-efficient image compression", supportsAlpha: true },
  { format: "BMP", label: "BMP", desc: "Uncompressed Windows bitmap format", supportsAlpha: false },
  { format: "ICO", label: "ICO", desc: "Standard multi-size Windows icon file", supportsAlpha: true },
  { format: "SVG", label: "SVG", desc: "Scalable Vector Graphics container", supportsAlpha: true },
  { format: "GIF", label: "GIF", desc: "Web graphics with transparency & animation", supportsAlpha: true },
  { format: "TIFF", label: "TIFF", desc: "High-resolution desktop publishing & print", supportsAlpha: true },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function ImageConverterView() {
  const [items, setItems] = useState<ImageFileQueueItem[]>([]);
  const [targetFormat, setTargetFormat] = useState<SupportedImageFormat>("WEBP");
  const [quality, setQuality] = useState<number>(90);
  const [enableResize, setEnableResize] = useState<boolean>(false);
  const [targetWidth, setTargetWidth] = useState<string>("");
  const [targetHeight, setTargetHeight] = useState<string>("");
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  const [converting, setConverting] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [downloadingZip, setDownloadingZip] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const newItems: ImageFileQueueItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const originalUrl = URL.createObjectURL(file);
      const originalFormat = await detectImageFormat(file, file.name);

      newItems.push({
        id,
        file,
        originalName: file.name,
        originalFormat,
        originalSizeBytes: file.size,
        originalUrl,
        status: "pending",
      });
    }

    setItems((prev) => [...prev, ...newItems]);
    toast.success(`Added ${newItems.length} image${newItems.length === 1 ? "" : "s"} to conversion queue.`);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.originalUrl) URL.revokeObjectURL(target.originalUrl);
      if (target?.convertedUrl) URL.revokeObjectURL(target.convertedUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleClearAll = () => {
    for (const item of items) {
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
      if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
    }
    setItems([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConvertAll = async () => {
    if (items.length === 0 || converting) return;

    setConverting(true);
    setProgress({ current: 0, total: items.length });

    const widthNum = enableResize && targetWidth ? parseInt(targetWidth, 10) : undefined;
    const heightNum = enableResize && targetHeight ? parseInt(targetHeight, 10) : undefined;

    const updated = [...items];

    for (let i = 0; i < updated.length; i++) {
      const item = updated[i]!;
      item.status = "processing";
      setItems([...updated]);
      setProgress({ current: i + 1, total: updated.length });

      try {
        const res = await convertImage(item.file, {
          targetFormat,
          quality: quality / 100,
          width: widthNum,
          height: heightNum,
          maintainAspectRatio: maintainAspect,
          backgroundColor,
        });

        const convertedUrl = URL.createObjectURL(res.blob);
        item.status = "success";
        item.convertedBlob = res.blob;
        item.convertedUrl = convertedUrl;
        item.convertedFormat = res.format;
        item.convertedSizeBytes = res.blob.size;
        item.convertedWidth = res.width;
        item.convertedHeight = res.height;
        item.warning = res.warning;
      } catch (err) {
        console.error(`Conversion error for ${item.originalName}:`, err);
        item.status = "error";
        item.errorMessage = err instanceof Error ? err.message : "Conversion failed.";
      }

      setItems([...updated]);
    }

    setConverting(false);
    toast.success("Image conversion complete!");
  };

  const handleDownloadSingle = (item: ImageFileQueueItem) => {
    if (!item.convertedBlob || !item.convertedFormat) return;
    const baseName = item.originalName.replace(/\.[^/.]+$/, "");
    const ext = FORMAT_EXT_MAP[item.convertedFormat] || "png";
    const downloadName = `${baseName}_converted.${ext}`;

    const url = URL.createObjectURL(item.convertedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${downloadName}`);
  };

  const handleDownloadAllZip = async () => {
    const successfulItems = items.filter((i) => i.status === "success" && i.convertedBlob && i.convertedFormat);
    if (successfulItems.length === 0) return;

    setDownloadingZip(true);
    try {
      const zipEntries = successfulItems.map((item) => {
        const baseName = item.originalName.replace(/\.[^/.]+$/, "");
        const ext = FORMAT_EXT_MAP[item.convertedFormat!] || "png";
        return {
          filename: `${baseName}.${ext}`,
          blob: item.convertedBlob!,
        };
      });

      const zipBlob = await createImagesZip(zipEntries);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DocuMind_Converted_Images_${targetFormat.toLowerCase()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Downloaded all converted images in ZIP archive!");
    } catch (err) {
      console.error("ZIP packaging error:", err);
      toast.error("Failed to generate ZIP archive.");
    } finally {
      setDownloadingZip(false);
    }
  };

  const successfulCount = items.filter((i) => i.status === "success").length;
  const isTargetTransparent = formatSupportsTransparency(targetFormat);

  return (
    <div className="space-y-6">
      {/* Educational Banner */}
      <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 p-4 text-xs text-foreground/80 flex items-start gap-3">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-foreground">Universal Bidirectional Image Conversion:</strong>
          <p className="leading-relaxed">
            Convert seamlessly across PNG, JPG, WebP, AVIF, BMP, GIF, TIFF, HEIC, ICO, and SVG. Adjust quality, custom dimensions, and background fill color when converting transparent images into non-transparent formats (like JPG).
          </p>
        </div>
      </div>

      {/* Upload Box */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-paper space-y-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            1. Upload Images for Conversion (Single or Batch)
          </label>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer.files?.length) {
                handleFiles(e.dataTransfer.files);
              }
            }}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-2/40 p-8 text-center transition-all hover:border-primary hover:bg-surface-2 cursor-pointer"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.png,.jpg,.jpeg,.webp,.avif,.bmp,.gif,.tiff,.tif,.heic,.heif,.ico,.svg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleFiles(e.target.files);
                }
              }}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
              <Upload className="h-6 w-6" />
            </div>

            <h3 className="text-sm font-semibold text-foreground">
              Click to browse or drag & drop images
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Supported formats: PNG, JPG/JPEG, WebP, AVIF, BMP, GIF, TIFF, HEIC, ICO, and SVG
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
              {["PNG", "JPG", "WebP", "AVIF", "BMP", "GIF", "TIFF", "HEIC", "ICO", "SVG"].map((fmt) => (
                <span
                  key={fmt}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-2 border border-border/80 text-muted-foreground"
                >
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Target Format Selector */}
        {items.length > 0 && (
          <div className="space-y-4 border-t border-border pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. Choose Target Output Format
              </label>
              <span className="text-[11px] text-muted-foreground">
                Converts {items.length} image{items.length === 1 ? "" : "s"} simultaneously
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {AVAILABLE_TARGET_FORMATS.map((tf) => (
                <button
                  key={tf.format}
                  type="button"
                  onClick={() => setTargetFormat(tf.format)}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    targetFormat === tf.format
                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/20 text-foreground"
                      : "border-border bg-surface-2/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <span className="font-bold text-xs">{tf.label}</span>
                    {tf.supportsAlpha && (
                      <span className="ml-auto text-[9px] px-1.5 py-0.2 rounded font-mono bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Alpha
                      </span>
                    )}
                  </div>
                  <span className="mt-1 text-[10px] text-muted-foreground line-clamp-1">{tf.desc}</span>
                </button>
              ))}
            </div>

            {/* Non-transparency alert & background color option */}
            {!isTargetTransparent && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <strong className="font-semibold">{targetFormat} does not support transparency:</strong>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Transparent regions will be filled with the chosen background color to prevent unexpected black backgrounds.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 bg-background/80 px-2.5 py-1 rounded-lg border border-border">
                  <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
                    <Palette className="h-3 w-3" /> BG Color:
                  </span>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="h-6 w-7 rounded cursor-pointer border-none bg-transparent"
                    title="Choose fill color for transparent areas"
                  />
                  <span className="font-mono text-[11px] text-muted-foreground">{backgroundColor}</span>
                </div>
              </div>
            )}

            {/* Quality & Resize Controls Accordion/Panel */}
            <div className="rounded-xl border border-border bg-surface-2/30 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Quality Slider (for lossy formats) */}
                {["JPG", "JPEG", "WEBP", "AVIF"].includes(targetFormat) && (
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <Sliders className="h-3.5 w-3.5 text-primary" /> Image Quality:
                      </span>
                      <span className="font-mono font-bold text-primary">{quality}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={quality}
                      onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                      className="w-full accent-primary cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>10% (Smaller)</span>
                      <span>85% (Balanced)</span>
                      <span>100% (Lossless)</span>
                    </div>
                  </div>
                )}

                {/* Resize Option Toggle */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableResize}
                      onChange={(e) => setEnableResize(e.target.checked)}
                      className="rounded border-border accent-primary cursor-pointer"
                    />
                    <span>Custom Resize Dimensions</span>
                  </label>
                </div>
              </div>

              {enableResize && (
                <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-3 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground font-mono">W:</span>
                    <input
                      type="number"
                      placeholder="Auto"
                      value={targetWidth}
                      onChange={(e) => setTargetWidth(e.target.value)}
                      className="w-20 px-2 py-1 rounded-md border border-border bg-background text-foreground font-mono text-xs focus:border-primary outline-none"
                    />
                    <span className="text-muted-foreground">px</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground font-mono">H:</span>
                    <input
                      type="number"
                      placeholder="Auto"
                      value={targetHeight}
                      onChange={(e) => setTargetHeight(e.target.value)}
                      className="w-20 px-2 py-1 rounded-md border border-border bg-background text-foreground font-mono text-xs focus:border-primary outline-none"
                    />
                    <span className="text-muted-foreground">px</span>
                  </div>
                  <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer ml-2">
                    <input
                      type="checkbox"
                      checked={maintainAspect}
                      onChange={(e) => setMaintainAspect(e.target.checked)}
                      className="rounded border-border accent-primary cursor-pointer"
                    />
                    <span>Lock Aspect Ratio (No Distortion)</span>
                  </label>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                variant="glass"
                size="sm"
                onClick={handleClearAll}
                disabled={converting}
                className="text-xs text-muted-foreground hover:text-red-500 gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear All ({items.length})
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="hero"
                  size="lg"
                  onClick={handleConvertAll}
                  disabled={converting || items.length === 0}
                  className="gap-2 px-6"
                >
                  {converting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Converting {progress.current} of {progress.total}...
                    </>
                  ) : (
                    <>
                      Convert {items.length} Image{items.length === 1 ? "" : "s"} to {targetFormat}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar during Batch Processing */}
      {converting && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs font-semibold text-primary">
            <span>Processing Conversions...</span>
            <span className="font-mono">
              {progress.current} / {progress.total} Completed
            </span>
          </div>
          <div className="h-2 w-full bg-primary/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Conversion Results / Queue Display */}
      {items.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">
                Conversion Queue & Results ({items.length})
              </span>
              {successfulCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {successfulCount} Converted Successfully
                </span>
              )}
            </div>

            {successfulCount > 1 && (
              <Button
                variant="hero"
                size="sm"
                onClick={handleDownloadAllZip}
                disabled={downloadingZip}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {downloadingZip ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Archive className="h-3.5 w-3.5" />
                )}
                Download All ({successfulCount}) as ZIP
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => {
              const isDone = item.status === "success";
              const isErr = item.status === "error";
              const isProc = item.status === "processing";

              const sizeDiff =
                item.convertedSizeBytes && item.originalSizeBytes
                  ? item.convertedSizeBytes - item.originalSizeBytes
                  : 0;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 space-y-3 transition-all ${
                    isDone
                      ? "border-emerald-500/30 bg-card shadow-xs"
                      : isErr
                        ? "border-red-500/30 bg-red-500/5"
                        : "border-border bg-card"
                  }`}
                >
                  {/* Top file meta header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-foreground truncate" title={item.originalName}>
                        {item.originalName}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                        <span className="font-mono uppercase font-semibold text-primary">
                          {item.originalFormat}
                        </span>
                        <span>· {formatBytes(item.originalSizeBytes)}</span>
                        {item.convertedFormat && (
                          <>
                            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                            <span className="font-mono uppercase font-bold text-emerald-600">
                              {item.convertedFormat}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {!converting && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-muted-foreground hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer"
                        title="Remove image"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Previews: Original & Converted side-by-side */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Original Preview */}
                    <div className="rounded-xl border border-border/80 bg-surface-2/40 p-2 flex flex-col items-center justify-between text-center min-h-[140px]">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold mb-1">
                        Original ({item.originalFormat})
                      </span>
                      <div className="h-20 w-full flex items-center justify-center overflow-hidden rounded-lg bg-black/5 dark:bg-white/5">
                        <img
                          src={item.originalUrl}
                          alt="Original"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground mt-1">
                        {formatBytes(item.originalSizeBytes)}
                      </span>
                    </div>

                    {/* Converted Preview */}
                    <div className="rounded-xl border border-border/80 bg-surface-2/40 p-2 flex flex-col items-center justify-between text-center min-h-[140px]">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold mb-1">
                        {isDone ? `Converted (${item.convertedFormat})` : "Target Preview"}
                      </span>
                      <div className="h-20 w-full flex items-center justify-center overflow-hidden rounded-lg bg-black/5 dark:bg-white/5">
                        {isDone && item.convertedUrl ? (
                          <img
                            src={item.convertedUrl}
                            alt="Converted"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : isProc ? (
                          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                        ) : isErr ? (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Ready</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground mt-1">
                        {isDone && item.convertedSizeBytes ? (
                          <span
                            className={
                              sizeDiff < 0
                                ? "text-emerald-600 font-bold"
                                : sizeDiff > 0
                                  ? "text-amber-600 font-bold"
                                  : "text-muted-foreground"
                            }
                          >
                            {formatBytes(item.convertedSizeBytes)} (
                            {sizeDiff < 0 ? "-" : "+"}
                            {Math.abs(Math.round((sizeDiff / item.originalSizeBytes) * 100))}%)
                          </span>
                        ) : (
                          "Pending"
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Warning or Error note */}
                  {item.warning && (
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                      {item.warning}
                    </p>
                  )}
                  {item.errorMessage && (
                    <p className="text-[10px] text-red-600 dark:text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                      {item.errorMessage}
                    </p>
                  )}

                  {/* Download single button */}
                  {isDone && (
                    <Button
                      variant="hero"
                      size="sm"
                      onClick={() => handleDownloadSingle(item)}
                      className="w-full gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5"
                    >
                      <Download className="h-3.5 w-3.5" /> Download Converted {item.convertedFormat}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
