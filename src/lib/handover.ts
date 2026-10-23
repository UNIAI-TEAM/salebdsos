// Pure: handover planning + permission. Contracts and commissions stay with the
// original Sale (earned income); only follow-up work moves.
import type { Membership } from "./departments";

/** Spread items across targets, giving each next item to the least-loaded target. */
export function planHandover(itemIds: string[], targets: string[], load: Record<string, number> = {}) {
  if (!targets.length) throw new Error("Chưa chọn Sale nhận bàn giao");
  const cur: Record<string, number> = Object.fromEntries(targets.map((t) => [t, load[t] ?? 0]));
  const out: Record<string, string> = {};
  for (const id of itemIds) {
    const t = targets.reduce((a, b) => (cur[b] < cur[a] ? b : a));
    out[id] = t;
    cur[t]++;
  }
  return out;
}

/** Admin: anyone. Department head: from and every target must be in a department they lead. */
export function canHandover(
  scope: { isAdmin: boolean; manageable: string[] },
  fromUserId: string, toUserIds: string[], members: Membership[],
) {
  if (toUserIds.includes(fromUserId) || !toUserIds.length) return false;
  if (scope.isAdmin) return true;
  return scope.manageable.some((team) => {
    const inTeam = (u: string) => members.some((m) => m.team_id === team && m.user_id === u);
    return inTeam(fromUserId) && toUserIds.every(inTeam);
  });
}
