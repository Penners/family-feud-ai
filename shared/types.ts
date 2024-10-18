import type { FaceOff } from "../party/FaceOff";

export interface Question {
  id: string;
  question: string;
  season: string;
  numberOfAnswers: number;
  answers: Answer[];
}

export interface Board {
  question?: string;
  slots: ({
    text?: string;
    isCorrect?: boolean;
    points?: number;
  } | null)[];
}

export interface Answer {
  id: string;
  answer: string;
  points: number;
}

export interface Team {
  name: string;
  points: number;
}

export type TeamId = "a" | "b";

export interface Player {
  id: string;
  name: string;
  team?: TeamId;
}

export interface FeudBoardAnswer {
  id: string;
  points?: number;
  text?: string;
  playerId?: string;
  teamId?: string;
  isCorrect?: boolean;
}

export interface GameState {
  stage: "LOBBY" | "INTRO" | "FACE_OFF" | "FAST_MONEY" | "END";
  players: Player[];
  teams: Record<TeamId, Team>;
  faceOff?: FaceOff;
}
