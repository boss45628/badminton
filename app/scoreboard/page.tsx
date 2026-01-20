"use client";

import { useMemo, useState } from "react";

type BestOf = 3 | 5;
type Side = "A" | "B";
type GameWinner = Side | null;

type CourtState = {
  id: number;
  bestOf: BestOf;

  teamA: string;
  teamB: string;

  scoreA: number;
  scoreB: number;

  games: Side[]; // 每局勝者紀錄，例如 ["A","B","A"]
};

function getGameWinner(scoreA: number, scoreB: number): GameWinner {
  // 羽球單局規則：先到 21 且領先 2；20:20 後需領先 2；最高 30 直接決勝
  if (scoreA >= 30 && scoreA > scoreB) return "A";
  if (scoreB >= 30 && scoreB > scoreA) return "B";

  const maxScore = Math.max(scoreA, scoreB);
  const diff = Math.abs(scoreA - scoreB);

  if (maxScore < 21) return null;
  if (diff < 2) return null;

  return scoreA > scoreB ? "A" : "B";
}

function clampMin0(n: number) {
  return n < 0 ? 0 : n;
}

function createCourt(id: number): CourtState {
  return {
    id,
    bestOf: 3,
    teamA: `A隊`,
    teamB: `B隊`,
    scoreA: 0,
    scoreB: 0,
    games: [],
  };
}

function countWins(games: Side[], side: Side) {
  let c = 0;
  for (const g of games) if (g === side) c++;
  return c;
}

function isMatchFinished(games: Side[], bestOf: BestOf) {
  const need = Math.ceil(bestOf / 2);
  return countWins(games, "A") >= need || countWins(games, "B") >= need;
}

function Pill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "red" | "amber" | "blue";
}) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    green: "bg-green-100 text-green-700 ring-green-200",
    red: "bg-red-100 text-red-700 ring-red-200",
    amber: "bg-amber-100 text-amber-700 ring-amber-200",
    blue: "bg-blue-100 text-blue-700 ring-blue-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${map[tone]}`}>
      {children}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  variant = "solid",
  disabled,
}: {
  label: string;
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
    <button className={`${base} ${styles}`} onClick={onClick} disabled={disabled} type="button">
      {label}
    </button>
  );
}

function CourtCard({
  court,
  onChange,
}: {
  court: CourtState;
  onChange: (next: CourtState) => void;
}) {
  const gameWinner = useMemo(() => getGameWinner(court.scoreA, court.scoreB), [court.scoreA, court.scoreB]);

  const winsA = useMemo(() => countWins(court.games, "A"), [court.games]);
  const winsB = useMemo(() => countWins(court.games, "B"), [court.games]);

  const need = Math.ceil(court.bestOf / 2);
  const matchFinished = useMemo(() => isMatchFinished(court.games, court.bestOf), [court.games, court.bestOf]);

  const status = useMemo(() => {
    if (matchFinished) return { text: "比賽結束", tone: "green" as const };
    if (gameWinner) return { text: `本局可結束：${gameWinner === "A" ? "A隊領先" : "B隊領先"}`, tone: "amber" as const };
    return { text: "進行中", tone: "slate" as const };
  }, [matchFinished, gameWinner]);

  const canEndGame = !!gameWinner && !matchFinished;

  function setScore(side: Side, delta: number) {
    if (matchFinished) return;
    if (side === "A") onChange({ ...court, scoreA: clampMin0(court.scoreA + delta) });
    else onChange({ ...court, scoreB: clampMin0(court.scoreB + delta) });
  }

  function endGame() {
    if (!gameWinner) return;
    if (matchFinished) return;

    const nextGames = [...court.games, gameWinner];
    onChange({
      ...court,
      games: nextGames,
      scoreA: 0,
      scoreB: 0,
    });
  }

  function resetMatch() {
    onChange({ ...court, scoreA: 0, scoreB: 0, games: [] });
  }

  function resetGameOnly() {
    if (matchFinished) return;
    onChange({ ...court, scoreA: 0, scoreB: 0 });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Court {court.id}</h3>
            <Pill tone={status.tone}>{status.text}</Pill>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Best of {court.bestOf}（先拿 {need} 局）
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
            value={court.bestOf}
            onChange={(e) => onChange({ ...court, bestOf: Number(e.target.value) as BestOf, scoreA: 0, scoreB: 0, games: [] })}
            title="Best of"
          >
            <option value={3}>BO3</option>
            <option value={5}>BO5</option>
          </select>

          <IconButton label="重置" variant="outline" onClick={resetMatch} />
        </div>
      </div>

      {/* Team names */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-600">A隊名稱</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={court.teamA}
            onChange={(e) => onChange({ ...court, teamA: e.target.value })}
            placeholder="例如：紅隊"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">B隊名稱</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={court.teamB}
            onChange={(e) => onChange({ ...court, teamB: e.target.value })}
            placeholder="例如：藍隊"
          />
        </div>
      </div>

      {/* Scoreboard */}
      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* A */}
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{court.teamA || "A隊"}</p>
                <p className="text-xs text-slate-500">局數：{winsA}</p>
              </div>
              <div className="text-5xl font-extrabold tabular-nums text-slate-900">{court.scoreA}</div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <IconButton label="+1" onClick={() => setScore("A", +1)} disabled={matchFinished} />
              <IconButton label="-1" variant="outline" onClick={() => setScore("A", -1)} disabled={matchFinished || court.scoreA === 0} />
            </div>
          </div>

          {/* B */}
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{court.teamB || "B隊"}</p>
                <p className="text-xs text-slate-500">局數：{winsB}</p>
              </div>
              <div className="text-5xl font-extrabold tabular-nums text-slate-900">{court.scoreB}</div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <IconButton label="+1" onClick={() => setScore("B", +1)} disabled={matchFinished} />
              <IconButton label="-1" variant="outline" onClick={() => setScore("B", -1)} disabled={matchFinished || court.scoreB === 0} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <IconButton label="本局歸零" variant="outline" onClick={resetGameOnly} disabled={matchFinished && (court.scoreA === 0 && court.scoreB === 0)} />
            <IconButton label="結束本局" onClick={endGame} disabled={!canEndGame} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {matchFinished ? (
              <Pill tone="green">
                勝者：{winsA > winsB ? (court.teamA || "A隊") : (court.teamB || "B隊")}
              </Pill>
            ) : gameWinner ? (
              <Pill tone={gameWinner === "A" ? "blue" : "red"}>
                本局領先：{gameWinner === "A" ? (court.teamA || "A隊") : (court.teamB || "B隊")}
              </Pill>
            ) : (
              <Pill tone="slate">尚未達成結束條件</Pill>
            )}
          </div>
        </div>
      </div>

      {/* Games history */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-600">每局結果</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {court.games.length === 0 ? (
            <span className="text-sm text-slate-500">尚無</span>
          ) : (
            court.games.map((g, idx) => (
              <Pill key={idx} tone={g === "A" ? "blue" : "red"}>
                第 {idx + 1} 局：{g === "A" ? (court.teamA || "A隊") : (court.teamB || "B隊")}
              </Pill>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function BadmintonMultiCourtPage() {
  const [courts, setCourts] = useState<CourtState[]>([createCourt(1), createCourt(2), createCourt(3), createCourt(4)]);

  function updateCourt(id: number, next: CourtState) {
    setCourts((prev) => prev.map((c) => (c.id === id ? next : c)));
  }

  function resetAll() {
    setCourts([createCourt(1), createCourt(2), createCourt(3), createCourt(4)]);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Top bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">羽球計分板（多場地）</h1>
            <p className="mt-1 text-sm text-slate-600">
              {/* 先做純前端記分，未來接 ASP.NET Core API 再把資料存起來。*/}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <IconButton label="全部重置" variant="danger" onClick={resetAll} />
          </div>
        </div>

        {/* Grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {courts.map((c) => (
            <CourtCard key={c.id} court={c} onChange={(next) => updateCourt(c.id, next)} />
          ))}
        </div>

        <footer className="mt-8 text-center text-xs text-slate-400">
          {/*v0：本地 state 記分｜下一步可加：發球權、換邊、每球紀錄、房間同步、API 儲存*/}
        </footer>
      </div>
    </div>
  );
}
