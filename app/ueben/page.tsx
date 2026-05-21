"use client";

import { useState } from "react";
import { usePlayer } from "@/components/player-provider";
import { generateCalculations } from "@/lib/math";
import { CalculationWithInput, Stufe } from "@/lib/types";
import { CalculationCard } from "@/components/calculation-card";
import { Timer } from "@/components/timer";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Phase = "setup" | "solving" | "submitting";

const STUFEN: Stufe[] = [1, 2, 3];
const COUNT = 10;

const STUFE_SUBTITLES: Record<Stufe, string> = {
  1: "Plus bis 10",
  2: "Plus & Minus bis 10",
  3: "Plus & Minus bis 20",
};

export default function UebenPage() {
  const { player } = usePlayer();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("setup");
  const [stufe, setStufe] = useState<Stufe | null>(null);
  const [calculations, setCalculations] = useState<CalculationWithInput[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  function startRound() {
    if (!stufe) return;
    const calcs = generateCalculations(stufe, COUNT);
    setCalculations(calcs.map((c) => ({ ...c })));
    setCurrentIndex(0);
    setStartedAt(new Date());
    setPhase("solving");
  }

  async function handleAnswer(answer: number) {
    const updated = [...calculations];
    updated[currentIndex] = { ...updated[currentIndex], playerAnswer: answer };
    setCalculations(updated);

    if (currentIndex + 1 < COUNT) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setPhase("submitting");
      const finishedAt = new Date();

      const correctCount = updated.filter(
        (c) => c.playerAnswer === c.answer
      ).length;

      if (player) {
        const { data } = await supabase.from("rounds").insert({
          player_id: player.id,
          stufe,
          started_at: startedAt!.toISOString(),
          finished_at: finishedAt.toISOString(),
          correct_count: correctCount,
          calculations: updated,
        }).select("id").single();

        if (data) {
          router.push(`/ueben/${data.id}`);
          return;
        }
      }
    }
  }

  if (!player) {
    return (
      <div className="text-center pt-12">
        <p className="text-xl mb-4">Bitte melde dich zuerst an!</p>
        <Link href="/" className="text-blue-500 underline text-xl">
          Zur Startseite
        </Link>
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <div className="flex flex-col items-center gap-6 pt-8">
        <h1 className="text-3xl font-bold">Üben</h1>
        <div className="w-full space-y-4 p-4 bg-amber-50 rounded-xl">
          <h2 className="text-xl font-bold">Stufe wählen:</h2>
          <div className="flex flex-col gap-2">
            {STUFEN.map((s) => (
              <button
                key={s}
                onClick={() => setStufe(s)}
                className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 ${
                  stufe === s
                    ? "bg-amber-500 text-white"
                    : "bg-white active:bg-gray-100"
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
                <div className="flex flex-col items-start">
                  <span className="text-xl font-bold">Stufe {s}</span>
                  <span className={`text-sm ${stufe === s ? "text-white/80" : "text-gray-500"}`}>
                    {STUFE_SUBTITLES[s]}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {stufe && (
            <>
              <p className="text-sm text-gray-500 text-center">💡 10 von 10 richtig? Deine Zeit kommt in die Bestenliste!</p>
              <button
                onClick={startRound}
                className="w-full py-4 text-xl font-bold bg-green-500 text-white rounded-xl active:bg-green-600"
              >
                ✏️ Los geht&apos;s!
              </button>
            </>
          )}
        </div>
        <Link href="/" className="mt-4 px-6 py-3 text-xl font-bold bg-gray-200 text-gray-500 rounded-xl active:bg-gray-300">
          Zurück
        </Link>
      </div>
    );
  }

  if (phase === "submitting") {
    return (
      <div className="flex flex-col items-center gap-4 pt-12 text-center">
        <div className="animate-pulse text-5xl">⏳</div>
        <p className="text-xl text-gray-500">Einen Moment...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 pt-4">
      <div className="flex w-full items-center justify-between px-2">
        <span className="text-lg text-gray-500">Aufgabe {currentIndex + 1} von {COUNT}</span>
        <Timer running={phase === "solving"} />
      </div>
      <CalculationCard
        key={currentIndex}
        calculation={calculations[currentIndex]}
        stufe={stufe!}
        onAnswer={handleAnswer}
        onBack={currentIndex > 0 ? () => setCurrentIndex(currentIndex - 1) : null}
        onCancel={() => setPhase("setup")}
      />
    </div>
  );
}
