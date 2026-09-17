# Digital Card Professional Dark Mode

## Mục tiêu
Tạo danh thiếp số toàn màn hình để Sale mở trên PWA và đưa khách quét ngay, theo phương án Professional Dark Mode đã chọn.

## Thay đổi
- Nâng cấp phần xem trước trong trang Danh thiếp số thành bản trình chiếu sát với giao diện thật: ảnh Sale, tên/chức danh/công ty, QR trung tâm, Gọi, Zalo, Lưu danh bạ, Chia sẻ và lối xem dự án.
- Thiết kế lại trang công khai `/c/<slug>` với nền đen bạch kim, lớp kính mờ nhẹ, chữ Libre Baskerville + IBM Plex Sans và điểm nhấn xanh.
- Đưa QR công khai lên trung tâm màn hình đầu tiên; giữ nguyên URL ổn định và cơ chế ghi nhận lượt truy cập hiện tại.
- Giữ các dự án, biểu mẫu khách quan tâm và nội dung bổ sung ở phía dưới, không cạnh tranh với QR.
- Giữ toàn bộ nút liên hệ hiện tại hoạt động; bổ sung trạng thái phản hồi rõ khi chia sẻ hoặc sao chép liên kết.

## Chi tiết kỹ thuật
- Dùng token màu semantic mới trong `src/styles.css`, không hardcode màu trong giao diện.
- Nạp Libre Baskerville và IBM Plex Sans qua phần head chung.
- Tái sử dụng QR hiện có; không thay đổi dữ liệu hoặc tạo bảng mới.
- Thêm metadata riêng cho trang chỉnh sửa Digital Card nếu còn thiếu.
- Kiểm tra ở màn hình điện thoại 390px và desktop; xác nhận QR hiển thị, không tràn ngang, nút liên hệ và phần dự án hoạt động.

## Ngoài phạm vi
- Không thay đổi quy trình tạo/sửa dữ liệu danh thiếp.
- Không thay đổi cơ chế QR, tracking hoặc biểu mẫu khách hàng ở backend.
