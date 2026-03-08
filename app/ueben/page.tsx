"use client";

import { useState, useCallback } from "react";
import { usePlayer } from "@/components/player-provider";
import { generateCalculations } from "@/lib/math";
import { CalculationWithInput, OpMode } from "@/lib/types";
import { CalculationCard } from "@/components/calculation-card";
import { ResultScreen } from "@/components/result-screen";
import { Timer } from "@/components/timer";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Phase = "pick-ops" | "pick-range" | "solving" | "done";

const RANGES = [10, 20, 30];
const COUNT = 10;

export default function UebenPage() {
  const { player } = usePlayer();
  const [phase, setPhase] = useState<Phase>("pick-ops");
  const [opMode, setOpMode] = useState<OpMode>("plus");
  const [calculations, setCalculations] = useState<CalculationWithInput[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [numberRange, setNumberRange] = useState(10);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);

  function pickOps(mode: OpMode) {
    setOpMode(mode);
    setPhase("pick-range");
  }

  function startRound(range: number) {
    const calcs = generateCalculations(range, COUNT, opMode);
    setCalculations(calcs.map((c) => ({ ...c })));
    setCurrentIndex(0);
    setNumberRange(range);
    setLeaderboardRank(null);
    setStartedAt(new Date());
    setPhase("solving");
  }

  const handleElapsed = useCallback((ms: number) => {
    setElapsedMs(ms);
  }, []);

  async function handleAnswer(answer: number) {
    const updated = [...calculations];
    updated[currentIndex] = { ...updated[currentIndex], playerAnswer: answer };
    setCalculations(updated);

    if (currentIndex + 1 < COUNT) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setPhase("done");
      const finishedAt = new Date();
      setElapsedMs(finishedAt.getTime() - startedAt!.getTime());

      const correctCount = updated.filter(
        (c) => c.playerAnswer === c.answer
      ).length;

      if (player) {
        await supabase.from("rounds").insert({
          player_id: player.id,
          number_range: numberRange,
          op_mode: opMode,
          started_at: startedAt!.toISOString(),
          finished_at: finishedAt.toISOString(),
          correct_count: correctCount,
          calculations: updated,
        });

        // Check leaderboard position if perfect round
        if (correctCount === COUNT) {
          const { data: board } = await supabase
            .from("leaderboard")
            .select("player_id, best_time")
            .eq("number_range", numberRange)
            .eq("op_mode", opMode)
            .order("best_time", { ascending: true });
          if (board) {
            const rank = board.findIndex((e) => e.player_id === player.id);
            if (rank !== -1) setLeaderboardRank(rank + 1);
          }
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

  if (phase === "pick-ops") {
    return (
      <div className="flex flex-col items-center gap-6 pt-8">
        <h1 className="text-3xl font-bold">Rechenart wählen</h1>
        <div className="w-full space-y-4">
          <button
            onClick={() => pickOps("plus")}
            className="block w-full py-5 text-2xl font-bold text-center bg-green-400 rounded-xl active:bg-green-500"
          >
            Nur Plus (+)
          </button>
          <button
            onClick={() => pickOps("plus-minus")}
            className="block w-full py-5 text-2xl font-bold text-center bg-purple-400 text-white rounded-xl active:bg-purple-500"
          >
            Plus und Minus (+ −)
          </button>
        </div>
        <Link href="/" className="mt-4 text-gray-500 underline">
          Zurück
        </Link>
      </div>
    );
  }

  if (phase === "pick-range") {
    return (
      <div className="flex flex-col items-center gap-6 pt-8">
        <h1 className="text-3xl font-bold">Zahlenraum wählen</h1>
        <div className="w-full space-y-4">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => startRound(r)}
              className="block w-full py-5 text-2xl font-bold text-center bg-sky-400 text-white rounded-xl active:bg-sky-500"
            >
              bis {r}
            </button>
          ))}
        </div>
        <button
          onClick={() => setPhase("pick-ops")}
          className="mt-4 text-gray-500 underline"
        >
          Zurück
        </button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="pt-8">
        <ResultScreen calculations={calculations} elapsedMs={elapsedMs} leaderboardRank={leaderboardRank} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-4">
      <Timer running={phase === "solving"} onElapsed={handleElapsed} />
      <CalculationCard
        key={currentIndex}
        calculation={calculations[currentIndex]}
        index={currentIndex}
        total={COUNT}
        onAnswer={handleAnswer}
      />
    </div>
  );
}
