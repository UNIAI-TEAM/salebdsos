import { useState, type ReactNode } from "react";
import { z } from "zod";
import { Sparkles, Loader2, Rocket } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(2, "Vui lòng nhập họ tên").max(100),
  email: z.string().trim().email("Email không hợp lệ").max(255),
  phone: z.string().trim().min(8, "Số điện thoại không hợp lệ").max(20)
    .regex(/^[0-9+\-\s().]+$/, "Số điện thoại không hợp lệ"),
  role: z.string().min(1, "Chọn vai trò"),
  teamSize: z.string().min(1, "Chọn quy mô đội ngũ"),
});

type FormData = z.infer<typeof schema>;
type FormErrors = Partial<Record<keyof FormData, string>>;

const initial: FormData = { name: "", email: "", phone: "", role: "", teamSize: "" };

export function DemoDialog({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<FormData>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(data);
    if (!result.success) {
      const fe: FormErrors = {};
      for (const issue of result.error.issues) {
        const k = issue.path[0] as keyof FormData;
        if (!fe[k]) fe[k] = issue.message;
      }
      setErrors(fe);
      return;
    }
    setSubmitting(true);
    try {
      const leads = JSON.parse(localStorage.getItem("nfc_demo_leads") ?? "[]");
      leads.push({ ...result.data, source: "demo_cta", createdAt: new Date().toISOString() });
      localStorage.setItem("nfc_demo_leads", JSON.stringify(leads));
      await new Promise((r) => setTimeout(r, 400));
      toast.success("Đang chuyển bạn vào demo…");
      setOpen(false);
      navigate({ to: "/dashboard" });
    } catch {
      toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) setTimeout(() => { setData(initial); setErrors({}); }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Trải nghiệm demo
            </DialogTitle>
            <DialogDescription>
              Điền nhanh thông tin để mở môi trường demo cá nhân hoá cho đội Sales của bạn.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="d-name">Họ tên *</Label>
                <Input id="d-name" value={data.name} onChange={(e) => update("name", e.target.value)} placeholder="Nguyễn Văn A" />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-phone">Số điện thoại *</Label>
                <Input id="d-phone" value={data.phone} onChange={(e) => update("phone", e.target.value)} placeholder="0901 234 567" />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="d-email">Email công việc *</Label>
              <Input id="d-email" type="email" value={data.email} onChange={(e) => update("email", e.target.value)} placeholder="ban@congty.vn" />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Vai trò *</Label>
                <Select value={data.role} onValueChange={(v) => update("role", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn vai trò" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Sale / Môi giới</SelectItem>
                    <SelectItem value="leader">Trưởng nhóm</SelectItem>
                    <SelectItem value="manager">Quản lý / Giám đốc Sales</SelectItem>
                    <SelectItem value="owner">Chủ doanh nghiệp</SelectItem>
                    <SelectItem value="other">Khác</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Quy mô đội ngũ *</Label>
                <Select value={data.teamSize} onValueChange={(v) => update("teamSize", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn quy mô" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1 - 10 sale</SelectItem>
                    <SelectItem value="11-50">11 - 50 sale</SelectItem>
                    <SelectItem value="51-200">51 - 200 sale</SelectItem>
                    <SelectItem value="200+">Trên 200 sale</SelectItem>
                  </SelectContent>
                </Select>
                {errors.teamSize && <p className="text-xs text-destructive">{errors.teamSize}</p>}
              </div>
            </div>

            <p className="text-[11.5px] text-muted-foreground">
              Bằng việc tiếp tục, bạn đồng ý cho chúng tôi liên hệ tư vấn về nền tảng.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>Huỷ</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang mở demo…</> : <><Rocket className="h-4 w-4 mr-2" /> Vào demo ngay</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
