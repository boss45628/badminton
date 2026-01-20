"use client";

import { useEffect, useMemo, useState } from "react";
import {
  defaultAssignments,
  loadSchedulerState,
  saveSchedulerState,
  uid,
  type CourtAssignment,
  type Player,
  type SchedulerState,
} from "../lib/store";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
      {children}
    </span>
  );
}

function Button({
  children,
  onClick,
  variant = "solid",
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "solid" | "outline" | "danger";
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "solid"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : variant === "danger"
        ? "bg-red-600 text-white hover:bg-red-500"
        : "border border-slate-300 text-slate-800 hover:bg-slate-50";
  return (
    <button type="button" className={`${base} ${styles}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function toggleId(list: string[], id: string, max: number) {
  const exists = list.includes(id);
  if (exists) return list.filter((x) => x !== id);
  if (list.length >= max) return list; // 超過上限就不加
  return [...list, id];
}

export default function SchedulerPage() {
  const [state, setState] = useState<SchedulerState>({
    players: [],
    assignments: defaultAssignments(),
  });

  const [newName, setNewName] = useState<string>("");

  // load
  useEffect(() => {
    setState(loadSchedulerState());
  }, []);

  // save
  useEffect(() => {
    saveSchedulerState(state);
  }, [state]);

  const playersById = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of state.players) m.set(p.id, p);
    return m;
  }, [state.players]);

  function addPlayer() {
    const name = newName.trim();
    if (!name) return;

    const p: Player = {
      id: uid(),
      name,
      playedCount: 0,
      history: [],
    };

    setState((prev) => ({
      ...prev,
      players: [...prev.players, p],
    }));
    setNewName("");
  }

  function removePlayer(id: string) {
    setState((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== id),
      assignments: prev.assignments.map((a) => ({
        ...a,
        teamAPlayerIds: a.teamAPlayerIds.filter((x) => x !== id),
        teamBPlayerIds: a.teamBPlayerIds.filter((x) => x !== id),
      })),
    }));
  }

  function updateAssignment(courtId: number, patch: Partial<CourtAssignment>) {
    setState((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) =>
        a.courtId === courtId ? { ...a, ...patch } : a
      ),
    }));
  }

  // 你可以決定：單打=1人 / 雙打=2人；這裡先做「最多 2 人」(可兼容單打/雙打)
  const maxPerTeam = 2;

  function clickPick(courtId: number, side: "A" | "B", playerId: string) {
    const a = state.assignments.find((x) => x.courtId === courtId)!;

    const otherSideIds = side === "A" ? a.teamBPlayerIds : a.teamAPlayerIds;
    // 同一個人不能同時在 A/B
    if (otherSideIds.includes(playerId)) return;

    const key = side === "A" ? "teamAPlayerIds" : "teamBPlayerIds";
    const list = side === "A" ? a.teamAPlayerIds : a.teamBPlayerIds;

    updateAssignment(courtId, { [key]: toggleId(list, playerId, maxPerTeam) } as any);
  }

  function confirmOnCourt() {
    const now = new Date().toISOString();

    // 被安排上場的人（去重）
    const onCourtIds = new Set<string>();
    for (const a of state.assignments) {
      for (const id of a.teamAPlayerIds) onCourtIds.add(id);
      for (const id of a.teamBPlayerIds) onCourtIds.add(id);
    }

    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) => {
        if (!onCourtIds.has(p.id)) return p;

        // 每次「確認上場」就算一次上場（你也可以改成：每結束一場才+1）
        const entries: Player["history"] = [];

        for (const asg of prev.assignments) {
          if (asg.teamAPlayerIds.includes(p.id)) {
            entries.push({ at: now, courtId: asg.courtId, role: "A" });
          }
          if (asg.teamBPlayerIds.includes(p.id)) {
            entries.push({ at: now, courtId: asg.courtId, role: "B" });
          }
        }

        return {
          ...p,
          playedCount: p.playedCount + 1,
          history: [...entries, ...p.history],
        };
      }),
    }));
  }

  function clearAllAssignments() {
    setState((prev) => ({
      ...prev,
      assignments: defaultAssignments(),
    }));
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">排場（上下場 / 場次紀錄）</h1>
          <p className="text-sm text-slate-600">
            {/*  先用 localStorage 暫存。未來接 API 可以把 players/assignments 改成從後端讀寫。*/}
           
          </p>
        </div>

        {/* Top actions */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button onClick={confirmOnCourt}>確認上場（+1 場次）</Button>
          <Button onClick={clearAllAssignments} variant="outline">清空四面場</Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Players */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">玩家名單</h2>
                <p className="mt-1 text-xs text-slate-500">點選玩家後，可到右側場地加入 A/B。</p>
              </div>
              <Pill>{state.players.length} 人</Pill>
            </div>

            <div className="mt-4 flex gap-2">
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="輸入玩家名稱"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addPlayer();
                }}
              />
              <Button onClick={addPlayer} disabled={!newName.trim()}>
                新增
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {state.players.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  先新增玩家，才能開始排場。
                </div>
              ) : (
                state.players
                  .slice()
                  .sort((a, b) => a.playedCount - b.playedCount) // 先讓場次少的排前面（方便輪替）
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900">{p.name}</div>
                        <div className="mt-1 text-xs text-slate-500">上場：{p.playedCount} 次</div>
                      </div>
                      <Button onClick={() => removePlayer(p.id)} variant="outline">
                        刪除
                      </Button>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Courts */}
          <div className="lg:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            {state.assignments.map((asg) => {
              const teamA = asg.teamAPlayerIds.map((id) => playersById.get(id)?.name ?? "？");
              const teamB = asg.teamBPlayerIds.map((id) => playersById.get(id)?.name ?? "？");

              return (
                <div key={asg.courtId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">Court {asg.courtId}</h3>
                      <p className="mt-1 text-xs text-slate-500">每隊最多 {maxPerTeam} 人（可單可雙）</p>
                    </div>
                    <Pill>{asg.teamAPlayerIds.length + asg.teamBPlayerIds.length} 人上場</Pill>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-900">A隊</p>
                        <Pill>{asg.teamAPlayerIds.length}/{maxPerTeam}</Pill>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">
                        {teamA.length ? teamA.join("、") : "尚未選擇"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-900">B隊</p>
                        <Pill>{asg.teamBPlayerIds.length}/{maxPerTeam}</Pill>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">
                        {teamB.length ? teamB.join("、") : "尚未選擇"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-600">點選玩家加入（同一人不可同時在 A/B）</p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {state.players.length === 0 ? (
                        <span className="text-sm text-slate-500">先新增玩家</span>
                      ) : (
                        state.players.map((p) => {
                          const inA = asg.teamAPlayerIds.includes(p.id);
                          const inB = asg.teamBPlayerIds.includes(p.id);
                          const active = inA || inB;

                          return (
                            <button
                              key={p.id}
                              type="button"
                              className={[
                                "rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition",
                                active
                                  ? inA
                                    ? "bg-blue-100 text-blue-700 ring-blue-200"
                                    : "bg-red-100 text-red-700 ring-red-200"
                                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                              ].join(" ")}
                              onClick={() => {
                                // 預設：先嘗試加 A，A滿了就加 B（你也可以改成按住Shift加入B）
                                const canAddA = !inB && (inA || asg.teamAPlayerIds.length < maxPerTeam);
                                if (canAddA) clickPick(asg.courtId, "A", p.id);
                                else clickPick(asg.courtId, "B", p.id);
                              }}
                              title="點一下加入/移除（預設先 A 再 B）"
                            >
                              {p.name}
                            </button>
                          );
                        })
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => updateAssignment(asg.courtId, { teamAPlayerIds: [] })}
                      >
                        清 A
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => updateAssignment(asg.courtId, { teamBPlayerIds: [] })}
                      >
                        清 B
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => updateAssignment(asg.courtId, { teamAPlayerIds: [], teamBPlayerIds: [] })}
                      >
                        清本場
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="mt-8 text-center text-xs text-slate-400">
          {/* v0：排場（localStorage）｜下一步：把排好的隊名自動帶入計分版 + 每場結束後自動換人*/}
         
        </footer>
      </div>
    </div>
  );
}
