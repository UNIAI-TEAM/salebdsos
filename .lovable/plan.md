# Profile Sale + QR: khách quét là thấy ngay dự án đang bán

## Hiện trạng
- Khi đăng nhập bằng sale@salebdsos.vn, mục "Danh thiếp số" đã tạo được profile (ảnh, tên, chức danh, số điện thoại, Zalo) và có QR để chia sẻ.
- Nhưng trang khách nhìn thấy sau khi quét QR chỉ có thông tin liên hệ. Không có dự án nào, không có brochure, không có chỗ để khách để lại thông tin.
- Tài khoản demo cũng chưa có danh thiếp mẫu nào được điền sẵn, nên quét QR ra trang trống.

## Đề xuất tính năng
Biến trang quét QR thành "mini website của sale": liên hệ + dự án đang bán + để lại thông tin.

### 1. Gắn dự án vào danh thiếp (trong app)
- Trong trang Danh thiếp số thêm mục "Dự án tôi đang bán": chọn từ danh sách dự án của workspace, kéo sắp thứ tự, bật/tắt.
- Sale chọn 3-6 dự án nổi bật; mỗi dự án hiển thị ảnh bìa (bản nhẹ cho điện thoại), tên, khu vực, giá từ.

### 2. Trang công khai sau khi quét QR
Thứ tự hiển thị trên điện thoại:
1. Ảnh đại diện, tên, chức danh, công ty, giới thiệu ngắn.
2. Hàng nút nhanh: Gọi, Zalo, Lưu danh bạ (vCard), Chia sẻ.
3. "Dự án đang bán" — thẻ ảnh ngang cuộn được, bấm vào mở landing dự án công khai (đã có sẵn) kèm brochure.
4. "Để lại thông tin" — form ngắn: tên, số điện thoại, dự án quan tâm.
5. Chân trang: thương hiệu SaleBDS OS.

### 3. Khách để lại thông tin → sale nhận ngay
- Form tạo khách tiềm năng gắn đúng sale (chủ danh thiếp), đúng dự án quan tâm và nguồn "QR danh thiếp".
- Bắn thông báo realtime vào chuông trong app, bấm vào là mở khách đó.

### 4. Thống kê để sale biết QR có hiệu quả
- Trên Danh thiếp số: số lượt quét, số lượt bấm vào dự án, số khách để lại thông tin (30 ngày).

### 5. Dữ liệu demo
- Tạo sẵn danh thiếp hoàn chỉnh cho sale@salebdsos.vn (ảnh, chức danh, Zalo, giới thiệu) và gắn 4 dự án mẫu đã có, để anh quét QR là ra ngay bản demo đẹp.

## Ghi chú kỹ thuật
- Dùng bảng `card_projects` đã có (tenant_id, card_id, project_id, position) cho việc gắn dự án; không cần bảng mới.
- Mở rộng `src/routes/c.$slug.tsx`: loader lấy thêm dự án qua `card_projects` → `projects` (name, city, price_from, cover_mobile_url, cover_url, slug) và link tới landing công khai `/p/$slug`.
- Form khách: server function public ghi vào `leads` với `card_id`, `project_id`, `owner_user_id` = chủ card, `source = 'qr_card'`, kèm insert `notifications` như luồng lead form hiện tại.
- Ghi nhận lượt bấm dự án vào `interaction_events` với `source` phù hợp; thống kê đọc từ `interaction_events` + `leads`.
- Ảnh dùng `srcSet` desktop/mobile như landing để tải nhanh trên 3G.
