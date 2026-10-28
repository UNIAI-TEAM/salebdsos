import {createContext,useContext,useEffect,type ReactNode} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {useAuth} from './use-auth';
import {getTenantBranding} from '@/lib/settings.functions';
import {parseBranding,type TenantBranding} from '@/lib/tenant-branding';
const Ctx=createContext<TenantBranding>(parseBranding({}));
export function TenantBrandingProvider({children}:{children:ReactNode}){
 const {currentTenant}=useAuth(),get=useServerFn(getTenantBranding);
 const tenantId=currentTenant?.id??'';
 const q=useQuery({queryKey:['tenant-branding',tenantId],queryFn:()=>get({data:{tenantId}}),enabled:!!tenantId});
 const branding=q.data??parseBranding({});
 useEffect(()=>{
  const root=document.documentElement;
  root.dataset.tenantTheme=branding.theme;
  return ()=>{delete root.dataset.tenantTheme;};
 },[tenantId,branding.theme]);
 return <Ctx.Provider value={branding}>{children}</Ctx.Provider>;
}
export function useTenantBranding(){return useContext(Ctx);}