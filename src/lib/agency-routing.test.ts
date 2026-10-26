import {it,expect} from 'vitest';
import {selectAgencyByLoad,referralSla} from './agency-routing';
it('routes first by pending load, then 30-day intake',()=>{
  expect(selectAgencyByLoad([{id:'a',pending:2,received30:2},{id:'b',pending:1,received30:20},{id:'c',pending:1,received30:10}])).toBe('c');
});
it('returns no candidate for an empty eligible project pool',()=>expect(selectAgencyByLoad([])).toBe(null));
it('warns within 5 minutes and detects overdue without restarting the SLA',()=>{
  const now=Date.parse('2026-10-26T03:47:00Z');
  expect(referralSla('2026-10-26T03:52:00Z',null,'assigned',now)).toBe('warning');
  expect(referralSla('2026-10-26T03:47:00Z',null,'assigned',now)).toBe('overdue');
  expect(referralSla('2026-10-26T03:53:00Z',null,'assigned',now)).toBe('pending');
});
it('stops SLA when Sale records contact',()=>expect(referralSla('2026-10-26T03:47:00Z','2026-10-26T03:46:00Z','contacted')).toBe('responded'));