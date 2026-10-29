# Kế hoạch: Zalo OA đa tài khoản + Ticket + Đánh giá hài lòng + Kịch bản tư vấn

## Mục tiêu
Sàn kết nối **nhiều Zalo OA** (mỗi dự án/chi nhánh/đại lý một OA), nhắn tin hai chiều với khách trong Hộp thoại đa kênh, giao ticket cho Sale, thu đánh giá hài lòng (CSAT) sau hỗ trợ và chạy kịch bản tư vấn tự động trước khi chuyển người thật.

## Nguyên tắc chung (áp dụng cho mọi phần)
- Mọi giá trị số (SLA, thời hạn, số lần thử lại, cửa sổ gửi tin) là **cấu hình**, có mặc định toàn hệ thống và cho phép chỉnh theo từng OA; không viết cứng trong code.
- Mọi thao tác nhạy cảm (thêm/sửa/ngắt OA, chuyển ticket, đổi cấu hình) ghi nhật ký: ai, lúc nào, thay đổi gì.
- Dữ liệu tách theo tenant (RLS); không bao giờ trả secret/token về trình duyệt.

---

## 1. Quản lý nhiều Zalo OA (Tích hợp → Zalo OA)

### 1.1 Danh sách và trạng thái
- Cột: tên, ảnh, OA ID, trạng thái, dự án gắn kèm, số hội thoại, số ticket đang mở, ngày kết nối, lần nhận tin gần nhất, hạn token.
- Trạng thái: **Đã kết nối / Sắp hết hạn token / Hết hạn token / Lỗi webhook / Tạm dừng**.
- Màn hình chi tiết từng OA: nhật ký webhook gần nhất (thành công/lỗi), hàng đợi tin gửi lỗi, nút "Kiểm tra kết nối" và "Gửi tin thử".

### 1.2 Thêm OA
- Nhập App ID, Secret Key, OA ID trong ô bảo mật (mã hóa, chỉ server đọc, không hiển thị lại sau khi lưu, chỉ cho thay mới).
- Luồng cấp quyền OAuth của Zalo: sau khi nhập khóa, admin bấm "Cấp quyền" để chuyển sang Zalo, đồng ý rồi quay lại; hệ thống lưu access token và refresh token.
- Hiển thị địa chỉ webhook riêng cho từng OA kèm hướng dẫn dán vào cấu hình ứng dụng Zalo; có nút "Kiểm tra webhook".
- `oa_id` duy nhất toàn hệ thống: nếu OA đã được tenant khác kết nối thì từ chối và báo rõ.

### 1.3 Làm mới token (quan trọng)
- Access token của Zalo có hạn ngắn, refresh token **dùng một lần** (mỗi lần làm mới sẽ nhận refresh token mới). Vì vậy:
  - Lưu refresh token mới **ngay trong cùng giao dịch** với access token mới.
  - Có **khóa theo OA** để hai tiến trình không làm mới cùng lúc (nếu không sẽ mất kết nối).
  - Cron làm mới trước khi hết hạn (mặc định trước 15 phút với access token); khi gửi tin gặp lỗi token thì làm mới ngay và thử lại 1 lần.
  - Làm mới thất bại → đặt trạng thái "Hết hạn token", dừng bot của OA đó, báo admin (thông báo trong app + email), hiện nút "Cấp quyền lại". Hội thoại đang mở vẫn xem được, chỉ không gửi được.
- Giá trị thời hạn token cần đối chiếu với tài liệu Zalo hiện hành khi triển khai.

### 1.4 Cấu hình từng OA
- Dự án gắn kèm; nhóm/Sale nhận khách mặc định; quy tắc giao ticket (xem mục 3); kịch bản bot đang bật; giờ làm việc theo từng ngày; lời chào ngoài giờ; SLA riêng (nếu khác mặc định); mẫu trả lời nhanh dùng chung.
- Bật/tắt, đổi tên, ngắt kết nối từng OA. **Ngắt kết nối**: xóa token, giữ nguyên lịch sử hội thoại/ticket, hội thoại chuyển sang chế độ chỉ đọc. **Tạm dừng**: vẫn nhận tin, không chạy bot, không gửi CSAT.
- **Đổi dự án gắn kèm**: ticket cũ giữ nguyên dự án cũ, chỉ ticket mới theo dự án mới.

### 1.5 Phân quyền quản lý OA
| Vai trò | Quyền |
|---|---|
| Admin tenant | Thêm/sửa/ngắt OA, xem khóa (chỉ thay mới), xem tất cả hội thoại và báo cáo |
| Quản lý (trưởng nhóm/dự án) | Xem OA, hội thoại, ticket, báo cáo của OA thuộc dự án mình quản lý; sửa giờ làm việc, lời chào, kịch bản, quy tắc giao ticket |
| Sale | Chỉ thấy hội thoại/ticket của OA thuộc dự án mình được gán; không thấy cấu hình khóa |

---

## 2. Nhắn tin hai chiều

### 2.1 Sự kiện webhook cần xử lý
- Tin nhắn từ khách: văn bản, ảnh, tệp, vị trí, sticker (hiển thị dạng thông báo nếu chưa hỗ trợ).
- Sự kiện theo dõi / bỏ theo dõi OA (cập nhật hồ sơ khách, bỏ theo dõi thì cảnh báo "không gửi được").
- Trạng thái tin gửi đi: đã gửi / đã nhận / đã xem / thất bại.
- Khách bấm nút trong tin tương tác (CSAT, lựa chọn bot).
- Sự kiện lạ: ghi nhật ký và bỏ qua, không làm lỗi webhook.

### 2.2 Nhận tin
- Tin từ mỗi OA vào Hộp thoại đa kênh, có nhãn tên OA và biểu tượng Zalo; lọc theo OA.
- Chống trùng: khóa idempotent theo (oa_account, message_id) qua `ingest_channel_message`; Zalo gửi lại webhook không tạo tin thứ hai.
- Webhook phản hồi nhanh (xử lý nặng đưa vào hàng đợi) để Zalo không gửi lại liên tục.
- Một khách nhắn nhiều OA → mỗi OA một hội thoại riêng, cùng gắn một hồ sơ khách (ghép tường minh như hiện tại). Danh tính theo (tenant, oa_account, zalo_user_id).

### 2.3 Gửi tin
- Sale trả lời từ đúng OA khách đã nhắn; hỗ trợ văn bản, ảnh, tệp, mẫu trả lời nhanh.
- Giới hạn tốc độ gửi theo OA; vượt thì xếp hàng, không bỏ tin.
- Tin gửi lỗi: hiện trạng thái "Gửi thất bại" ngay trên tin, nút "Gửi lại"; hàng đợi tự thử lại tối đa 3 lần (cách quãng tăng dần), sau đó dừng và báo Sale.
- Sale chỉ trả lời được hội thoại thuộc quyền của mình; kiểm quyền ở server.

### 2.4 Cửa sổ gửi tin của Zalo
- Tin tư vấn chỉ gửi được trong **cửa sổ thời gian sau lần tương tác gần nhất của khách**. Độ dài cửa sổ là tham số cấu hình (mặc định theo tài liệu Zalo hiện hành, **cần xác nhận lại trên developers.zalo.me khi triển khai**, vì chính sách có thể thay đổi).
- Hội thoại hiển thị đồng hồ đếm ngược cửa sổ; khi còn ít giờ thì cảnh báo vàng, hết thì khóa ô soạn tin và ghi "Quá hạn: chỉ gửi được tin mẫu/ZNS nếu có".

---

## 3. Ticket & phân công

### 3.1 Tạo và mở lại ticket
- Hội thoại mới tự tạo ticket.
- Khách nhắn lại khi ticket đã **Đóng**: nếu trong vòng **48 giờ** kể từ lúc đóng thì **mở lại ticket cũ** (ghi sự kiện "Mở lại"), quá 48 giờ thì **tạo ticket mới** liên kết ticket cũ.
- Khách nhắn khi ticket ở trạng thái **Chờ khách** → tự chuyển về **Đang xử lý**.

### 3.2 Trạng thái và ưu tiên
- Mới → Đang xử lý → Chờ khách → Đã giải quyết → Đóng.
- **Đã giải quyết** tự đóng sau 24 giờ nếu khách không nhắn lại (cấu hình được); Sale cũng đóng tay được.
- Mức ưu tiên: Thấp / Thường / Cao / Khẩn. Mặc định Thường; tự nâng lên Cao nếu khách có từ khóa cấu hình (khiếu nại, gấp…) hoặc điểm CSAT ≤ 2 trước đó.

### 3.3 SLA (giá trị mặc định, chỉnh được theo OA)
| Ưu tiên | Phản hồi đầu | Giải quyết |
|---|---|---|
| Khẩn | 5 phút | 4 giờ |
| Cao | 15 phút | 8 giờ |
| Thường | 30 phút | 24 giờ |
| Thấp | 2 giờ | 72 giờ |
- Tính theo **giờ làm việc của OA** (ngoài giờ thì tạm dừng đồng hồ SLA; tin ngoài giờ được tính từ lúc bắt đầu giờ làm việc kế tiếp).
- Trạng thái **Chờ khách** tạm dừng SLA giải quyết.
- Cảnh báo: push khi còn 20% thời gian và khi quá SLA; quá SLA báo thêm cho quản lý.

### 3.4 Quy tắc giao ticket (chọn theo từng OA)
1. **Sale cá nhân:** luôn giao một người.
2. **Nhóm theo tải:** giao cho Sale trong nhóm có **ít ticket đang mở nhất** (Mới/Đang xử lý/Chờ khách); hòa thì chọn người nhận ticket gần nhất cách đây lâu nhất. Số ticket nhận trong 30 ngày dùng làm tiêu chí phụ khi hòa.
3. **Thủ công:** vào hàng chờ, quản lý hoặc Sale tự nhận.
- Sale đang nghỉ/tắt trạng thái "Sẵn sàng" bị bỏ qua; ngoài giờ làm việc ticket vào hàng chờ và giao khi vào giờ.
- Không ai nhận được (không có Sale sẵn sàng) → vào hàng chờ của nhóm, báo quản lý nếu chờ quá nửa SLA phản hồi đầu.
- Khách cũ đã có Sale phụ trách → ưu tiên giao lại đúng Sale đó nếu Sale còn sẵn sàng.

### 3.5 Chuyển ticket
- Sale chuyển cho Sale/nhóm khác **trong cùng dự án**; quản lý chuyển được mọi nơi trong phạm vi của mình. Bắt buộc nhập lý do.
- Sau khi chuyển: Sale cũ **không còn thấy** hội thoại (chỉ thấy trong lịch sử ticket nếu có quyền xem), Sale mới nhận push.
- Mọi sự kiện lưu trong `ticket_events` (tạo, giao, chuyển, đổi trạng thái, đổi ưu tiên, mở lại, quá SLA).

### 3.6 Trang Ticket
- KPI theo OA/Sale: số ticket mới, đang mở, đúng/quá SLA, thời gian phản hồi đầu trung bình, thời gian giải quyết trung bình.
- Lọc theo OA, Sale, trạng thái, ưu tiên, khoảng ngày; tùy chọn "chỉ của tôi".

---

## 4. Đánh giá độ hài lòng (CSAT)

- **Gửi khi:** ticket chuyển sang **Đóng** (hoặc Đã giải quyết tự đóng), qua đúng OA của hội thoại, nếu còn trong cửa sổ gửi tin; tin có 5 nút 1–5 sao.
- **Không gửi khi:** OA tạm dừng/hết token, khách đã bỏ theo dõi, ngoài cửa sổ gửi, hoặc ticket đã có đánh giá. Các trường hợp này ghi trạng thái "Không gửi được" kèm lý do, **không thử lại vô hạn** (tối đa 2 lần nếu lỗi tạm thời).
- **Góp ý:** sau khi khách bấm sao, gửi tiếp một tin mời góp ý bằng văn bản (không bắt buộc). Nếu khách không trả lời thì giữ điểm sao.
- **Nhắc lại:** gửi 1 tin nhắc sau 24 giờ nếu chưa bấm sao; không nhắc lần hai.
- **Hết hạn:** 72 giờ kể từ lúc gửi; bấm sau hạn thì bị từ chối và báo nhẹ "Phiếu đã hết hạn".
- **Chống trùng:** mỗi ticket chỉ nhận **1 đánh giá**; bấm lại thì bỏ qua (không ghi đè). Ticket mở lại rồi đóng lại **không gửi CSAT lần hai** nếu đã có điểm.
- **Lưu điểm:** vào ticket, hồ sơ khách và Sale phụ trách tại thời điểm đóng.
- **Cảnh báo ≤ 2 sao:** gửi quản lý của dự án/nhóm qua thông báo trong app (và email nếu bật), kèm link tới ticket; ticket gắn cờ "Cần xem lại" và Sale được nhắc theo dõi.
- **Báo cáo CSAT:** điểm trung bình, tỷ lệ phản hồi, phân bố sao theo OA/Sale/tháng; danh sách góp ý (lọc theo số sao). Quyền xem theo mục 1.5.

---

## 5. Kịch bản tư vấn trên Zalo OA

- Dùng lại bộ dựng kịch bản cây phân nhánh hiện có (mẫu BĐS, AI sinh kịch bản, ảnh/video).
- Gán kịch bản theo từng OA.

### 5.1 Kích hoạt
- Khách nhắn lần đầu; khớp từ khóa; hoặc ngoài giờ làm việc.
- Khi nhiều kịch bản cùng khớp, ưu tiên theo thứ tự: **từ khóa cụ thể > ngoài giờ > lần đầu**, cùng loại thì theo thứ tự ưu tiên admin sắp xếp.

### 5.2 Luồng chạy
- Bot hỏi nhu cầu (loại hình, ngân sách, khu vực), ghi vào hồ sơ khách, đặt lịch hẹn rồi chuyển Sale.
- **Trả lời ngoài lựa chọn / không hiểu:** hỏi lại tối đa **2 lần**, sau đó chuyển cho Sale kèm ghi chú "Bot không hiểu".
- **Khách im lặng:** nhắc 1 lần sau 30 phút (trong cửa sổ gửi tin); sau đó dừng, lưu phần đã thu thập.
- **Khách gõ "gặp nhân viên"** hoặc từ khóa tương tự → chuyển Sale ngay.

### 5.3 Dừng và chạy lại
- Bot **dừng ngay** khi Sale gửi tin đầu tiên trong hội thoại.
- Bot chỉ được chạy lại nếu ticket đóng và khách nhắn lại sau khi ticket đã đóng (ticket mới), hoặc hội thoại im lặng hơn 24 giờ và kịch bản được cấu hình cho phép "chạy lại".

### 5.4 Đặt lịch hẹn
- Lịch hẹn lưu trong module lịch hẹn hiện có, gắn khách + dự án + **Sale phụ trách ticket**; nếu chưa có Sale thì gắn nhóm và gán khi ticket được giao.
- Nhắc lịch: gửi push cho Sale trước 1 giờ và 1 ngày; gửi tin xác nhận cho khách qua OA ngay khi đặt (nếu còn trong cửa sổ).

### 5.5 Đưa vào chạy thật
- Chỉ bật Zalo vào danh sách kênh bot chạy thật sau khi kiểm thử gửi–nhận thành công trên OA thử nghiệm.
- Mỗi OA có nút bật/tắt bot riêng và nhật ký các phiên bot (bắt đầu, kết thúc, lý do chuyển người).

---

## 6. Vận hành, bảo mật, dữ liệu
- **Theo dõi:** nhật ký webhook, hàng đợi gửi lại, cảnh báo admin khi OA lỗi liên tục hoặc không nhận tin quá lâu trong giờ làm việc.
- **Bảo mật dữ liệu khách:** tên Zalo, ảnh, số điện thoại (nếu khách chia sẻ) lưu trong hồ sơ khách theo RLS; có chức năng **xóa/ẩn danh theo yêu cầu khách** (giữ ticket và thống kê, xóa thông tin định danh và nội dung tin).
- **Xác minh webhook:** kiểm chữ ký theo secret của từng OA; sai chữ ký thì từ chối và ghi nhật ký.
- **Hiệu năng:** phân trang hội thoại, chỉ mục theo (tenant, oa_account, trạng thái, Sale).


## Điều chỉnh sau khi rà soát kịch bản
- **Một ứng dụng Zalo quản lý nhiều OA:** cho phép nhiều OA dùng chung một bộ App ID/Secret (khai báo ứng dụng một lần, mỗi OA cấp quyền riêng) thay vì bắt nhập lại khóa cho từng OA.
- **Chuyển đổi Zalo OA cũ:** cấu hình Zalo OA đơn hiện có được chuyển thành OA đầu tiên trong danh sách, giữ nguyên hội thoại và hồ sơ đã ghép.
- **Xác minh webhook:** dùng chữ ký sự kiện Zalo (mã băm từ App ID + nội dung + thời điểm + OA Secret), từ chối sự kiện quá cũ để chống phát lại.
- **Ticket dùng chung:** tái sử dụng ticket tin nhắn đã có trong Hộp thoại (không tạo hệ ticket thứ hai), chỉ bổ sung ưu tiên, SLA giải quyết, mở lại và OA.
- **SLA hiện có:** SLA lead (gọi khách trong X phút) giữ nguyên; SLA ticket là đồng hồ riêng, không ghi đè.
- **Trạng thái "Sẵn sàng" của Sale:** thêm công tắc trên thanh trên cùng/mobile; mặc định Sẵn sàng trong giờ làm việc.
- **Chống chồng việc:** khi Sale đang trả lời thì bot và tin nhắc CSAT/im lặng bị hủy; mọi tin tự động kiểm lại trạng thái ngay trước lúc gửi.
- **Thời hạn token, cửa sổ gửi tin, nút bấm trong tin:** đối chiếu tài liệu Zalo hiện hành trước khi code; nếu tin tư vấn không hỗ trợ nút 1–5 sao thì dùng danh sách lựa chọn hoặc liên kết đánh giá ngắn.
- **Nhiều việc nên chia đợt:** mỗi bước trong "Thứ tự triển khai" là một lần làm + kiểm thử riêng, anh duyệt kết quả rồi mới sang bước tiếp.

## Ngoài phạm vi lần này
- Gửi ZNS (tin mẫu trả phí) và chiến dịch hàng loạt qua Zalo.
- Thử với OA thật cần anh tự nhập khóa trong app sau khi Publish; em không nhận khóa qua chat.

## Chi tiết kỹ thuật
- **Bảng mới:** `zalo_oa_accounts` (tenant, oa_id duy nhất toàn hệ thống, credential mã hóa, access/refresh token + hạn, trạng thái, cấu hình, khóa làm mới), `ticket_events`, `csat_surveys` (ticket, oa_account, trạng thái gửi, điểm, góp ý, hạn, lý do không gửi), `zalo_webhook_logs`; mở rộng ticket hiện có với `priority`, `first_response_due`, `resolve_due`, `reopened_from`, `oa_account_id`.
- **Webhook** `/api/public/zalo/$oaKey`: xác minh chữ ký theo secret của OA, ghi qua `ingest_channel_message` (idempotent), trả lời nhanh, xử lý nặng qua hàng đợi.
- **Gửi tin:** server function kiểm quyền, chọn token theo OA của hội thoại, giới hạn tốc độ theo OA, thử lại theo hàng đợi.
- **Cron:** làm mới token; tự đóng ticket "Đã giải quyết"; hết hạn phiếu CSAT; nhắc CSAT; kiểm tra quá SLA.
- **Quy tắc thuần + test đơn vị:** chọn OA gửi, phân ticket theo tải, tính SLA theo giờ làm việc, mở lại hay tạo ticket mới, cửa sổ CSAT, chống đánh giá trùng, ưu tiên kịch bản.
- **Kiểm thử đầu cuối** với OA thử nghiệm: nhận tin → tạo ticket → giao → trả lời → đóng → CSAT → báo cáo; kèm kịch bản token hết hạn và webhook gửi trùng.
- **RLS** theo tenant và quyền Sale/quản lý hiện có; chỉ admin quản lý OA và khóa.

## Thứ tự triển khai
1. Quản lý nhiều OA (kể cả OAuth, làm mới token, phân quyền) + webhook/gửi nhận
2. Ticket & phân công (SLA, mở lại, chuyển ticket)
3. CSAT + báo cáo
4. Kịch bản tư vấn trên Zalo (kèm đặt lịch hẹn)
5. Vận hành: nhật ký, cảnh báo, xóa dữ liệu theo yêu cầu, kiểm thử đầu cuối