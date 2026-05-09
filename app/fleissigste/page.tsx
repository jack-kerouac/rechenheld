"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PracticeLeaderboardEntry, Stufe, STUFE_LABELS } from "@/lib/types";
import Link from "next/link";

const STUFEN: Stufe[] = [1, 2, 3];

function getWeekRange(): string {
  const now = new Date();
  const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - daysFromMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const endStr = `${end.getDate()}. ${end.toLocaleDateString("de-DE", { month: "long" })}`;
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}. – ${endStr}`;
  }
  return `${start.getDate()}. ${start.toLocaleDateString("de-DE", { month: "long" })} – ${endStr}`;
}

function FleissigsteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialStufe = Number(searchParams.get("stufe")) as Stufe;
  const [stufe, setStufe] = useState<Stufe>(
    STUFEN.includes(initialStufe) ? initialStufe : 1
  );
  const [entries, setEntries] = useState<PracticeLeaderboardEntry[]>([]);

  function updateFilter(newStufe: Stufe) {
    setStufe(newStufe);
    router.replace(`/fleissigste?stufe=${newStufe}`, { scroll: false });
  }

  useEffect(() => {
    loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stufe]);

  async function loadLeaderboard() {
    const { data } = await supabase
      .from("practice_leaderboard")
      .select("*")
      .eq("stufe", stufe)
      .order("rounds_count", { ascending: false })
      .limit(20);
    if (data) setEntries(data as PracticeLeaderboardEntry[]);
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-8">
      <h1 className="text-3xl font-bold">Fleißigste Helden</h1>
      <p className="text-lg font-semibold text-blue-600">Diese Woche ({getWeekRange()})</p>

      <div className="flex flex-col w-full gap-2">
        {STUFEN.map((s) => (
          <button
            key={s}
            onClick={() => updateFilter(s)}
            className={`w-full px-4 py-2 text-lg font-bold rounded-xl ${
              stufe === s
                ? "bg-yellow-400"
                : "bg-gray-100 active:bg-gray-200"
            }`}
          >
            Stufe {s}: {STUFE_LABELS[s]}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500">Runden mit mindestens 6 von 10 richtig</p>

      {entries.length === 0 ? (
        <p className="text-xl text-gray-400 mt-8">Diese Woche noch keine Einträge!</p>
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
              <span className="font-bold shrink-0 whitespace-nowrap">
                {entry.rounds_count} Runden
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

export default function FleissigstePage() {
  return (
    <Suspense>
      <FleissigsteContent />
    </Suspense>
  );
}
