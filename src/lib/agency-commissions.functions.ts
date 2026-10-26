import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {agencyCommissionCommand,commissionLevel,type AgencyCommissionView} from './agency-commissions';
export const getAgencyCommissions=createServerFn({method:'GET'}).middleware([requireSupabaseAuth])
 .inputValidator((d:unknown)=>z.object({tenantId:z.string().uuid(),agencyId:z.string().uuid(),level:commissionLevel,page:z.number().int().min(0).max(10000).default(0)}).parse(d))
 .handler(async({data,context})=>{const {data:r,error}=await context.supabase.rpc('agency_commission_view',{p_tenant:data.tenantId,p_agency:data.agencyId,p_level:data.level,p_page:data.page});if(error)throw new Error(error.message);return r as unknown as AgencyCommissionView;});
export const changeAgencyCommission=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
 .inputValidator((d:unknown)=>{const base=z.object({tenantId:z.string().uuid(),agencyId:z.string().uuid()}).parse(d);return {...base,...agencyCommissionCommand.parse(d)};})
 .handler(async({data,context})=>{const {data:id,error}=await context.supabase.rpc('agency_commission_command',{p_tenant:data.tenantId,p_agency:data.agencyId,p_action:data.action,p_data:data.payload});if(error)throw new Error(error.message);return {id};});