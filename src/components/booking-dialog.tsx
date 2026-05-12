import { useState, type ReactNode } from "react";
import { z } from "zod";
import { Calendar, Loader2, CheckCircle2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  company: z.string().trim().max(150).optional().or(z.literal("")),
  teamSize: z.string().min(1, "Chọn quy mô đội ngũ"),
  preferredTime: z.string().min(1, "Chọn thời gian liên hệ"),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;
type FormErrors = Partial<Record<keyof FormData, string>>;

const initial: FormData = {
  name: "", email: "", phone: "", company: "",
  teamSize: "", preferredTime: "", note: "",
};

export function BookingDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<FormData>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

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
      // Lưu tạm vào localStorage (chưa kết nối DB)
      const leads = JSON.parse(localStorage.getItem("nfc_leads") ?? "[]");
      leads.push({ ...result.data, createdAt: new Date().toISOString() });
      localStorage.setItem("nfc_leads", JSON.stringify(leads));
      await new Promise((r) => setTimeout(r, 500));
      setDone(true);
      toast.success("Đã gửi yêu cầu! Chúng tôi sẽ liên hệ trong 24h.");
    } catch {
      toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setTimeout(() => { setData(initial); setErrors({}); setDone(false); }, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        {done ? (
          <div className="py-6 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/10 grid place-items-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Cảm ơn bạn!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Yêu cầu đã được ghi nhận. Đội ngũ tư vấn sẽ liên hệ với bạn trong vòng 24h làm việc.
            </p>
            <Button className="mt-6" onClick={() => handleOpenChange(false)}>Đóng</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Đặt lịch tư vấn
              </DialogTitle>
              <DialogDescription>
                Để lại thông tin, chuyên gia sẽ tư vấn giải pháp tăng trưởng cho đội Sales của bạn.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Họ tên *</Label>
                  <Input id="name" value={data.name} onChange={(e) => update("name", e.target.value)} placeholder="Nguyễn Văn A" />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Số điện thoại *</Label>
                  <Input id="phone" value={data.phone} onChange={(e) => update("phone", e.target.value)} placeholder="0901 234 567" />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={data.email} onChange={(e) => update("email", e.target.value)} placeholder="ban@congty.vn" />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="company">Công ty</Label>
                  <Input id="company" value={data.company} onChange={(e) => update("company", e.target.value)} placeholder="VD: ABC Land" />
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

              <div className="space-y-1.5">
                <Label>Thời gian liên hệ thuận tiện *</Label>
                <Select value={data.preferredTime} onValueChange={(v) => update("preferredTime", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn khung giờ" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Sáng (9h - 12h)</SelectItem>
                    <SelectItem value="afternoon">Chiều (13h - 17h)</SelectItem>
                    <SelectItem value="evening">Tối (18h - 20h)</SelectItem>
                    <SelectItem value="anytime">Bất kỳ lúc nào</SelectItem>
                  </SelectContent>
                </Select>
                {errors.preferredTime && <p className="text-xs text-destructive">{errors.preferredTime}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="note">Ghi chú</Label>
                <Textarea id="note" rows={3} value={data.note} onChange={(e) => update("note", e.target.value)} placeholder="Bạn quan tâm tính năng nào? Mục tiêu cụ thể?" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>Huỷ</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang gửi…</> : "Gửi yêu cầu"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
