"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LeaderboardEntry, Stufe } from "@/lib/types";
import Link from "next/link";

const STUFEN: Stufe[] = [1, 2, 3];

function formatInterval(interval: string): { short: string; long: string } {
  const match = interval.match(/(\d+):(\d+):(\d+)\.?(\d*)/);
  if (!match) return { short: interval, long: interval };
  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseInt(match[3]);
  const frac = match[4] ? match[4].slice(0, 1) : "0";
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return { short: `${totalSeconds},${frac} s`, long: `${totalSeconds},${frac} Sekunden` };
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const weekday = d.toLocaleDateString("de-DE", { weekday: "short" });
  const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${weekday} ${time}`;
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr);
  const weekday = d.toLocaleDateString("de-DE", { weekday: "long" });
  const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${weekday}, ${time} Uhr`;
}

function getWeekRange(offsetWeeks: number): string {
  const now = new Date();
  const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - daysFromMonday + offsetWeeks * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const endStr = `${end.getDate()}. ${end.toLocaleDateString("de-DE", { month: "long" })}`;
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}. – ${endStr}`;
  }
  return `${start.getDate()}. ${start.toLocaleDateString("de-DE", { month: "long" })} – ${endStr}`;
}

function SchnellsteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialStufe = Number(searchParams.get("stufe")) as Stufe;
  const [stufe, setStufe] = useState<Stufe>(
    STUFEN.includes(initialStufe) ? initialStufe : 1
  );
  const [prevWeek, setPrevWeek] = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  function updateFilter(newStufe: Stufe) {
    setStufe(newStufe);
    router.replace(`/schnellste?stufe=${newStufe}`, { scroll: false });
  }

  useEffect(() => {
    loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stufe, prevWeek]);

  async function loadLeaderboard() {
    const view = prevWeek ? "speed_leaderboard_prev_week" : "speed_leaderboard";
    const { data } = await supabase
      .from(view)
      .select("*")
      .eq("stufe", stufe)
      .order("best_time", { ascending: true })
      .limit(20);
    if (data) setEntries(data as LeaderboardEntry[]);
  }

  const weekLabel = prevWeek ? `Letzte Woche (${getWeekRange(-1)})` : `Diese Woche (${getWeekRange(0)})`;

  return (
    <div className="flex flex-col items-center gap-6 pt-8">
      <h1 className="text-3xl font-bold">Schnellste Helden</h1>

      <div className="flex w-full gap-2">
        <button
          onClick={() => setPrevWeek(false)}
          className={`flex-1 px-3 py-2 font-bold rounded-xl ${
            !prevWeek ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 active:bg-gray-200"
          }`}
        >
          Diese Woche
        </button>
        <button
          onClick={() => setPrevWeek(true)}
          className={`flex-1 px-3 py-2 font-bold rounded-xl ${
            prevWeek ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 active:bg-gray-200"
          }`}
        >
          Letzte Woche
        </button>
      </div>

      <p className="text-lg font-semibold text-blue-600">{weekLabel}</p>

      <div className="flex w-full gap-2">
        {STUFEN.map((s) => (
          <button
            key={s}
            onClick={() => updateFilter(s)}
            className={`flex-1 flex flex-col items-center gap-2 px-3 py-3 font-bold rounded-xl ${
              stufe === s
                ? "bg-yellow-400"
                : "bg-gray-100 active:bg-gray-200"
            }`}
          >
            <div className="flex gap-1">
              {[1, 2, 3].map((dot) => (
                <div
                  key={dot}
                  className={`w-2 h-2 rounded-full ${
                    dot <= s
                      ? stufe === s ? "bg-white/80" : "bg-amber-500"
                      : stufe === s ? "bg-white/30" : "bg-amber-200"
                  }`}
                />
              ))}
            </div>
            <span>Stufe {s}</span>
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500">Nur perfekte Runden (10 von 10 richtig)</p>

      {entries.length === 0 ? (
        <p className="text-xl text-gray-400 mt-8">{prevWeek ? "Letzte Woche keine Einträge!" : "Diese Woche noch keine Einträge!"}</p>
      ) : (
        <div className="w-full space-y-2">
          {entries.map((entry, i) => (
            <div
              key={entry.player_id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xl ${
                i === 0
                  ? "bg-yellow-200"
                  : i === 1
                    ? "bg-gray-200"
                    : i === 2
                      ? "bg-orange-200"
                      : "bg-white"
              }`}
            >
              <span className="font-bold w-8 shrink-0">{i + 1}.</span>
              <span className="flex-1 min-w-0 truncate">
                {entry.name}
              </span>
              <span className="text-sm text-gray-500 shrink-0 whitespace-nowrap">
                <span className="sm:hidden">{formatDateShort(entry.best_date)}</span>
                <span className="hidden sm:inline">{formatDateLong(entry.best_date)}</span>
              </span>
              <span className="font-mono font-bold shrink-0 whitespace-nowrap">
                <span className="sm:hidden">{formatInterval(entry.best_time).short}</span>
                <span className="hidden sm:inline">{formatInterval(entry.best_time).long}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <Link href="/" className="mt-4 px-6 py-3 text-xl font-bold bg-gray-200 text-gray-500 rounded-xl active:bg-gray-300">
        Zurück
      </Link>
    </div>
  );
}

export default function SchnellstePage() {
  return (
    <Suspense>
      <SchnellsteContent />
    </Suspense>
  );
}
