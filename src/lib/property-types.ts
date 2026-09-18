// Cấu hình loại hình BĐS dùng chung cho form, bộ lọc, nhập tệp và hiển thị.

export const PROPERTY_KINDS = [
  "apartment",
  "land_plot",
  "townhouse",
  "social_housing",
] as const;
export type PropertyKind = (typeof PROPERTY_KINDS)[number];

export const LISTING_STATUSES = [
  "available",
  "locked",
  "reserved",
  "negotiating",
  "deposited",
  "contracted",
  "sold",
  "liquidated",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  available: "Trống",
  locked: "Tạm khoá",
  reserved: "Giữ chỗ",
  negotiating: "Đang đàm phán",
  deposited: "Cọc",
  contracted: "Ký HĐMB",
  sold: "Đã bán",
  liquidated: "Đã thanh lý",
};

export const LISTING_STATUS_TONE: Record<ListingStatus, string> = {
  available: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  locked: "bg-muted text-muted-foreground border-border",
  reserved: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  negotiating: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  deposited: "bg-violet-500/10 text-violet-600 border-violet-500/30",
  contracted: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
  sold: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  liquidated: "bg-zinc-500/10 text-zinc-500 border-zinc-500/30",
};

/** Trạng thái còn có thể bán (dùng cho tỷ lệ hấp thụ). */
export const OPEN_STATUSES: ListingStatus[] = ["available", "locked"];

export type FieldDef = {
  key: string;
  label: string;
  /** column = cột trong bảng products, attr = lưu trong attributes */
  store: "column" | "attr";
  type: "text" | "number" | "select" | "date";
  options?: string[];
  placeholder?: string;
  suffix?: string;
};

export type KindConfig = {
  key: PropertyKind;
  label: string;
  codeLabel: string;
  zoneLabel: string;
  /** Cách xem mặc định trong giỏ hàng */
  view: "floor-grid" | "zone-grid" | "list";
  fields: FieldDef[];
};

const DIRECTIONS = ["Đông", "Tây", "Nam", "Bắc", "Đông Nam", "Đông Bắc", "Tây Nam", "Tây Bắc"];
const LEGAL = ["Sổ hồng riêng", "Sổ đỏ riêng", "Hợp đồng mua bán", "Chờ sổ", "Vi bằng"];

const COMMON_APARTMENT: FieldDef[] = [
  { key: "zone", label: "Toà / block", store: "column", type: "text", placeholder: "A" },
  { key: "floor", label: "Tầng", store: "column", type: "number" },
  { key: "code", label: "Mã căn", store: "column", type: "text", placeholder: "A-12.05" },
  { key: "area", label: "Diện tích tim tường", store: "column", type: "number", suffix: "m²" },
  { key: "usable_area", label: "Diện tích thông thuỷ", store: "column", type: "number", suffix: "m²" },
  { key: "bedrooms", label: "Phòng ngủ", store: "column", type: "number" },
  { key: "bathrooms", label: "Phòng tắm", store: "column", type: "number" },
  { key: "direction", label: "Hướng", store: "column", type: "select", options: DIRECTIONS },
  { key: "view", label: "View", store: "attr", type: "text", placeholder: "Hồ, nội khu…" },
  {
    key: "unit_kind",
    label: "Loại căn",
    store: "attr",
    type: "select",
    options: ["Studio", "Căn tiêu chuẩn", "Duplex", "Penthouse", "Sky villa"],
  },
  { key: "legal_status", label: "Pháp lý", store: "column", type: "select", options: LEGAL },
];

export const KIND_CONFIG: Record<PropertyKind, KindConfig> = {
  apartment: {
    key: "apartment",
    label: "Căn hộ chung cư",
    codeLabel: "Mã căn",
    zoneLabel: "Toà",
    view: "floor-grid",
    fields: COMMON_APARTMENT,
  },
  land_plot: {
    key: "land_plot",
    label: "Đất nền / phân lô",
    codeLabel: "Mã lô",
    zoneLabel: "Khu",
    view: "zone-grid",
    fields: [
      { key: "zone", label: "Khu", store: "column", type: "text", placeholder: "K1" },
      { key: "code", label: "Mã lô", store: "column", type: "text", placeholder: "K1-08" },
      { key: "area", label: "Diện tích", store: "column", type: "number", suffix: "m²" },
      { key: "frontage", label: "Mặt tiền", store: "attr", type: "number", suffix: "m" },
      { key: "depth", label: "Chiều sâu", store: "attr", type: "number", suffix: "m" },
      { key: "road_width", label: "Đường trước lô", store: "attr", type: "number", suffix: "m" },
      { key: "direction", label: "Hướng", store: "column", type: "select", options: DIRECTIONS },
      { key: "legal_status", label: "Pháp lý", store: "column", type: "select", options: LEGAL },
    ],
  },
  townhouse: {
    key: "townhouse",
    label: "Nhà phố / nhà đất / shophouse",
    codeLabel: "Mã sản phẩm",
    zoneLabel: "Khu",
    view: "list",
    fields: [
      { key: "zone", label: "Khu / tuyến", store: "column", type: "text" },
      { key: "code", label: "Mã sản phẩm", store: "column", type: "text" },
      { key: "address", label: "Địa chỉ", store: "attr", type: "text" },
      { key: "area", label: "Diện tích đất", store: "column", type: "number", suffix: "m²" },
      { key: "build_area", label: "Diện tích xây dựng", store: "attr", type: "number", suffix: "m²" },
      { key: "floors", label: "Số tầng", store: "attr", type: "number" },
      { key: "bedrooms", label: "Phòng ngủ", store: "column", type: "number" },
      { key: "bathrooms", label: "Phòng tắm", store: "column", type: "number" },
      { key: "direction", label: "Hướng", store: "column", type: "select", options: DIRECTIONS },
      { key: "legal_status", label: "Pháp lý", store: "column", type: "select", options: LEGAL },
      { key: "completed_year", label: "Năm hoàn thiện", store: "attr", type: "number" },
    ],
  },
  social_housing: {
    key: "social_housing",
    label: "Nhà ở xã hội",
    codeLabel: "Mã căn",
    zoneLabel: "Toà",
    view: "floor-grid",
    fields: [
      ...COMMON_APARTMENT,
      { key: "eligibility", label: "Điều kiện đối tượng", store: "attr", type: "text" },
      {
        key: "dossier_status",
        label: "Hồ sơ xét duyệt",
        store: "attr",
        type: "select",
        options: ["Chưa nhận", "Đang nhận", "Đang xét duyệt", "Đã duyệt", "Từ chối"],
      },
      { key: "regulated_price", label: "Giá theo quy định", store: "attr", type: "number", suffix: "đ/m²" },
      { key: "dossier_deadline", label: "Hạn nộp hồ sơ", store: "attr", type: "date" },
    ],
  },
};

export const KIND_OPTIONS = PROPERTY_KINDS.map((k) => ({
  value: k,
  label: KIND_CONFIG[k].label,
}));

export function kindLabel(kind?: string | null) {
  return kind && kind in KIND_CONFIG ? KIND_CONFIG[kind as PropertyKind].label : "Khác";
}
