"use client";

import { useState, useEffect } from "react";
import { usePlayer } from "@/components/player-provider";
import { supabase } from "@/lib/supabase";
import { generateCalculations } from "@/lib/math";
import { Battle, OpMode, Player, Round } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

const RANGES = [10, 20, 30];

export default function DuellPage() {
  const { player } = usePlayer();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [battles, setBattles] = useState<
    (Battle & { challenger: Player; opponent: Player | null; rounds: Round[] })[]
  >([]);
  const [creating, setCreating] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<string>("");
  const [selectedRange, setSelectedRange] = useState<number>(0);
  const [selectedOpMode, setSelectedOpMode] = useState<OpMode | "">("");

  useEffect(() => {
    if (!player) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  async function loadData() {
    const [{ data: playersData }, { data: battlesData }] = await Promise.all([
      supabase.from("players").select("id, name").order("name"),
      supabase
        .from("battles")
        .select(
          "*, challenger:players!battles_challenger_id_fkey(*), opponent:players!battles_opponent_id_fkey(*), rounds(*)"
        )
        .or(`challenger_id.eq.${player!.id},opponent_id.eq.${player!.id}`)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (playersData)
      setPlayers(playersData.filter((p: Player) => p.id !== player!.id));
    if (battlesData)
      setBattles(
        battlesData as (Battle & {
          challenger: Player;
          opponent: Player | null;
          rounds: Round[];
        })[]
      );
  }

  async function createChallenge() {
    if (!selectedOpponent || !selectedRange || !selectedOpMode || !player)
      return;

    const calcs = generateCalculations(selectedRange, 10, selectedOpMode);
    const { data, error } = await supabase
      .from("battles")
      .insert({
        challenger_id: player.id,
        opponent_id: selectedOpponent,
        number_range: selectedRange,
        op_mode: selectedOpMode,
        calculations: calcs,
      })
      .select("id")
      .single();

    if (error || !data) return;

    router.push(`/duell/${data.id}`);
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

  return (
    <div className="flex flex-col items-center gap-6 pt-8">
      <h1 className="text-3xl font-bold">Duell</h1>

      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="w-full py-4 text-xl font-bold bg-amber-500 text-white rounded-xl active:bg-amber-600"
        >
          ⚔️ Neues Duell
        </button>
      ) : (
        <div className="w-full space-y-4 p-4 bg-amber-50 rounded-xl">
          <h2 className="text-xl font-bold">Gegner wählen:</h2>
          <div className="space-y-2">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedOpponent(p.id)}
                className={`block w-full py-3 text-xl text-center rounded-xl ${
                  selectedOpponent === p.id
                    ? "bg-amber-500 text-white"
                    : "bg-white active:bg-gray-100"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {selectedOpponent && (
            <>
              <h2 className="text-xl font-bold mt-4">Rechenart:</h2>
              <div className="flex gap-2">
                {([["plus", "Nur +"], ["plus-minus", "+ und −"]] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setSelectedOpMode(mode)}
                    className={`flex-1 py-3 text-xl font-bold rounded-xl ${
                      selectedOpMode === mode
                        ? "bg-amber-500 text-white"
                        : "bg-white active:bg-gray-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {selectedOpponent && selectedOpMode && (
            <>
              <h2 className="text-xl font-bold mt-4">Zahlenraum:</h2>
              <div className="flex gap-2">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRange(r)}
                    className={`flex-1 py-3 text-xl font-bold rounded-xl ${
                      selectedRange === r
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

          {selectedOpponent && selectedOpMode && selectedRange > 0 && (
            <button
              onClick={createChallenge}
              className="w-full py-4 text-xl font-bold bg-green-500 text-white rounded-xl active:bg-green-600"
            >
              ⚔️ Herausfordern!
            </button>
          )}

          <button
            onClick={() => {
              setCreating(false);
              setSelectedOpponent("");
              setSelectedOpMode("");
              setSelectedRange(0);
            }}
            className="w-full py-3 text-xl font-bold bg-gray-200 text-gray-500 rounded-xl active:bg-gray-300"
          >
            Abbrechen
          </button>
        </div>
      )}

      {battles.length > 0 && (
        <div className="w-full space-y-2 mt-4">
          <h2 className="text-xl font-bold">Letzte Duelle</h2>
          {battles.map((b) => {
            const isChallenger = b.challenger_id === player.id;
            const otherName = isChallenger
              ? b.opponent?.name
              : b.challenger.name;
            const iPlayed = b.rounds.some((r) => r.player_id === player.id);
            const opponentPlayed = b.rounds.some((r) => r.player_id !== player.id);
            const bothPlayed = iPlayed && opponentPlayed;

            let badgeClass: string;
            let badgeLabel: string;
            if (bothPlayed) {
              badgeClass = "bg-green-200";
              badgeLabel = "Fertig";
            } else if (iPlayed) {
              badgeClass = "bg-blue-200";
              badgeLabel = `Warte auf ${otherName}`;
            } else if (opponentPlayed) {
              badgeClass = "bg-orange-200";
              badgeLabel = "Du bist dran!";
            } else {
              badgeClass = "bg-yellow-200";
              badgeLabel = "Offen";
            }

            return (
              <Link
                key={b.id}
                href={`/duell/${b.id}`}
                className="block w-full px-4 py-3 bg-gray-100 rounded-xl"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-lg">
                      {isChallenger ? "Du" : b.challenger.name} gegen{" "}
                      {isChallenger ? otherName : "Dich"}
                    </span>
                    <div className="flex gap-1 mt-1">
                      <span className="text-sm bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">{b.op_mode === "plus" ? "Nur +" : "+ und −"}</span>
                      <span className="text-sm bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-medium">Bis {b.number_range}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(b.created_at).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })}
                    </div>
                  </div>
                  <span className={`text-sm font-bold px-2 py-1 rounded ${badgeClass}`}>
                    {badgeLabel}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Link href="/" className="mt-4 px-6 py-3 text-xl font-bold bg-gray-200 text-gray-500 rounded-xl active:bg-gray-300">
        Zurück
      </Link>
    </div>
  );
}
