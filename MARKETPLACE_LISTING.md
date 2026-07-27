# MARKETPLACE_LISTING.md

## VIETNAMESE

### 1) TÊN DỰ ÁN
SaleBDS OS – Sales Growth OS cho Bất động sản

### 2) MÔ TẢ
SaleBDS OS là nền tảng SaaS đa tenant dành riêng cho đội Sale Bất động sản, hợp nhất danh thiếp số (NFC/QR/Wallet), CRM, AI follow-up và marketing trên một hệ thống duy nhất. Sản phẩm gồm khoảng 27 route ứng dụng nội bộ trải trên 5 nhóm chức năng (Tổng quan, Bán hàng, AI & Tăng trưởng, Sharing, Quản lý) cùng landing/marketing site công khai, với kiến trúc multi-tenant tách biệt theo `tenant_id` và RBAC 6 vai trò (platform_admin, owner, admin, manager, agent, viewer). Nền tảng dựng trên TanStack Start 1.167 + React 19 + Vite 7 + TypeScript 5.8, UI Tailwind CSS 4 và Radix UI, backend Supabase/PostgreSQL với Row-Level Security siết theo từng tenant qua schema `private` (23 migration đã áp dụng), realtime qua Supabase channels, lưu trữ trên 2 bucket `card-assets` và `project-assets`, AI qua Lovable AI Gateway (Gemini). Bảo mật gồm RLS toàn diện, Google OAuth có domain allowlist, xác thực email có rate-limit, audit log kèm batch-id và CSV export có tự kiểm tra tính toàn vẹn. Giao diện responsive desktop/tablet/mobile với drawer riêng cho mobile và Wallet Card (Apple/Google) cho end-user. Lợi ích: rút ngắn thời gian tạo lead thủ công, tăng tỉ lệ follow-up nhờ AI, quản trị pipeline tập trung và triển khai được cả trên Lovable Cloud lẫn on-premise Docker (Postgres + Caddy + App) theo bộ deploy đã có sẵn. Ngôn ngữ hiện tại: chỉ tiếng Việt hardcode trong UI (chưa có file i18n) [CẦN NGƯỜI XÁC NHẬN: kế hoạch đa ngôn ngữ].

### 3) NGÀNH
Công nghệ Bất động sản – CRM & Sales Enablement (PropTech / Real Estate CRM)

### 4) TÍNH NĂNG
Dashboard tổng quan: KPI leads/cards/analytics theo dải ngày, biểu đồ Recharts, widget realtime
CRM Leads: quản lý pipeline lead, drawer chi tiết 3 tab Overview/Timeline/Notes, gắn audit log
Khách hàng & Import CSV: CRUD khách hàng, mapping field, validate, template CSV mẫu tiếng Việt
Pipeline & Deals: kéo-thả stage (dnd-kit), win probability, next action, last activity tracking
Lịch hẹn (Appointments): view danh sách + lịch tuần, trạng thái scheduled/completed/canceled/no_show
Digital Card & NFC/QR: thiết kế thẻ, block builder, template, short-code, dynamic QR có scan count
AI Follow-up & Lead Score: sinh nội dung đa kênh qua Lovable AI Gateway, chấm điểm lead tự động
AI Sales Page & Marketing Campaign: tạo landing bằng AI, campaign đa kênh email/SMS/Zalo có scheduling
Wallet Card & AirDrop chia sẻ: pass Apple/Google Wallet, chia sẻ realtime kèm trạng thái phân phối
Dự án BĐS & Brochure: quản lý project, gallery, brochure PDF có download count, CTA form/phone
Tài liệu (Files): upload đa bucket, ZIP bulk-download có progress + batch-id, audit trail + CSV export
Thành viên & Team: mời email token, role app_role, team lead, quản lý workspace nhiều tenant
Cài đặt & Auth Settings: JSONB settings theo tenant, Google OAuth managed, domain allowlist
Bảo mật & Hạ tầng: RLS đầy đủ 34 bảng, schema `private` helper, on-prem Docker + backup/restore

### 5) DANH SÁCH ẢNH CHỤP MÀN HÌNH ĐỀ XUẤT

| # | Màn hình | Route | File component | Điều hướng | Lý do ấn tượng | Dữ liệu mẫu cần |
|---|---|---|---|---|---|---|
| 1 | Dashboard tổng quan | `/dashboard` | `src/routes/_app.dashboard.tsx` | Đăng nhập → mặc định vào Dashboard (mọi role) | KPI cards + biểu đồ Recharts, ảnh thumbnail chính | ≥3 tháng `analytics_daily`, ≥50 leads, ≥5 cards |
| 2 | Leads CRM có drawer chi tiết | `/leads` | `src/routes/_app.leads.tsx` | Sidebar → nhóm "Bán hàng" → Leads (mọi role) | Bảng dày, drawer 3 tab Overview/Timeline/Notes gắn audit | ≥30 leads đủ status, ≥10 event timeline |
| 3 | Pipeline kanban kéo-thả | `/pipeline` | `src/routes/_app.pipeline.tsx` | Sidebar → Pipeline (mọi role) | Kanban dnd-kit trực quan, badge giá trị deal | ≥4 stage, ≥15 deals trải đều stage |
| 4 | AI Sales Page builder | `/ai-sales-page` | `src/routes/_app.ai-sales-page.tsx` | Sidebar → nhóm "AI & Tăng trưởng" (owner/admin/manager) | Prompt AI + preview landing sinh động | ≥3 sales page mẫu đã publish |
| 5 | Tài liệu + ZIP audit | `/files` | `src/routes/_app.files.tsx` | Sidebar → nhóm "Quản lý" → Tài liệu (mọi role) | Grid/list files, drawer audit có batch-id, progress ZIP | ≥40 file đa mime, ≥5 batch ZIP lịch sử |
| 6 | Digital Card designer | `/digital-card` | `src/routes/_app.digital-card.tsx` | Sidebar → Tổng quan → Danh thiếp & Profile | Preview NFC card giống mobile-first | ≥1 card đã publish có avatar + blocks |
| 7 | AirDrop realtime | `/airdrop` | `src/routes/_app.airdrop.tsx` | Sidebar → nhóm "Sharing" → AirDrop | Trạng thái live cập nhật realtime | ≥10 airdrop_shares đủ direction/status |
| 8 | Landing marketing công khai | `/` | `src/routes/index.tsx` | Truy cập root domain (public) | Hero + FAQ + Design carousel, chatbot demo | Assets tĩnh có sẵn, không cần seed DB |

### 6) LINK DEMO
- Preview: https://id-preview--037ef328-074a-4c9e-8c29-68ffe926410e.lovable.app
- Published: https://salebdsos.lovable.app
- Tài khoản demo (từ lịch sử hội thoại, chưa thấy trong seed SQL): `admin@salebdsos.vn` / `123456` (role admin, workspace "SaleBDS Demo"). [CẦN NGƯỜI XÁC NHẬN: tài khoản còn hoạt động và có được phép public không]
- Custom domain: chưa cấu hình.

---

## ENGLISH

### 1) PROJECT NAME
SaleBDS OS – Sales Growth OS for Real Estate

### 2) DESCRIPTION
SaleBDS OS is a multi-tenant SaaS built specifically for real-estate sales teams, unifying digital business cards (NFC/QR/Wallet), CRM, AI follow-up and marketing in a single workspace. The app ships ~27 internal routes across five functional groups (Overview, Sales, AI & Growth, Sharing, Management) plus a public marketing site, with strict per-`tenant_id` isolation and a 6-tier RBAC (platform_admin, owner, admin, manager, agent, viewer). It is built on TanStack Start 1.167 + React 19 + Vite 7 + TypeScript 5.8, styled with Tailwind CSS 4 and Radix UI, and backed by Supabase/PostgreSQL with Row-Level Security enforced through a dedicated `private` helper schema (23 applied migrations), Supabase Realtime channels and two storage buckets (`card-assets`, `project-assets`). AI features run through the Lovable AI Gateway (Gemini). Security includes end-to-end RLS, Google OAuth with domain allowlist, rate-limited email verification, and an audit log with batch IDs plus integrity-checked CSV export. The UI is responsive across desktop/tablet/mobile with a dedicated mobile drawer, and end users get Apple/Google Wallet passes. Business benefits: faster lead capture, higher follow-up conversion via AI, centralized pipeline governance, and dual deployment on Lovable Cloud or on-premise Docker (Postgres + Caddy + App) with ready-made backup/restore scripts. Localization today: Vietnamese UI strings are hardcoded — no i18n files exist yet [NEEDS CONFIRMATION: multi-language roadmap].

### 3) INDUSTRY
Real Estate Technology – CRM & Sales Enablement (PropTech / Real Estate CRM)

### 4) FEATURES
Overview dashboard: leads/cards/analytics KPIs by date range, Recharts visuals, realtime widgets
Leads CRM: pipeline management, detail drawer with 3 tabs (Overview/Timeline/Notes), audit-log wired
Customers & CSV import: full CRUD, field mapping, validation, Vietnamese CSV template
Pipeline & Deals: drag-and-drop stages (dnd-kit), win probability, next action, activity tracking
Appointments: list + weekly calendar view, statuses scheduled/completed/canceled/no_show
Digital Card & NFC/QR: card designer, block builder, templates, short codes, dynamic QR with scan count
AI Follow-up & Lead Score: multi-channel copy via Lovable AI Gateway, automated lead scoring
AI Sales Page & Marketing: AI-generated landings, multi-channel campaigns (email/SMS/Zalo) with scheduling
Wallet Card & AirDrop sharing: Apple/Google Wallet passes, realtime share distribution status
Real-estate projects & brochures: project CRUD, gallery, PDF brochures with download count, CTA form
Files: multi-bucket uploads, bulk ZIP download with progress + batch ID, audit trail + CSV export
Members & Teams: email-token invites, `app_role` roles, team leads, multi-tenant workspaces
Settings & Auth Settings: per-tenant JSONB settings, managed Google OAuth, email domain allowlist
Security & Infrastructure: full RLS across 34 tables, `private` helper schema, on-prem Docker + backups

### 5) SUGGESTED SCREENSHOTS

| # | Screen | Route | Component file | Navigation | Why it stands out | Sample data needed |
|---|---|---|---|---|---|---|
| 1 | Overview dashboard | `/dashboard` | `src/routes/_app.dashboard.tsx` | Default landing after login (all roles) | KPI cards + Recharts, main thumbnail | ≥3 months of `analytics_daily`, ≥50 leads, ≥5 cards |
| 2 | Leads CRM with detail drawer | `/leads` | `src/routes/_app.leads.tsx` | Sidebar → "Sales" → Leads (all roles) | Dense table, 3-tab drawer wired to audit log | ≥30 leads across statuses, ≥10 timeline events |
| 3 | Kanban pipeline | `/pipeline` | `src/routes/_app.pipeline.tsx` | Sidebar → Pipeline (all roles) | dnd-kit drag-and-drop, deal-value badges | ≥4 stages, ≥15 deals spread across stages |
| 4 | AI Sales Page builder | `/ai-sales-page` | `src/routes/_app.ai-sales-page.tsx` | Sidebar → "AI & Growth" (owner/admin/manager) | AI prompt + live landing preview | ≥3 published sample pages |
| 5 | Files + ZIP audit trail | `/files` | `src/routes/_app.files.tsx` | Sidebar → "Management" → Files (all roles) | Files grid, audit drawer with batch ID + ZIP progress | ≥40 mixed-mime files, ≥5 historic ZIP batches |
| 6 | Digital Card designer | `/digital-card` | `src/routes/_app.digital-card.tsx` | Sidebar → Overview → Business Card | Mobile-first NFC card preview | ≥1 published card with avatar + blocks |
| 7 | Realtime AirDrop | `/airdrop` | `src/routes/_app.airdrop.tsx` | Sidebar → "Sharing" → AirDrop | Live status updates via Supabase Realtime | ≥10 airdrop_shares across directions/statuses |
| 8 | Public marketing landing | `/` | `src/routes/index.tsx` | Root domain (public) | Hero + FAQ + design carousel + demo chatbot | Static assets only, no DB seed |

### 6) DEMO LINKS
- Preview: https://id-preview--037ef328-074a-4c9e-8c29-68ffe926410e.lovable.app
- Published: https://salebdsos.lovable.app
- Demo credentials (from prior chat history, not found in seed SQL): `admin@salebdsos.vn` / `123456` (admin role, "SaleBDS Demo" workspace). [NEEDS CONFIRMATION: still active and safe to share publicly]
- Custom domain: not configured.

---

## CHECKLIST TRƯỚC KHI ĐĂNG

- [ ] Xác nhận tài khoản demo `admin@salebdsos.vn / 123456` còn hoạt động và được phép public (nếu không, tạo tài khoản demo mới chỉ đọc).
- [ ] Chốt tagline chính thức (hiện đang dùng "Sales Growth OS cho Bất động sản" — có thể muốn "Điều hành kinh doanh bằng điểm chạm").
- [ ] Xác nhận trạng thái đa ngôn ngữ: dự án hiện KHÔNG có file i18n, toàn bộ UI hardcode tiếng Việt.
- [ ] Seed dữ liệu mẫu cho tenant demo theo bảng "dữ liệu mẫu cần có" ở mục 5 trước khi chụp ảnh.
- [ ] Chuẩn bị 8 ảnh chụp theo thứ tự ưu tiên (1 = thumbnail chính), khuyến nghị resolution 1600×1000 desktop + 1 ảnh mobile drawer.
- [ ] Xác nhận có công khai được URL preview `id-preview--…lovable.app` hay chỉ dùng `salebdsos.lovable.app`.
- [ ] Bổ sung logo/branding chính thức (`public/favicon.ico` hiện là mặc định) nếu marketplace yêu cầu ảnh brand.
- [ ] Rà soát tuyên bố "ISO 27001" và "fine-tune AI trên dữ liệu BĐS VN" trong FAQ của `src/routes/index.tsx` — hiện là marketing copy, cần xác nhận chứng nhận thực tế trước khi đăng.
- [ ] Xác nhận ngành nghề marketplace nội bộ có preset "PropTech / Real Estate CRM" hay phải chọn ngành gần đúng.
