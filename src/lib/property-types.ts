// Cấu hình loại hình BĐS dùng chung cho form, bộ lọc, nhập tệp và hiển thị.

export const PROPERTY_KINDS = [
  "apartment",
  "land_plot",
  "subdivision",
  "house_land",
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
    label: "Đất nền",
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
  subdivision: {
    key: "subdivision",
    label: "Phân lô",
    codeLabel: "Số lô",
    zoneLabel: "Block / dãy",
    view: "zone-grid",
    fields: [
      { key: "zone", label: "Block / dãy", store: "column", type: "text", placeholder: "B2" },
      { key: "code", label: "Số lô", store: "column", type: "text", placeholder: "B2-15" },
      { key: "area", label: "Diện tích", store: "column", type: "number", suffix: "m²" },
      { key: "frontage", label: "Mặt tiền", store: "attr", type: "number", suffix: "m" },
      { key: "depth", label: "Chiều sâu", store: "attr", type: "number", suffix: "m" },
      { key: "road_width", label: "Đường trước lô", store: "attr", type: "number", suffix: "m" },
      { key: "corner", label: "Lô góc", store: "attr", type: "select", options: ["Có", "Không"] },
      { key: "direction", label: "Hướng", store: "column", type: "select", options: DIRECTIONS },
      { key: "legal_status", label: "Pháp lý", store: "column", type: "select", options: LEGAL },
    ],
  },
  house_land: {
    key: "house_land",
    label: "Nhà đất",
    codeLabel: "Mã sản phẩm",
    zoneLabel: "Khu / phường",
    view: "list",
    fields: [
      { key: "zone", label: "Khu / phường", store: "column", type: "text" },
      { key: "code", label: "Mã sản phẩm", store: "column", type: "text" },
      { key: "address", label: "Địa chỉ", store: "attr", type: "text" },
      { key: "area", label: "Diện tích đất", store: "column", type: "number", suffix: "m²" },
      { key: "build_area", label: "Diện tích xây dựng", store: "attr", type: "number", suffix: "m²" },
      { key: "floors", label: "Số tầng", store: "attr", type: "number" },
      { key: "frontage", label: "Mặt tiền", store: "attr", type: "number", suffix: "m" },
      { key: "bedrooms", label: "Phòng ngủ", store: "column", type: "number" },
      { key: "bathrooms", label: "Phòng tắm", store: "column", type: "number" },
      { key: "direction", label: "Hướng", store: "column", type: "select", options: DIRECTIONS },
      { key: "legal_status", label: "Pháp lý", store: "column", type: "select", options: LEGAL },
    ],
  },
  townhouse: {
    key: "townhouse",
    label: "Nhà phố / shophouse",
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

/** Cột của bảng giá riêng cho từng loại hình. */
export type PriceColumn = {
  key: string;
  label: string;
  /** column = cột products, attr = attributes, computed = tính toán */
  store: "column" | "attr" | "computed";
  align?: "left" | "right";
  suffix?: string;
};

const COL_CODE = (label: string): PriceColumn => ({ key: "code", label, store: "column" });
const COL_PRICE: PriceColumn[] = [
  { key: "price", label: "Giá bán", store: "column", align: "right" },
  { key: "unit_price", label: "Đơn giá / m²", store: "computed", align: "right" },
];

export const KIND_PRICE_COLUMNS: Record<PropertyKind, PriceColumn[]> = {
  apartment: [
    COL_CODE("Mã căn"),
    { key: "zone", label: "Toà", store: "column" },
    { key: "floor", label: "Tầng", store: "column", align: "right" },
    { key: "unit_kind", label: "Loại căn", store: "attr" },
    { key: "area", label: "Tim tường", store: "column", align: "right", suffix: "m²" },
    { key: "usable_area", label: "Thông thuỷ", store: "column", align: "right", suffix: "m²" },
    { key: "bedrooms", label: "PN", store: "column", align: "right" },
    { key: "direction", label: "Hướng", store: "column" },
    ...COL_PRICE,
  ],
  land_plot: [
    COL_CODE("Mã lô"),
    { key: "zone", label: "Khu", store: "column" },
    { key: "area", label: "Diện tích", store: "column", align: "right", suffix: "m²" },
    { key: "frontage", label: "Mặt tiền", store: "attr", align: "right", suffix: "m" },
    { key: "road_width", label: "Đường", store: "attr", align: "right", suffix: "m" },
    { key: "direction", label: "Hướng", store: "column" },
    { key: "legal_status", label: "Pháp lý", store: "column" },
    ...COL_PRICE,
  ],
  subdivision: [
    COL_CODE("Số lô"),
    { key: "zone", label: "Block", store: "column" },
    { key: "area", label: "Diện tích", store: "column", align: "right", suffix: "m²" },
    { key: "frontage", label: "Mặt tiền", store: "attr", align: "right", suffix: "m" },
    { key: "depth", label: "Chiều sâu", store: "attr", align: "right", suffix: "m" },
    { key: "corner", label: "Lô góc", store: "attr" },
    { key: "legal_status", label: "Pháp lý", store: "column" },
    ...COL_PRICE,
  ],
  house_land: [
    COL_CODE("Mã sản phẩm"),
    { key: "address", label: "Địa chỉ", store: "attr" },
    { key: "area", label: "Đất", store: "column", align: "right", suffix: "m²" },
    { key: "build_area", label: "Xây dựng", store: "attr", align: "right", suffix: "m²" },
    { key: "floors", label: "Tầng", store: "attr", align: "right" },
    { key: "bedrooms", label: "PN", store: "column", align: "right" },
    { key: "legal_status", label: "Pháp lý", store: "column" },
    ...COL_PRICE,
  ],
  townhouse: [
    COL_CODE("Mã sản phẩm"),
    { key: "zone", label: "Khu / tuyến", store: "column" },
    { key: "area", label: "Đất", store: "column", align: "right", suffix: "m²" },
    { key: "build_area", label: "Xây dựng", store: "attr", align: "right", suffix: "m²" },
    { key: "floors", label: "Tầng", store: "attr", align: "right" },
    { key: "bedrooms", label: "PN", store: "column", align: "right" },
    { key: "direction", label: "Hướng", store: "column" },
    ...COL_PRICE,
  ],
  social_housing: [
    COL_CODE("Mã căn"),
    { key: "zone", label: "Toà", store: "column" },
    { key: "floor", label: "Tầng", store: "column", align: "right" },
    { key: "area", label: "Tim tường", store: "column", align: "right", suffix: "m²" },
    { key: "usable_area", label: "Thông thuỷ", store: "column", align: "right", suffix: "m²" },
    { key: "bedrooms", label: "PN", store: "column", align: "right" },
    { key: "regulated_price", label: "Giá quy định", store: "attr", align: "right", suffix: "đ/m²" },
    { key: "dossier_status", label: "Hồ sơ", store: "attr" },
    ...COL_PRICE,
  ],
};

export function kindLabel(kind?: string | null) {
  return kind && kind in KIND_CONFIG ? KIND_CONFIG[kind as PropertyKind].label : "Khác";
}
