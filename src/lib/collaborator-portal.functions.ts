import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { portalSubmitSchema,type PortalWorkspace } from './collaborator-portal';
export const getPortal=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const {data,error}=await context.supabase.rpc('collaborator_portal_workspace');
 if(error)throw new Error(error.message); return data as unknown as PortalWorkspace;
});
export const acceptPortalInvite=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({token:z.string().regex(/^[a-f0-9]{64}$/)}).parse(d)).handler(async({data,context})=>{
 const {error}=await context.supabase.rpc('collaborator_portal_accept',{p_token:data.token}); if(error)throw new Error(error.message); return {ok:true};
});
export const submitPortalLead=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>portalSubmitSchema.parse(d)).handler(async({data,context})=>{
 const {data:id,error}=await context.supabase.rpc('collaborator_portal_submit',{p_name:data.name,p_phone:data.phone,p_email:data.email,p_need:data.need,p_request:data.requestId}); if(error)throw new Error(error.message); return {id};
});
export const invitePortal=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({tenantId:z.string().uuid(),collaboratorId:z.string().uuid()}).parse(d)).handler(async({data,context})=>{
 const {data:token,error}=await context.supabase.rpc('collaborator_portal_invite',{p_tenant:data.tenantId,p_collaborator:data.collaboratorId}); if(error)throw new Error(error.message); return {token};
});