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

function clampMin0(n: number) {
  return n < 0 ? 0 : n;
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

  // 先做「最多 2 人」（可單可雙）
  const maxPerTeam = 2;

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

  function clickPick(courtId: number, side: "A" | "B", playerId: string) {
    const a = state.assignments.find((x) => x.courtId === courtId)!;

    const otherSideIds = side === "A" ? a.teamBPlayerIds : a.teamAPlayerIds;
    // 同一個人不能同時在 A/B
    if (otherSideIds.includes(playerId)) return;

    const key = side === "A" ? "teamAPlayerIds" : "teamBPlayerIds";
    const list = side === "A" ? a.teamAPlayerIds : a.teamBPlayerIds;

    updateAssignment(courtId, { [key]: toggleId(list, playerId, maxPerTeam) } as any);
  }

  // ✅ 這個就是你要的：把「目前四面場上場的人」一次 +1，並寫入歷史
  function recordThisRound() {
    const now = new Date().toISOString();

    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) => {
        // 找這個人是否在任何一面場上
        const entries: Player["history"] = [];

        for (const asg of prev.assignments) {
          if (asg.teamAPlayerIds.includes(p.id)) entries.push({ at: now, courtId: asg.courtId, role: "A" });
          if (asg.teamBPlayerIds.includes(p.id)) entries.push({ at: now, courtId: asg.courtId, role: "B" });
        }

        if (entries.length === 0) return p;

        return {
          ...p,
          playedCount: p.playedCount + 1,
          history: [...entries, ...p.history],
        };
      }),
    }));
  }

  function adjustPlayerCount(id: string, delta: number) {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === id ? { ...p, playedCount: clampMin0(p.playedCount + delta) } : p
      ),
    }));
  }

  function resetPlayerCount(id: string) {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === id ? { ...p, playedCount: 0 } : p
      ),
    }));
  }

  function clearAllAssignments() {
    setState((prev) => ({
      ...prev,
      assignments: defaultAssignments(),
    }));
  }

  function clearAllData() {
    setState({ players: [], assignments: defaultAssignments() });
  }

  const totalOnCourt = useMemo(() => {
    let n = 0;
    for (const a of state.assignments) n += a.teamAPlayerIds.length + a.teamBPlayerIds.length;
    return n;
  }, [state.assignments]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">排場（打球次數紀錄）</h1>
          <p className="text-sm text-slate-600">
            獨立功能：排上場名單 → 按「記錄本輪」→ 上場的人次數 +1（localStorage 會保存）。
          </p>
        </div>

        {/* Top actions */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button onClick={recordThisRound} disabled={totalOnCourt === 0}>記錄本輪（上場者 +1）</Button>
          <Button onClick={clearAllAssignments} variant="outline">清空四面場</Button>
          <Button onClick={clearAllData} variant="danger">全部清除（含名單）</Button>
          <Pill>目前上場：{totalOnCourt} 人</Pill>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Players */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">玩家名單</h2>
                <p className="mt-1 text-xs text-slate-500">場次少的會排在前面，方便輪替。</p>
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
                  .sort((a, b) => a.playedCount - b.playedCount)
                  .map((p) => (
                    <div key={p.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-slate-900">{p.name}</div>
                          <div className="mt-1 text-xs text-slate-500">打球次數：{p.playedCount}</div>
                        </div>
                        <Button onClick={() => removePlayer(p.id)} variant="outline">
                          刪除
                        </Button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button onClick={() => adjustPlayerCount(p.id, +1)} variant="outline">+1</Button>
                        <Button onClick={() => adjustPlayerCount(p.id, -1)} variant="outline" disabled={p.playedCount === 0}>-1</Button>
                        <Button onClick={() => resetPlayerCount(p.id)} variant="outline">歸零</Button>
                        <Pill>歷史：{p.history.length} 筆</Pill>
                      </div>

                      {p.history.length > 0 && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-3">
                          <div className="text-xs font-semibold text-slate-600">最近 3 筆</div>
                          <ul className="mt-2 space-y-1 text-xs text-slate-600">
                            {p.history.slice(0, 3).map((h, idx) => (
                              <li key={idx} className="flex items-center justify-between">
                                <span>
                                  Court {h.courtId} / {h.role}隊
                                </span>
                                <span className="text-slate-500">
                                  {new Date(h.at).toLocaleString()}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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
                    <Pill>{asg.teamAPlayerIds.length + asg.teamBPlayerIds.length} 人</Pill>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-900">A隊</p>
                        <Pill>{asg.teamAPlayerIds.length}/{maxPerTeam}</Pill>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{teamA.length ? teamA.join("、") : "尚未選擇"}</p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-900">B隊</p>
                        <Pill>{asg.teamBPlayerIds.length}/{maxPerTeam}</Pill>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{teamB.length ? teamB.join("、") : "尚未選擇"}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-600">點選玩家加入/移除（同一人不可同時在 A/B）</p>

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
                                // 預設：先加 A；A 滿了再加 B（你也可以改 UI 做兩個區塊按鈕更直覺）
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
                      <Button variant="outline" onClick={() => updateAssignment(asg.courtId, { teamAPlayerIds: [] })}>
                        清 A
                      </Button>
                      <Button variant="outline" onClick={() => updateAssignment(asg.courtId, { teamBPlayerIds: [] })}>
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
          v0：排場 + 次數紀錄（localStorage）｜下一步可加：自動輪替建議、匯出/匯入、分組固定搭檔
        </footer>
      </div>
    </div>
  );
}
