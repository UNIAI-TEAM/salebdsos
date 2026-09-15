# Đồng bộ timeline dự án với landing công khai

## Mục tiêu
- Quản lý lịch hẹn ngay trong trang chi tiết dự án: thêm, sửa, xóa và đổi trạng thái.
- Mỗi lịch có công tắc “Hiển thị trên landing”; mặc định là riêng tư.
- Landing chỉ hiển thị các lịch được bật công khai, không lộ ghi chú hay thông tin khách hàng.

## Thực hiện
- Bổ sung liên kết dự án và cờ công khai cho dữ liệu lịch hẹn.
- Mở rộng chức năng lịch hẹn hiện có để lọc theo dự án và lưu hai trường mới.
- Thêm khu vực “Lịch hẹn & sự kiện” vào trang quản lý dự án, dùng lại hộp thêm/sửa và xác nhận xóa.
- Trả về danh sách lịch công khai tối giản trong dữ liệu landing và hiển thị timeline gọn trên điện thoại.
- Khi thêm, sửa hoặc xóa, làm mới dữ liệu dự án và landing tương ứng.

## Kỹ thuật và an toàn
- Dữ liệu nội bộ tiếp tục áp dụng quyền theo workspace hiện có.
- Landing chỉ nhận `title`, `location`, `starts_at`, `ends_at`; không trả ghi chú, khách, người phụ trách.
- Kiểm tra giao diện 320px, 390px và desktop; kiểm tra build, lỗi trình duyệt và truy vấn dữ liệu.
