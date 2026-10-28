import { describe,it,expect } from 'vitest';
import { portalSubmitSchema } from './collaborator-portal';
describe('CTV submissions',()=>{
 const base={name:'Khách giới thiệu',phone:'0909123456',email:'',need:'Mua đất',requestId:'11111111-1111-4111-8111-111111111111'};
 it('requires customer name and a valid phone',()=>{
  expect(portalSubmitSchema.safeParse(base).success).toBe(true);
  for(const bad of [{...base,name:''},{...base,phone:'123'},{...base,phone:''}])expect(portalSubmitSchema.safeParse(bad).success).toBe(false);
 });
 it('requires a request identity for duplicate-safe submission',()=>{
  expect(portalSubmitSchema.safeParse({...base,requestId:undefined}).success).toBe(false);
 });
});