// Nén & chuyển định dạng ảnh ngay trên máy trước khi tải lên,
// giúp landing công khai tải nhanh trên điện thoại.

export type OptimizedImage = {
  file: File;
  width: number;
  height: number;
};

const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

async function loadBitmap(file: File): Promise<{ w: number; h: number; draw: CanvasImageSource; cleanup: () => void }> {
  if ("createImageBitmap" in window) {
    const bmp = await createImageBitmap(file);
    return { w: bmp.width, h: bmp.height, draw: bmp, cleanup: () => bmp.close?.() };
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Không đọc được ảnh"));
    img.src = url;
  });
  return { w: img.naturalWidth, h: img.naturalHeight, draw: img, cleanup: () => URL.revokeObjectURL(url) };
}

function supportsType(type: string) {
  if (!isBrowser()) return false;
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  return c.toDataURL(type).startsWith(`data:${type}`);
}

/**
 * Nén ảnh về chiều rộng tối đa maxWidth, xuất WebP (fallback JPEG).
 * Trả về file gốc nếu không phải ảnh raster hoặc trình duyệt không hỗ trợ.
 */
export async function optimizeImage(
  file: File,
  opts: { maxWidth?: number; quality?: number } = {},
): Promise<OptimizedImage> {
  const maxWidth = opts.maxWidth ?? 1600;
  const quality = opts.quality ?? 0.82;

  if (!isBrowser() || !file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return { file, width: 0, height: 0 };
  }

  try {
    const { w, h, draw, cleanup } = await loadBitmap(file);
    const scale = Math.min(1, maxWidth / Math.max(1, w));
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      cleanup();
      return { file, width: w, height: h };
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(draw, 0, 0, outW, outH);
    cleanup();

    const type = supportsType("image/webp") ? "image/webp" : "image/jpeg";
    const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), type, quality));
    if (!blob) return { file, width: w, height: h };
    // Chỉ dùng bản nén nếu thực sự nhỏ hơn (hoặc ảnh đã bị thu nhỏ)
    if (blob.size >= file.size && scale === 1) return { file, width: w, height: h };

    const ext = type === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return {
      file: new File([blob], `${base}.${ext}`, { type, lastModified: Date.now() }),
      width: outW,
      height: outH,
    };
  } catch {
    return { file, width: 0, height: 0 };
  }
}

/** Bản ảnh lớn (desktop) + bản nhỏ cho điện thoại. */
export async function optimizeImageVariants(file: File) {
  const large = await optimizeImage(file, { maxWidth: 1600, quality: 0.82 });
  const small = await optimizeImage(file, { maxWidth: 800, quality: 0.75 });
  return { large, small };
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
