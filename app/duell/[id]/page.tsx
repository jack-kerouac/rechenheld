"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { usePlayer } from "@/components/player-provider";
import { supabase } from "@/lib/supabase";
import { Battle, CalculationWithInput, Round } from "@/lib/types";
import { CalculationCard } from "@/components/calculation-card";
import { Timer } from "@/components/timer";
import Link from "next/link";

type Phase = "loading" | "ready" | "solving" | "done" | "waiting";

export default function BattlePage() {
  const { id } = useParams<{ id: string }>();
  const { player } = usePlayer();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [calculations, setCalculations] = useState<CalculationWithInput[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [myRound, setMyRound] = useState<Round | null>(null);
  const [opponentRound, setOpponentRound] = useState<Round | null>(null);

  const loadBattle = useCallback(async () => {
    if (!player) return;

    const { data: battleData } = await supabase
      .from("battles")
      .select("*")
      .eq("id", id)
      .single();

    if (!battleData) return;
    setBattle(battleData as Battle);

    // Load rounds for this battle
    const { data: rounds } = await supabase
      .from("rounds")
      .select("*")
      .eq("battle_id", id);

    const myR = rounds?.find((r: Round) => r.player_id === player.id) ?? null;
    const opR =
      rounds?.find((r: Round) => r.player_id !== player.id) ?? null;
    setMyRound(myR);
    setOpponentRound(opR);

    if (myR?.finished_at) {
      setCalculations(myR.calculations);
      setElapsedMs(
        new Date(myR.finished_at).getTime() -
          new Date(myR.started_at).getTime()
      );
      if (opR?.finished_at) {
        setPhase("done");
      } else {
        setPhase("waiting");
      }
    } else {
      setCalculations(
        (battleData as Battle).calculations.map((c) => ({ ...c }))
      );
      setPhase("ready");
    }
  }, [player, id]);

  useEffect(() => {
    loadBattle();
  }, [loadBattle]);

  // Subscribe to round changes for this battle
  useEffect(() => {
    if (!battle || phase !== "waiting") return;

    const channel = supabase
      .channel(`battle-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rounds",
          filter: `battle_id=eq.${id}`,
        },
        () => loadBattle()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battle, phase, id, loadBattle]);

  function startSolving() {
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

    if (currentIndex + 1 < calculations.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const finishedAt = new Date();
      const ms = finishedAt.getTime() - startedAt!.getTime();
      setElapsedMs(ms);

      const correctCount = updated.filter(
        (c) => c.playerAnswer === c.answer
      ).length;

      // Save round
      await supabase.from("rounds").insert({
        player_id: player!.id,
        number_range: battle!.number_range,
        op_mode: battle!.op_mode,
        started_at: startedAt!.toISOString(),
        finished_at: finishedAt.toISOString(),
        correct_count: correctCount,
        calculations: updated,
        battle_id: id,
      });

      // Update battle status
      const isChallenger = battle!.challenger_id === player!.id;
      if (!isChallenger) {
        await supabase
          .from("battles")
          .update({ status: "finished" })
          .eq("id", id);
      } else {
        await supabase
          .from("battles")
          .update({ status: "accepted" })
          .eq("id", id);
      }

      await loadBattle();
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

  if (phase === "loading") {
    return <div className="text-center pt-12 text-xl">Laden...</div>;
  }

  if (phase === "ready") {
    return (
      <div className="flex flex-col items-center gap-6 pt-12">
        <h1 className="text-3xl font-bold">Duell</h1>
        <p className="text-xl">Zahlenraum bis {battle?.number_range}</p>
        <p className="text-lg text-gray-500">
          {calculations.length} Aufgaben
        </p>
        <button
          onClick={startSolving}
          className="w-full py-5 text-2xl font-bold bg-green-500 text-white rounded-xl active:bg-green-600"
        >
          Start!
        </button>
        <Link href="/duell" className="text-gray-500 underline">
          Zurück
        </Link>
      </div>
    );
  }

  if (phase === "solving") {
    return (
      <div className="flex flex-col items-center gap-6 pt-4">
        <Timer running={true} onElapsed={handleElapsed} />
        <CalculationCard
          key={currentIndex}
          calculation={calculations[currentIndex]}
          index={currentIndex}
          total={calculations.length}
          onAnswer={handleAnswer}
        />
      </div>
    );
  }

  if (phase === "waiting") {
    const myCorrect = myRound
      ? (myRound.calculations as CalculationWithInput[]).filter(
          (c) => c.playerAnswer === c.answer
        ).length
      : 0;
    const myTime = myRound
      ? (
          (new Date(myRound.finished_at!).getTime() -
            new Date(myRound.started_at).getTime()) /
          1000
        ).toFixed(1)
      : "0";

    return (
      <div className="flex flex-col items-center gap-6 pt-12">
        <h1 className="text-3xl font-bold">Warte auf Gegner...</h1>
        <p className="text-xl">
          Dein Ergebnis: {myCorrect}/10 in {myTime}s
        </p>
        <div className="animate-pulse text-4xl">⏳</div>
        <Link
          href="/"
          className="mt-4 px-6 py-3 bg-sky-500 text-white text-xl font-bold rounded-xl"
        >
          Zurück zur Startseite
        </Link>
      </div>
    );
  }

  // phase === "done" — show comparison
  const myCalcs = myRound?.calculations as CalculationWithInput[] | undefined;
  const opCalcs = opponentRound?.calculations as
    | CalculationWithInput[]
    | undefined;
  const myCorrect = myCalcs?.filter((c) => c.playerAnswer === c.answer).length ?? 0;
  const opCorrect = opCalcs?.filter((c) => c.playerAnswer === c.answer).length ?? 0;
  const myTime = myRound
    ? (new Date(myRound.finished_at!).getTime() -
        new Date(myRound.started_at).getTime()) /
      1000
    : 0;
  const opTime = opponentRound
    ? (new Date(opponentRound.finished_at!).getTime() -
        new Date(opponentRound.started_at).getTime()) /
      1000
    : 0;

  const iWon =
    myCorrect > opCorrect ||
    (myCorrect === opCorrect && myTime < opTime);
  const tie = myCorrect === opCorrect && myTime === opTime;

  return (
    <div className="flex flex-col items-center gap-6 pt-8">
      <h1 className="text-4xl font-bold">
        {tie ? "Unentschieden!" : iWon ? "Du hast gewonnen! 🏆" : "Knapp verloren!"}
      </h1>

      <div className="w-full grid grid-cols-2 gap-4 text-center">
        <div className="p-4 bg-blue-100 rounded-xl">
          <div className="font-bold text-lg">Du</div>
          <div className="text-2xl font-bold">{myCorrect}/10</div>
          <div className="text-lg">{myTime.toFixed(1)}s</div>
        </div>
        <div className="p-4 bg-amber-100 rounded-xl">
          <div className="font-bold text-lg">Gegner</div>
          <div className="text-2xl font-bold">{opCorrect}/10</div>
          <div className="text-lg">{opTime.toFixed(1)}s</div>
        </div>
      </div>

      <div className="flex gap-4 mt-4">
        <Link
          href="/duell"
          className="px-6 py-3 bg-amber-500 text-white text-xl font-bold rounded-xl"
        >
          Neues Duell
        </Link>
        <Link
          href="/"
          className="px-6 py-3 bg-sky-500 text-white text-xl font-bold rounded-xl"
        >
          Start
        </Link>
      </div>
    </div>
  );
}
