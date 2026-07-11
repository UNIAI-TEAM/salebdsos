# Nhóm B — Bảng mới + CRUD cho 6 trang

Mỗi trang cần: (1) migration bảng + RLS + GRANT, (2) file `*.functions.ts`, (3) refactor UI đã có sang dùng React Query. Tất cả bảng scope theo `tenant_id` với policy `private.is_tenant_member` (đọc) và `private.has_tenant_role_in([owner, admin, manager, agent])` (ghi), theo pattern hiện tại của dự án.

## 1. `/appointments` — Lịch hẹn khách

Bảng `appointments`: `customer_id`, `assigned_to`, `title`, `location`, `starts_at`, `ends_at`, `status` (scheduled/completed/canceled/no_show), `notes`, `reminder_minutes`.

CRUD: list theo khoảng thời gian + filter status/assignee, tạo/sửa/xoá, đổi trạng thái nhanh. UI: view Danh sách + view Lịch (theo tuần), form dialog.

## 2. `/products` — Sản phẩm / Bảng giá

Bảng `products`: `sku`, `name`, `category`, `price`, `currency`, `unit`, `status` (draft/active/archived), `description`, `image_url`, `attributes` (jsonb).

CRUD: list phân trang + search theo tên/SKU, tạo/sửa/xoá, đổi trạng thái. Import CSV (dùng lại `csv-import`).

## 3. `/lead-capture` — Form thu lead

2 bảng:
- `lead_forms`: `slug` (unique/tenant), `name`, `fields` (jsonb — mảng field), `redirect_url`, `is_active`, `submit_count`.
- `lead_submissions`: `form_id`, `payload` (jsonb), `ip_hash`, `user_agent`, `created_lead_id`.

Endpoint public: server route `/api/public/lead-forms/$slug` (POST) — verify tenant qua slug, ghi submission + tạo `leads` row bằng `supabaseAdmin`. UI: quản lý form, xem submission, copy embed snippet.

## 4. `/files` — Tài liệu

Bảng `files`: `bucket`, `path`, `name`, `size`, `mime`, `folder`, `uploaded_by`, `related_type` (customer/lead/deal/null), `related_id`.

CRUD: upload lên bucket `project-assets` (đã có), list/filter theo folder + related, xoá (xoá cả row + object storage). UI: grid thumbnail + list, drag-drop upload.

## 5. `/ai-sales-page` — Landing tạo bằng AI

Bảng `sales_pages`: `slug` (unique/tenant), `title`, `product_id` (nullable), `sections` (jsonb — blocks), `theme` (jsonb), `is_published`, `views_count`, `og_image_url`.

Server fn `generateSalesPage` gọi Lovable AI Gateway (model `google/gemini-2.5-flash`) sinh sections từ prompt + product. Route public `/p/$slug` (chưa có, thêm) render trang đã publish. CRUD: tạo/sửa/xoá/publish/unpublish.

## 6. `/airdrop` — Chiến dịch airdrop / voucher

2 bảng:
- `airdrops`: `name`, `type` (voucher/token/nft), `total_supply`, `claimed_count`, `starts_at`, `ends_at`, `is_active`, `rules` (jsonb).
- `airdrop_claims`: `airdrop_id`, `customer_id` (nullable), `email`, `phone`, `code`, `claimed_at`, `ip_hash`.

CRUD: quản lý campaign, sinh mã claim (bulk generate), xem danh sách claim, export CSV.

## Chi tiết kỹ thuật

- Mỗi migration chạy độc lập (6 migration) — user duyệt từng bảng thay vì gộp 1 khối lớn.
- Toàn bộ ghi qua `createServerFn` + `requireSupabaseAuth`, không dùng `supabaseAdmin` trừ endpoint public `/api/public/lead-forms/$slug`.
- Trigger `set_updated_at` cho mọi bảng có `updated_at`.
- Index: `(tenant_id, created_at desc)` cho list; `(tenant_id, slug)` unique cho `lead_forms` và `sales_pages`; `(tenant_id, starts_at)` cho `appointments`.
- `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` + `GRANT ALL ... TO service_role` cho mọi bảng. Không cấp `anon` (public form đi qua server route + `supabaseAdmin`).
- Types Supabase auto-regen sau migration; code trong `*.functions.ts` viết sau khi migration duyệt.

## Thứ tự triển khai đề xuất

Đây là ~20 giờ tổng. Đề xuất chia thành 3 đợt để user duyệt migration + review UI từng phần:

```text
Đợt 1  →  appointments  +  products     (dữ liệu nền tảng)
Đợt 2  →  lead-capture  +  files        (thu thập & lưu trữ)
Đợt 3  →  ai-sales-page +  airdrop      (marketing / growth)
```

## Câu hỏi trước khi bắt đầu

1. Đồng ý thứ tự Đợt 1 → 3 ở trên không, hay muốn ưu tiên trang nào trước?
2. `/ai-sales-page`: dùng Lovable AI Gateway (Gemini flash, đã có `LOVABLE_API_KEY`) — OK chứ?
3. `/airdrop`: chỉ cần loại **voucher / mã giảm giá** hay thực sự cần `token/nft` on-chain? Nếu chỉ voucher thì bỏ 2 loại kia cho gọn.
