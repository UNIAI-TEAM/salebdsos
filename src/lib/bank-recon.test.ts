import { describe, expect, it } from "vitest";
import { allocatePayment, extractContractCode, transferContent } from "./bank-recon";

describe("đối soát ngân hàng", () => {
  it("nhận mã hợp đồng khi ngân hàng bỏ dấu gạch", () => {
    expect(extractContractCode("NGUYEN VAN A CK HD260923LHS8 dot 1")).toBe("HD-260923-LHS8");
  });
  it("không có mã hợp đồng thì để chờ khớp tay", () => {
    expect(extractContractCode("chuyen tien coc")).toBeNull();
  });
  it("nội dung chuyển khoản chuẩn bỏ dấu gạch", () => {
    expect(transferContent("HD-260923-LHS8")).toBe("HD260923LHS8");
  });
  it("tiền về được trừ vào đợt còn nợ theo thứ tự, dư thì báo lại", () => {
    const r = allocatePayment(
      [
        { id: "b", position: 2, amount: 900, paid_amount: 0 },
        { id: "a", position: 1, amount: 900, paid_amount: 900 },
      ],
      1000,
    );
    expect(r.allocations).toEqual([{ installmentId: "b", amount: 900 }]);
    expect(r.leftover).toBe(100);
  });
});
