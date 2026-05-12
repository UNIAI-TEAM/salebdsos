// Reusable QR generator (client-side render).
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";

interface Props {
  value: string;
  size?: number;
  label?: string;
  filename?: string;
}

export function QrCode({ value, size = 220, label, filename = "qr-code" }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, value, {
      width: size,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
    QRCode.toDataURL(value, { width: size * 2, margin: 1 }).then(setDataUrl);
  }, [value, size]);

  return (
    <div className="inline-flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border">
      <canvas ref={ref} />
      {label && <div className="text-xs font-medium text-slate-700">{label}</div>}
      {dataUrl && (
        <a
          href={dataUrl}
          download={`${filename}.png`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Download className="h-3 w-3" /> Tải PNG
        </a>
      )}
    </div>
  );
}
