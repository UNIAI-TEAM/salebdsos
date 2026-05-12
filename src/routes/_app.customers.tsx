import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Plus, Search, Phone, Mail } from "lucide-react";

export const Route = createFileRoute("/_app/customers")({ component: CustomersPage });

const data = [
  { n: "Hoàng Minh Long", p: "8.6 tỷ", proj: "The Global City", tag: "VIP", date: "12/05/2024" },
  { n: "Bùi Thị Ngọc", p: "6.3 tỷ", proj: "Vinhomes Ocean Park 2", tag: "VIP", date: "08/05/2024" },
  { n: "Vũ Thị Lan", p: "3.2 tỷ", proj: "Vinhomes Ocean Park 2", tag: "Mua ở", date: "01/05/2024" },
  { n: "Nguyễn Thanh Tùng", p: "5.8 tỷ", proj: "Masteri Waterfront", tag: "Đầu tư", date: "28/04/2024" },
  { n: "Lê Hoàng Nam", p: "4.4 tỷ", proj: "Lumi Hanoi", tag: "VIP", date: "20/04/2024" },
];

function CustomersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Khách hàng" sub="Cơ sở dữ liệu khách hàng đã chuyển đổi."
        action={<button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> Thêm khách</button>} />
      <SectionCard>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input placeholder="Tìm khách hàng..." className="w-full h-10 rounded-xl bg-muted/60 pl-9 pr-3 text-[13px] outline-none border border-transparent focus:bg-card focus:border-border" />
        </div>
        <table className="w-full text-[12.5px]">
          <thead><tr className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border">
            <th className="py-2.5 font-semibold">Khách hàng</th><th className="py-2.5 font-semibold">Dự án đã mua</th>
            <th className="py-2.5 font-semibold">Giá trị</th><th className="py-2.5 font-semibold">Phân loại</th>
            <th className="py-2.5 font-semibold">Ngày chốt</th><th className="py-2.5 font-semibold text-right">Liên hệ</th>
          </tr></thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.n} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="py-3"><div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-indigo-400/30 grid place-items-center text-[11px] font-semibold">{c.n.split(" ").pop()![0]}</div>
                  <span className="font-semibold">{c.n}</span>
                </div></td>
                <td className="py-3 text-muted-foreground">{c.proj}</td>
                <td className="py-3 font-semibold text-primary">{c.p}</td>
                <td className="py-3"><span className="text-[11px] px-2 py-0.5 rounded-md bg-primary-soft text-primary font-semibold">{c.tag}</span></td>
                <td className="py-3 text-muted-foreground">{c.date}</td>
                <td className="py-3"><div className="flex justify-end gap-1.5">
                  <button className="h-7 w-7 rounded-lg border border-border hover:bg-muted grid place-items-center"><Phone className="h-3.5 w-3.5" /></button>
                  <button className="h-7 w-7 rounded-lg border border-border hover:bg-muted grid place-items-center"><Mail className="h-3.5 w-3.5" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
