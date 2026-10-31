import React, { useState, useRef } from "react";
import {
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Gauge,
  Sliders,
  Trash2,
  Archive,
  ArrowRight,
  Info,
  ShieldCheck,
  Sparkles,
  Maximize2,
  Layers,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  detectImageFormat,
  compressImage,
  createImagesZip,
  generateImagePreviewUrl,
  FORMAT_EXT_MAP,
  type SupportedImageFormat,
  type ImageCompressionProfile,
} from "@/lib/image-processor";

export interface ImageCompressorQueueItem {
  id: string;
  file: File;
  originalName: string;
  originalFormat: SupportedImageFormat;
  originalSizeBytes: number;
  originalUrl: string;
  originalPreviewUrl?: string;
  originalWidth?: number;
  originalHeight?: number;
  status: "pending" | "processing" | "success" | "error";
  compressedBlob?: Blob;
  compressedUrl?: string;
  compressedPreviewUrl?: string;
  compressedFormat?: SupportedImageFormat;
  compressedSizeBytes?: number;
  compressedWidth?: number;
  compressedHeight?: number;
  reductionBytes?: number;
  reductionPercent?: number;
  warning?: string;
  errorMessage?: string;
}

const PROFILES: {
  id: ImageCompressionProfile;
  label: string;
  badge: string;
  desc: string;
}[] = [
  {
    id: "recommended",
    label: "Recommended (Smart Auto)",
    badge: "Adaptive",
    desc: "Intelligently chooses optimal compression per format (JPEG 78%, WebP 75%, PNG lossless).",
  },
  {
    id: "high_quality",
    label: "High Quality (Light Shrink)",
    badge: "90% Quality",
    desc: "Preserves maximum visual fidelity with minimal compression artifacts. Perfect for print/portfolios.",
  },
  {
    id: "balanced",
    label: "Balanced (Web & Email)",
    badge: "74% Quality",
    desc: "Standard balance between small file size and sharp screen rendering. Ideal for websites and attachments.",
  },
  {
    id: "max_compression",
    label: "Maximum Compression",
    badge: "58% Quality",
    desc: "Aggressively reduces file weight to bypass strict file-size limits on portals and mobile devices.",
  },
  {
    id: "custom",
    label: "Custom Quality & Resize",
    badge: "Manual",
    desc: "Fine-tune quality percentages, max dimensions, resize ratios, and metadata options manually.",
  },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function ImageCompressorView() {
  const [items, setItems] = useState<ImageCompressorQueueItem[]>([]);
  const [profile, setProfile] = useState<ImageCompressionProfile>("recommended");
  const [outputFormat, setOutputFormat] = useState<SupportedImageFormat | "original">("original");
  const [customQuality, setCustomQuality] = useState<number>(75);
  const [lossless, setLossless] = useState<boolean>(false);
  const [resizePercent, setResizePercent] = useState<number>(100);
  const [maxWidth, setMaxWidth] = useState<string>("");
  const [maxHeight, setMaxHeight] = useState<string>("");
  const [compressing, setCompressing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [downloadingZip, setDownloadingZip] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const newItems: ImageCompressorQueueItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const originalUrl = URL.createObjectURL(file);
      const originalFormat = await detectImageFormat(file, file.name);
      let originalPreviewUrl: string | undefined = undefined;

      try {
        originalPreviewUrl = await generateImagePreviewUrl(file, originalFormat);
      } catch (err) {
        console.warn("Could not generate preview for item:", err);
      }

      newItems.push({
        id,
        file,
        originalName: file.name,
        originalFormat,
        originalSizeBytes: file.size,
        originalUrl,
        originalPreviewUrl,
        status: "pending",
      });
    }

    setItems((prev) => [...prev, ...newItems]);
    toast.success(`Added ${newItems.length} image${newItems.length === 1 ? "" : "s"} to compression queue.`);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.originalUrl) URL.revokeObjectURL(target.originalUrl);
      if (target?.originalPreviewUrl && target.originalPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.originalPreviewUrl);
      }
      if (target?.compressedUrl) URL.revokeObjectURL(target.compressedUrl);
      if (target?.compressedPreviewUrl && target.compressedPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.compressedPreviewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleClearAll = () => {
    for (const item of items) {
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
      if (item.originalPreviewUrl && item.originalPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.originalPreviewUrl);
      }
      if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
      if (item.compressedPreviewUrl && item.compressedPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.compressedPreviewUrl);
      }
    }
    setItems([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCompressAll = async () => {
    if (items.length === 0 || compressing) return;

    setCompressing(true);
    setProgress({ current: 0, total: items.length });

    const maxW = maxWidth ? parseInt(maxWidth, 10) : undefined;
    const maxH = maxHeight ? parseInt(maxHeight, 10) : undefined;

    const updated = [...items];

    for (let i = 0; i < updated.length; i++) {
      const item = updated[i]!;
      item.status = "processing";
      setItems([...updated]);
      setProgress({ current: i + 1, total: updated.length });

      try {
        const res = await compressImage(item.file, {
          profile,
          quality: customQuality,
          resizePercentage: resizePercent,
          maxWidth: maxW,
          maxHeight: maxH,
          outputFormat: outputFormat !== "original" ? outputFormat : undefined,
          lossless: profile === "custom" ? lossless : undefined,
        });

        const compressedUrl = URL.createObjectURL(res.blob);
        let compressedPreviewUrl = res.previewDataUrl;
        if (!compressedPreviewUrl && (res.format === "ICO" || res.format === "TIFF" || res.format === "HEIC")) {
          try {
            compressedPreviewUrl = await generateImagePreviewUrl(res.blob, res.format);
          } catch {}
        }

        item.status = "success";
        item.compressedBlob = res.blob;
        item.compressedUrl = compressedUrl;
        item.compressedPreviewUrl = compressedPreviewUrl;
        item.compressedFormat = res.format;
        item.compressedSizeBytes = res.compressedSizeBytes;
        item.compressedWidth = res.width;
        item.compressedHeight = res.height;
        item.reductionBytes = res.reductionBytes;
        item.reductionPercent = res.reductionPercent;
        item.warning = res.warning;
      } catch (err) {
        console.error(`Compression error for ${item.originalName}:`, err);
        item.status = "error";
        item.errorMessage = err instanceof Error ? err.message : "Compression failed.";
      }

      setItems([...updated]);
    }

    setCompressing(false);
    toast.success("Image compression complete!");
  };

  const handleDownloadSingle = (item: ImageCompressorQueueItem) => {
    if (!item.compressedBlob || !item.compressedFormat) return;
    const baseName = item.originalName.replace(/\.[^/.]+$/, "");
    const ext = FORMAT_EXT_MAP[item.compressedFormat] || "jpg";
    const downloadName = `compressed_${baseName}.${ext}`;

    const url = URL.createObjectURL(item.compressedBlob);
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
    const successfulItems = items.filter(
      (i) => i.status === "success" && i.compressedBlob && i.compressedFormat,
    );
    if (successfulItems.length === 0) return;

    setDownloadingZip(true);
    try {
      const zipEntries = successfulItems.map((item) => {
        const baseName = item.originalName.replace(/\.[^/.]+$/, "");
        const ext = FORMAT_EXT_MAP[item.compressedFormat!] || "jpg";
        return {
          filename: `compressed_${baseName}.${ext}`,
          blob: item.compressedBlob!,
        };
      });

      const zipBlob = await createImagesZip(zipEntries);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DocuMind_Compressed_Images.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Downloaded all compressed images in ZIP archive!");
    } catch (err) {
      console.error("ZIP packaging error:", err);
      toast.error("Failed to generate ZIP archive.");
    } finally {
      setDownloadingZip(false);
    }
  };

  // Metrics summary
  const successfulItems = items.filter((i) => i.status === "success");
  const totalOriginalBytes = successfulItems.reduce((acc, i) => acc + i.originalSizeBytes, 0);
  const totalCompressedBytes = successfulItems.reduce((acc, i) => acc + (i.compressedSizeBytes || 0), 0);
  const totalSavedBytes = Math.max(0, totalOriginalBytes - totalCompressedBytes);
  const overallReductionPercent =
    totalOriginalBytes > 0 ? Math.round((totalSavedBytes / totalOriginalBytes) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Educational Banner */}
      <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 p-4 text-xs text-foreground/80 flex items-start gap-3">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-foreground">Intelligent Multi-Format Image Compression:</strong>
          <p className="leading-relaxed">
            Reduce image file sizes while preserving visual quality. Upload one or multiple images and choose your preferred compression settings.
          </p>
        </div>
      </div>

      {/* Upload Card */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-paper space-y-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            1. Select Images to Compress (Single or Batch)
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
              Supports PNG, JPG, WebP, AVIF, BMP, GIF, TIFF, HEIC, ICO, and SVG files up to 50 MB
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

        {/* Compression Profiles & Options */}
        {items.length > 0 && (
          <div className="space-y-4 border-t border-border pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. Choose Image Compression Level
              </label>
              <span className="text-[11px] text-muted-foreground">
                {items.length} image{items.length === 1 ? "" : "s"} queued
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {PROFILES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfile(p.id)}
                  className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                    profile === p.id
                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/20 text-foreground"
                      : "border-border bg-surface-2/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs">{p.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-primary/10 text-primary border border-primary/20">
                      {p.badge}
                    </span>
                  </div>
                  <span className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {p.desc}
                  </span>
                </button>
              ))}
            </div>

            {/* Output Format Selector Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-surface-2/30">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground">Target Output Format:</span>
                <p className="text-[11px] text-muted-foreground">Keep original format or compress directly into WebP / JPEG / PNG.</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "original", label: "Auto (Original)" },
                  { id: "WEBP", label: "WebP (Ultra Shrink)" },
                  { id: "JPG", label: "JPEG" },
                  { id: "PNG", label: "PNG" },
                  { id: "AVIF", label: "AVIF" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setOutputFormat(opt.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      outputFormat === opt.id
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground border border-border/60"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom controls if custom profile selected */}
            {profile === "custom" && (
              <div className="rounded-xl border border-border bg-surface-2/30 p-4 space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Quality slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">Target Quality:</span>
                      <span className="font-mono font-bold text-primary">{customQuality}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={customQuality}
                      onChange={(e) => setCustomQuality(parseInt(e.target.value, 10))}
                      disabled={lossless}
                      className="w-full accent-primary cursor-pointer disabled:opacity-40"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>10% (Lowest)</span>
                      <span>75% (Standard)</span>
                      <span>100% (Lossless)</span>
                    </div>
                  </div>

                  {/* Scale ratio slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">Resize Scale:</span>
                      <span className="font-mono font-bold text-primary">{resizePercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={25}
                      max={100}
                      step={5}
                      value={resizePercent}
                      onChange={(e) => setResizePercent(parseInt(e.target.value, 10))}
                      className="w-full accent-primary cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>25% (Quarter)</span>
                      <span>50% (Half)</span>
                      <span>100% (Original)</span>
                    </div>
                  </div>
                </div>

                {/* Lossless checkbox & Max dimension bounds */}
                <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={lossless}
                      onChange={(e) => setLossless(e.target.checked)}
                      className="rounded accent-primary cursor-pointer"
                    />
                    <span className="font-medium">Lossless Mode (Optimize compression without altering pixels)</span>
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-muted-foreground font-medium">Max Bounds:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground font-mono">Max W:</span>
                      <input
                        type="number"
                        placeholder="e.g. 1920"
                        value={maxWidth}
                        onChange={(e) => setMaxWidth(e.target.value)}
                        className="w-20 px-2 py-1 rounded-md border border-border bg-background text-foreground font-mono text-xs focus:border-primary outline-none"
                      />
                      <span className="text-muted-foreground">px</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground font-mono">Max H:</span>
                      <input
                        type="number"
                        placeholder="e.g. 1080"
                        value={maxHeight}
                        onChange={(e) => setMaxHeight(e.target.value)}
                        className="w-20 px-2 py-1 rounded-md border border-border bg-background text-foreground font-mono text-xs focus:border-primary outline-none"
                      />
                      <span className="text-muted-foreground">px</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                variant="glass"
                size="sm"
                onClick={handleClearAll}
                disabled={compressing}
                className="text-xs text-muted-foreground hover:text-red-500 gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear All ({items.length})
              </Button>

              <Button
                variant="hero"
                size="lg"
                onClick={handleCompressAll}
                disabled={compressing || items.length === 0}
                className="gap-2 px-6"
              >
                {compressing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Compressing {progress.current} of {progress.total}...
                  </>
                ) : (
                  <>
                    Compress {items.length} Image{items.length === 1 ? "" : "s"}
                    <Zap className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {compressing && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs font-semibold text-primary">
            <span>Intelligent Image Compression in Progress...</span>
            <span className="font-mono">
              {progress.current} / {progress.total} Processed
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

      {/* Results Summary Bar */}
      {successfulItems.length > 0 && (
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-card p-4 sm:p-6 shadow-paper flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">
                Compression Complete — Saved {formatBytes(totalSavedBytes)} ({overallReductionPercent}% reduction)
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                Original: {formatBytes(totalOriginalBytes)} → Compressed: {formatBytes(totalCompressedBytes)} ({successfulItems.length} images)
              </p>
            </div>
          </div>

          {successfulItems.length > 1 && (
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
              Download All as ZIP
            </Button>
          )}
        </div>
      )}

      {/* Queue & Comparison Cards */}
      {items.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => {
              const isDone = item.status === "success";
              const isErr = item.status === "error";
              const isProc = item.status === "processing";

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
                        {isDone && item.reductionPercent !== undefined && (
                          <span className="font-mono font-bold text-emerald-600 ml-1">
                            -{item.reductionPercent}% saved
                          </span>
                        )}
                      </div>
                    </div>

                    {!compressing && (
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

                  {/* Previews: Original & Compressed side-by-side */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Original Preview */}
                    <div className="rounded-xl border border-border/80 bg-surface-2/40 p-2 flex flex-col items-center justify-between text-center min-h-[140px]">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold mb-1">
                        Original ({formatBytes(item.originalSizeBytes)})
                      </span>
                      <div className="h-20 w-full flex items-center justify-center overflow-hidden rounded-lg bg-black/5 dark:bg-white/5">
                        <img
                          src={item.originalPreviewUrl || item.originalUrl}
                          alt="Original"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground mt-1">
                        {item.originalFormat}
                      </span>
                    </div>

                    {/* Compressed Preview */}
                    <div className="rounded-xl border border-border/80 bg-surface-2/40 p-2 flex flex-col items-center justify-between text-center min-h-[140px]">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold mb-1">
                        {isDone ? `Compressed (${formatBytes(item.compressedSizeBytes || 0)})` : "Compressed"}
                      </span>
                      <div className="h-20 w-full flex items-center justify-center overflow-hidden rounded-lg bg-black/5 dark:bg-white/5">
                        {isDone && (item.compressedPreviewUrl || item.compressedUrl) ? (
                          <img
                            src={item.compressedPreviewUrl || item.compressedUrl}
                            alt="Compressed"
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
                        {isDone && item.reductionPercent !== undefined ? (
                          <span className="text-emerald-600 font-bold">
                            Saved {item.reductionPercent}%
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
                      <Download className="h-3.5 w-3.5" /> Download Compressed Image
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
