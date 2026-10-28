import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REPORT_COPY } from "@/lib/reporting";

export function ReportActions({ refresh, exportData, busy, ready }: { refresh: () => void; exportData: () => void; busy: boolean; ready: boolean }) {
  return <div className="flex gap-2">
    <Button variant="outline" size="icon" aria-label={REPORT_COPY.refresh} title={REPORT_COPY.refresh} onClick={refresh} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /></Button>
    <Button variant="outline" size="icon" aria-label={REPORT_COPY.export} title={REPORT_COPY.export} onClick={exportData} disabled={!ready || busy}><Download className="h-4 w-4" /></Button>
  </div>;
}

export function ReportOwnerFilter({ value, onChange, owners }: { value: string; onChange: (value: string) => void; owners: { id: string; name: string }[] }) {
  if (!owners.length) return null;
  return <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="h-9 w-[180px] max-w-full" aria-label={REPORT_COPY.owner}><SelectValue /></SelectTrigger>
    <SelectContent><SelectItem value="all">{REPORT_COPY.allOwners}</SelectItem>{owners.map((owner) => <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>)}</SelectContent>
  </Select>;
}