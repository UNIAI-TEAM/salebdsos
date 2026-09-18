# Trang quản lý Sale

## Mục tiêu
Nâng cấp “Danh sách Sale” thành nơi quản lý tập trung: mời Sale mới, sửa hồ sơ và danh thiếp, ngừng hoạt động, đồng thời phản ánh thay đổi ngay trên Digital Card trình chiếu và đường dẫn công khai.

## Trải nghiệm quản lý
- Đổi tên trang thành **Quản lý Sale**, chỉ dành cho Owner/Admin; Manager được xem danh sách và mở danh thiếp nhưng không thay đổi tài khoản.
- Thanh công cụ gồm tìm kiếm, bộ lọc trạng thái và nút **Thêm Sale**.
- Form thêm Sale dùng email mời, gồm họ tên, email, số điện thoại và vai trò Sale; hiển thị các lời mời đang chờ để gửi lại hoặc thu hồi.
- Mỗi Sale có trạng thái hoạt động, ảnh đại diện, chức danh, liên hệ, trạng thái danh thiếp, lượt xem và dự án đang gắn.
- Màn hình sửa chia hai phần rõ ràng:
  - **Hồ sơ Sale:** họ tên, số điện thoại, ảnh đại diện, vai trò. Email đăng nhập chỉ hiển thị, không tự đổi.
  - **Danh thiếp:** tên hiển thị, chức danh, công ty, giới thiệu, đường dẫn, trạng thái công khai và các thông tin liên hệ.
- Có bản xem trước Digital Card trong màn hình sửa; lưu thành công cập nhật ngay bản trình chiếu và trang công khai.
- Hành động **Ngừng hoạt động** yêu cầu xác nhận, gỡ Sale khỏi workspace và ẩn danh thiếp; giữ nguyên khách hàng, giao dịch, lịch hẹn và lịch sử. Không xóa tài khoản vĩnh viễn.

## Đồng bộ dữ liệu
- Tạo hàm đồng bộ một Sale dùng chung cho thao tác thêm/sửa và nút đồng bộ hàng loạt.
- Thay đổi hồ sơ cập nhật ngay các trường tương ứng trên danh thiếp; thay đổi vai trò cập nhật chức danh mặc định.
- Tôn trọng các trường danh thiếp đã được tùy chỉnh thủ công; chỉnh trực tiếp trong trang quản lý sẽ trở thành giá trị chính thức, không bị đồng bộ hàng loạt ghi đè.
- Sau mọi thao tác, làm mới danh sách Sale, Digital Card, Tổng quan Sale và các dữ liệu liên quan trên giao diện.

## Quyền và an toàn
- Mọi thao tác ghi được kiểm tra quyền Owner/Admin ở phía máy chủ; không dựa vào việc ẩn nút trên giao diện.
- Không cho người quản lý tự ngừng chính mình hoặc ngừng Owner cuối cùng.
- Chỉ thao tác trên Sale thuộc workspace hiện tại.
- Lời mời hết hạn/đã thu hồi không tạo hồ sơ hoặc danh thiếp.
- Ngừng hoạt động là thao tác mềm, có thể mời/gắn lại sau mà không mất lịch sử.

## Kỹ thuật
- Mở rộng các hàm quản lý Sale hiện có thay vì tạo bảng mới.
- Dùng hồ sơ, vai trò, lời mời, danh thiếp và quan hệ dự án hiện tại; không thay đổi cấu trúc cơ sở dữ liệu.
- Dùng các thành phần giao diện sẵn có và bổ sung hộp thoại/form thích ứng desktop, tablet, mobile.
- Bổ sung tiêu đề và mô tả chia sẻ riêng cho trang quản lý.
- Kiểm thử quyền, mời/sửa/ngừng hoạt động, đồng bộ Digital Card, đường dẫn công khai và giao diện mobile không tràn.
