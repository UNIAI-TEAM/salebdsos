# Trang tổng quan Sale

## Mục tiêu
Tạo một trang tổng quan riêng cho từng Sale, tự động tổng hợp dữ liệu hiện có theo đúng người phụ trách và workspace.

## Nội dung trang
- Bộ chọn Sale chỉ hiển thị cho Chủ sàn, Quản trị và Trưởng phòng; Sale luôn xem dữ liệu của chính mình.
- Chỉ số tự cập nhật: lượt tương tác QR/Digital Card, khách hàng đã phục vụ, hợp đồng đã ký, dự án đã bán và tỷ lệ chuyển đổi.
- Lịch hẹn sắp tới của Sale, gồm khách hàng, dự án, thời gian, địa điểm và trạng thái.
- Lịch sự kiện/mở bán của các dự án Sale đang phụ trách hoặc đã gắn vào Digital Card.
- Khu vực “Khách đã quét” tách rõ:
  - Khách đã xác định: có tên/số điện thoại sau khi gửi thông tin.
  - Lượt quét ẩn danh: chỉ hiển thị phiên, dự án, QR/kênh, thời gian và trạng thái hành trình.
- Dòng hoạt động gần đây để Sale biết khách vừa quét, mở landing, xem dự án hay gửi thông tin.

## Quy tắc tính chỉ số
- **Lượt tương tác:** các lượt quét QR và mở Digital Card thuộc Sale.
- **Khách hàng đã phục vụ:** khách/lead có thông tin, loại trùng theo bản ghi khách hàng hoặc lead.
- **Hợp đồng đã ký:** giao dịch của Sale có trạng thái `won`.
- **Dự án đã bán:** số dự án khác nhau có ít nhất một giao dịch `won`.
- Lượt quét ẩn danh không được cộng vào khách hàng, hợp đồng hoặc dự án đã bán.

## Phân quyền và dữ liệu
- Sale chỉ truy cập được tổng quan của chính mình.
- Chủ sàn, Quản trị và Trưởng phòng có thể chọn từng Sale trong cùng workspace.
- Kiểm tra quyền ở phía máy chủ, không tin vào mã Sale do trình duyệt gửi lên.
- Tận dụng dữ liệu hiện có từ hành trình khách hàng, lịch hẹn, dự án, khách hàng và pipeline; không thêm bảng mới.

## Giao diện
- Thêm mục **Tổng quan Sale** trong khu vực Tổng quan và lối vào thuận tiện trên điện thoại.
- Bố cục ưu tiên điện thoại: chỉ số ngắn gọn phía trên, lịch theo ngày, hai nhóm khách đã quét và hoạt động gần đây.
- Giữ phong cách SaaS hiện tại, tiếng Việt, trạng thái tải/trống/lỗi rõ ràng, không tràn ngang ở 390px.

## Kiểm tra
- Kiểm tra vai trò Sale và vai trò quản lý.
- Đối chiếu chỉ số với dữ liệu hành trình và pipeline.
- Kiểm tra màn hình 390px và desktop, đường dẫn điều hướng, lỗi trình duyệt và trạng thái biên dịch.
