import Link from "next/link";

function Card({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-600">{desc}</p>
        </div>
        <span className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition group-hover:bg-slate-800">
          進入
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            羽球場館小工具
          </h1>
          <p className="text-slate-600">
                {/*  先做前端版（無資料庫），之後可接 ASP.NET Core API 做儲存/同步。 */}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card
            title="計分版（4 面場地）"
            desc="同時顯示 4 面場地記分，支援 BO3/BO5、本局結束判定與局數紀錄。"
            href="/scoreboard"
          />
          <Card
            title="排場（上下場 / 場次紀錄）"
            desc="管理玩家名單、安排上場與下場，並記錄每位玩家上場場次與歷史。"
            href="/scheduler"
          />
        </div>
   
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">       
          {/* 建議流程：先在「排場」把 4 面場的出賽人員排好，再到「計分版」開始記分。 */}
        </div>
        
      </div>
    </div>
  );
}
