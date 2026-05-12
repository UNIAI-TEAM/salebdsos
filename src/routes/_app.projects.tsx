import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { MapPin, Building2, Plus, Heart } from "lucide-react";

export const Route = createFileRoute("/_app/projects")({ component: ProjectsPage });

const projects = [
  { n: "Vinhomes Ocean Park 2", loc: "Hưng Yên", price: "Từ 2.8 tỷ", units: 124, tone: "from-blue-300 to-indigo-300" },
  { n: "Masteri Waterfront", loc: "Hà Nội", price: "Từ 3.6 tỷ", units: 86, tone: "from-cyan-300 to-blue-300" },
  { n: "Lumi Hanoi", loc: "Hà Nội", price: "Từ 4.2 tỷ", units: 72, tone: "from-amber-300 to-rose-300" },
  { n: "The Global City", loc: "TP.HCM", price: "Từ 5.1 tỷ", units: 96, tone: "from-violet-300 to-fuchsia-300" },
  { n: "Eaton Park", loc: "TP.HCM", price: "Từ 6.8 tỷ", units: 54, tone: "from-emerald-300 to-cyan-300" },
  { n: "Sun Group Hạ Long", loc: "Quảng Ninh", price: "Từ 4.5 tỷ", units: 68, tone: "from-sky-300 to-indigo-300" },
];

function ProjectsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dự án" sub="Catalog dự án bất động sản đang phân phối."
        action={<button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> Thêm dự án</button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <SectionCard key={p.n} className="overflow-hidden">
            <div className="-m-5 mb-3">
              <div className={["aspect-[16/10] bg-gradient-to-br relative", p.tone].join(" ")}>
                <button className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/90 grid place-items-center hover:bg-white"><Heart className="h-4 w-4 text-rose-500" /></button>
                <Building2 className="absolute bottom-3 left-3 h-8 w-8 text-white/70" />
              </div>
            </div>
            <div className="text-[14px] font-bold">{p.n}</div>
            <div className="text-[11.5px] text-muted-foreground inline-flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" /> {p.loc}</div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <div><div className="text-[10.5px] text-muted-foreground">Giá</div><div className="text-[13px] font-bold text-primary">{p.price}</div></div>
              <div className="text-right"><div className="text-[10.5px] text-muted-foreground">Còn lại</div><div className="text-[13px] font-bold">{p.units} căn</div></div>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
