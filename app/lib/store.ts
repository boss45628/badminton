export type Side = "A" | "B";
export type BestOf = 3 | 5;

export type CourtAssignment = {
  courtId: number; // 1~4
  teamAPlayerIds: string[]; // 單打=1人，雙打=2人
  teamBPlayerIds: string[];
};

export type Player = {
  id: string;
  name: string;
  playedCount: number;
};

export type SchedulerState = {
  players: Player[];
  assignments: CourtAssignment[]; // 4 面場目前上場名單
};

const KEY = "badminton_scheduler_v1";

export function loadSchedulerState(): SchedulerState {
  if (typeof window === "undefined") {
    return { players: [], assignments: defaultAssignments() };
  }
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return { players: [], assignments: defaultAssignments() };

  try {
    const parsed = JSON.parse(raw) as SchedulerState;
    // 補預設值防呆
    return {
      players: parsed.players ?? [],
      assignments: parsed.assignments?.length ? parsed.assignments : defaultAssignments(),
    };
  } catch {
    return { players: [], assignments: defaultAssignments() };
  }
}

export function saveSchedulerState(state: SchedulerState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function defaultAssignments(): CourtAssignment[] {
  return [1, 2, 3, 4].map((id) => ({
    courtId: id,
    teamAPlayerIds: [],
    teamBPlayerIds: [],
  }));
}

export function uid(): string {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
