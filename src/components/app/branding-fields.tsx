import {useRef,useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {Upload,Trash2,Check} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {uploadTenantLogo} from '@/lib/settings.functions';
import {BRAND_COPY as c,BRAND_THEMES} from '@/lib/tenant-branding';
import {toast} from 'sonner';
export function BrandingFields({tenantId,form,set}:{tenantId:string;form:Record<string,unknown>;set:(k:string,v:unknown)=>void}){
 const upload=useServerFn(uploadTenantLogo),input=useRef<HTMLInputElement>(null),[busy,setBusy]=useState(false);
 const labels={blue:c.blue,green:c.green,graphite:c.graphite,legacy:c.legacy};
 async function handleLogo(file:File|undefined){
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){toast.error(c.invalid);return;}
  setBusy(true);
  try{const encoded=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]??'');reader.onerror=()=>reject(new Error(c.invalid));reader.readAsDataURL(file);});const result=await upload({data:{tenantId,mime:file.type as 'image/png'|'image/jpeg'|'image/webp',base64:encoded}});set('logo_url',result.url);}catch(e){toast.error(e instanceof Error?e.message:c.invalid);}finally{setBusy(false);if(input.current)input.current.value='';}
 }
 return <div className="space-y-5">
  <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">{c.themes}</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{BRAND_THEMES.map(theme=><Button type="button" key={theme} variant={form.theme===theme?'secondary':'outline'} aria-pressed={form.theme===theme} onClick={()=>set('theme',theme)} className="h-auto min-h-16 flex-wrap justify-start gap-2 p-3"><span className={`theme-swatch-${theme} h-5 w-5 shrink-0 rounded-full`}/><span>{labels[theme]}</span>{form.theme===theme&&<Check className="ml-auto h-4 w-4"/>}</Button>)}</div></fieldset>
  <div className="space-y-2"><Label>{c.logo}</Label><div className="flex flex-wrap items-center gap-3">{!!form.logo_url&&<img src={String(form.logo_url)} alt={c.logo} className="h-16 w-16 rounded-md border border-border bg-muted object-contain p-1"/>}<input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label={c.upload} onChange={e=>handleLogo(e.target.files?.[0])}/><Button type="button" variant="outline" disabled={busy} onClick={()=>input.current?.click()}><Upload className="h-4 w-4"/>{busy?c.uploading:c.upload}</Button>{!!form.logo_url&&<Button type="button" variant="ghost" onClick={()=>set('logo_url','')}><Trash2 className="h-4 w-4"/>{c.remove}</Button>}</div><p className="text-xs text-muted-foreground">{c.hint}</p></div>
  <div className="space-y-2"><Label htmlFor="brand-slogan">{c.slogan}</Label><Input id="brand-slogan" value={String(form.tagline??'')} maxLength={160} onChange={e=>set('tagline',e.target.value)}/></div>
  <div className="border-t border-border pt-3"><p className="mb-2 text-xs text-muted-foreground">{c.preview}</p><div className="flex items-center gap-3">{!!form.logo_url&&<img src={String(form.logo_url)} alt="" className="h-10 w-10 object-contain"/>}<p className="min-w-0 break-words text-sm">{String(form.tagline||c.tagline)}</p></div></div>
 </div>;
}