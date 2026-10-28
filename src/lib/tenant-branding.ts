import { z } from 'zod';
export const BRAND_COPY={themes:'Giao diện',blue:'Xanh doanh nghiệp',green:'Xanh ngọc',graphite:'Đen trắng',legacy:'Luxury',mode:'Chế độ mặc định',light:'Sáng',dark:'Tối',logo:'Logo của sàn',upload:'Tải logo',remove:'Xóa logo',slogan:'Slogan',preview:'Xem trước',hint:'PNG, JPG hoặc WebP · tối đa 2 MB',uploading:'Đang tải logo…',invalid:'Logo phải là PNG, JPG hoặc WebP và không quá 2 MB.',fallback:'SaleBDS OS',tagline:'Điều hành kinh doanh bằng điểm chạm'};
export const BRAND_THEMES=['blue','green','graphite','legacy'] as const;
export const brandingSchema=z.object({theme:z.enum(BRAND_THEMES).default('blue'),mode:z.enum(['light','dark']).default('dark'),primary_color:z.string().trim().regex(/^#([0-9a-fA-F]{6})$/).default('#2563EB'),logo_url:z.string().trim().max(500).refine(v=>!v||v.startsWith('https://'),'Logo cần địa chỉ HTTPS.').default(''),tagline:z.string().trim().max(160).default('')});
export type TenantBranding=z.infer<typeof brandingSchema>;
export function parseBranding(value:unknown):TenantBranding {const r=brandingSchema.safeParse(value??{});return r.success?r.data:brandingSchema.parse({});}
export function validLogo(bytes:Uint8Array,mime:string){
 if(bytes.length>2*1024*1024||bytes.length<12)return false;
 if(mime==='image/png')return [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
 if(mime==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 return mime==='image/webp'&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
}