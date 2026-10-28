import { createFileRoute,Link,useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';
import { Users,Send,Wallet,LogOut,ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PORTAL_COPY as C,portalSubmitSchema } from '@/lib/collaborator-portal';
import { CTV_COPY,ctvMoney,collaboratorTotals } from '@/lib/collaborators';
import { getPortal,acceptPortalInvite,submitPortalLead } from '@/lib/collaborator-portal.functions';
export const Route=createFileRoute('/ctv')({
 validateSearch:z.object({invite:z.string().regex(/^[a-f0-9]{64}$/).optional()}),
 head:()=>({meta:[{title:`${C.title} — SaleBDS OS`},{name:'description',content:C.description},{property:'og:title',content:`${C.title} — SaleBDS OS`},{property:'og:description',content:C.description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
 component:PortalPage,
});
function PortalPage(){
 const {session,loading}=useAuth(); const {invite}=Route.useSearch(); const nav=useNavigate(); const qc=useQueryClient();
 const get=useServerFn(getPortal),accept=useServerFn(acceptPortalInvite),submit=useServerFn(submitPortalLead);
 const [mode,setMode]=useState<'login'|'signup'>('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [form,setForm]=useState({name:'',phone:'',email:'',need:''}); const [requestId,setRequestId]=useState<string|null>(null);
 const query=useQuery({queryKey:['ctv-portal',session?.user.id],enabled:Boolean(session),queryFn:()=>get()});
 const acceptMutation=useMutation({mutationFn:()=>{if(!invite)throw new Error(C.inviteNeeded);return accept({data:{token:invite}});},onSuccess:async()=>{toast.success(C.linked);await qc.invalidateQueries({queryKey:['ctv-portal']});nav({to:'/ctv',search:{},replace:true});},onError:e=>toast.error(e.message)});
 const sendMutation=useMutation({mutationFn:()=>{const id=requestId??crypto.randomUUID();setRequestId(id);return submit({data:{...form,requestId:id}});},onSuccess:async()=>{toast.success(C.sent);setForm({name:'',phone:'',email:'',need:''});setRequestId(null);await qc.invalidateQueries({queryKey:['ctv-portal']});},onError:e=>toast.error(e.message)});
 async function authenticate(e:React.FormEvent){e.preventDefault();setBusy(true);setNotice('');try{
  if(mode==='signup'){
   const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:`${window.location.origin}/ctv${invite?`?invite=${invite}`:''}`,data:{full_name:name}}});if(error)throw error;if(!data.session)setNotice(C.confirm);
  }else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;}
 }catch(e){toast.error(e instanceof Error?e.message:C.error);}finally{setBusy(false);}}
 async function logout(){await qc.cancelQueries();qc.clear();await supabase.auth.signOut();nav({to:'/ctv',search:invite?{invite}:{},replace:true});}
 const data=query.data; const totals=collaboratorTotals((data?.referrals??[]));
 return <div className="min-h-screen bg-background text-foreground"><header className="border-b border-border"><div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3"><Link to="/ctv" search={{}} className="flex items-center gap-3 font-semibold"><Users className="size-6 text-primary"/><span>SaleBDS OS <span className="text-muted-foreground">· CTV</span></span></Link>{session&&<Button variant="ghost" size="icon" aria-label={C.logout} title={C.logout} onClick={logout}><LogOut className="size-5"/></Button>}</div></header>
 <main className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6"><h1 className="text-2xl font-semibold">{C.title}</h1>
 {loading?<p>{C.loading}</p>:!session?<section className="max-w-md mx-auto py-8 space-y-5"><h2 className="text-xl font-semibold">{mode==='login'?C.login:C.signup}</h2><form onSubmit={authenticate} className="space-y-4">{mode==='signup'&&<div className="space-y-2"><Label htmlFor="ctv-name">{C.name}</Label><Input id="ctv-name" value={name} onChange={e=>setName(e.target.value)} required maxLength={150}/></div>}<div className="space-y-2"><Label htmlFor="ctv-email">{C.email}</Label><Input id="ctv-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div><div className="space-y-2"><Label htmlFor="ctv-password">{C.password}</Label><Input id="ctv-password" type="password" autoComplete={mode==='signup'?'new-password':'current-password'} minLength={mode==='signup'?8:1} value={password} onChange={e=>setPassword(e.target.value)} required/></div><Button className="w-full" disabled={busy} type="submit">{mode==='login'?C.login:C.signup}<ArrowRight className="size-4"/></Button></form>{notice&&<p role="status" className="text-sm text-success">{notice}</p>}<Button variant="link" onClick={()=>{setMode(mode==='login'?'signup':'login');setNotice('');}}>{mode==='login'?C.signup:C.login}</Button></section>:<>
 {invite&&<section className="border-y border-border py-4 flex flex-wrap gap-3 items-center justify-between"><span>{C.inviteEmail}</span><Button disabled={acceptMutation.isPending} onClick={()=>acceptMutation.mutate()}>{C.accept}</Button></section>}
 {query.isLoading&&<p>{C.loading}</p>}{query.error&&<p role="alert" className="text-destructive">{query.error.message}</p>}
 {data&&!data.profile&&<p className="text-muted-foreground">{C.inviteNeeded}</p>}
 {data?.profile&&<><div><h2 className="text-xl font-semibold">{data.profile.name}</h2><p className="text-sm text-muted-foreground">{data.profile.agency} · {data.profile.code}</p></div>
 <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-border divide-x divide-border">{[[C.referrals,String(data.referrals.length)],[C.approved,ctvMoney(totals.approved)],[C.paid,ctvMoney(totals.paid)],[C.remaining,ctvMoney(totals.outstanding)]].map(([label,value])=><div key={label} className="p-3 sm:p-4 min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold break-words">{value}</p></div>)}</div>
 <div className="grid lg:grid-cols-[340px_1fr] gap-8"><section><h2 className="font-semibold mb-4 flex items-center gap-2"><Send className="size-4 text-primary"/>{C.submit}</h2><form className="space-y-3" onSubmit={e=>{e.preventDefault();sendMutation.mutate();}}>{(['name','phone','email'] as const).map(field=><div className="space-y-1" key={field}><Label htmlFor={`lead-${field}`}>{field==='name'?C.customer:field==='phone'?C.phone:C.customerEmail}</Label><Input id={`lead-${field}`} type={field==='email'?'email':field==='phone'?'tel':'text'} required={field!=='email'} value={form[field]} onChange={e=>{setForm({...form,[field]:e.target.value});setRequestId(null);}} maxLength={field==='name'?150:field==='email'?254:15}/></div>)}<Label htmlFor="lead-need">{C.need}</Label><Textarea id="lead-need" value={form.need} maxLength={2000} onChange={e=>{setForm({...form,need:e.target.value});setRequestId(null);}}/><Button type="submit" disabled={sendMutation.isPending||!portalSubmitSchema.safeParse({...form,requestId:'11111111-1111-4111-8111-111111111111'}).success}><Send className="size-4"/>{C.submit}</Button></form></section>
 <section className="min-w-0"><h2 className="font-semibold mb-4">{C.referrals}</h2><div className="divide-y divide-border border-y border-border">{data.referrals.length===0&&<p className="py-8 text-muted-foreground">{C.empty}</p>}{data.referrals.map(r=><article key={r.id} className="py-4 space-y-2"><div className="flex flex-wrap justify-between gap-2"><strong className="break-words">{r.name}</strong><Badge variant="outline">{CTV_COPY.leadsStatus[r.status]??r.status}</Badge></div><p className="text-sm text-muted-foreground">{r.phone} · {new Date(r.created_at).toLocaleDateString('vi-VN')}</p><p className="text-sm">{r.approved?`${C.approved}: ${ctvMoney(Number(r.commission_amount))}`:C.pending} · {C.paid}: {ctvMoney(Number(r.paid))}</p></article>)}</div><h3 className="mt-6 mb-3 font-semibold flex items-center gap-2"><Wallet className="size-4"/>{C.history}</h3>{data.payments.map(p=><div key={p.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-3 text-sm"><span>{data.referrals.find(r=>r.id===p.referral_id)?.name} · {new Date(p.paid_at).toLocaleDateString('vi-VN')}</span><strong>{ctvMoney(Number(p.amount))}</strong></div>)}</section></div></>}
 </>}
 </main></div>;
}