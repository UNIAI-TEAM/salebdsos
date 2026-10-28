import { z } from 'zod';
export const PORTAL_COPY = {
 title:'Cổng Cộng tác viên', description:'Gửi khách giới thiệu và theo dõi trạng thái, hoa hồng của riêng bạn tại SaleBDS OS.',
 login:'Đăng nhập', signup:'Tạo tài khoản CTV', email:'Email', password:'Mật khẩu', name:'Họ và tên', phone:'Số điện thoại khách', customer:'Tên khách', need:'Nhu cầu khách', customerEmail:'Email khách (không bắt buộc)',
 submit:'Gửi khách giới thiệu', sent:'Đã tiếp nhận khách giới thiệu', accept:'Nhận lời mời', inviteNeeded:'Chưa có liên kết CTV. Vui lòng nhận lời mời từ quản trị sàn.', confirm:'Kiểm tra email để xác nhận tài khoản, sau đó mở lại lời mời.',
 referrals:'Khách giới thiệu', approved:'Hoa hồng đã duyệt', paid:'Đã nhận', remaining:'Còn lại', pending:'Chờ duyệt', history:'Lịch sử chi trả', empty:'Chưa có khách giới thiệu', logout:'Đăng xuất', loading:'Đang tải…', error:'Không thể thực hiện thao tác',
 invite:'Mời vào cổng CTV', link:'Liên kết mời CTV', copy:'Sao chép', copied:'Đã sao chép liên kết', inviteEmail:'CTV cần đăng nhập đúng email trong hồ sơ; lời mời có hiệu lực 7 ngày.', back:'Quay lại', linked:'Đã liên kết tài khoản CTV',
};
export const portalSubmitSchema=z.object({name:z.string().trim().min(1).max(150),phone:z.string().trim().regex(/^(?:0\d{9}|\+?84\d{9})$/),email:z.union([z.literal(''),z.string().email().max(254)]),need:z.string().max(2000),requestId:z.string().uuid()});
export type PortalReferral={id:string;name:string;phone:string;status:string;created_at:string;approved:boolean;commission_amount:number;paid:number};
export type PortalWorkspace={profile:{name:string;code:string;agency:string}|null;referrals:PortalReferral[];payments:{id:string;referral_id:string;amount:number;paid_at:string}[]};