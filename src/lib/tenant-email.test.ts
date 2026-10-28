import { describe,it,expect } from 'vitest';
import { emailAdmin,emailReady,tenantEmailInput } from './tenant-email';
describe('Tenant sender rules',()=>{
 it('only tenant administrators configure sending',()=>{expect(emailAdmin(['admin'])).toBe(true);expect(emailAdmin(['agent','manager','viewer'])).toBe(false);});
 it('sender address must match the exact domain',()=>{expect(tenantEmailInput.safeParse({tenantId:'11111111-2222-4333-8444-555555550047',domain:'example.vn',senderName:'Sàn',senderEmail:'sale@other.vn',enabled:true}).success).toBe(false);});
 it('pending domains cannot send',()=>{expect(emailReady({domain:'example.vn',sender_email:'sale@example.vn',status:'pending',enabled:true})).toBe(false);});
 it('paused verified domains cannot send',()=>{expect(emailReady({domain:'example.vn',sender_email:'sale@example.vn',status:'verified',enabled:false})).toBe(false);});
 it('verified enabled exact domains can send',()=>{expect(emailReady({domain:'example.vn',sender_email:'sale@example.vn',status:'verified',enabled:true})).toBe(true);});
});