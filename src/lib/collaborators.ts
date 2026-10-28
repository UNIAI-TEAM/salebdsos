import { z } from 'zod';

export const CTV_COPY = {
  title: 'Cộng tác viên bán hàng', description: 'Hồ sơ, khách giới thiệu và hoa hồng cộng tác viên của sàn.',
  add: 'Thêm CTV', edit: 'Sửa hồ sơ', search: 'Tìm tên, mã hoặc số điện thoại', all: 'Tất cả', active: 'Đang hợp tác', paused: 'Tạm dừng',
  name: 'Họ và tên', code: 'Mã cộng tác viên', phone: 'Số điện thoại', email: 'Email', owner: 'Sale phụ trách', note: 'Ghi chú', status: 'Trạng thái',
  save: 'Lưu', cancel: 'Huỷ', loading: 'Đang tải…', empty: 'Chưa có cộng tác viên', noResults: 'Không có kết quả phù hợp',
  profiles: 'Cộng tác viên', referrals: 'Khách giới thiệu', payable: 'Còn phải chi', paid: 'Đã chi',
  addReferral: 'Ghi nhận khách', findLead: 'Tìm khách trong CRM', chooseLead: 'Chọn khách', noLead: 'Không tìm thấy khách',
  commission: 'Duyệt hoa hồng', pay: 'Ghi nhận chi', amount: 'Số tiền (VND)', reference: 'Mã chứng từ', contract: 'Hợp đồng',
  chooseContract: 'Chọn hợp đồng', noContract: 'Chưa có hợp đồng hiệu lực của khách này', pending: 'Chưa duyệt', approved: 'Đã duyệt',
  payments: 'Lịch sử chi trả', noReferrals: 'Chưa có khách giới thiệu', noPayments: 'Chưa ghi nhận chi trả',
  saved: 'Đã lưu cộng tác viên', referred: 'Đã ghi nhận khách giới thiệu', commissioned: 'Đã duyệt hoa hồng', paymentSaved: 'Đã ghi nhận khoản chi',
  error: 'Không thể thực hiện thao tác', tenantMissing: 'Chưa chọn sàn', member: 'Thành viên', selectOwner: 'Chọn người phụ trách',
  leadsStatus: { new: 'Mới', contacted: 'Đã liên hệ', qualified: 'Tiềm năng', proposal: 'Đề xuất', consulting: 'Tư vấn', quoted: 'Báo giá', deposit: 'Đặt cọc', won: 'Thành công', lost: 'Thất bại' } as Record<string,string>,
};
export const collaboratorProfileSchema = z.object({
  id: z.string().uuid().optional(), name: z.string().trim().min(1).max(150), code: z.string().trim().min(1).max(40),
  phone: z.string().trim().max(30), email: z.union([z.literal(''),z.string().email()]),
  ownerId: z.string().uuid(), status: z.enum(['active','paused']), note: z.string().trim().max(2000),
});
export const collaboratorCommandSchema = z.discriminatedUnion('action',[
  z.object({action:z.literal('save'),payload:collaboratorProfileSchema}),
  z.object({action:z.literal('refer'),payload:z.object({collaboratorId:z.string().uuid(),leadId:z.string().uuid(),note:z.string().max(2000).default('')})}),
  z.object({action:z.literal('commission'),payload:z.object({referralId:z.string().uuid(),contractId:z.string().uuid(),amount:z.number().finite().min(0).max(1e15)})}),
  z.object({action:z.literal('pay'),payload:z.object({referralId:z.string().uuid(),amount:z.number().finite().positive().max(1e15),reference:z.string().trim().min(1).max(100)})}),
]);
export type CollaboratorCommand = z.infer<typeof collaboratorCommandSchema> & {tenantId:string};
export type CollaboratorProfile = {id:string;code:string;full_name:string;phone:string|null;email:string|null;owner_user_id:string;owner_name:string;status:'active'|'paused';note:string|null;created_at:string};
export type CollaboratorReferral = {id:string;collaborator_id:string;lead_id:string;lead_name:string;lead_phone:string|null;lead_status:string;contract_id:string|null;contract_code:string|null;commission_amount:number;approved:boolean;paid:number;note:string|null;created_at:string};
export type CollaboratorPayment = {id:string;referral_id:string;amount:number;reference:string;paid_at:string};
export type CollaboratorWorkspace = {canEdit:boolean;profiles:CollaboratorProfile[];referrals:CollaboratorReferral[];payments:CollaboratorPayment[];people:{user_id:string;name:string}[];leads:{id:string;full_name:string;phone:string|null}[]};
export function collaboratorTotals(rows: Pick<CollaboratorReferral,'approved'|'commission_amount'|'paid'>[]) {
  const approved=rows.reduce((sum,row)=>sum+(row.approved?Number(row.commission_amount):0),0);
  const paid=rows.reduce((sum,row)=>sum+Number(row.paid),0);
  return {approved,paid,outstanding:Math.max(0,approved-paid)};
}
export const ctvMoney = (amount:number) => new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(amount);
export const ctvCompactMoney = (amount:number) => new Intl.NumberFormat('vi-VN',{notation:'compact',maximumFractionDigits:1}).format(amount);