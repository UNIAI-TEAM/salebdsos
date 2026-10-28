import {describe,it,expect} from 'vitest';
import {vietnamDay,vietnamDayStart,mergeCallLeads,uniqueWork} from './today-work';
describe('today work',()=>{
 it('uses Vietnam day boundaries for today appointments',()=>{expect(vietnamDay('2026-10-28T17:00:00Z')).toBe('2026-10-29');expect(vietnamDay('2026-10-28T16:59:00Z')).toBe('2026-10-28');});
 it('shows a customer only once in the call list even when cold and late SLA',()=>{expect(mergeCallLeads([{id:'lead-1'},{id:'lead-2'}],[{id:'lead-1'}])).toHaveLength(2);});
 it('starts today at midnight Vietnam so earlier uncompleted appointments stay visible',()=>{expect(vietnamDayStart('2026-10-28T07:57:00Z')).toBe('2026-10-27T17:00:00.000Z');});
 it('deduplicates calls and SLA in all tasks',()=>{expect(uniqueWork([{id:'call-1',leadId:'1',kind:'calls',name:'A',detail:'',status:'',urgent:true,order:0},{id:'sla-1',leadId:'1',kind:'sla',name:'A',detail:'',status:'',urgent:true,order:0}]).map(i=>i.id)).toEqual(['sla-1']);});
});