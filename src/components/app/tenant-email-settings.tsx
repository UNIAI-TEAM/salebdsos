import { useEffect,useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery,useMutation,useQueryClient } from '@tanstack/react-query';
import { Copy,Mail,RefreshCw,Save,Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { EMAIL_COPY as c,emailReady } from '@/lib/tenant-email';
import { getTenantEmail,saveTenantEmail,verifyTenantEmail,testTenantEmail } from '@/lib/tenant-email.functions';
type DnsRecord={type?:string;name?:string;value?:string;priority?:number;ttl?:string;status?:string};
export function TenantEmailSettings({tenantId}:{tenantId:string}){
 const qc=useQueryClient(),get=useServerFn(getTenantEmail),save=useServerFn(saveTenantEmail),verify=useServerFn(verifyTenantEmail),test=useServerFn(testTenantEmail);
 const query=useQuery({queryKey:['tenant-email',tenantId],queryFn:()=>get({data:{tenantId}})});
 const [form,setForm]=useState({domain:'',senderName:'',senderEmail:'',replyTo:'',enabled:false});
 const [key,setKey]=useState('');
 useEffect(()=>{const v=query.data?.config;if(v)setForm({domain:v.domain,senderName:v.sender_name,senderEmail:v.sender_email,replyTo:v.reply_to??'',enabled:v.enabled});},[query.data?.config]);
 const invalidate=()=>qc.invalidateQueries({queryKey:['tenant-email',tenantId]});
 const saving=useMutation({mutationFn:()=>save({data:{tenantId,...form,...(key?{apiKey:key}:{})}}),onSuccess:()=>{setKey('');toast.success(c.saved);invalidate();},onError:(e:Error)=>toast.error(e.message)});
 const checking=useMutation({mutationFn:()=>verify({data:{tenantId}}),onSuccess:r=>{toast.success(r.status==='verified'?c.verified:c.pending);invalidate();},onError:(e:Error)=>toast.error(e.message)});
 const testing=useMutation({mutationFn:()=>test({data:{tenantId}}),onSuccess:()=>{toast.success(c.accepted);invalidate();},onError:(e:Error)=>{toast.error(e.message);invalidate();}});
 const busy=saving.isPending||checking.isPending||testing.isPending;
 if(query.isPending)return <p className="text-sm text-muted-foreground">{c.loading}</p>;
 if(query.isError)return <p className="text-sm text-destructive">{query.error.message}</p>;
 const config=query.data.config,records=(config?.dns_records??[]) as DnsRecord[];
 return <section aria-label={c.title} className="space-y-5 border-b border-border pb-6">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-semibold"><Mail className="h-5 w-5 text-primary"/>{c.title}</h2><Badge variant={config?.status==='verified'?'secondary':'outline'}>{!config?c.missing:config.status==='verified'?c.verified:c.pending}</Badge></div>
  <p className="text-sm text-muted-foreground">{c.providerHint}</p>
  <form onSubmit={e=>{e.preventDefault();saving.mutate();}} className="space-y-4">
   <div className="grid gap-4 sm:grid-cols-2">
    <div className="space-y-1.5"><Label htmlFor="email-domain">{c.domain}</Label><Input id="email-domain" required placeholder="notify.tenmiensan.vn" value={form.domain} onChange={e=>setForm({...form,domain:e.target.value})}/></div>
    <div className="space-y-1.5"><Label htmlFor="email-name">{c.name}</Label><Input id="email-name" required value={form.senderName} onChange={e=>setForm({...form,senderName:e.target.value})}/></div>
    <div className="space-y-1.5"><Label htmlFor="email-from">{c.sender}</Label><Input id="email-from" type="email" required placeholder="nhacnothue@notify.tenmiensan.vn" value={form.senderEmail} onChange={e=>setForm({...form,senderEmail:e.target.value})}/></div>
    <div className="space-y-1.5"><Label htmlFor="email-reply">{c.reply}</Label><Input id="email-reply" type="email" value={form.replyTo} onChange={e=>setForm({...form,replyTo:e.target.value})}/></div>
    <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="email-key">{c.key}</Label><Input id="email-key" type="password" autoComplete="new-password" required={!query.data.hasKey} placeholder={query.data.hasKey?'••••••••':'re_…'} value={key} onChange={e=>setKey(e.target.value)}/><p className="text-xs text-muted-foreground">{c.keyHint}</p></div>
   </div>
   <div className="flex items-center gap-3"><Switch id="email-enabled" checked={form.enabled} onCheckedChange={enabled=>setForm({...form,enabled})}/><Label htmlFor="email-enabled">{c.enabled}</Label></div>
   <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}><Save className="mr-2 h-4 w-4"/>{c.save}</Button><Button type="button" variant="outline" disabled={busy||!config} onClick={()=>checking.mutate()}><RefreshCw className="mr-2 h-4 w-4"/>{c.verify}</Button><Button type="button" variant="outline" disabled={busy||!emailReady(config)} onClick={()=>testing.mutate()}><Send className="mr-2 h-4 w-4"/>{c.test}</Button></div>
  </form>
  {config&&<p className="text-xs text-muted-foreground">{config.enabled?c.checkHint:c.disabled}</p>}
  {records.length>0&&<div className="space-y-2"><h3 className="text-sm font-medium">{c.dns}</h3><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-border text-muted-foreground"><tr>{[c.record,c.host,c.value,c.priority,c.ttl,c.status].map(v=><th className="p-2" key={v}>{v}</th>)}</tr></thead><tbody>{records.map((r,i)=><tr key={i} className="border-b border-border"><td className="p-2">{r.type}</td><td className="p-2">{r.name}</td><td className="p-2"><div className="flex items-center gap-2"><code className="max-w-64 break-all">{r.value}</code><Button type="button" size="icon" variant="ghost" title={c.copy} aria-label={`${c.copy} ${r.name}`} onClick={()=>{navigator.clipboard.writeText(r.value??'');toast.success(c.copied);}}><Copy className="h-4 w-4"/></Button></div></td><td className="p-2">{r.priority??'—'}</td><td className="p-2">{r.ttl??'—'}</td><td className="p-2">{r.status==='verified'?c.verified:c.pending}</td></tr>)}</tbody></table></div></div>}
  <div className="space-y-2"><h3 className="text-sm font-medium">{c.history}</h3>{!query.data.logs.length?<p className="text-xs text-muted-foreground">{c.empty}</p>:query.data.logs.map(l=><div key={l.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-2 text-xs"><div className="min-w-0 break-all"><p>{l.recipient} · {l.subject}</p><p className="text-muted-foreground">{new Date(l.created_at).toLocaleString('vi-VN')}</p>{l.error&&<p className="text-destructive">{l.error}</p>}</div><Badge variant={l.status==='sent'?'secondary':'outline'}>{l.status==='sent'?c.acceptedLabel:c.failedLabel}</Badge></div>)}</div>
 </section>;
}