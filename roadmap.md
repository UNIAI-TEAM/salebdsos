# Roadmap

- [ ] Lấy lại tên/ảnh khách trên Zalo Vietants bằng token của đúng OA; kiểm thử ticket, phân công, khảo sát và kịch bản qua hội thoại Zalo thật, ghi rõ các bước chờ khách gửi tin/chấm điểm.

- [x] Form "Thêm Zalo OA" rõ ràng: mỗi ô có hướng dẫn lấy giá trị ở đâu; Secret Key đổi tên thành "Secret Key của ứng dụng (App Secret)" và ghi rõ không phải OA Secret Key (khóa này nhập sau trong Sửa cấu hình). OA ID được bỏ trống: lưu dạng chờ theo webhook riêng, cấp quyền xong tự ghi đúng mã do token xác nhận; OA đã có mã không bao giờ bị cấp quyền sau ghi đè. 17 test đạt, đã thử lưu không nhập OA ID → hiện "Chưa có mã OA — bấm Cấp quyền" → xóa bản ghi thử, build OK. Chưa xuất bản.
- [x] Đối chiếu lỗi Zalo thật: nhận user_send_text thành công lúc 04:48 UTC; gửi bị nhà cung cấp chặn do OA cần nâng cấp gói. Bổ sung lấy tên/ảnh qua v3 user-detail, cache đúng danh tính OA và hiển thị avatar/lỗi; API hồ sơ hiện bị Zalo từ chối nên chưa có tên/ảnh thật. Sửa nhận diện OA ở sự kiện xác nhận gửi để tránh báo Sai OA giả; 29 test đạt, giao diện hội thoại thật/lỗi đã kiểm tra, bản sửa chưa xuất bản.
- [ ] Zalo gửi/tên/ảnh thành công: chờ quản trị OA kiểm tra nâng cấp gói và quyền quản lý thông tin người dùng; không thể vượt giới hạn Zalo bằng gửi lại hoặc đổi khóa.

- [x] Lỗi cấp quyền lại: OA đang cấu hình NextSchool 2788520716563342888 nhưng Zalo trả về 1931793407476901203; hệ thống chặn đúng để không đổi sang OA khác. Cần người dùng chọn đúng OA khi cấp quyền hoặc thêm OA kia thành tài khoản riêng.

- [x] Chẩn đoán OA thật NextSchool: kiểm tra token trực tiếp qua giao diện thành công; webhook công khai đã nhận user_send_text/image nhưng từ chối sai chữ ký, chưa có hội thoại Zalo. Đã sửa trạng thái dùng OA thay cấu hình cũ, tự cập nhật và nêu lỗi nhận tin; chuẩn hóa mac spacing, giữ nguyên body và ID lớn. 26 test đạt, build OK; chưa xuất bản.
- [ ] Xác nhận Zalo gửi–nhận thật: cần xuất bản sửa mới và quản trị kiểm tra/nhập lại OA Secret Key tại NextSchool → Sửa cấu hình nếu tiếp tục sai chữ ký, rồi gửi tin mới; không thể khôi phục tin đã bị từ chối hoặc xác minh hai chiều khi chưa có tin vào hợp lệ.

- [x] Zalo OA bước 1: nhiều OA tại Tích hợp (thêm, dùng chung ứng dụng, cấp quyền Zalo, nhập token tay, gắn dự án, tạm dừng, ngắt kết nối, nhật ký), webhook riêng có chữ ký/chống phát lại, trả lời từ đúng OA, làm mới token có khóa + hằng giờ. Thử tin giả lập có chữ ký: nhận 1 tin, gửi trùng không nhân đôi, sai chữ ký bị chặn; 5 test đạt; dữ liệu thử đã dọn. Chưa thử OA thật.
- [x] Zalo OA bước 1 phần còn lại: nhãn + lọc OA trong Hộp thoại, đồng hồ hạn gửi tin 7 ngày (cảnh báo 12 giờ cuối, quá hạn khóa gửi cả ở máy chủ), gửi ảnh JPG/PNG ≤1MB và PDF/DOC ≤5MB (kiểm nội dung tệp, lưu kho riêng tư), tự thử lại 3 lần với lỗi tạm thời + nút Gửi lại cập nhật đúng tin cũ, báo Sale khi lỗi. 8 test quy tắc đạt, build OK.
- [ ] Kiểm thử giao diện Hộp thoại phần Zalo mới: chưa đăng nhập được bản xem trước để thử — cần anh đăng nhập preview rồi em chạy lại.
- [ ] Zalo bước 2–5: Ticket & phân công, CSAT, kịch bản tư vấn trên Zalo, vận hành — chờ anh duyệt từng bước.
- [ ] Thử OA thật: cần Publish, anh nhập App ID/Secret và bấm Cấp quyền.

- [x] Theme/logo/slogan tại Cài đặt → Thương hiệu: 4 preset theo sàn, giữ lựa chọn sáng/tối cá nhân; logo PNG/JPG/WebP 2MB, kiểm nội dung và quyền quản trị. Lưu theme/slogan/logo, tải lại và xem logo thành công; đã khôi phục thương hiệu trước thử. 4 test đạt, build OK; chưa xuất bản.

- [x] Cấu hình email riêng tại Tích hợp: Resend theo tài khoản từng sàn, khóa mã hóa, quản trị nhập tên miền/địa chỉ gửi, lấy DNS, xác minh, gửi thử đến chính mình và lịch sử tiếp nhận/thất bại; chặn tên miền chưa xác minh. 5 test quy tắc đạt; giao diện quản trị và chặn địa chỉ khác tên miền đã kiểm tra. Chưa xuất bản.
- [ ] Kiểm thử Resend tạo/xác minh/gửi thật: chờ quản trị sàn nhập khóa Full access và tên miền sở hữu, thêm DNS; không có tài khoản/khóa để thực hiện thay sàn. Email chiến dịch vẫn chặn, chưa triển khai đồng ý nhận tin/hủy đăng ký.

- [x] Rà soát CRM/CTV: thay quyền quá rộng bằng quyền theo Sale/vai trò, chặn liên kết chéo sàn và nâng platform_admin, khóa tài liệu CRM riêng, lời mời gắn email xác nhận/hiện tại, gỡ chatbot AI cũ công khai, chặn gọi theo hậu tố. 7 kiểm thử trực tiếp Sale/CTV đạt; CTV gửi khách và đọc lại trên giao diện; quản lý bị chặn sửa nhưng được điều phối; chặn hợp đồng chéo sàn/lời mời email cũ/tải tài liệu không đăng nhập. Quét cơ bản sau sửa không còn cảnh báo; bản giao diện mới chưa xuất bản.
- [ ] Mật khẩu quản trị từng lộ trong tệp quản lý cũ: cần chủ tài khoản đổi mật khẩu, thu hồi phiên và xử lý tệp lịch sử bị công cụ khóa sửa; chưa xác minh đã luân chuyển nên giữ cảnh báo mở.

- [x] Gom Việc hôm nay ngay Tổng quan Sale: khách cần gọi/lịch hẹn/SLA/công nợ; không thêm menu, giữ phân quyền và thao tác hiện có. Công nợ theo Sale đang chọn; lịch từ đầu ngày Việt Nam, Tất cả không lặp SLA/khách. 16 kiểm thử đạt; thử Sale có khách, chuyển nhóm, tải lại và mở đúng hồ sơ từ công việc. Chưa xuất bản.

- [x] Cổng CTV /ctv: quản trị mời từ hồ sơ CTV bằng liên kết 7 ngày, đúng email và dùng một lần; tài khoản riêng không cấp role CRM. Tự gửi khách nguyên tử/giữ Sale phụ trách/chặn trùng, xem trạng thái và hoa hồng riêng. Thử nhận lời mời → gửi → tải lại; chặn lời mời dùng lại, trùng điện thoại, CTV khác không thấy khách/hoa hồng, tạm dừng bị chặn; đối chiếu 60/20/40 triệu, 5 test đạt, mobile không tràn. QA đã dọn; chưa xuất bản.

- [x] Telegram hai chiều: địa chỉ công khai không còn 404; kiểm tra trước kích hoạt, cấu hình origin server-side, chặn thiếu hội thoại/sai binding và báo lỗi nhà cung cấp; 24 kiểm thử đạt. Nhận thật TEST TELEGRAM 2842 → trả lời từ Hộp thoại được Telegram xác nhận → tải lại vẫn thấy Đã gửi. 0 tin chờ, không có lỗi webhook; bản gia cố mới chưa xuất bản.

- [x] Cộng tác viên bán hàng: hồ sơ, Sale phụ trách, khách giới thiệu, duyệt hoa hồng theo hợp đồng và lịch sử chi riêng; thử lưu/đọc lại khoản chi 20/60 triệu, chặn trùng/vượt/sửa đã chi và sàn khác, 3 kiểm thử đạt, mobile không tràn; dữ liệu thử đã dọn. Chưa xuất bản; chưa có tài khoản CTV hoặc cổng tự gửi khách.

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
- [x] Xác minh Telegram hai chiều với người thật: @Unicomsale_bot nhận TEST TELEGRAM 2842 qua địa chỉ dev công khai và phản hồi từ Hộp thoại được xác nhận với message ID; tải lại giữ nguyên. Địa chỉ từ chối thiếu chữ ký (401), dữ liệu sai (400), bỏ qua cập nhật không có tin (200); không gửi cho người không liên quan.
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
