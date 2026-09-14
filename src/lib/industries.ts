// Phân loại theo ngành, dùng chung cho prompt và landing đã tạo
export const INDUSTRIES = [
  "real_estate",
  "apartment",
  "land",
  "resort",
  "office",
  "industrial",
  "finance",
  "construction",
  "retail",
  "education",
  "healthcare",
  "other",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export const INDUSTRY_LABEL_VI: Record<Industry, string> = {
  real_estate: "Bất động sản (chung)",
  apartment: "Căn hộ / Chung cư",
  land: "Đất nền",
  resort: "Nghỉ dưỡng",
  office: "Văn phòng / Thương mại",
  industrial: "Khu công nghiệp",
  finance: "Tài chính / Ngân hàng",
  construction: "Xây dựng / Nội thất",
  retail: "Bán lẻ / Tiêu dùng",
  education: "Giáo dục",
  healthcare: "Y tế / Sức khoẻ",
  other: "Khác",
};

export function industryLabel(value?: string | null): string {
  if (!value) return "Chưa phân loại";
  return INDUSTRY_LABEL_VI[value as Industry] ?? value;
}
