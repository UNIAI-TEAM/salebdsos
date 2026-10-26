import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { agencyProfileSchema, type AgencyCatalog, type AgencyWorkspace } from './agencies';

export const getAgencyWorkspace = createServerFn({method:'GET'}).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({tenantId:z.string().uuid(), agencyId:z.string().uuid().optional()}).parse(d))
  .handler(async ({data,context}) => {
    const {data:result,error} = await context.supabase.rpc('agency_workspace',{p_tenant:data.tenantId,p_agency:data.agencyId});
    if(error) throw new Error(error.message);
    return result as unknown as AgencyWorkspace;
  });
const commandSchema = z.discriminatedUnion('action',[
  z.object({action:z.literal('save'), payload:agencyProfileSchema}),
  z.object({action:z.literal('accept'), payload:z.object({id:z.string().uuid()})}),
  z.object({action:z.literal('status'), payload:z.object({id:z.string().uuid(),status:z.enum(['active','paused'])})}),
  z.object({action:z.literal('allocate'), payload:z.object({id:z.string().uuid(),projectId:z.string().uuid(),productIds:z.array(z.string().uuid()).min(1).max(100),expiresAt:z.string().datetime().nullable()})}),
  z.object({action:z.literal('revoke'), payload:z.object({id:z.string().uuid(),allocationId:z.string().uuid()})}),
  z.object({action:z.literal('access_add'), payload:z.object({id:z.string().uuid(),userId:z.string().uuid().optional(),teamId:z.string().uuid().optional()}).refine(d=>Boolean(d.userId)!==Boolean(d.teamId))}),
  z.object({action:z.literal('access_remove'), payload:z.object({id:z.string().uuid(),accessId:z.string().uuid()})}),
]);
export type AgencyCommand = z.infer<typeof commandSchema> & {tenantId:string};
export const changeAgency = createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator((d:AgencyCommand) => ({...commandSchema.parse(d),tenantId:z.string().uuid().parse(d.tenantId)}))
  .handler(async ({data,context}) => {
    const {data:id,error}=await context.supabase.rpc('agency_command',{p_tenant:data.tenantId,p_action:data.action,p_data:data.payload});
    if(error) throw new Error(error.message);
    return {id};
  });
export const getAgencyCatalog = createServerFn({method:'GET'}).middleware([requireSupabaseAuth])
  .inputValidator((d:unknown)=>z.object({tenantId:z.string().uuid(),projectId:z.string().uuid().optional(),page:z.number().int().min(0).max(10000).default(0)}).parse(d))
  .handler(async ({data,context})=>{
    const {data:result,error}=await context.supabase.rpc('agency_catalog',{p_tenant:data.tenantId,p_project:data.projectId,p_page:data.page});
    if(error) throw new Error(error.message);
    return result as unknown as AgencyCatalog;
  });