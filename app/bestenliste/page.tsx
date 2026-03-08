"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LeaderboardEntry, OpMode } from "@/lib/types";
import Link from "next/link";

const RANGES = [10, 20, 30];
const OP_MODES: { value: OpMode; label: string }[] = [
  { value: "plus", label: "Nur +" },
  { value: "plus-minus", label: "+ und −" },
];

function formatInterval(interval: string): string {
  // PostgreSQL interval like "00:00:12.345" → "12,3s"
  const match = interval.match(/(\d+):(\d+):(\d+)\.?(\d*)/);
  if (!match) return interval;
  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseInt(match[3]);
  const frac = match[4] ? match[4].slice(0, 1) : "0";
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return `${totalSeconds},${frac}s`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${time} Uhr`;
}

function BestenlisteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialRange = Number(searchParams.get("range")) || 10;
  const initialOp = (searchParams.get("op") as OpMode) || "plus";

  const [range, setRange] = useState(
    RANGES.includes(initialRange) ? initialRange : 10
  );
  const [opMode, setOpMode] = useState<OpMode>(
    OP_MODES.some((m) => m.value === initialOp) ? initialOp : "plus"
  );
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  function updateFilter(newRange: number, newOp: OpMode) {
    setRange(newRange);
    setOpMode(newOp);
    router.replace(`/bestenliste?range=${newRange}&op=${newOp}`, {
      scroll: false,
    });
  }

  useEffect(() => {
    loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, opMode]);

  async function loadLeaderboard() {
    const { data } = await supabase
      .from("leaderboard")
      .select("*")
      .eq("number_range", range)
      .eq("op_mode", opMode)
      .order("best_time", { ascending: true })
      .limit(20);
    if (data) setEntries(data as LeaderboardEntry[]);
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-8">
      <h1 className="text-3xl font-bold">Bestenliste</h1>

      <div className="flex gap-2">
        {OP_MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => updateFilter(range, m.value)}
            className={`px-4 py-2 text-lg font-bold rounded-xl ${
              opMode === m.value
                ? "bg-yellow-400"
                : "bg-gray-100 active:bg-gray-200"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => updateFilter(r, opMode)}
            className={`px-4 py-2 text-lg font-bold rounded-xl ${
              range === r
                ? "bg-yellow-400"
                : "bg-gray-100 active:bg-gray-200"
            }`}
          >
            bis {r}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500">Nur perfekte Runden (10 von 10 richtig)</p>

      {entries.length === 0 ? (
        <p className="text-xl text-gray-400 mt-8">Noch keine Einträge!</p>
      ) : (
        <div className="w-full space-y-2">
          {entries.map((entry, i) => (
            <div
              key={entry.player_id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-xl ${
                i === 0
                  ? "bg-yellow-200"
                  : i === 1
                    ? "bg-gray-200"
                    : i === 2
                      ? "bg-orange-200"
                      : "bg-white"
              }`}
            >
              <span className="font-bold w-8">{i + 1}.</span>
              <span className="flex-1">
                {entry.name}
              </span>
              <span className="text-sm text-gray-500 mr-3">
                {formatDate(entry.best_date)}
              </span>
              <span className="font-mono font-bold">
                {formatInterval(entry.best_time)}
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

export default function BestenlistePage() {
  return (
    <Suspense>
      <BestenlisteContent />
    </Suspense>
  );
}
