import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Upload, FileText, Download, Folder } from "lucide-react";

export const Route = createFileRoute("/_app/files")({ component: FilesPage });

function FilesPage() {
  const files = [
    { n: "Brochure Vinhomes Ocean Park 2.pdf", s: "8.2 MB", d: "12/05/2024" },
    { n: "Bảng giá Masteri Waterfront.xlsx", s: "1.6 MB", d: "10/05/2024" },
    { n: "Hợp đồng mẫu mua bán.docx", s: "640 KB", d: "08/05/2024" },
    { n: "Brochure Lumi Hanoi.pdf", s: "12.4 MB", d: "05/05/2024" },
    { n: "Chính sách bán hàng Q2.pdf", s: "2.8 MB", d: "01/05/2024" },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Tài liệu & Brochure" sub="Thư viện tài liệu chia sẻ với khách hàng."
        action={<button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Upload className="h-4 w-4" /> Tải lên</button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {["Tất cả","Brochure","Bảng giá","Hợp đồng"].map((f, i) => (
          <button key={f} className={["rounded-xl border p-3 text-left transition", i === 0 ? "border-primary bg-primary-soft" : "border-border bg-card hover:bg-muted"].join(" ")}>
            <Folder className={["h-5 w-5 mb-2", i === 0 ? "text-primary" : "text-muted-foreground"].join(" ")} />
            <div className="text-[12.5px] font-semibold">{f}</div>
            <div className="text-[11px] text-muted-foreground">{[124,42,38,18][i]} files</div>
          </button>
        ))}
      </div>
      <SectionCard>
        <ul className="divide-y divide-border">
          {files.map((f) => (
            <li key={f.n} className="flex items-center gap-3 py-3">
              <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 grid place-items-center"><FileText className="h-5 w-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate">{f.n}</div>
                <div className="text-[11px] text-muted-foreground">{f.s} · {f.d}</div>
              </div>
              <button className="h-8 w-8 rounded-lg border border-border hover:bg-muted grid place-items-center"><Download className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
