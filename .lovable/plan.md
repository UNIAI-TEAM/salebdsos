# QR riêng cho từng dự án + hành trình khách hàng

## Mục tiêu
Mỗi dự án có một mã QR riêng. Sale gửi QR cho khách, khách quét là mở landing dự án ngay.
Hệ thống ghi lại từng điểm chạm của khách trên landing để sale và ban điều hành thấy được
hành trình: quét QR → xem ảnh → xem bảng giá → tải brochure → gọi/Zalo → để lại thông tin.

## Sale sẽ thấy gì
Trong trang dự án, mỗi dự án có thẻ "Mã QR dự án":
- Ảnh QR để tải về (PNG) hoặc chia sẻ nhanh qua Zalo/Facebook.
- Nút tạo thêm QR theo kênh: QR in tờ rơi, QR tại sự kiện, QR gắn standee sàn giao dịch.
  Mỗi QR là một mã riêng nên biết khách đến từ đâu.
- Số lượt quét, số khách để lại thông tin của từng QR trong 30 ngày.

## Ban điều hành sẽ thấy gì
Một trang "Hành trình khách hàng" (trong Phân tích) hiển thị:
- Phễu: lượt quét → xem landing → xem chi tiết → tải brochure → liên hệ → để lại thông tin.
- Xếp hạng dự án và xếp hạng sale theo lượt quét và tỉ lệ ra khách.
- Nguồn quét (tờ rơi, sự kiện, standee, Zalo...), thiết bị, thời điểm.
- Nhật ký từng phiên khách: các bước khách đã làm theo thứ tự thời gian.

## Điểm chạm được ghi nhận
Trên landing công khai của dự án: mở trang, xem hết ảnh, mở thư viện ảnh, xem giá/chính sách,
xem lịch mở bán, tải brochure, bấm gọi, bấm Zalo, bấm chia sẻ, mở form, gửi form.
Mỗi phiên khách có một mã phiên ẩn (không thu thập danh tính) để nối các bước thành hành trình.
Khi khách gửi thông tin, cả hành trình trước đó được gắn vào khách đó.

## Chi tiết kỹ thuật
- Bảng `project_qr_codes`: tenant_id, project_id, code (duy nhất), channel, label,
  created_by, is_active, scan_count. RLS theo tenant, GRANT cho authenticated + service_role.
  Đọc công khai chỉ qua endpoint server, không mở policy anon.
- Bảng `project_touchpoints`: tenant_id, project_id, qr_code_id, session_id, event_type,
  meta jsonb, device/referrer/ip_hash, occurred_at. Chỉ insert qua server (service role);
  policy chỉ cho phép người trong tenant đọc. Index (tenant_id, project_id, occurred_at),
  (session_id).
  Không dùng `interaction_events` vì bảng đó bắt buộc `card_id` (gắn danh thiếp).
- Endpoint công khai `src/routes/api/public/pq.$code.ts`: nhận lượt quét, ghi touchpoint
  `qr_scan`, tăng scan_count, đặt cookie session, rồi redirect sang `/p/{slug landing}`
  (fallback về trang dự án nếu chưa có landing).
- Endpoint công khai `src/routes/api/public/project-touch.ts`: nhận batch điểm chạm từ landing,
  validate bằng zod, chỉ chấp nhận danh sách event_type cố định, rate-limit theo ip_hash.
- `src/lib/project-qr.functions.ts`: tạo/đổi trạng thái QR, danh sách QR theo dự án,
  thống kê 30 ngày (dùng `requireSupabaseAuth`, RLS theo tenant).
- `src/lib/journey.functions.ts`: phễu, xếp hạng dự án/sale, nhật ký phiên.
- UI: thẻ QR trong `_app.sale-projects.tsx` và `_app.projects.$id.tsx`; trang hành trình
  thêm vào `_app.analytics.tsx`; landing `p.$slug.tsx` gắn tracker gửi điểm chạm.
- Lead từ QR dự án: gắn `project_id`, source theo channel của QR, tạo thông báo cho sale
  và hiện trong Timeline + trang Khách hàng như luồng QR danh thiếp hiện có.

## Riêng tư & bảo mật
Không lưu số điện thoại/IP thô của khách, chỉ lưu ip_hash. Không mở policy anon cho bảng
điểm chạm. Mọi số liệu chỉ người trong cùng sàn xem được, sale xem dự án mình phụ trách,
ban điều hành xem toàn sàn.

## Triển khai theo bước
1. Migration hai bảng + RLS + GRANT.
2. QR dự án: tạo mã, tải ảnh, chia sẻ, endpoint quét + redirect.
3. Tracker điểm chạm trên landing + endpoint nhận.
4. Trang hành trình khách hàng cho sale và ban điều hành.
5. Kiểm thử thật bằng trình duyệt: quét → landing → tải brochure → gửi form, rồi xoá dữ liệu test.
