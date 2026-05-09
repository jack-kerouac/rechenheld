"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Calculation, Stufe } from "@/lib/types";

export function CalculationCard({
  calculation,
  stufe,
  onAnswer,
  onBack,
  onCancel,
}: {
  calculation: Calculation;
  stufe: Stufe;
  onAnswer: (answer: number) => void;
  onBack?: (() => void) | null;
  onCancel?: () => void;
}) {
  const maxAnswer = stufe <= 2 ? 10 : 20;
  const answers = Array.from({ length: maxAnswer + 1 }, (_, i) => i);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const handleAnswer = useCallback(
    (n: number) => {
      if (selectedAnswer !== null) return;
      setSelectedAnswer(n);
      setTimeout(() => onAnswer(n), 120);
    },
    [onAnswer, selectedAnswer]
  );

  const keyBuffer = useRef("");
  const keyTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key < "0" || e.key > "9") return;
      keyBuffer.current += e.key;
      if (keyTimer.current) clearTimeout(keyTimer.current);

      const buf = keyBuffer.current;
      const maxDigits = String(maxAnswer).length;
      const firstDigit = parseInt(buf[0], 10);
      const couldBeMultiDigit = firstDigit * 10 <= maxAnswer;
      if (buf.length >= maxDigits || (buf.length === 1 && !couldBeMultiDigit)) {
        const n = parseInt(buf, 10);
        keyBuffer.current = "";
        if (n <= maxAnswer) handleAnswer(n);
      } else {
        keyTimer.current = setTimeout(() => {
          const n = parseInt(keyBuffer.current, 10);
          keyBuffer.current = "";
          if (n <= maxAnswer) handleAnswer(n);
        }, 200);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (keyTimer.current) clearTimeout(keyTimer.current);
    };
  }, [handleAnswer, maxAnswer]);

  return (
    <div className="flex flex-col items-center gap-4 w-full animate-fade-in">
      <div className="text-5xl font-bold bg-amber-50 px-8 py-4 rounded-2xl">
        {calculation.a} {calculation.op} {calculation.b} = <span className="text-amber-500">?</span>
      </div>

      <div
        className={`grid w-full max-w-sm mt-2 px-4 ${
          maxAnswer <= 10
            ? "grid-cols-3 gap-2 text-4xl"
            : "grid-cols-4 gap-2 text-3xl"
        }`}
        style={{ touchAction: "none" }}
      >
        {answers.map((n) => (
          <button
            key={n}
            onClick={() => handleAnswer(n)}
            className={`py-3 font-bold rounded-xl transition-colors ${
              selectedAnswer === n
                ? "bg-sky-400 text-white"
                : "bg-sky-100 active:bg-sky-300"
            }`}
          >
            {n}
          </button>
        ))}
        {onBack !== undefined && (
          <button
            onClick={onBack ?? undefined}
            disabled={!onBack}
            className={`py-3 font-bold rounded-xl text-2xl ${
              onBack
                ? "bg-amber-200 text-amber-600 active:bg-amber-300"
                : "bg-gray-100 text-gray-300"
            }`}
          >
            ←
          </button>
        )}
        {onCancel && (
          <button
            onClick={onCancel}
            className="py-3 font-bold rounded-xl bg-red-200 text-red-600 active:bg-red-300 text-2xl"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
