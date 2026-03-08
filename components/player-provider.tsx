"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Player } from "@/lib/types";
import { supabase } from "@/lib/supabase";

const NAMES_KEY = "rechenheld_known_names";

function getKnownNames(): string[] {
  const stored = localStorage.getItem(NAMES_KEY);
  return stored ? JSON.parse(stored) : [];
}

function addKnownName(name: string) {
  const names = getKnownNames();
  if (!names.includes(name)) {
    names.push(name);
    localStorage.setItem(NAMES_KEY, JSON.stringify(names));
  }
}

type PlayerContextType = {
  player: Player | null;
  knownNames: string[];
  login: (name: string) => Promise<void>;
  logout: () => void;
};

const PlayerContext = createContext<PlayerContextType>({
  player: null,
  knownNames: [],
  login: async () => {},
  logout: () => {},
});

export function usePlayer() {
  return useContext(PlayerContext);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [knownNames, setKnownNames] = useState<string[]>([]);

  useEffect(() => {
    setKnownNames(getKnownNames());
    const stored = localStorage.getItem("rechenheld_player");
    if (stored) {
      setPlayer(JSON.parse(stored));
    }
  }, []);

  async function login(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Try to find existing player
    const { data: existing } = await supabase
      .from("players")
      .select("id, name")
      .eq("name", trimmed)
      .single();

    if (existing) {
      setPlayer(existing);
      localStorage.setItem("rechenheld_player", JSON.stringify(existing));
      addKnownName(trimmed);
      setKnownNames(getKnownNames());
      return;
    }

    // Create new player
    const { data: created, error } = await supabase
      .from("players")
      .insert({ name: trimmed })
      .select("id, name")
      .single();

    if (error) throw error;

    setPlayer(created);
    localStorage.setItem("rechenheld_player", JSON.stringify(created));
    addKnownName(trimmed);
    setKnownNames(getKnownNames());
  }

  function logout() {
    setPlayer(null);
    localStorage.removeItem("rechenheld_player");
  }

  return (
    <PlayerContext.Provider value={{ player, knownNames, login, logout }}>
      {children}
    </PlayerContext.Provider>
  );
}
