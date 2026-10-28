import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import {collaboratorCommandSchema,type CollaboratorCommand,type CollaboratorWorkspace} from './collaborators';

export const getCollaborators = createServerFn({method:'GET'}).middleware([requireSupabaseAuth])
  .inputValidator((d:unknown)=>z.object({tenantId:z.string().uuid(),search:z.string().max(100).default('')}).parse(d))
  .handler(async({data,context})=>{
    const {data:result,error}=await context.supabase.rpc('collaborator_workspace',{p_tenant:data.tenantId,p_search:data.search});
    if(error) throw new Error(error.message);
    return result as unknown as CollaboratorWorkspace;
  });
export const changeCollaborator = createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator((d:CollaboratorCommand)=>({...collaboratorCommandSchema.parse(d),tenantId:z.string().uuid().parse(d.tenantId)}))
  .handler(async({data,context})=>{
    const {data:id,error}=await context.supabase.rpc('collaborator_command',{p_tenant:data.tenantId,p_action:data.action,p_data:data.payload});
    if(error) throw new Error(error.message);
    return {id};
  });
export const getCollaboratorContracts = createServerFn({method:'GET'}).middleware([requireSupabaseAuth])
  .inputValidator((d:unknown)=>z.object({tenantId:z.string().uuid(),referralId:z.string().uuid()}).parse(d))
  .handler(async({data,context})=>{
    const {data:rows,error}=await context.supabase.rpc('collaborator_contracts',{p_tenant:data.tenantId,p_referral:data.referralId});
    if(error) throw new Error(error.message);
    return rows??[];
  });