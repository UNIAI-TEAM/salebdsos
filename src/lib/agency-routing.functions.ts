import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import type {AgencyRoutingView} from './agency-routing';
export const getAgencyRouting=createServerFn({method:'GET'}).middleware([requireSupabaseAuth])
 .inputValidator((d:unknown)=>z.object({tenantId:z.string().uuid(),agencyId:z.string().uuid()}).parse(d))
 .handler(async({data,context})=>{const {data:r,error}=await context.supabase.rpc('agency_routing_view',{p_tenant:data.tenantId,p_agency:data.agencyId});if(error)throw new Error(error.message);return r as unknown as AgencyRoutingView;});
export const saveAgencyRouting=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
 .inputValidator((d:unknown)=>z.object({tenantId:z.string().uuid(),agencyId:z.string().uuid(),projectId:z.string().uuid(),enabled:z.boolean(),sla:z.number().int().min(5).max(1440)}).parse(d))
 .handler(async({data,context})=>{const {error}=await context.supabase.rpc('agency_routing_save',{p_tenant:data.tenantId,p_agency:data.agencyId,p_project:data.projectId,p_enabled:data.enabled,p_sla:data.sla});if(error)throw new Error(error.message);return {ok:true};});
export const updateAgencyReferral=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
 .inputValidator((d:unknown)=>z.object({id:z.string().uuid(),action:z.enum(['reassign','contacted','closed']),saleId:z.string().uuid().optional()}).refine(d=>d.action!=='reassign'||Boolean(d.saleId)).parse(d))
 .handler(async({data,context})=>{const {error}=await context.supabase.rpc('agency_referral_action',{p_id:data.id,p_action:data.action,p_sale:data.saleId});if(error)throw new Error(error.message);return {ok:true};});