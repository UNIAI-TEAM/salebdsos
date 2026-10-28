import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { emailAdmin,tenantEmailInput } from './tenant-email';
import { CHANNELS_KEY,parseChannelSettings } from './channels';
const idSchema=z.object({tenantId:z.string().uuid()});
async function requireAdmin(context:any,tenantId:string){
 const {data,error}=await context.supabase.from('user_roles').select('role').eq('tenant_id',tenantId).eq('user_id',context.userId);
 if(error||!emailAdmin((data??[]).map((r:any)=>r.role))) throw new Error('Chỉ quản trị sàn được cấu hình email.');
}
export const getTenantEmail=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(d=>idSchema.parse(d)).handler(async({data,context})=>{
 await requireAdmin(context,data.tenantId);
 const {supabaseAdmin:sb}=await import('@/integrations/supabase/client.server');
 const {credentialStatus}=await import('./credentials.server');
 const [config,logs,keys]=await Promise.all([sb.from('tenant_email_domains').select('*').eq('tenant_id',data.tenantId).maybeSingle(),sb.from('tenant_email_send_logs').select('*').eq('tenant_id',data.tenantId).order('created_at',{ascending:false}).limit(10),credentialStatus(data.tenantId)]);
 if(config.error||logs.error) throw new Error('Không tải được cấu hình email.');
 return {config:config.data,logs:logs.data??[],hasKey:!!keys.resend_api_key};
});
export const saveTenantEmail=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(d=>tenantEmailInput.parse(d)).handler(async({data,context})=>{
 await requireAdmin(context,data.tenantId);
 const {supabaseAdmin:sb}=await import('@/integrations/supabase/client.server');
 const {saveCredential,getCredential}=await import('./credentials.server');
 const {resendRequest}=await import('./tenant-email.server');
 const key=data.apiKey||await getCredential(data.tenantId,'resend_api_key');
 if(!key) throw new Error('Nhập khóa Resend Full access của sàn.');
 const {data:other,error:lookupError}=await sb.from('tenant_email_domains').select('tenant_id').eq('domain',data.domain).neq('tenant_id',data.tenantId).maybeSingle();
 if(lookupError) throw new Error('Không kiểm tra được tên miền.');
 if(other) throw new Error('Tên miền đã được gắn với sàn khác.');
 const list=await resendRequest(key,'/domains');
 let domain=(list.data??[]).find((d:any)=>d.name===data.domain);
 if(!domain) domain=await resendRequest(key,'/domains','POST',{name:data.domain});
 const detail=await resendRequest(key,`/domains/${z.string().uuid().parse(domain.id)}`);
 if(detail.name!==data.domain) throw new Error('Tên miền Resend không khớp.');
 // Persist domain identity only after provider validation; no secret enters client-readable settings.
 const {error}=await sb.from('tenant_email_domains').upsert({tenant_id:data.tenantId,domain:data.domain,provider_domain_id:detail.id,sender_name:data.senderName,sender_email:data.senderEmail,reply_to:data.replyTo||null,status:detail.status,dns_records:detail.records??[],enabled:data.enabled,checked_at:new Date().toISOString(),updated_by:context.userId,updated_at:new Date().toISOString()});
 if(error) throw new Error('Không lưu được tên miền; có thể đã được sàn khác sử dụng.');
 if(data.apiKey) await saveCredential(data.tenantId,'resend_api_key',data.apiKey,context.userId);
 const {data:current,error:readError}=await sb.from('settings').select('value').eq('tenant_id',data.tenantId).eq('key',CHANNELS_KEY).maybeSingle();
 if(readError) throw new Error('Đã lưu tên miền nhưng chưa cập nhật được kênh email.');
 const channels=parseChannelSettings(current?.value);
 channels.email={...channels.email,enabled:data.enabled,senderName:data.senderName,replyTo:data.replyTo||''};
 const {error:channelError}=await sb.from('settings').upsert({tenant_id:data.tenantId,key:CHANNELS_KEY,value:channels,updated_by:context.userId},{onConflict:'tenant_id,key'});
 if(channelError) throw new Error('Đã lưu tên miền nhưng chưa bật được kênh email.');
 return {ok:true};
});
export const verifyTenantEmail=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(d=>idSchema.parse(d)).handler(async({data,context})=>{
 await requireAdmin(context,data.tenantId);
 const {supabaseAdmin:sb}=await import('@/integrations/supabase/client.server');
 const {getCredential}=await import('./credentials.server');
 const {resendRequest}=await import('./tenant-email.server');
 const {data:config,error}=await sb.from('tenant_email_domains').select('*').eq('tenant_id',data.tenantId).maybeSingle();
 const key=await getCredential(data.tenantId,'resend_api_key');
 if(error||!config||!key) throw new Error('Lưu cấu hình email trước.');
 await resendRequest(key,`/domains/${config.provider_domain_id}/verify`,'POST');
 const result=await resendRequest(key,`/domains/${config.provider_domain_id}`);
 if(result.name!==config.domain) throw new Error('Tên miền không khớp.');
 const {error:saveError}=await sb.from('tenant_email_domains').update({status:result.status,dns_records:result.records??[],checked_at:new Date().toISOString()}).eq('tenant_id',data.tenantId);
 if(saveError) throw new Error('Không lưu được kết quả xác minh.');
 return {status:String(result.status)};
});
export const testTenantEmail=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(d=>idSchema.parse(d)).handler(async({data,context})=>{
 await requireAdmin(context,data.tenantId);
 const {data:auth,error}=await context.supabase.auth.getUser();
 if(error||!auth.user?.email||!auth.user.email_confirmed_at) throw new Error('Tài khoản cần có email đã xác nhận.');
 const {sendTenantEmail}=await import('./tenant-email.server');
 const result=await sendTenantEmail({tenantId:data.tenantId,to:auth.user.email,subject:'Kiểm tra email sàn — SaleBDS OS',text:'Đây là email kiểm tra cấu hình tên miền gửi của sàn trên SaleBDS OS.'});
 if(result.status!=='sent') throw new Error(result.error??'Chưa gửi được email thử.');
 return {ok:true};
});