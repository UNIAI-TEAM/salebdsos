import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Upload, FileText, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { parseCsv, autoMap, type FieldKey } from "@/lib/csv-import";
import { bulkCreateCustomers } from "@/lib/customer.functions";

const FIELD_LABEL: Record<Exclude<FieldKey, "">, string> = {
  full_name: "Họ và tên",
  phone: "SĐT",
  email: "Email",
  company: "Công ty",
  notes: "Ghi chú",
};

export function ImportCustomersDialog({
  open, onOpenChange, tenantId, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenantId: string;
  onDone: () => void;
}) {
  const [fileName, setFileName] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, FieldKey>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const fnBulk = useServerFn(bulkCreateCustomers);

  const reset = () => {
    setFileName(""); setHeaders([]); setRows([]); setMapping({});
    if (inputRef.current) inputRef.current.value = "";
  };

  const onFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("File quá lớn (>5MB)"); return; }
    const text = await file.text();
    const { headers: hs, rows: rs } = parseCsv(text);
    if (hs.length === 0) { toast.error("CSV trống"); return; }
    setFileName(file.name);
    setHeaders(hs);
    setRows(rs);
    setMapping(autoMap(hs));
  };

  // Map rows → CustomerInput shape, drop ones missing full_name.
  const prepared = useMemo(() => {
    if (!headers.length) return [];
    const inv: Partial<Record<Exclude<FieldKey, "">, string>> = {};
    for (const h of headers) {
      const k = mapping[h];
      if (k) inv[k] = h;
    }
    if (!inv.full_name) return [];
    return rows
      .map((r) => ({
        full_name: (r[inv.full_name!] ?? "").trim(),
        phone: inv.phone ? r[inv.phone].trim() : "",
        email: inv.email ? r[inv.email].trim() : "",
        company: inv.company ? r[inv.company].trim() : "",
        notes: inv.notes ? r[inv.notes].trim() : "",
      }))
      .filter((r) => r.full_name.length > 0);
  }, [headers, rows, mapping]);

  const importMut = useMutation({
    mutationFn: () =>
      fnBulk({ data: { tenantId, rows: prepared.map((r) => ({
        full_name: r.full_name,
        email: r.email || null,
        phone: r.phone || null,
        company: r.company || null,
        notes: r.notes || null,
      })) } }),
    onSuccess: (res) => {
      toast.success(`Đã nhập ${res.inserted} khách hàng`);
      reset();
      onOpenChange(false);
      onDone();
    },
    onError: (e: any) => toast.error(e?.message ?? "Nhập thất bại"),
  });

  const fullNameMapped = Object.values(mapping).includes("full_name");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nhập khách hàng từ CSV</DialogTitle>
          <DialogDescription>
            Dòng đầu tiên là tiêu đề cột. Hệ thống tự động map (Họ tên, SĐT, Email, Công ty, Ghi chú); bạn có thể chỉnh lại bên dưới.
          </DialogDescription>
        </DialogHeader>

        {!headers.length ? (
          <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl py-10 cursor-pointer hover:bg-muted/30">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-[13px]">Chọn file .csv (UTF-8)</span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              Chọn file
            </Button>
          </label>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2 text-[13px]">
                <FileText className="h-4 w-4" />
                <span className="font-medium truncate">{fileName}</span>
                <span className="text-muted-foreground">· {rows.length} dòng</span>
              </div>
              <Button size="icon" variant="ghost" onClick={reset}><X className="h-4 w-4" /></Button>
            </div>

            <div>
              <div className="text-[12.5px] font-semibold mb-2">Map cột</div>
              <div className="space-y-2">
                {headers.map((h) => (
                  <div key={h} className="grid grid-cols-2 gap-2 items-center">
                    <div className="text-[12.5px] truncate text-muted-foreground">{h}</div>
                    <Select
                      value={mapping[h] || "__none__"}
                      onValueChange={(v) =>
                        setMapping((m) => ({ ...m, [h]: v === "__none__" ? "" : (v as FieldKey) }))
                      }
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Bỏ qua —</SelectItem>
                        {(Object.keys(FIELD_LABEL) as Array<Exclude<FieldKey, "">>).map((k) => (
                          <SelectItem
                            key={k}
                            value={k}
                            disabled={Object.entries(mapping).some(([oh, ok]) => oh !== h && ok === k)}
                          >
                            {FIELD_LABEL[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {!fullNameMapped && (
              <div className="text-[12.5px] text-destructive">Cần map ít nhất cột "Họ và tên".</div>
            )}

            {fullNameMapped && (
              <div>
                <div className="text-[12.5px] font-semibold mb-2">
                  Xem trước ({prepared.length} dòng hợp lệ)
                </div>
                <div className="overflow-auto border border-border rounded-lg max-h-60">
                  <table className="w-full text-[12.5px]">
                    <thead className="bg-muted/40 text-muted-foreground sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium">Họ tên</th>
                        <th className="px-2 py-1.5 text-left font-medium">SĐT</th>
                        <th className="px-2 py-1.5 text-left font-medium">Email</th>
                        <th className="px-2 py-1.5 text-left font-medium">Công ty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prepared.slice(0, 50).map((r, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-2 py-1.5">{r.full_name}</td>
                          <td className="px-2 py-1.5">{r.phone || "—"}</td>
                          <td className="px-2 py-1.5">{r.email || "—"}</td>
                          <td className="px-2 py-1.5">{r.company || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Hủy</Button>
          <Button
            disabled={!prepared.length || importMut.isPending}
            onClick={() => importMut.mutate()}
          >
            {importMut.isPending ? "Đang nhập…" : `Nhập ${prepared.length} khách hàng`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
