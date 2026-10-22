import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { previewSegment } from "@/lib/campaign.functions";
import type { Segment } from "@/lib/segments";

const STATUSES: Array<[string, string]> = [
  ["new", "Mới"], ["contacted", "Đã liên hệ"], ["consulting", "Đang tư vấn"], ["qualified", "Tiềm năng"],
  ["quoted", "Đã báo giá"], ["proposal", "Đề xuất"], ["deposit", "Giữ chỗ/cọc"], ["won", "Đã chốt"], ["lost", "Thất bại"],
];
const DAYS = [null, 7, 14, 30, 60, 90, 180];

function Chip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-muted-foreground hover:bg-muted"}`}>
      {label}
    </button>
  );
}

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function SegmentBuilder({ tenantId, channel, value, onChange }: {
  tenantId: string; channel: "email" | "zalo" | "sms" | "push"; value: Segment; onChange: (s: Segment) => void;
}) {
  const fn = useServerFn(previewSegment);
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), 300); return () => clearTimeout(t); }, [value]);
  const q = useQuery({
    queryKey: ["segment-preview", tenantId, channel, debounced],
    queryFn: () => fn({ data: { tenantId, channel, segment: debounced } }),
  });
  const opts = q.data?.options;
  const sel = "h-9 rounded-md border border-input bg-transparent px-2 text-sm";

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div>
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">Dự án (bỏ trống = tất cả)</div>
        <div className="flex flex-wrap gap-1.5">
          {(opts?.projects ?? []).map((p) => (
            <Chip key={p.id} label={p.name} on={value.projectIds.includes(p.id)}
              onClick={() => onChange({ ...value, projectIds: toggle(value.projectIds, p.id) })} />
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">Trạng thái khách</div>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map(([k, l]) => (
            <Chip key={k} label={l} on={value.statuses.includes(k)}
              onClick={() => onChange({ ...value, statuses: toggle(value.statuses, k) })} />
          ))}
        </div>
      </div>
      {!!opts?.sources.length && (
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Nguồn</div>
          <div className="flex flex-wrap gap-1.5">
            {opts.sources.map((s) => (
              <Chip key={s} label={s} on={value.sources.includes(s)}
                onClick={() => onChange({ ...value, sources: toggle(value.sources, s) })} />
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>Khách mới trong</span>
          <select className={`${sel} w-full`} value={value.createdWithinDays ?? ""}
            onChange={(e) => onChange({ ...value, createdWithinDays: e.target.value ? Number(e.target.value) : null })}>
            {DAYS.map((d) => <option key={String(d)} value={d ?? ""}>{d ? `${d} ngày` : "Bất kỳ"}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>Không tương tác từ</span>
          <select className={`${sel} w-full`} value={value.inactiveDays ?? ""}
            onChange={(e) => onChange({ ...value, inactiveDays: e.target.value ? Number(e.target.value) : null })}>
            {DAYS.map((d) => <option key={String(d)} value={d ?? ""}>{d ? `${d} ngày` : "Bất kỳ"}</option>)}
          </select>
        </label>
      </div>
      <label className="flex items-center justify-between text-sm">
        <span>Loại khách đã chốt / thất bại</span>
        <Switch checked={value.excludeWon} onCheckedChange={(v) => onChange({ ...value, excludeWon: v })} />
      </label>
      <div className="flex items-start gap-2 rounded-md bg-muted/60 p-2.5 text-sm">
        <Users className="mt-0.5 h-4 w-4 text-primary" />
        <div>
          {q.isLoading ? "Đang đếm..." : (
            <>
              <b>{q.data?.reachable ?? 0}</b> / {q.data?.total ?? 0} khách nhận được qua kênh này
              {!!q.data?.sample.length && (
                <div className="text-xs text-muted-foreground">VD: {q.data.sample.join(", ")}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
