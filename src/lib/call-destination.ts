/** Only Vietnamese full phone identities are accepted; suffix matching is not authorization. */
export function exactCallPhone(value: string | null | undefined): string | null {
  if (!value || !/^[+\d\s().-]+$/.test(value)) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("84") && digits.length === 11) digits = `0${digits.slice(2)}`;
  return /^0\d{9}$/.test(digits) ? digits : null;
}
export function matchedCallPhone(requested: string, contacts: Array<string | null | undefined>): string {
  const normalized = exactCallPhone(requested);
  if (!normalized || !contacts.some((p) => exactCallPhone(p) === normalized)) throw new Error("Chỉ gọi được đúng số điện thoại trong hồ sơ khách được phép truy cập");
  return normalized;
}