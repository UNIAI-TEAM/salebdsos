# Giỏ hàng đa loại hình cho sàn BĐS

Một giỏ hàng chung cho mọi loại hình sản phẩm, mỗi loại hình có bộ thông tin riêng và cách xem riêng, dùng chung trạng thái bán và bộ lọc.

## Loại hình hỗ trợ

| Loại hình | Thông tin riêng | Cách xem mặc định |
|---|---|---|
| Căn hộ chung cư | Toà/block, tầng, mã căn, số phòng ngủ/WC, diện tích tim tường & thông thuỷ, hướng, view, loại hình căn (studio/duplex/penthouse) | Theo toà → tầng (lưới căn) |
| Đất nền / phân lô | Khu, lô, diện tích, mặt tiền, chiều sâu, đường trước lô, hướng, pháp lý | Theo khu → lô (lưới lô) |
| Nhà phố / nhà đất / shophouse | Địa chỉ, diện tích đất, diện tích xây dựng, số tầng, số phòng, hướng, pháp lý, năm hoàn thiện | Danh sách/thẻ |
| Nhà ở xã hội | Như chung cư + điều kiện đối tượng, trạng thái hồ sơ xét duyệt, giá theo quy định, hạn nộp hồ sơ | Theo toà → tầng + cột hồ sơ |

## Trạng thái bán (dùng chung)

Trống · Tạm khoá · Giữ chỗ · Đang đàm phán · Cọc · Ký HĐMB · Đã bán · Đã thanh lý.

- Mỗi trạng thái có màu riêng trên lưới và bộ lọc nhanh.
- Chuyển trạng thái ghi lại người thực hiện + thời điểm vào nhật ký sản phẩm.
- Giữ chỗ và Cọc có hạn thời gian; hết hạn hệ thống nhắc và cho trả về Trống.
- Một sản phẩm chỉ có một trạng thái đang hiệu lực, tránh trùng bán.

## Trang & luồng sử dụng

1. **Giỏ hàng dự án** (trong trang dự án): chọn cách xem theo loại hình, lưới ô màu theo trạng thái, bộ lọc (loại hình, giá, diện tích, số phòng, hướng, trạng thái, khu/toà/tầng), tìm theo mã căn/lô.
2. **Chi tiết sản phẩm**: thông tin theo loại hình, giá & chính sách, lịch sử trạng thái, khách đang quan tâm, nút Giữ chỗ / Cọc / Gắn vào giao dịch.
3. **Nhập giỏ hàng**: nhập tay từng sản phẩm, tạo hàng loạt theo dải (toà A, tầng 5–20, mỗi tầng 8 căn), và nhập từ tệp Excel/CSV theo mẫu từng loại hình.
4. **Gắn vào bán hàng**: từ khách/lead/giao dịch chọn sản phẩm; khi giao dịch chuyển Thành công thì sản phẩm sang Đã bán.
5. **Hiển thị công khai**: landing dự án và danh thiếp hiện danh sách sản phẩm còn trống (ẩn giá nội bộ nếu sàn muốn), khách bấm quan tâm tạo lead gắn đúng sản phẩm.
6. **Báo cáo**: tỷ lệ hấp thụ theo dự án/khu/toà, số căn còn trống, doanh số theo loại hình.

## Phần kỹ thuật

- Giữ bảng `products` làm giỏ hàng, bổ sung: `project_id`, `product_type` (enum 4 loại hình), `zone` (khu/toà), `floor`, `code` (mã căn/lô), `area`, `usable_area`, `bedrooms`, `bathrooms`, `direction`, `legal_status`, `listing_status` (enum 8 trạng thái), `hold_expires_at`, `deal_id`, `is_public`. Thuộc tính đặc thù còn lại tiếp tục ở `attributes` jsonb.
- Bảng mới `product_status_history` (sản phẩm, trạng thái cũ/mới, người thực hiện, ghi chú, thời điểm) cho nhật ký và chống trùng bán.
- Ràng buộc: `unique (project_id, code)` theo tenant; trigger kiểm tra `product_type` khớp loại hình cho phép của dự án và ghi nhật ký khi `listing_status` đổi.
- RLS theo tenant như các bảng hiện có, kèm GRANT cho `authenticated`/`service_role`; thêm chính sách đọc `anon` chỉ cho sản phẩm `is_public` và trạng thái Trống.
- Định nghĩa trường theo loại hình tập trung trong một tệp cấu hình dùng chung cho form, bộ lọc, nhập Excel và hiển thị — thêm loại hình mới chỉ cần thêm cấu hình.
- Server function mới trong `src/lib/inventory.functions.ts`: danh sách có phân trang/bộ lọc, tạo hàng loạt, đổi trạng thái, nhập tệp; đọc công khai qua server function không cần đăng nhập.
- Giao diện: `src/routes/_app.projects.$id.tsx` thêm tab Giỏ hàng, trang `_app.inventory.*` cho quản lý toàn sàn, thành phần lưới dùng lại cho cả chung cư và đất nền.

## Ngoài phạm vi lần này

Hoa hồng, phiếu cọc/hợp đồng in ấn, đợt thanh toán, sơ đồ mặt bằng dạng ảnh có vùng bấm — làm ở bước sau.
