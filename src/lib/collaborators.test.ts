import { describe,it,expect } from 'vitest';
import {collaboratorCommandSchema,collaboratorTotals} from './collaborators';
describe('collaborator ledger safeguards',()=>{
  it('counts approved commission only and subtracts partial payments',()=>{
    expect(collaboratorTotals([{approved:true,commission_amount:60000000,paid:20000000},{approved:false,commission_amount:90000000,paid:0}])).toEqual({approved:60000000,paid:20000000,outstanding:40000000});
  });
  it('rejects zero, negative and blank-reference payments',()=>{
    const payload={referralId:'11111111-1111-4111-8111-111111111111',amount:100,reference:'CTV-001'};
    expect(collaboratorCommandSchema.safeParse({action:'pay',payload}).success).toBe(true);
    for(const bad of [{...payload,amount:0},{...payload,amount:-1},{...payload,reference:'  '}]) expect(collaboratorCommandSchema.safeParse({action:'pay',payload:bad}).success).toBe(false);
  });
  it('requires a valid contract for commission approval',()=>{
    expect(collaboratorCommandSchema.safeParse({action:'commission',payload:{referralId:'11111111-1111-4111-8111-111111111111',amount:60000000}}).success).toBe(false);
  });
});