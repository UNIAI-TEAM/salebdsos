import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getFacebookCredentialStatus, saveFacebookCredentials } from "@/lib/integrations.functions";

const when = (iso: string | null) => (iso ? `Đã lưu ${new Date(iso).toLocaleString("vi-VN")}` : "Chưa có");

/** Ô nhập chỉ-ghi: khoá được mã hoá trên máy chủ và không bao giờ hiển thị lại. */
export function FacebookCredentials({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const statusFn = useServerFn(getFacebookCredentialStatus);
  const saveFn = useServerFn(saveFacebookCredentials);
  const q = useQuery({ queryKey: ["fb-creds", tenantId], queryFn: () => statusFn({ data: { tenantId } }), enabled: !!tenantId });
  const [appSecret, setAppSecret] = useState("");
  const [pageToken, setPageToken] = useState("");
  const [show, setShow] = useState(false);

  const done = () => {
    setAppSecret(""); setPageToken(""); setShow(false);
    qc.invalidateQueries({ queryKey: ["fb-creds", tenantId] });
    qc.invalidateQueries({ queryKey: ["integrations", tenantId] });
    qc.invalidateQueries({ queryKey: ["social", tenantId] });
  };
  const save = useMutation({
    mutationFn: () => saveFn({ data: { tenantId, appSecret: appSecret.trim() || undefined, pageToken: pageToken.trim() || undefined } }),
    onSuccess: (r) => { toast.success(r.pageName ? `Đã lưu khoá · Fanpage: ${r.pageName}` : "Đã lưu khoá"); done(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const clear = useMutation({
    mutationFn: () => saveFn({ data: { tenantId, clear: true } }),
    onSuccess: () => { toast.success("Đã xoá khoá Facebook"); done(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const s = q.data;
  const type = show ? "text" : "password";

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldCheck className="h-4 w-4 text-primary" /> Khoá ứng dụng Facebook (chỉ quản trị viên)
      </div>
      <p className="text-xs text-muted-foreground">
        Khoá được mã hoá và lưu trên máy chủ. Sau khi lưu sẽ không hiển thị lại — muốn đổi thì nhập khoá mới.
      </p>
      <form
        className="space-y-3"
        autoComplete="off"
        onSubmit={(e) => { e.preventDefault(); if (appSecret || pageToken) save.mutate(); }}
      >
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="fb-app-secret" className="text-xs">App Secret</Label>
            <Badge variant={s?.appSecretAt ? "secondary" : "outline"} className="text-[10px]">{when(s?.appSecretAt ?? null)}</Badge>
          </div>
          <Input id="fb-app-secret" type={type} autoComplete="new-password" spellCheck={false} value={appSecret}
            onChange={(e) => setAppSecret(e.target.value)} placeholder={s?.appSecretAt ? "•••••••• (nhập để thay)" : "Facebook App → Cài đặt → Cơ bản"} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="fb-page-token" className="text-xs">Page Access Token</Label>
            <Badge variant={s?.pageTokenAt ? "secondary" : "outline"} className="text-[10px]">{when(s?.pageTokenAt ?? null)}</Badge>
          </div>
          <Input id="fb-page-token" type={type} autoComplete="new-password" spellCheck={false} value={pageToken}
            onChange={(e) => setPageToken(e.target.value)} placeholder={s?.pageTokenAt ? "•••••••• (nhập để thay)" : "Token dài hạn của Fanpage"} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={save.isPending || (!appSecret && !pageToken)}>{save.isPending ? "Đang kiểm tra..." : "Lưu khoá"}</Button>
          <Button type="button" variant="ghost" size="icon" aria-label={show ? "Ẩn khoá đang nhập" : "Hiện khoá đang nhập"} onClick={() => setShow(!show)}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          {(s?.appSecretAt || s?.pageTokenAt) && (
            <Button type="button" variant="outline" className="ml-auto text-destructive" disabled={clear.isPending}
              onClick={() => { if (confirm("Xoá khoá Facebook của sàn? Tự động hoá Fanpage sẽ ngừng.")) clear.mutate(); }}>
              Xoá khoá
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
