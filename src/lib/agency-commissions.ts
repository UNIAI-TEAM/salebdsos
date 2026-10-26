import {z} from 'zod';
export const commissionLevel=z.enum(['master_agency','agency_sale']);
export type CommissionLevel=z.infer<typeof commissionLevel>;
export const agencyCommissionCommand=z.discriminatedUnion('action',[
 z.object({action:z.literal('create'),payload:z.object({level:commissionLevel,contractId:z.string().uuid(),saleId:z.string().uuid().optional(),rate:z.number().positive().max(100),dueDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()}).refine(d=>d.level!=='agency_sale'||Boolean(d.saleId))}),
 z.object({action:z.enum(['submit','confirm','cancel']),payload:z.object({id:z.string().uuid()})}),
 z.object({action:z.literal('dispute'),payload:z.object({id:z.string().uuid(),note:z.string().trim().min(2).max(1000)})}),
 z.object({action:z.literal('pay'),payload:z.object({id:z.string().uuid(),amount:z.number().positive(),reference:z.string().trim().min(1).max(160),paidDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)})}),
 z.object({action:z.literal('receive'),payload:z.object({id:z.string().uuid(),paymentId:z.string().uuid()})}),
]);
export type CommissionCommand=z.infer<typeof agencyCommissionCommand>;
export type CommissionPayment={id:string;amount:number;reference:string;paid_date:string;received_at:string|null};
export type AgencyCommissionEntry={id:string;level:CommissionLevel;contract_code:string;base_amount:number;rate:number;amount:number;currency:string;status:'draft'|'submitted'|'confirmed'|'disputed'|'cancelled';due_date:string|null;dispute_note:string|null;sale_name:string;canConfirm:boolean;history:{action:string;at:string}[];payments:CommissionPayment[]};
export type AgencyCommissionView={canCreate:boolean;canPay:boolean;total:number;contracts:{id:string;code:string;net_price:number;currency:string}[];sales:{user_id:string;name:string}[];entries:AgencyCommissionEntry[]};
export function commissionBalance(e:Pick<AgencyCommissionEntry,'amount'|'payments'>){
 const recorded=e.payments.reduce((s,p)=>s+Number(p.amount),0),received=e.payments.filter(p=>p.received_at).reduce((s,p)=>s+Number(p.amount),0);
 return {recorded,received,remaining:Math.max(0,Number(e.amount)-recorded),awaiting:recorded-received};
}
export const agencyCommissionCopy={
 title:'Hoa hồng & đối soát',master_agency:'Sàn tổng → Đại lý',agency_sale:'Đại lý → Sale',create:'Lập hoa hồng',contract:'Hợp đồng',chooseContract:'Chọn hợp đồng hiệu lực',sale:'Sale nhận hoa hồng',chooseSale:'Chọn Sale',rate:'Tỷ lệ (%)',dueDate:'Hạn thanh toán',save:'Lưu',cancel:'Đóng',submit:'Gửi đối soát',confirm:'Xác nhận đối soát',dispute:'Báo chênh lệch',note:'Lý do chênh lệch',pay:'Ghi nhận chi tiền',receive:'Xác nhận đã nhận',amount:'Số tiền',reference:'Mã giao dịch / chứng từ',paidDate:'Ngày chi',history:'Lịch sử',payments:'Thanh toán',empty:'Chưa có hoa hồng',loading:'Đang tải…',error:'Không thể cập nhật hoa hồng',saved:'Đã cập nhật',refresh:'Làm mới',draft:'Bản nháp',submitted:'Chờ đối soát',confirmed:'Đã thống nhất',disputed:'Có chênh lệch',cancelled:'Đã hủy',cancelEntry:'Hủy bản nháp',recorded:'Đã ghi nhận chi',received:'Đã xác nhận nhận',remaining:'Còn phải chi',awaiting:'Chờ xác nhận nhận tiền',base:'Giá trị tính hoa hồng',previous:'Trang trước',next:'Trang sau',page:'Trang',noContracts:'Chưa có hợp đồng phù hợp',actions:{create:'Lập hoa hồng',submit:'Gửi đối soát',confirm:'Xác nhận đối soát',dispute:'Báo chênh lệch',cancel:'Hủy',pay:'Ghi nhận chi',receive:'Xác nhận nhận tiền'},
};