# Từ giỏ hàng sang hợp đồng: hợp đồng, đợt thanh toán, hoa hồng, KPI phễu

Nối tiếp giỏ hàng hiện có: khi một sản phẩm được chốt bán, sàn lập hợp đồng, lên lịch các đợt thanh toán, tính hoa hồng cho Sale và số liệu này tự chảy vào báo cáo phễu.

## Luồng sử dụng

1. **Tạo hợp đồng từ sản phẩm**: ở chi tiết sản phẩm (trạng thái Cọc / Đang đàm phán) bấm "Lập hợp đồng" → chọn khách, giao dịch, giá bán, chính sách chiết khấu, ngày ký. Hệ thống tự chuyển sản phẩm sang "Ký HĐMB", ghi nhật ký trạng thái.
2. **Đợt thanh toán**: mỗi hợp đồng có danh sách đợt (tên đợt, tỷ lệ %, số tiền, ngày đến hạn, đã thu/chưa thu). Có mẫu nhanh: 4 đợt 30/30/30/10 hoặc tự thêm. Đánh dấu "Đã thu" ghi ngày thu và cộng vào số đã thu của hợp đồng.
3. **Hoa hồng**: mỗi hợp đồng có các dòng hoa hồng theo người thụ hưởng (Sale chính, Sale hỗ trợ, quản lý), theo % giá bán hoặc số tiền cố định, trạng thái Chờ · Duyệt · Đã trả. Chỉ quản lý được duyệt và đánh dấu đã trả.
4. **Trang Hợp đồng** (menu nhóm Khách hàng & bán hàng): danh sách hợp đồng, lọc theo dự án / trạng thái / Sale, tổng giá trị, đã thu, còn phải thu, hoa hồng chờ trả. Mở chi tiết thấy sản phẩm, khách, đợt thanh toán, hoa hồng.
5. **Hoàn tất hợp đồng**: khi thu đủ, hợp đồng sang "Hoàn tất", sản phẩm sang "Đã bán", giao dịch sang "Thành công".
6. **Phễu KPI**: báo cáo phễu thêm bước Hợp đồng lấy từ bảng hợp đồng thật (thay vì suy ra từ trạng thái sản phẩm), thêm cột giá trị hợp đồng, số đã thu và tỷ lệ thu tiền theo dự án và theo nguồn khách.

## Quy tắc

- Một sản phẩm chỉ có một hợp đồng đang hiệu lực; huỷ hợp đồng trả sản phẩm về Trống và ghi nhật ký.
- Tổng tỷ lệ các đợt thanh toán phải bằng 100% trước khi hợp đồng được duyệt.
- Sale chỉ thấy hợp đồng và hoa hồng của mình; quản lý thấy toàn sàn.
- Mọi thay đổi trạng thái hợp đồng, thu tiền, duyệt hoa hồng ghi vào nhật ký kiểm toán.

## Phần kỹ thuật

- Migration: bảng `contracts` (tenant_id, project_id, product_id, customer_id, lead_id, deal_id, owner_user_id, code, sale_price, discount_amount, net_price, currency, status enum `contract_status` draft/active/completed/cancelled, signed_at, completed_at, note, timestamps, deleted_at); `contract_installments` (contract_id, tenant_id, name, position, percent, amount, due_date, paid_at, paid_amount, status); `contract_commissions` (contract_id, tenant_id, beneficiary_user_id, role_label, percent, amount, status enum `commission_status` pending/approved/paid, approved_by, approved_at, paid_at, note). RLS theo tenant + GRANT `authenticated`/`service_role`; trigger `set_updated_at`; unique `(tenant_id, code)` và unique một hợp đồng hiệu lực cho mỗi `product_id`.
- Trigger/hàm: khi `contracts.status` đổi → cập nhật `products.listing_status` (`contracted`/`sold`/`available`) và ghi `product_status_history`; khi đợt thanh toán đổi trạng thái → cập nhật tổng đã thu.
- `src/lib/contract.functions.ts`: `listContracts`, `getContract`, `createContractFromProduct`, `updateContract`, `setInstallments`, `markInstallmentPaid`, `setCommissions`, `approveCommission`, `markCommissionPaid`, `completeContract`, `cancelContract` — đều `requireSupabaseAuth`, kiểm vai trò trong handler (Sale chỉ dữ liệu của mình).
- Giao diện: `src/routes/_app.contracts.tsx` (danh sách + chi tiết dạng panel), nút "Lập hợp đồng" trong `src/routes/_app.inventory.tsx`, mục menu mới trong `src/components/app/sidebar.tsx`.
- `src/lib/funnel-report.functions.ts`: bước hợp đồng đọc từ `contracts` (status active/completed), thêm `contractValue`, `collected`, `collectRate` cho tổng và từng dòng; `src/routes/_app.funnel-report.tsx` thêm cột tương ứng.

## Ngoài phạm vi lần này

In ấn hợp đồng/phiếu thu PDF, tích hợp ngân hàng đối soát tự động, hoa hồng nhiều cấp F2/F3 — làm ở bước sau.
