// Nút liên hệ nhanh: gọi, Zalo, SMS, email — dùng ở trang khách hàng và timeline.
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, MessageSquare, Mail } from "lucide-react";

/** Chuẩn hoá số điện thoại Việt Nam cho link Zalo (84xxxxxxxxx). */
function zaloNumber(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (digits.startsWith("84")) return digits;
  if (digits.startsWith("0")) return `84${digits.slice(1)}`;
  return digits;
}

export function QuickContact({
  phone,
  email,
  name,
  size = "sm",
  compact = false,
}: {
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  size?: "sm" | "icon";
  compact?: boolean;
}) {
  const tel = phone?.trim() || "";
  const mail = email?.trim() || "";
  if (!tel && !mail) return null;

  const greeting = `Xin chào ${name || "anh/chị"}, em liên hệ về nhu cầu bất động sản của mình ạ.`;
  const iconOnly = size === "icon" || compact;
  const btn = (label: string, href: string, Icon: any, primary = false) => (
    <Button
      asChild
      key={label}
      size={iconOnly ? "icon" : "sm"}
      variant={primary ? "default" : "outline"}
      title={label}
      aria-label={label}
    >
      <a href={href} target="_blank" rel="noreferrer">
        <Icon className={iconOnly ? "h-4 w-4" : "mr-2 h-4 w-4"} />
        {iconOnly ? null : label}
      </a>
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tel ? btn("Zalo", `https://zalo.me/${zaloNumber(tel)}`, MessageCircle, true) : null}
      {tel ? btn("Gọi", `tel:${tel.replace(/\s/g, "")}`, Phone) : null}
      {tel
        ? btn("SMS", `sms:${tel.replace(/\s/g, "")}?&body=${encodeURIComponent(greeting)}`, MessageSquare)
        : null}
      {mail
        ? btn(
            "Email",
            `mailto:${mail}?subject=${encodeURIComponent("Thông tin bất động sản")}&body=${encodeURIComponent(greeting)}`,
            Mail,
          )
        : null}
    </div>
  );
}
