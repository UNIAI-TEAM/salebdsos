import type { Role } from "@/hooks/use-auth";
import { INBOX_COPY } from "./omnichannel";

/** Sub-pages grouped under one sidebar hub; rendered as tabs above the page. */
export type HubTab = { to: string; label: string; roles?: Role[] };
export type Hub = { id: string; tabs: HubTab[] };

const M: Role[] = ["owner", "admin", "manager"];
const A: Role[] = ["owner", "admin"];

export const HUBS: Hub[] = [
  { id: "customers", tabs: [
    { to: "/leads", label: "Leads" },
    { to: "/customers", label: "Khách hàng" },
    { to: "/pipeline", label: "Phễu cơ hội" },
    { to: "/journey", label: "Hành trình" },
  ] },
  { id: "inbox", tabs: [
    { to: "/inbox", label: INBOX_COPY.title },
    { to: "/inbox-tickets", label: "Ticket tin nhắn" },
    { to: "/appointments", label: "Lịch hẹn" },
  ] },
  { id: "projects", tabs: [
    { to: "/projects", label: "Dự án" },
    { to: "/inventory", label: "Giỏ hàng" },
    { to: "/plot-map", label: "Sơ đồ lô" },
    { to: "/landings", label: "Landing dự án" },
    { to: "/products", label: "Sản phẩm khác" },
    { to: "/files", label: "Tài liệu" },
  ] },
  { id: "card", tabs: [
    { to: "/digital-card", label: "Danh thiếp" },
    { to: "/card-designer", label: "Sửa danh thiếp" },
    { to: "/profile", label: "Profile" },
    { to: "/qr-sharing", label: "QR Sharing" },
    { to: "/nfc-codes", label: "NFC & QR" },
    { to: "/dynamic-qr", label: "QR động" },
    { to: "/airdrop", label: "AirDrop" },
    { to: "/wallet", label: "Wallet" },
    { to: "/events", label: "Sự kiện" },
  ] },
  { id: "finance", tabs: [
    { to: "/contracts", label: "Hợp đồng" },
    { to: "/debt-aging", label: "Tuổi nợ" },
    { to: "/bank-reconciliation", label: "Đối soát" },
    { to: "/discounts", label: "Chiết khấu TT nhanh", roles: M },
    { to: "/commission-rules", label: "Chính sách hoa hồng", roles: M },
  ] },
  { id: "ai", tabs: [
    { to: "/ai-agent", label: "Trợ lý AI" },
    { to: "/ai-sales-page", label: "AI Landing", roles: M },
    { to: "/ai-followup", label: "AI Follow-up" },
    { to: "/ai-lead-score", label: "AI Lead Score", roles: M },
    { to: "/prompt-library", label: "Prompt" },
  ] },
  { id: "marketing", tabs: [
    { to: "/marketing", label: "Chiến dịch", roles: M },
    { to: "/nurture", label: "Nhắc khách", roles: M },
    { to: "/social-automation", label: "Fanpage", roles: M },
    { to: "/chat-flows", label: "Kịch bản chat", roles: M },
    { to: "/lead-capture", label: "Tạo lead tự động" },
    { to: "/lead-routing", label: "Phân phối lead", roles: M },
    { to: "/content-library", label: "Kho nội dung" },
  ] },
  { id: "reports", tabs: [
    { to: "/dashboard", label: "Tổng quan", roles: M },
    { to: "/funnel-report", label: "Phễu" },
    { to: "/revenue-report", label: "Doanh thu", roles: M },
    { to: "/analytics", label: "Tương tác", roles: M },
  ] },
  { id: "org", tabs: [
    { to: "/sales-directory", label: "Quản lý Sale", roles: M },
    { to: "/collaborators", label: "Cộng tác viên", roles: ["owner", "admin", "manager", "agent"] },
    { to: "/members", label: "Thành viên", roles: A },
    { to: "/departments", label: "Phòng ban" },
    { to: "/team", label: "Nhóm", roles: M },
    { to: "/handover", label: "Bàn giao khách" },
  ] },
  { id: "settings", tabs: [
    { to: "/settings", label: "Cài đặt", roles: A },
    { to: "/integrations", label: "Tích hợp kênh" },
    { to: "/mobile-app", label: "App & thông báo" },
  ] },
];

export function hubForPath(pathname: string): Hub | undefined {
  return HUBS.find((h) => h.tabs.some((t) => pathname === t.to || pathname.startsWith(t.to + "/")));
}
