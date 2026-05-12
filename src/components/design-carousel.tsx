import { useMemo, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Radio, QrCode, Building2, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

type Category = "all" | "nfc" | "qr" | "bds";

type Template = {
  id: string;
  name: string;
  role: string;
  brand: string;
  city: string;
  phone: string;
  email: string;
  categories: Exclude<Category, "all">[];
  /** Tailwind classes for the card surface */
  surface: string;
  /** Tailwind classes for accent bar / chip */
  accent: string;
  /** Brand text color */
  brandText: string;
  /** Subtext color */
  subText: string;
};

const TEMPLATES: Template[] = [
  {
    id: "01",
    name: "Nguyễn Văn A",
    role: "Chuyên viên tư vấn BĐS cao cấp",
    brand: "ABC REAL ESTATE",
    city: "Vinhomes Ocean Park 2 · Hà Nội",
    phone: "0987 654 321",
    email: "nguyenvana@gmail.com",
    categories: ["nfc", "qr", "bds"],
    surface: "bg-gradient-to-br from-[#0b1538] via-[#11215c] to-[#1a3aa3] text-white",
    accent: "bg-amber-300/90 text-[#0b1538]",
    brandText: "text-amber-300",
    subText: "text-white/70",
  },
  {
    id: "02",
    name: "Trần Minh Đức",
    role: "Chuyên viên tư vấn BĐS",
    brand: "LUXURY REAL ESTATE",
    city: "Masteri Waterfront · Hà Nội",
    phone: "0938 222 848",
    email: "duc.tran@luxuryreal.vn",
    categories: ["nfc", "qr", "bds"],
    surface: "bg-gradient-to-br from-[#fbf7ee] to-[#f0e6cf] text-[#1a1408]",
    accent: "bg-[#b48e3a] text-white",
    brandText: "text-[#b48e3a]",
    subText: "text-[#5b4a26]",
  },
  {
    id: "03",
    name: "Lê Thu Hương",
    role: "Chuyên viên tư vấn BĐS",
    brand: "HOMEPLUS",
    city: "Lumi Hanoi · Nam Từ Liêm",
    phone: "0912 345 678",
    email: "huong.le@homeplus.vn",
    categories: ["nfc", "qr", "bds"],
    surface: "bg-gradient-to-br from-[#0f2418] via-[#143524] to-[#1c4a32] text-white",
    accent: "bg-emerald-300/90 text-[#0f2418]",
    brandText: "text-emerald-300",
    subText: "text-white/70",
  },
  {
    id: "04",
    name: "Phạm Tuấn Anh",
    role: "Chuyên viên tư vấn BĐS",
    brand: "GLOBAL CITY",
    city: "The Global City · TP.HCM",
    phone: "0906 168 268",
    email: "tuananh.pham@gmail.com",
    categories: ["nfc", "bds"],
    surface: "bg-gradient-to-br from-[#0a1340] via-[#152574] to-[#2748b4] text-white",
    accent: "bg-sky-300/90 text-[#0a1340]",
    brandText: "text-sky-300",
    subText: "text-white/70",
  },
  {
    id: "05",
    name: "Đỗ Quốc Bảo",
    role: "Chuyên viên tư vấn BĐS",
    brand: "ELITE REAL ESTATE",
    city: "Eaton Park · TP.HCM",
    phone: "0888 668 699",
    email: "bao.do@elitereal.vn",
    categories: ["nfc", "qr", "bds"],
    surface: "bg-gradient-to-br from-[#0a0a0a] via-[#161616] to-[#262421] text-white",
    accent: "bg-amber-300/90 text-black",
    brandText: "text-amber-300",
    subText: "text-white/65",
  },
  {
    id: "06",
    name: "Nguyễn Hải Yến",
    role: "Chuyên viên tư vấn BĐS",
    brand: "GREEN HOMES",
    city: "Vinhomes Smart City · Hà Nội",
    phone: "0961 789 456",
    email: "haiyen.nguyen@greenhomes.vn",
    categories: ["nfc", "qr", "bds"],
    surface: "bg-gradient-to-br from-[#f7f9f5] to-[#dceadb] text-[#0f2418]",
    accent: "bg-emerald-700 text-white",
    brandText: "text-emerald-800",
    subText: "text-emerald-900/65",
  },
  {
    id: "07",
    name: "Bùi Thị Ngọc",
    role: "Chuyên viên tư vấn BĐS",
    brand: "SUNLAND",
    city: "Sunshine City · Cầu Giấy, Hà Nội",
    phone: "0945 662 288",
    email: "ngoc.bui@sunland.vn",
    categories: ["qr", "bds"],
    surface: "bg-gradient-to-br from-[#3a0a12] via-[#5a1320] to-[#7a1a2c] text-white",
    accent: "bg-amber-200 text-[#3a0a12]",
    brandText: "text-amber-200",
    subText: "text-white/70",
  },
  {
    id: "08",
    name: "Hoàng Minh Long",
    role: "Chuyên viên tư vấn BĐS",
    brand: "MEGA REALTY",
    city: "Masteri Centre Point · Q9",
    phone: "0978 555 111",
    email: "long.hoang@megarealty.vn",
    categories: ["nfc", "qr", "bds"],
    surface: "bg-gradient-to-br from-[#fafbff] to-[#dfe6f5] text-[#0a1340]",
    accent: "bg-[#0a1340] text-white",
    brandText: "text-[#0a1340]",
    subText: "text-[#0a1340]/60",
  },
  {
    id: "09",
    name: "Vũ Thanh Tùng",
    role: "Chuyên viên tư vấn BĐS",
    brand: "NEXTGEN",
    city: "The Metropole Thủ Thiêm · TP.HCM",
    phone: "0859 333 999",
    email: "tung.vu@nextgen.vn",
    categories: ["nfc", "qr", "bds"],
    surface: "bg-gradient-to-br from-[#1a0b3a] via-[#2c1361] to-[#451f8f] text-white",
    accent: "bg-fuchsia-300/90 text-[#1a0b3a]",
    brandText: "text-fuchsia-300",
    subText: "text-white/70",
  },
  {
    id: "10",
    name: "Đinh Quang Huy",
    role: "Trưởng nhóm kinh doanh",
    brand: "URBAN HOMES",
    city: "The Global City · TP.HCM",
    phone: "0901 234 567",
    email: "huy.dinh@urbanhomes.vn",
    categories: ["qr", "bds"],
    surface: "bg-gradient-to-br from-[#fff8ef] to-[#fde3c5] text-[#3a210a]",
    accent: "bg-orange-500 text-white",
    brandText: "text-orange-700",
    subText: "text-[#3a210a]/65",
  },
];

const FILTERS: { id: Category; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "nfc", label: "NFC" },
  { id: "qr", label: "QR Code" },
  { id: "bds", label: "Bất động sản" },
];

export function DesignCarousel() {
  const [active, setActive] = useState<Category>("all");

  const visible = useMemo(
    () =>
      active === "all"
        ? TEMPLATES
        : TEMPLATES.filter((t) => t.categories.includes(active)),
    [active],
  );

  return (
    <div className="mt-10">
      {/* Filters */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 lg:mx-0 lg:px-0 lg:justify-center scrollbar-none"
        role="tablist"
      >
        {FILTERS.map((f) => {
          const isActive = active === f.id;
          const count =
            f.id === "all"
              ? TEMPLATES.length
              : TEMPLATES.filter((t) => t.categories.includes(f.id)).length;
          return (
            <button
              key={f.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(f.id)}
              className={cn(
                "shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold transition-all border",
                isActive
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/40",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "ml-2 text-[11px] font-medium",
                  isActive ? "text-background/70" : "text-muted-foreground/70",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Carousel */}
      <Carousel
        opts={{ align: "start", loop: false, dragFree: true }}
        className="mt-6"
      >
        <CarouselContent className="-ml-3 lg:-ml-4">
          {visible.map((t) => (
            <CarouselItem
              key={t.id}
              className="pl-3 lg:pl-4 basis-[88%] sm:basis-1/2 lg:basis-1/3"
            >
              <DesignCard t={t} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden lg:flex -left-4" />
        <CarouselNext className="hidden lg:flex -right-4" />
      </Carousel>

      {/* Mobile hint */}
      <p className="lg:hidden mt-3 text-center text-[11.5px] text-muted-foreground">
        Vuốt ngang để xem thêm mẫu →
      </p>
    </div>
  );
}

function DesignCard({ t }: { t: Template }) {
  return (
    <article
      className={cn(
        "relative aspect-[1.7/1] rounded-2xl overflow-hidden p-4 sm:p-5 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.4)] border border-black/5",
        t.surface,
      )}
    >
      {/* Top: number + brand */}
      <header className="flex items-start justify-between">
        <span
          className={cn(
            "inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md text-[11px] font-bold",
            t.accent,
          )}
        >
          {t.id}
        </span>
        <div className={cn("text-right text-[10.5px] font-bold tracking-[0.18em]", t.brandText)}>
          {t.brand}
        </div>
      </header>

      {/* Body: name + role */}
      <div className="mt-3">
        <h3 className="text-[15px] sm:text-[17px] font-bold leading-tight tracking-tight">
          {t.name}
        </h3>
        <p className={cn("text-[10.5px] mt-0.5", t.subText)}>{t.role}</p>
      </div>

      {/* Contact */}
      <ul className={cn("mt-3 space-y-1 text-[10.5px]", t.subText)}>
        <li className="flex items-center gap-1.5">
          <Phone className="h-3 w-3 opacity-80" />
          {t.phone}
        </li>
        <li className="flex items-center gap-1.5">
          <Mail className="h-3 w-3 opacity-80" />
          <span className="truncate">{t.email}</span>
        </li>
        <li className="flex items-center gap-1.5">
          <Building2 className="h-3 w-3 opacity-80" />
          <span className="truncate">{t.city}</span>
        </li>
      </ul>

      {/* NFC + QR cluster (right) */}
      <div className="absolute right-3 bottom-3 flex items-end gap-2">
        {t.categories.includes("nfc") && (
          <div
            className={cn(
              "flex flex-col items-center justify-center h-14 w-12 rounded-lg",
              t.accent,
            )}
            aria-label="NFC"
          >
            <Radio className="h-4 w-4" />
            <span className="text-[8px] font-bold mt-0.5">NFC</span>
          </div>
        )}
        {t.categories.includes("qr") && (
          <div
            className="flex flex-col items-center justify-center h-14 w-14 rounded-lg bg-white text-black p-1.5"
            aria-label="QR"
          >
            <QrCode className="h-7 w-7" strokeWidth={1.5} />
            <span className="text-[7.5px] font-semibold leading-tight mt-0.5 text-black/70">
              Quét xem
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
