# Tách Tổng quan Sale theo dự án

## Mục tiêu
- Thêm bộ lọc **Tất cả dự án / từng dự án** trên Tổng quan Sale.
- Khi chọn dự án, toàn bộ chỉ số, lịch, khách đã gửi thông tin, lượt quét và hoạt động gần đây chỉ hiển thị dữ liệu của dự án đó.
- Thêm bảng so sánh tất cả dự án để Sale và quản lý nhìn nhanh hiệu quả từng dự án.

## Thay đổi chính
1. Mở rộng dữ liệu Tổng quan Sale nhận `projectId` và kiểm tra dự án thuộc danh sách dự án Sale đang phụ trách.
2. Tách số liệu theo từng dự án: tương tác 30 ngày, khách gửi thông tin không trùng, hợp đồng thành công, tỷ lệ chuyển đổi và lịch/sự kiện liên quan.
3. Đồng bộ bộ lọc dự án với địa chỉ trang để giữ lựa chọn khi tải lại hoặc chia sẻ nội bộ.
4. Hiển thị bảng so sánh dự án, tối ưu thành danh sách dễ đọc trên điện thoại.
5. Giữ nguyên phân quyền: Sale chỉ xem dữ liệu của mình; quản lý có thể chọn Sale rồi chọn dự án của Sale đó.

## Quy tắc số liệu
- Khách đã gửi thông tin: chỉ lead từ biểu mẫu công khai, có điện thoại hoặc email, khử trùng trong từng dự án.
- Hợp đồng đã ký: giao dịch `won` gắn với dự án.
- Tương tác: QR/Digital Card có thể quy về dự án trong 30 ngày.
- Dữ liệu không có dự án không được gán suy đoán vào một dự án cụ thể; chỉ xuất hiện ở chế độ tổng cộng.

## Kiểm tra
- Kiểm tra chọn Sale và dự án không làm lộ dữ liệu tenant khác.
- Kiểm tra số tổng bằng dữ liệu nguồn và số từng dự án không bị cộng trùng.
- Kiểm tra giao diện desktop và mobile 440px, không tràn ngang.
