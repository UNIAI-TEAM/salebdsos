// Pure: which deal status a pipeline stage implies when a deal is dropped into it.
export type StageLike = { name: string; position: number; win_probability: number | null };

export function statusForStage(s: StageLike): "won" | "lost" | "open" {
  const n = s.name.toLowerCase();
  if (s.win_probability === 100 || /thành công|chốt|won/.test(n)) return "won";
  if ((s.win_probability === 0 && s.position > 0) || /thất bại|huỷ|hủy|lost/.test(n)) return "lost";
  return "open";
}
