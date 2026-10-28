import {it,expect,describe} from 'vitest';
import {brandingSchema,validLogo,parseBranding} from './tenant-branding';
describe('Tenant branding validation',()=>{
 it('accepts exactly the supported themes',()=>{for(const theme of ['blue','green','graphite','legacy'])expect(brandingSchema.parse({theme}).theme).toBe(theme);expect(brandingSchema.safeParse({theme:'unknown'}).success).toBe(false);});
 it('supports both light and dark defaults',()=>{for(const mode of ['light','dark'])expect(parseBranding({mode}).mode).toBe(mode);});
 it('rejects unsafe logo URLs',()=>{expect(brandingSchema.safeParse({logo_url:'javascript:alert(1)'}).success).toBe(false);});
 it('rejects scripts disguised as images and files over 2MB',()=>{expect(validLogo(new TextEncoder().encode('<svg onload="alert(1)"></svg>'),'image/png')).toBe(false);expect(validLogo(new Uint8Array(2*1024*1024+1),'image/png')).toBe(false);});
});