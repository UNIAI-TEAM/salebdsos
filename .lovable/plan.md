# Tối ưu landing và timeline trên màn hình nhỏ

## Kết quả
- Thu gọn phần đầu landing theo hướng **Dark luxury mobile** đã chọn: giảm khoảng trống, ảnh có tỷ lệ ổn định, tiêu đề dài tự xuống dòng và CTA không tràn ở 320–430px.
- Biến brochure thành một hàng gọn với biểu tượng cố định, tên tài liệu co giãn/truncate và mũi tên luôn nằm trong khung.
- Làm timeline mobile nhẹ và dễ quét hơn: thẻ thống kê thích nghi ở 320px, tiêu đề/chi tiết dài tự ngắt, liên kết mở nhanh không kéo rộng trang.
- Sắp nhóm Zalo, Gọi, SMS, Email thành lưới 4 nút cân bằng trên mobile; giữ kiểu hiện tại trên màn hình lớn.
- Thu gọn form liên hệ và thêm khoảng an toàn đáy màn hình, không thay đổi việc gửi thông tin.

## Chi tiết kỹ thuật
- Chỉ sửa giao diện trong trang landing công khai, timeline và nhóm liên hệ dùng chung.
- Dùng token màu và thành phần nút hiện có; không thêm màu hardcode hoặc thay đổi dữ liệu/nghiệp vụ.
- Thêm `min-w-0`, `break-words`, `truncate`, lưới mobile và kích thước ổn định tại các điểm có nguy cơ tràn.
- Kiểm tra trực tiếp ở 320px, 390px và desktop; xác nhận chiều rộng nội dung không vượt viewport và không có lỗi build/runtime.
