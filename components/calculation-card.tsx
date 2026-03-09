"use client";

import { useEffect, useCallback, useRef } from "react";
import { Calculation } from "@/lib/types";

export function CalculationCard({
  calculation,
  numberRange,
  onAnswer,
  onBack,
  onCancel,
}: {
  calculation: Calculation;
  numberRange: number;
  onAnswer: (answer: number) => void;
  onBack?: (() => void) | null;
  onCancel?: () => void;
}) {
  const answers = Array.from({ length: numberRange + 1 }, (_, i) => i);

  const handleAnswer = useCallback(
    (n: number) => {
      onAnswer(n);
    },
    [onAnswer]
  );

  const keyBuffer = useRef("");
  const keyTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key < "0" || e.key > "9") return;
      keyBuffer.current += e.key;
      if (keyTimer.current) clearTimeout(keyTimer.current);

      const buf = keyBuffer.current;
      const maxDigits = String(numberRange).length;
      // Submit immediately if buffer is full, or first digit can't start a valid multi-digit number
      const firstDigit = parseInt(buf[0], 10);
      const couldBeMultiDigit = firstDigit * 10 <= numberRange;
      if (buf.length >= maxDigits || (buf.length === 1 && !couldBeMultiDigit)) {
        const n = parseInt(buf, 10);
        keyBuffer.current = "";
        if (n <= numberRange) handleAnswer(n);
      } else {
        keyTimer.current = setTimeout(() => {
          const n = parseInt(keyBuffer.current, 10);
          keyBuffer.current = "";
          if (n <= numberRange) handleAnswer(n);
        }, 200);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (keyTimer.current) clearTimeout(keyTimer.current);
    };
  }, [handleAnswer, numberRange]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="text-5xl font-bold bg-amber-50 px-8 py-4 rounded-2xl">
        {calculation.a} {calculation.op} {calculation.b} = <span className="text-amber-500">?</span>
      </div>

      <div
        className={`grid w-full mt-2 px-4 ${
          numberRange <= 10
            ? "grid-cols-3 gap-2 text-4xl"
            : numberRange <= 20
              ? "grid-cols-4 gap-2 text-3xl"
              : "grid-cols-5 gap-2 text-2xl"
        }`}
        style={{ touchAction: "none" }}
      >
        {answers.map((n) => (
          <button
            key={n}
            onClick={() => handleAnswer(n)}
            className="aspect-square font-bold rounded-xl bg-sky-100 active:bg-sky-300 transition-colors"
          >
            {n}
          </button>
        ))}
        {onBack !== undefined && (
          <button
            onClick={onBack ?? undefined}
            disabled={!onBack}
            className={`aspect-square font-bold rounded-xl text-2xl ${
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
            className="aspect-square font-bold rounded-xl bg-red-200 text-red-600 active:bg-red-300 text-2xl"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
