import {describe,it,expect} from 'vitest';
import {agencyCommissionCommand,commissionBalance} from './agency-commissions';
describe('separate commission ledgers',()=>{
 it('requires Sale for agency to Sale entries',()=>{expect(agencyCommissionCommand.safeParse({action:'create',payload:{level:'agency_sale',contractId:'00000000-0000-4000-8000-000000000001',rate:2}}).success).toBe(false);});
 it('keeps recorded payment separate from received payment',()=>{expect(commissionBalance({amount:60000000,payments:[{id:'1',amount:20000000,reference:'A',paid_date:'2026-10-26',received_at:null},{id:'2',amount:10000000,reference:'B',paid_date:'2026-10-26',received_at:'2026-10-26'}]})).toEqual({recorded:30000000,received:10000000,remaining:30000000,awaiting:20000000});});
});