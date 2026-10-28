import {describe,it,expect} from 'vitest';
import {vietnamDay,mergeCallLeads} from './today-work';
describe('today work',()=>{
 it('uses Vietnam day boundaries for today appointments',()=>{expect(vietnamDay('2026-10-28T17:00:00Z')).toBe('2026-10-29');expect(vietnamDay('2026-10-28T16:59:00Z')).toBe('2026-10-28');});
 it('shows a customer only once in the call list even when cold and late SLA',()=>{expect(mergeCallLeads([{id:'lead-1'},{id:'lead-2'}],[{id:'lead-1'}])).toHaveLength(2);});
});