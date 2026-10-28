// Biểu tượng kênh tin nhắn: kênh thương hiệu dùng màu nhận diện riêng,
// kênh nội bộ (chat web, SMS, email, cuộc gọi, ghi chú) dùng icon trung tính.
import { Globe, Mail, MessageSquare, Phone, Send, StickyNote } from "lucide-react";
import { CHANNEL_LABEL } from "@/lib/channels";

const BRAND_BG: Record<string, string> = {
  zalo: "#0068FF",
  messenger: "#0084FF",
  whatsapp: "#25D366",
  telegram: "#26A5E4",
  viber: "#7360F2",
};

function Glyph({ channel }: { channel: string }) {
  switch (channel) {
    case "zalo":
      return <span aria-hidden className="text-[9px] font-bold leading-none text-white">Z</span>;
    case "messenger":
      return (
        <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="size-3 text-white">
          <path d="M12 3C7.03 3 3 6.58 3 11c0 2.38 1.19 4.52 3.06 5.97V21l3.02-1.66c.93.25 1.92.38 2.92.38 4.97 0 9-3.58 9-8.02S16.97 3 12 3Zm1.06 10.6-2.35-2.51-4.53 2.51 4.94-5.26 2.41 2.51 4.47-2.51-4.94 5.26Z" />
        </svg>
      );
    case "whatsapp":
    case "viber":
    case "call":
      return <Phone className="size-2.5" aria-hidden />;
    case "telegram":
      return <Send className="size-2.5" aria-hidden />;
    case "sms":
      return <MessageSquare className="size-2.5" aria-hidden />;
    case "email":
      return <Mail className="size-2.5" aria-hidden />;
    case "web_chat":
      return <Globe className="size-2.5" aria-hidden />;
    case "note":
      return <StickyNote className="size-2.5" aria-hidden />;
    default:
      return <MessageSquare className="size-2.5" aria-hidden />;
  }
}

/** Huy hiệu tròn nhỏ màu thương hiệu của kênh; dùng ở danh sách, bong bóng tin nhắn và chi tiết khách. */
export function ChannelGlyph({ channel, className = "size-5" }: { channel: string; className?: string }) {
  const brand = BRAND_BG[channel];
  return (
    <span
      role="img"
      aria-label={CHANNEL_LABEL[channel] ?? channel}
      title={CHANNEL_LABEL[channel] ?? channel}
      className={`grid shrink-0 place-items-center rounded-full ${brand ? "text-white" : "bg-muted text-muted-foreground"}`}
      style={brand ? { backgroundColor: brand } : undefined}
    >
      <Glyph channel={channel} />
    </span>
  );
}
