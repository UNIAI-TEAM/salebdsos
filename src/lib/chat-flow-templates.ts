// Thư viện mẫu kịch bản BĐS 1-click. Pure, dùng chung builder và test.
import { uid, type ChatFlow, type ChatNode } from "./chat-flows";

type N = Partial<ChatNode> & { id: string; text: string };
const node = (n: N): ChatNode => ({ media: [], buttons: [], tag: "", handoff: false, appointment: null, need: null, ...n });
const btn = (label: string, next: string | null, keywords: string[] = []) => ({ id: `b${uid().slice(0, 6)}`, label, keywords, next });

export type FlowTemplate = { key: string; name: string; description: string; build: () => ChatFlow };

const flow = (name: string, nodes: ChatNode[], keywords: string[] = []): ChatFlow => ({
  id: uid(), name, enabled: false, trigger: keywords.length ? "keyword" : "first_message", keywords, startNodeId: nodes[0].id, nodes,
});

const visit = (tag = "Hẹn xem nhà mẫu") => node({ id: "visit", text: "Dạ em đã giữ lịch xem nhà mẫu {project} sáng mai lúc 9h. Chuyên viên sẽ gọi xác nhận với {name} ngay ạ.", tag, handoff: true, appointment: { title: "Xem nhà mẫu {project}", location: "Nhà mẫu dự án", daysAhead: 1, hour: 9 } });
const human = node({ id: "handoff", text: "Dạ, chuyên viên tư vấn sẽ liên hệ {name} trong ít phút nữa ạ.", handoff: true });

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    key: "price", name: "Tư vấn căn hộ & bảng giá", description: "Báo giá theo loại căn, gửi bảng tính dòng tiền, mời xem nhà mẫu.",
    build: () => flow("Tư vấn căn hộ & bảng giá", [
      node({ id: "start", text: "Chào {name}! Em là trợ lý dự án {project}. Anh/chị quan tâm loại căn nào ạ?", buttons: [btn("1 phòng ngủ", "p1", ["1pn", "studio"]), btn("2 phòng ngủ", "p2", ["2pn"]), btn("3 phòng ngủ", "p3", ["3pn"])] }),
      node({ id: "p1", text: "Căn 1PN phù hợp ở một mình hoặc cho thuê. Em gửi bảng giá và dòng tiền chi tiết nhé?", tag: "Đang khảo sát", need: { needType: "Căn hộ 1PN", budget: "", note: "" }, buttons: [btn("Gửi bảng giá", "handoff", ["co", "ok"]), btn("Hẹn xem nhà mẫu", "visit", ["hen"])] }),
      node({ id: "p2", text: "Căn 2PN được gia đình trẻ chọn nhiều nhất. Em gửi bảng giá và dòng tiền chi tiết nhé?", tag: "Đang khảo sát", need: { needType: "Căn hộ 2PN", budget: "", note: "" }, buttons: [btn("Gửi bảng giá", "handoff", ["co", "ok"]), btn("Hẹn xem nhà mẫu", "visit", ["hen"])] }),
      node({ id: "p3", text: "Căn 3PN rộng rãi cho gia đình nhiều thế hệ. Em gửi bảng giá và dòng tiền chi tiết nhé?", tag: "Đang khảo sát", need: { needType: "Căn hộ 3PN", budget: "", note: "" }, buttons: [btn("Gửi bảng giá", "handoff", ["co", "ok"]), btn("Hẹn xem nhà mẫu", "visit", ["hen"])] }),
      visit(), human,
    ]),
  },
  {
    key: "visit", name: "Hẹn xem nhà mẫu & sa bàn", description: "Chọn khung giờ, tự tạo lịch hẹn cho Sale phụ trách.",
    build: () => flow("Hẹn xem nhà mẫu & sa bàn", [
      node({ id: "start", text: "Dạ {name} muốn xem nhà mẫu {project} vào lúc nào ạ?", buttons: [btn("Sáng mai", "am", ["sang"]), btn("Chiều mai", "pm", ["chieu"]), btn("Cuối tuần", "we", ["thu 7", "chu nhat", "cuoi tuan"])] }),
      node({ id: "am", text: "Em đã giữ lịch 9h sáng mai. Chuyên viên sẽ gọi xác nhận ạ.", tag: "Hẹn xem nhà mẫu", handoff: true, appointment: { title: "Xem nhà mẫu {project}", location: "Nhà mẫu dự án", daysAhead: 1, hour: 9 } }),
      node({ id: "pm", text: "Em đã giữ lịch 15h chiều mai. Chuyên viên sẽ gọi xác nhận ạ.", tag: "Hẹn xem nhà mẫu", handoff: true, appointment: { title: "Xem nhà mẫu {project}", location: "Nhà mẫu dự án", daysAhead: 1, hour: 15 } }),
      node({ id: "we", text: "Dạ em ghi nhận lịch cuối tuần, chuyên viên sẽ gọi chốt giờ cụ thể ạ.", tag: "Hẹn xem nhà mẫu", handoff: true, appointment: { title: "Xem nhà mẫu cuối tuần — {project}", location: "Nhà mẫu dự án", daysAhead: 3, hour: 9 } }),
    ], ["xem nha", "nha mau", "sa ban", "hen"]),
  },
  {
    key: "survey", name: "Khảo sát nhu cầu & tài chính", description: "Ở thực hay đầu tư, tầm tiền — tự ghi vào hồ sơ khách.",
    build: () => flow("Khảo sát nhu cầu & tài chính", [
      node({ id: "start", text: "Để tư vấn đúng căn, {name} mua để ở hay đầu tư ạ?", buttons: [btn("Để ở", "live", ["o", "o that"]), btn("Đầu tư", "invest", ["dau tu", "cho thue"])] }),
      node({ id: "live", text: "Dạ, tầm tài chính dự kiến của anh/chị là bao nhiêu ạ?", need: { needType: "Mua để ở", budget: "", note: "" }, buttons: [btn("Dưới 3 tỷ", "b1"), btn("3–5 tỷ", "b2"), btn("Trên 5 tỷ", "b3")] }),
      node({ id: "invest", text: "Dạ, tầm tài chính dự kiến của anh/chị là bao nhiêu ạ?", need: { needType: "Đầu tư", budget: "", note: "" }, buttons: [btn("Dưới 3 tỷ", "b1"), btn("3–5 tỷ", "b2"), btn("Trên 5 tỷ", "b3")] }),
      node({ id: "b1", text: "Em ghi nhận rồi ạ. Chuyên viên sẽ gửi các căn phù hợp dưới 3 tỷ ngay.", tag: "Đang khảo sát", handoff: true, need: { needType: "", budget: "Dưới 3 tỷ", note: "" } }),
      node({ id: "b2", text: "Em ghi nhận rồi ạ. Chuyên viên sẽ gửi các căn phù hợp 3–5 tỷ ngay.", tag: "Đang khảo sát", handoff: true, need: { needType: "", budget: "3–5 tỷ", note: "" } }),
      node({ id: "b3", text: "Em ghi nhận rồi ạ. Chuyên viên sẽ gửi các căn cao cấp phù hợp ngay.", tag: "VIP", handoff: true, need: { needType: "", budget: "Trên 5 tỷ", note: "" } }),
    ]),
  },
  {
    key: "policy", name: "Chính sách & ưu đãi vay", description: "Chiết khấu thanh toán sớm, hỗ trợ lãi suất, ân hạn gốc.",
    build: () => flow("Chính sách & ưu đãi vay", [
      node({ id: "start", text: "{project} đang có chính sách ưu đãi. {name} muốn tìm hiểu phương án nào ạ?", buttons: [btn("Thanh toán sớm", "early", ["chiet khau"]), btn("Vay ngân hàng", "loan", ["vay", "lai suat"])] }),
      node({ id: "early", text: "Thanh toán sớm được chiết khấu theo chính sách hiện hành. Em gửi bảng tính chi tiết nhé?", need: { needType: "", budget: "", note: "Quan tâm thanh toán sớm" }, buttons: [btn("Gửi giúp em", "handoff", ["co", "ok"])] }),
      node({ id: "loan", text: "Dự án có ngân hàng bảo lãnh, hỗ trợ lãi suất và ân hạn gốc. Em tính khoản vay cho anh/chị nhé?", need: { needType: "", budget: "", note: "Quan tâm vay ngân hàng" }, buttons: [btn("Tính giúp em", "handoff", ["co", "ok"])] }),
      human,
    ], ["chinh sach", "uu dai", "vay", "chiet khau"]),
  },
  {
    key: "land", name: "Đất nền & nghỉ dưỡng", description: "Pháp lý, hạ tầng, quy hoạch, hẹn đi xem đất.",
    build: () => flow("Đất nền & nghỉ dưỡng", [
      node({ id: "start", text: "Chào {name}! Anh/chị muốn tìm hiểu gì về {project} ạ?", buttons: [btn("Pháp lý sổ đỏ", "legal", ["phap ly", "so do"]), btn("Hạ tầng & quy hoạch", "infra", ["ha tang", "quy hoach"]), btn("Đi xem đất", "visit", ["xem dat"])] }),
      node({ id: "legal", text: "Dự án có pháp lý rõ ràng, chuyên viên sẽ gửi hồ sơ pháp lý chi tiết ạ.", tag: "Đang khảo sát", need: { needType: "Đất nền", budget: "", note: "Hỏi pháp lý" }, buttons: [btn("Gặp chuyên viên", "handoff"), btn("Đi xem đất", "visit")] }),
      node({ id: "infra", text: "Em gửi bản đồ quy hoạch và tiến độ hạ tầng khu vực cho anh/chị nhé?", tag: "Đang khảo sát", need: { needType: "Đất nền", budget: "", note: "Hỏi hạ tầng" }, buttons: [btn("Gửi giúp em", "handoff", ["co", "ok"]), btn("Đi xem đất", "visit")] }),
      node({ id: "visit", text: "Dạ em đã giữ lịch đi xem đất sáng mai 8h. Chuyên viên sẽ gọi xác nhận điểm đón ạ.", tag: "Hẹn xem nhà mẫu", handoff: true, appointment: { title: "Đi xem đất {project}", location: "Thực địa dự án", daysAhead: 1, hour: 8 } }),
      human,
    ]),
  },
];
