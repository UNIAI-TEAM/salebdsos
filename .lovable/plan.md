# Kế hoạch: Zalo OA đa tài khoản + Ticket + Đánh giá hài lòng + Kịch bản tư vấn

## Mục tiêu
Sàn kết nối **nhiều Zalo OA** (mỗi dự án/chi nhánh/đại lý một OA), nhắn tin hai chiều với khách trong Hộp thoại đa kênh, giao ticket cho Sale, thu đánh giá hài lòng sau hỗ trợ và chạy kịch bản tư vấn tự động trước khi chuyển người thật.

## 1. Quản lý nhiều Zalo OA (Tích hợp → Zalo OA)
- Danh sách OA: tên, ảnh, OA ID, trạng thái (Đã kết nối / Hết hạn token / Tạm dừng), số hội thoại, ngày kết nối.
- Thêm OA: nhập App ID, Secret Key, mã OA trong ô bảo mật (mã hóa, chỉ server đọc); hiển thị địa chỉ webhook riêng cho từng OA.
- Mỗi OA cấu hình: dự án gắn kèm, nhóm/Sale nhận khách mặc định, kịch bản bot đang bật, giờ làm việc, lời chào ngoài giờ.
- Tự làm mới token truy cập trước khi hết hạn; báo admin khi lỗi.
- Bật/tắt, đổi tên, ngắt kết nối từng OA (giữ nguyên lịch sử).

## 2. Nhắn tin hai chiều
- Tin nhận từ mỗi OA vào Hộp thoại đa kênh, có nhãn tên OA và biểu tượng Zalo; lọc theo OA.
- Một khách nhắn nhiều OA → mỗi OA một hội thoại riêng, cùng gắn một hồ sơ khách (ghép tường minh như hiện tại).
- Sale trả lời từ đúng OA khách đã nhắn; hỗ trợ văn bản, ảnh, tệp, mẫu trả lời nhanh.
- Cảnh báo cửa sổ 7 ngày của Zalo (quá hạn thì chỉ gửi được tin mẫu/ZNS nếu có).

## 3. Ticket & phân công
- Mỗi hội thoại mới tạo ticket tự động; giao theo quy tắc của OA (Sale cá nhân / nhóm theo tải 30 ngày / thủ công).
- Trạng thái: Mới → Đang xử lý → Chờ khách → Đã giải quyết → Đóng; mức ưu tiên; SLA phản hồi đầu & SLA giải quyết.
- Chuyển ticket cho Sale/nhóm khác có lý do và lịch sử; push khi được giao và sắp quá SLA (dùng hàng đợi hiện có).
- Trang Ticket: KPI theo OA/Sale, lọc, "chỉ của tôi".

## 4. Đánh giá độ hài lòng (CSAT)
- Khi đóng ticket, tự gửi tin hỏi đánh giá 1–5 sao (nút bấm) + ô góp ý qua đúng OA.
- Lưu điểm vào ticket, hồ sơ khách và Sale phụ trách; mỗi ticket chỉ nhận 1 đánh giá, hết hạn sau 72 giờ.
- Báo cáo CSAT: điểm trung bình, tỷ lệ phản hồi, phân bố sao theo OA/Sale/tháng; cảnh báo quản lý khi ≤ 2 sao.

## 5. Kịch bản tư vấn trên Zalo OA
- Dùng lại bộ dựng kịch bản cây phân nhánh hiện có (mẫu BĐS, AI sinh kịch bản, ảnh/video).
- Gán kịch bản theo từng OA; kích hoạt khi khách nhắn lần đầu, theo từ khóa hoặc ngoài giờ.
- Bot hỏi nhu cầu (loại hình, ngân sách, khu vực), ghi vào hồ sơ, đặt lịch hẹn, rồi chuyển Sale; dừng khi Sale trả lời.
- Bật Zalo vào danh sách kênh bot chạy thật sau khi kiểm thử gửi–nhận.

## Ngoài phạm vi lần này
- Gửi ZNS (tin mẫu trả phí) và chiến dịch hàng loạt qua Zalo.
- Thử với OA thật cần anh tự nhập khóa trong app sau khi Publish; em không nhận khóa qua chat.

## Chi tiết kỹ thuật
- Bảng mới: `zalo_oa_accounts` (tenant, oa_id duy nhất toàn hệ thống, credential mã hóa, token/hết hạn, cấu hình), `ticket_events`, `csat_surveys`; mở rộng ticket hiện có với priority, SLA giải quyết, oa_account_id.
- Webhook `/api/public/zalo/$oaKey`: xác minh chữ ký theo secret của OA, ghi qua `ingest_channel_message` (idempotent), identity theo (tenant, oa_account, zalo_user_id).
- Gửi tin: server function kiểm quyền, chọn token theo OA của hội thoại; cron làm mới token.
- Quy tắc thuần + test: chọn OA gửi, phân ticket, SLA, cửa sổ CSAT, chống đánh giá trùng.
- RLS theo tenant và quyền Sale/quản lý hiện có; chỉ admin quản lý OA.

## Thứ tự triển khai
1. Quản lý nhiều OA + webhook/gửi nhận
2. Ticket & phân công
3. CSAT + báo cáo
4. Kịch bản tư vấn trên Zalo
