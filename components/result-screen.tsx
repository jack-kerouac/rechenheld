"use client";

import { CalculationWithInput, Stufe } from "@/lib/types";
import Link from "next/link";

export function ResultScreen({
  calculations,
  elapsedMs,
  battleMode,
  leaderboardRank,
  bestTimeDiffMs,
  stufe,
}: {
  calculations: CalculationWithInput[];
  elapsedMs: number;
  battleMode?: boolean;
  leaderboardRank?: number | null;
  bestTimeDiffMs?: number | null;
  stufe?: Stufe;
}) {
  const correct = calculations.filter(
    (c) => c.playerAnswer === c.answer
  ).length;
  const total = calculations.length;
  const seconds = (elapsedMs / 1000).toFixed(1).replace(".", ",");
  const perfect = correct === total;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-5xl font-bold">
        {perfect ? "🏆" : correct >= 7 ? "⭐" : "💪"}
      </div>
      <div className="text-3xl font-bold">
        {correct} von {total} richtig
      </div>
      <div className="text-2xl text-gray-600">{seconds} Sekunden</div>

      {leaderboardRank != null && (
        <div className="px-4 py-3 bg-yellow-100 border-2 border-yellow-400 rounded-xl text-center">
          <div className="text-2xl font-bold">
            {leaderboardRank === 1 ? "🥇" : leaderboardRank === 2 ? "🥈" : leaderboardRank === 3 ? "🥉" : "🎉"}{" "}
            Neue Bestzeit! Platz {leaderboardRank} in der Bestenliste!
          </div>
        </div>
      )}

      {bestTimeDiffMs != null && bestTimeDiffMs > 0 && (
        <div className="px-4 py-3 bg-gray-100 border-2 border-gray-300 rounded-xl text-center">
          <div className="text-xl text-gray-600">
            {(bestTimeDiffMs / 1000).toFixed(1).replace(".", ",")} Sekunden langsamer als deine Bestzeit
          </div>
        </div>
      )}

      <div className="w-full max-w-xs space-y-2 mt-4">
        {calculations.map((c, i) => {
          const isCorrect = c.playerAnswer === c.answer;
          return (
            <div
              key={i}
              className={`flex items-center justify-between px-4 py-2 rounded-lg text-xl ${
                isCorrect ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <span>
                {c.a} {c.op} {c.b} = {c.playerAnswer}
              </span>
              <span>
                {isCorrect ? (
                  "✓"
                ) : (
                  <span className="text-red-600">✗ {c.answer}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {!battleMode && (
        <div className="flex gap-4 mt-6">
          <Link
            href="/ueben"
            className="px-6 py-3 bg-sky-500 text-white text-xl font-bold rounded-xl"
          >
            Nochmal!
          </Link>
          <Link
            href={stufe ? `/schnellste?stufe=${stufe}` : "/schnellste"}
            className="px-6 py-3 bg-yellow-400 text-xl font-bold rounded-xl"
          >
            Schnellste Helden
          </Link>
        </div>
      )}
    </div>
  );
}
