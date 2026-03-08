"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Calculation } from "@/lib/types";

export function CalculationCard({
  calculation,
  index,
  total,
  onAnswer,
}: {
  calculation: Calculation;
  index: number;
  total: number;
  onAnswer: (answer: number) => void;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef(input);
  inputRef.current = input;
  const onAnswerRef = useRef(onAnswer);
  onAnswerRef.current = onAnswer;

  const handleKey = useCallback((key: string) => {
    if (key === "backspace") {
      setInput((prev) => prev.slice(0, -1));
    } else if (key === "ok") {
      if (inputRef.current !== "") {
        onAnswerRef.current(parseInt(inputRef.current, 10));
        setInput("");
      }
    } else {
      // Max 2 digits (range up to 30)
      setInput((prev) => (prev.length < 2 ? prev + key : prev));
    }
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") {
        handleKey(e.key);
      } else if (e.key === "Backspace") {
        handleKey("backspace");
      } else if (e.key === "Enter") {
        handleKey("ok");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-lg text-gray-500">
        Aufgabe {index + 1} von {total}
      </div>

      <div className="text-5xl font-bold">
        {calculation.a} {calculation.op} {calculation.b} ={" "}
        <span className="inline-block min-w-[2ch] border-b-4 border-sky-400 text-center">
          {input || "\u00A0"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 w-[320px] mt-4" style={{ touchAction: "none" }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => handleKey(String(n))}
            className="h-[84px] text-4xl font-bold rounded-xl bg-gray-100 active:bg-gray-300 transition-colors"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => handleKey("backspace")}
          className="h-[84px] text-3xl font-bold rounded-xl bg-red-100 active:bg-red-300 transition-colors"
        >
          ←
        </button>
        <button
          onClick={() => handleKey("0")}
          className="h-[84px] text-4xl font-bold rounded-xl bg-gray-100 active:bg-gray-300 transition-colors"
        >
          0
        </button>
        <div />
        <button
          onClick={() => handleKey("ok")}
          className="col-span-3 h-[84px] text-3xl font-bold rounded-xl bg-green-200 active:bg-green-400 transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
}
