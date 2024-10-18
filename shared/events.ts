import { z } from "zod";
import type { GameState } from "./types";

export const CLIENT_EVENTS = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("playOrPass"),
    play: z.boolean(),
  }),
  z.object({
    event: z.literal("stealOrPass"),
    play: z.boolean(),
  }),
  z.object({
    event: z.literal("voteStart"),
  }),
  z.object({
    event: z.literal("playerJoined"),
    name: z.string().optional(),
    team: z.union([z.literal("a"), z.literal("b")]).optional(),
  }),
  z.object({ event: z.literal("pressBuzzer") }),
  z.object({
    event: z.literal("answerQuestion"),
    answer: z.string(),
  }),
]);
export type CLIENT_EVENTS_TYPE = z.infer<typeof CLIENT_EVENTS>;

export type SERVER_EVENTS =
  | {
      event: "sync:state";
      data: GameState;
    }
  | {
      event: "play:sound";
      sound: string;
    };
