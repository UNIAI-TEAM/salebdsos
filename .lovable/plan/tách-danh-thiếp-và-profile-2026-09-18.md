# Tách Danh thiếp và Profile

## Mục tiêu
Tách trải nghiệm trình chiếu danh thiếp khỏi hồ sơ chi tiết, để Sale mở PWA và đưa khách xem ngay theo mẫu đã gửi.

## Thay đổi
- Tạo màn hình **Danh thiếp** riêng trong PWA, ưu tiên thông tin cốt lõi: ảnh, tên, chức danh, công ty, mô tả ngắn, QR và thao tác chia sẻ/NFC/xem hồ sơ.
- Thiết kế màn hình Danh thiếp theo tinh thần mẫu: nền tối cao cấp, viền vàng nhẹ, bố cục ngang trong khung danh thiếp và tối ưu lại thành bố cục dọc trên điện thoại nhỏ.
- Tạo màn hình **Profile** riêng để hiển thị phần giới thiệu, liên hệ, kinh nghiệm/lĩnh vực và danh sách dự án đang bán.
- Đưa toàn bộ cấu hình nội dung, liên hệ, dự án, mẫu màu và trạng thái công khai vào màn hình **Sửa danh thiếp**; không để các chi tiết chỉnh sửa lẫn trong màn hình trình chiếu.
- Cập nhật menu và các nút mở/xem để phân biệt rõ Danh thiếp, Profile và Sửa danh thiếp.
- Giữ nguyên đường dẫn công khai, QR, tracking và dữ liệu hiện có.

## Chi tiết kỹ thuật
- Tái sử dụng dữ liệu `cards`, `card_projects` và QR hiện có; không đổi cơ sở dữ liệu.
- Tách giao diện thành các phần dùng chung để bản trình chiếu, profile công khai và phần xem trước trong màn hình sửa luôn đồng bộ.
- Dùng token màu semantic hiện có, bổ sung token vàng/xanh đen khi cần; không hardcode màu trong giao diện.
- Thêm metadata riêng cho mọi trang mới.
- Kiểm tra ở điện thoại 390px và desktop, đảm bảo không tràn ngang và các nút/QR hoạt động.

## Ngoài phạm vi
- Không thay đổi cơ chế tạo QR, tracking hành trình khách hàng hoặc phân quyền.
- Không thêm trường dữ liệu mới cho kinh nghiệm/thành tích nếu dữ liệu hiện tại chưa có; Profile dùng thông tin và dự án sẵn có.
