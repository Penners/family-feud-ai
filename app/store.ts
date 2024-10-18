import { create, createStore } from "zustand";
import type { GameState } from "../shared/types";
import { playSound } from "./utils/sounds";

interface ClientState {
  userId?: string;
  isConnected: boolean;
}

interface ClientActions {
  setIsConnected: (bool: boolean) => void;
  setUserId: (userId: string) => void;
}

export const useClientStore = create<ClientState & ClientActions>(
  (set, get) => ({
    userId: undefined,
    isConnected: false,
    setIsConnected: (val: boolean) => set(() => ({ isConnected: val })),
    setUserId: (userId: string) => set(() => ({ userId: userId })),
  })
);

const initalState: GameState = {
  stage: "LOBBY",
  players: [],
  teams: {
    a: { name: "Family #1", points: 0 },
    b: { name: "Family #2", points: 0 },
  },
};

interface StateActions {
  syncState: (state: GameState) => void;
  setIsLoaded: () => void;
}

type ClientGameState = GameState & { isLoaded: boolean };

export const useGameStore = create<ClientGameState & StateActions>(
  (set, get) => ({
    ...initalState,
    isLoaded: false,
    setIsLoaded: () => true,
    syncState: (state: GameState) => {
      const prev = get();
      derriveEvents(state, prev);
      set({ ...state, isLoaded: true });
    },
  })
);

const derriveEvents = (curr: GameState, prev: ClientGameState) => {
  if (
    curr.faceOff?.answerLog.length !== prev.faceOff?.answerLog.length &&
    prev.faceOff !== undefined
  ) {
    const mostRecentAnswer =
      curr.faceOff?.answerLog[curr.faceOff?.answerLog.length - 1];
    if (mostRecentAnswer && mostRecentAnswer.isCorrect === false) {
      playSound("INCORRECT");
    }
    if (mostRecentAnswer && mostRecentAnswer.isCorrect === true) {
      playSound("CORRECT");
    }
  }
};

export const usePlayerInfo = () => {
  const playerId = useClientStore.getState().userId;
  const player = useGameStore((s) => s.players.find((p) => p.id === playerId));
  const team = useGameStore((store) => {
    if (player?.team) {
      return store.teams[player.team];
    }
  });
  return { player, team };
};
