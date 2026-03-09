"use client";

import { useState } from "react";
import { usePlayer } from "@/components/player-provider";
import { generateCalculations } from "@/lib/math";
import { CalculationWithInput, OpMode } from "@/lib/types";
import { CalculationCard } from "@/components/calculation-card";
import { Timer } from "@/components/timer";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Phase = "setup" | "solving";

const RANGES = [10, 20, 30];
const COUNT = 10;

export default function UebenPage() {
  const { player } = usePlayer();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("setup");
  const [opMode, setOpMode] = useState<OpMode | "">("");
  const [calculations, setCalculations] = useState<CalculationWithInput[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [numberRange, setNumberRange] = useState(0);

  function startRound() {
    if (!opMode || !numberRange) return;
    const calcs = generateCalculations(numberRange, COUNT, opMode);
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
      const finishedAt = new Date();

      const correctCount = updated.filter(
        (c) => c.playerAnswer === c.answer
      ).length;

      if (player) {
        const { data } = await supabase.from("rounds").insert({
          player_id: player.id,
          number_range: numberRange,
          op_mode: opMode,
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
          <h2 className="text-xl font-bold">Rechenart:</h2>
          <div className="flex gap-2">
            {([["plus", "Nur +"], ["plus-minus", "+ und −"]] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setOpMode(mode)}
                className={`flex-1 py-3 text-xl font-bold rounded-xl ${
                  opMode === mode
                    ? "bg-amber-500 text-white"
                    : "bg-white active:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {opMode && (
            <>
              <h2 className="text-xl font-bold mt-4">Zahlenraum:</h2>
              <div className="flex gap-2">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setNumberRange(r)}
                    className={`flex-1 py-3 text-xl font-bold rounded-xl ${
                      numberRange === r
                        ? "bg-amber-500 text-white"
                        : "bg-white active:bg-gray-100"
                    }`}
                  >
                    bis {r}
                  </button>
                ))}
              </div>
            </>
          )}

          {opMode && numberRange > 0 && (
            <button
              onClick={startRound}
              className="w-full py-4 text-xl font-bold bg-green-500 text-white rounded-xl active:bg-green-600"
            >
              ✏️ Los geht&apos;s!
            </button>
          )}
        </div>
        <Link href="/" className="mt-4 px-6 py-3 text-xl font-bold bg-gray-200 text-gray-500 rounded-xl active:bg-gray-300">
          Zurück
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-4">
      <Timer running={phase === "solving"} />
      <CalculationCard
        key={currentIndex}
        calculation={calculations[currentIndex]}
        index={currentIndex}
        total={COUNT}
        numberRange={numberRange}
        onAnswer={handleAnswer}
      />
      <button
        onClick={() => setPhase("setup")}
        className="px-6 py-3 text-xl font-bold bg-gray-200 text-gray-500 rounded-xl active:bg-gray-300"
      >
        Abbrechen
      </button>
    </div>
  );
}
