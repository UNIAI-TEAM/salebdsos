import { supabaseAdmin as sb } from '@/integrations/supabase/client.server';
import { getCredential } from './credentials.server';
import { emailReady } from './tenant-email';
export async function resendRequest(key: string, path: string, method = 'GET', body?: object) {
 const response = await fetch(`https://api.resend.com${path}`, { method, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
 const result = await response.json().catch(()=>({}));
 if (!response.ok) throw new Error(`Resend (${response.status}): ${response.status === 401 || response.status === 403 ? 'Khóa không hợp lệ hoặc thiếu quyền Full access.' : String(result.message ?? 'Không thể xử lý yêu cầu.').replaceAll(key,'[ẩn]').slice(0,300)}`);
 return result;
}
export async function sendTenantEmail(args: {tenantId: string; to: string; subject: string; text: string}) {
 const {data: config,error} = await sb.from('tenant_email_domains').select('*').eq('tenant_id',args.tenantId).maybeSingle();
 if(error) return {status:'failed' as const,externalId:null,error:'Không đọc được cấu hình email.'};
 if(!emailReady(config)) return {status:'pending' as const,externalId:null,error:'Email sàn chưa bật hoặc tên miền chưa xác minh.'};
 if(!config) return {status:'pending' as const,externalId:null,error:'Chưa cấu hình email.'};
 let status:'sent'|'failed'='failed', externalId:string|null=null, failure:string|null=null;
 try {
  const key=await getCredential(args.tenantId,'resend_api_key');
  if(!key) throw new Error('Chưa lưu khóa Resend.');
  const live=await resendRequest(key,`/domains/${config.provider_domain_id}`);
  if(live.name !== config.domain || live.status !== 'verified') throw new Error('Tên miền không còn được Resend xác minh.');
  const result=await resendRequest(key,'/emails','POST',{from:`${config.sender_name} <${config.sender_email}>`,to:[args.to],subject:args.subject,text:args.text,...(config.reply_to?{reply_to:config.reply_to}:{})});
  if(typeof result.id !== 'string') throw new Error('Resend chưa xác nhận tiếp nhận email.');
  externalId=result.id;status='sent';
 } catch(e){ failure=e instanceof Error?e.message:'Không gửi được email.'; }
 const {error: logError}=await sb.from('tenant_email_send_logs').insert({tenant_id:args.tenantId,recipient:args.to,subject:args.subject,status,provider_id:externalId,error:failure});
 if(logError) console.error('Tenant email log could not be saved');
 return {status,externalId,error:failure};
}