import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Plus, Package } from "lucide-react";

export const Route = createFileRoute("/_app/products")({ component: ProductsPage });

function ProductsPage() {
  const items = [
    { n: "Gói tư vấn VIP", price: "5,000,000đ", tag: "Dịch vụ" },
    { n: "Định giá BĐS chuyên sâu", price: "2,000,000đ", tag: "Dịch vụ" },
    { n: "Hỗ trợ vay ngân hàng", price: "Miễn phí", tag: "Hỗ trợ" },
    { n: "Báo cáo thị trường", price: "1,500,000đ", tag: "Tài liệu" },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Sản phẩm" sub="Catalog dịch vụ & sản phẩm phụ trợ."
        action={<button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> Thêm sản phẩm</button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((it) => (
          <SectionCard key={it.n}>
            <div className="h-12 w-12 rounded-xl bg-primary-soft text-primary grid place-items-center mb-3"><Package className="h-5 w-5" /></div>
            <div className="text-[13.5px] font-semibold">{it.n}</div>
            <div className="text-[11px] text-muted-foreground">{it.tag}</div>
            <div className="mt-3 text-[15px] font-bold text-primary">{it.price}</div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
