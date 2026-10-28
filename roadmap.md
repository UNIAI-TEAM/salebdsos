# Roadmap

- [x] Hoàn thiện Báo cáo: Tổng quan thực, lọc dự án/Sale/bán-thuê, xuất CSV; phễu cùng nhóm khách, ngày Việt Nam, hợp đồng thuê theo lịch thu, đọc phân trang và báo lỗi thay vì số thiếu. Kiểm tra đăng nhập 5 trang, tải 5 CSV, lọc Sale/thuê, 390px không tràn; đối chiếu hợp đồng 2,9 tỷ/thu 870 triệu/nợ 2,03 tỷ/hoa hồng 58 triệu. Chưa xuất bản.

- [x] Thiết kế Hộp thoại tinh gọn kiểu Omni Chat: danh sách/cuộn riêng, khung chat, thông tin khách mở khi cần; kiểm tra hội thoại có dữ liệu, soạn nháp không gửi, trạng thái kênh, desktop/mobile; 14 kiểm thử đạt.

- [x] Gia cố giữ căn đồng thời bằng khóa/phiên bản, giải phóng giữ chỗ hết hạn mỗi giờ (không giải phóng cọc/hợp đồng), bảo toàn ID, số đã thu, ngày thu và lịch sử khi sửa đợt. 19 kiểm thử đạt; sửa tên qua giao diện sàn thử, đọc lại tiền giữ nguyên; dữ liệu thử đã dọn. Chưa xuất bản màn hình mới.

- [x] Push khách đại lý: hàng đợi riêng theo referral dùng chung lịch; giao khách/bàn giao, nhắc trước SLA 5 phút, hủy khi phản hồi, kiểm tra quyền đích trước gửi. 18 kiểm thử đạt, thử khách trong sàn riêng và xác nhận thao tác Đã liên hệ hủy nhắc; chưa xác minh thông báo trên điện thoại vì 0 thiết bị, cần xuất bản bản mới và bật thông báo.

- [x] Rà soát quyền hồ sơ/giỏ hàng đại lý: chặn đọc cấp căn hết hạn/thu hồi trực tiếp, khóa bảng lịch sử/quyền/hồ sơ chuyển tiếp thô, ẩn lý do và danh tính đại lý khác và ID nhóm nội bộ. 16 kiểm thử đạt, kiểm tra quản trị/Sale, thu hồi quyền và tạm dừng; không đọc CRM sàn tổng, dữ liệu thử đã dọn.

- [x] Phân khách đến nhóm theo dự án; bàn giao đại lý/nhóm/Sale có lý do, lịch sử và giữ hạn SLA. Đã thử nhóm A nhận khách, chuyển nhóm B và chuyển đại lý đích, SLA quá hạn giữ nguyên, đại lý cũ mất quyền xem khách; 13 kiểm thử đạt. Nhắc push SLA liên đại lý vẫn chưa kích hoạt.

- [x] Hoa hồng và đối soát riêng sàn tổng → đại lý, đại lý → Sale; xác nhận hai bên, thanh toán từng phần, quyền riêng. Đã thử hai sổ qua giao diện, đọc lại bằng quyền Sale, chặn chi trùng/vượt số dư và chi đồng thời; 14 kiểm thử đạt. Không tự chuyển tiền hoặc tự ghép giao dịch ngân hàng; sổ hiện có giữ nguyên.

- [x] Phân khách kênh chung → đại lý theo dự án/tải chờ + 30 ngày → Sale được cấp quyền; SLA từ lúc khách vào, chuyển Sale không gia hạn, ghi nhận liên hệ và lịch sử. Kiểm tra biểu mẫu hai khách chia hai đại lý, quyền Sale riêng, đọc lại phản hồi hai sàn; 20 kiểm thử đạt, dữ liệu thử đã xoá. SLA hiển thị trong Phân khách & SLA; chưa có push nhắc SLA liên đại lý hoặc chat xuyên sàn.

- [x] Đại lý & phân phối: hồ sơ, xác nhận liên kết sàn đối tác, quyền nhóm/Sale, cấp và thu hồi từng căn theo dự án; luồng hai sàn và Sale chỉ có quyền đại lý đã kiểm tra, 19 kiểm thử đạt; dữ liệu thử đã xoá. Chưa bao gồm booking, phân lead hoặc hoa hồng liên đại lý.

- [x] Push giao lead/gán lại bằng hàng đợi, nhắc trước SLA 5 phút, hủy nhắc sau phản hồi; thử sàn riêng, gán lại và lịch tự dừng đạt; 25 kiểm thử đạt.
- [ ] Kích hoạt push thật: chờ xuất bản bản mới (địa chỉ công khai chưa có bộ xử lý mới) và Sale bật thông báo trên điện thoại; hiện 0 thiết bị, chưa xác minh hiển thị thông báo thật.

- [x] Đối chiếu giao khách: giữ Sale cá nhân, tải toàn sàn 30 ngày, nhóm dự án/dự phòng, SLA khi vào hệ thống, QR/chat theo dõi SLA, push Zalo/Messenger, khách cũ chưa có Sale được phân phối; 29 kiểm thử đạt và mở Tổng quan → Gán lại Sale thành công.
- [ ] Hotline nhận khách mới: chờ nhà cung cấp tổng đài và định dạng cuộc gọi đến đã xác thực; hiện webhook chỉ cập nhật kết quả cuộc gọi đã có.
- [ ] Xác minh push tới điện thoại và gửi/nhận kênh thật: chờ thiết bị bật thông báo và tài khoản nhà cung cấp; chưa gửi tin thử.

- [x] Bổ sung tab kết nối Telegram/WhatsApp/Viber, lưu/xoá cấu hình quản trị và kiểm tra tài khoản không gửi tin; thử lưu/đọc/xoá cấu hình Telegram, 19 kiểm thử đạt. Xác minh nhà cung cấp thật còn chờ tài khoản/kết nối.
- [x] Telegram: bot Unicomsale đã liên kết và đăng ký nhận tin cho SaleBDS Demo; bộ xử lý xác thực/trả lời đúng định danh và 23 kiểm thử đạt tại local.
- [ ] Xác minh Telegram hai chiều với người thật: địa chỉ preview công khai đang trả 404 cho webhook (local trả đúng 401); chờ triển khai bản mới và kiểm tra lại trước khi nhắn @Unicomsale_bot. Chưa gửi tin giả hoặc tin cho người không liên quan.
- [ ] WhatsApp gửi/nhận: chờ số WhatsApp Business và hoàn tất thẻ kết nối (đã bỏ qua); chưa bật gửi/nhận.
- [ ] Viber gửi/nhận: chờ bot doanh nghiệp được Viber duyệt; chưa có thông tin kết nối.
- [x] Hiển thị ba kênh mới trong Hộp thoại với trạng thái chờ thiết lập rõ ràng; kiểm tra giao diện bằng tài khoản đăng nhập và 14 kiểm thử đạt.

- [x] Kiểm tra ghép hồ sơ Zalo/Messenger: bỏ đoán theo điện thoại/định danh cũ, gắn hồ sơ nguyên tử, chặn người nhận mơ hồ; kiểm thử sàn tạm và xoá dữ liệu thử.

- [x] Làm nổi bật Hộp thoại đa kênh trong menu Sale; ghi rõ SMS/email chỉ gửi đi và trạng thái kết nối.

- [x] Chat đa kênh: Zalo OA/Messenger nhận tin có chữ ký, chống trùng, gắn hồ sơ, phản hồi đúng kênh, trạng thái kết nối; đã thử trong sàn tạm riêng và xoá dữ liệu thử.
- [ ] Xác nhận gửi/nhận thật Zalo OA và Messenger: chờ quản trị viên cung cấp tài khoản/khoá qua ô bảo mật.

- [x] Kiểm tra và sửa Trợ lý AI: phạm vi Sale, lỗi tra cứu, hội thoại dài/đổi sàn; bốn câu hỏi thực tế trả lời thành công, 17 kiểm thử đạt.

- [x] Kiểm tra hiện trạng kênh, quyền cấu hình, yêu cầu không có khoá trên preview và published; kiểm thử bank/social/segments (17/17).
- [ ] SePay/Casso: chờ chọn nhà cung cấp và tài khoản quản trị sàn; chưa có cấu hình ngân hàng/khoá webhook.
- [ ] Zalo OA: chờ tài khoản quản trị sàn và thông tin OA/ứng dụng qua ô bảo mật; chưa có token/secret/app ID.
- [ ] SMS: chờ chọn nhà cung cấp, brandname và khoá qua ô bảo mật; chưa có cấu hình/khoá eSMS.
- [ ] Facebook: chờ tài khoản quản trị sàn, Page/form và App Secret/Page Token qua ô bảo mật; chưa có cấu hình/khoá.

- [x] Tách Danh thiếp, Profile và màn hình Sửa theo thiết kế đã duyệt.

- [ ] Hoàn tất publish và kiểm tra landing công khai từ chế độ PWA.
- [x] Hoàn thiện Digital Card Professional Dark Mode và kiểm tra mobile/desktop.
- [x] Gắn timeline vào quản lý dự án.
- [x] Cho phép thêm, sửa, xóa lịch hẹn trong dự án.
- [x] Đồng bộ lịch hẹn dự án với landing công khai.
- [x] Kiểm tra giao diện, dữ liệu và lỗi sau thay đổi.
- [x] Tạo trang tổng quan từng Sale với lịch, khách quét và chỉ số tự cập nhật.
- [x] Cho Sale tải ảnh và tạo chân dung doanh nhân bằng AI để duyệt trước khi dùng.
- [x] Hiển thị số liệu uy tín xác thực trên landing công khai và danh thiếp Sale.
- [x] Chỉ tính khách đã gửi thông tin, khử trùng số điện thoại/email và làm rõ chỉ số trên Tổng quan Sale.

- [x] Tách Tổng quan Sale theo từng dự án với bộ lọc toàn trang và bảng so sánh.
- [x] Tạo trang Quản lý Sale: mời qua email, sửa hồ sơ/danh thiếp và ngừng hoạt động an toàn.
- [x] Tối ưu PWA: thanh dưới 4 mục, nút QR giữa và menu bên chỉ còn Sale/Quản trị.

- [x] Phễu: tự chuyển khách vào giỏ khi đổi trạng thái; tự cập nhật KPI khi chốt hợp đồng

- [x] Giai đoạn 1: Đối soát ngân hàng tự động + Sự kiện mở bán & check-in QR
- [x] Giai đoạn 2: Phân khúc động + chiến dịch gửi hàng loạt
- [x] Giai đoạn 3: Tự động hoá bình luận Facebook/Messenger, trả lời nhanh, thẻ hội thoại
- [x] Giai đoạn 4: Tuổi nợ + trợ lý AI điều hành

- [x] Bước 1a: Hồ sơ khách hàng 360° (gộp gửi thông tin, tin nhắn, gọi, hợp đồng, thu tiền, ngân hàng, sự kiện, tài liệu, nhắc tự động)
- [x] Bước 1b: Phễu cơ hội kéo thả (điện thoại, tự thắng/thua, lý do thất bại, nhật ký)
- [x] Bước 1c: Quản lý phòng ban + phân quyền theo phòng
- [x] Bước 1d: Bàn giao khách khi Sale nghỉ
- [x] Landing: thêm mục Đại lý & phân phối, Danh thiếp số, Kịch bản bán hàng; cập nhật điều hướng, FAQ và mô tả tìm kiếm

- [x] Kịch bản chat GĐ1: thư viện mẫu BĐS, AI sinh theo dự án, tự tạo lịch hẹn & ghi nhu cầu

- [x] Giai đoạn A — sàn đất/phân lô: sơ đồ lô theo khu (hàng×cột), tô màu trạng thái, giữ chỗ nhanh, đặt vị trí lô; 6 kiểm thử plot-map đạt; đã thử giữ chỗ + gán vị trí trên giao diện, mobile không tràn; dữ liệu thử đã xoá. Còn lại: chiết khấu theo đợt, tách/ghép lô.
- [x] Chiết khấu TT nhanh: chính sách theo dự án/loại hình (trang Chiết khấu TT nhanh), gợi ý trên sơ đồ lô và form hợp đồng, lưu chính sách đã áp dụng vào hợp đồng; 7 kiểm thử đạt; đã thử tạo chính sách → gợi ý -3%/60tr trên sơ đồ → áp dụng vào form hợp đồng; dữ liệu thử đã xoá.
