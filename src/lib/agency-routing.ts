export type AgencyLoad = {id:string; pending:number; received30:number};
export function selectAgencyByLoad(rows:AgencyLoad[]) {
  return [...rows].sort((a,b)=>a.pending-b.pending||a.received30-b.received30||a.id.localeCompare(b.id))[0]?.id??null;
}
export function referralSla(due:string,responded:string|null,status:string,now=Date.now()) {
  if(responded||status!=='assigned')return 'responded';
  const remaining=Date.parse(due)-now;
  return remaining<=0?'overdue':remaining<=5*60000?'warning':'pending';
}
export const agencyRoutingCopy={title:'Phân khách & SLA',addRule:'Thêm quy tắc',project:'Dự án',sla:'SLA (phút)',save:'Lưu quy tắc',enabled:'Đang bật',disabled:'Đã tắt',enable:'Bật',disable:'Tắt',chooseProject:'Chọn dự án',noRules:'Chưa có quy tắc phân khách',noLeads:'Chưa có khách được phân phối',contacted:'Đã liên hệ',closed:'Kết thúc xử lý',pending:'Đang chờ',warning:'Sắp quá hạn',overdue:'Quá hạn SLA',responded:'Đã phản hồi',customer:'Khách hàng',sale:'Sale phụ trách',reassign:'Chuyển Sale',history:'Lịch sử',assigned:'Giao khách',reassigned:'Chuyển Sale',refresh:'Làm mới',load:'Khách chờ phản hồi',error:'Không thể cập nhật',saved:'Đã cập nhật phân khách',slaDue:'Hạn phản hồi',info:'Kênh chung → đại lý theo dự án và tải → Sale',noEligible:'Chưa phân phối được',cancel:'Huỷ'};
export type AgencyRoutingView={canConfigure:boolean;canReassign:boolean;projects:{id:string;name:string}[];rules:{id:string;project_id:string;project_name:string;enabled:boolean;sla_minutes:number}[];sales:{user_id:string;name:string}[];referrals:{id:string;full_name:string|null;phone:string|null;email:string|null;source:string|null;project_name:string;sale_user_id:string;sale_name:string;created_at:string;sla_due_at:string;responded_at:string|null;status:string;canUpdate:boolean;history:{action:string;at:string}[]}[]};