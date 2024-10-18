import { useEffect, useMemo, useRef, useState } from "react";
import type { Player } from "../../shared/types";
import { useGameStore, usePlayerInfo } from "../store";
import { QuestionBuzzer } from "./QuestionBuzzer";
import { playSound } from "../utils/sounds";
import { usePrevious } from "../utils/hooks";
import { sendEvent } from "../socket";
import { FaceOff } from "../../party/FaceOff";

export const PlayerBar: React.FC = () => {
  const players = useGameStore((state) => state.players);
  const teamA = useGameStore((state) => state.teams.a);
  const teamB = useGameStore((state) => state.teams.b);
  const teamAPlayers = players.filter((p) => p.team === "a");
  const teamBPlayers = players.filter((p) => p.team === "b");
  const faceOff = useGameStore((state) => state.faceOff);
  const { player } = usePlayerInfo();

  const strikes = ["x", "x", "x"];

  return (
    <div className="z-50 fixed bottom-6 right-6 left-6">
      {faceOff?.playerAllowedToAnswer === player?.id ? (
        <div className="bg-white p-4 max-w-[600px] mx-auto my-4 rounded-lg">
          <h2 className="p-2">{faceOff?.board.question}</h2>
          <form
            className="flex items-stretch"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const input = formData.get("text")?.toString() ?? "";
              sendEvent({ event: "answerQuestion", answer: input });
              e.currentTarget.reset();
            }}
          >
            <input
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              type="text"
              name="text"
              required
              placeholder="Your awnser..."
              autoFocus={true}
            />
            <input
              type="submit"
              value="Submit"
              className="ml-2 focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
            />
          </form>
        </div>
      ) : null}
      <div className=" grid grid-cols-7 grid-rows-1 gap-4 items-end">
        <div className="col-span-3 flex justify-end flex-col bg-slate-800  rounded-lg">
          <div className="flex justify-end p-2 gap-2">
            <div className="bg-slate-800 px-2 flex gap-2 items-center">
              {strikes.map((x, i) => {
                return (
                  <span
                    key={i}
                    className={`font-mono text-2xl ${
                      (faceOff?.teamAStrikes || 0) > i
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    X
                  </span>
                );
              })}
            </div>
            <div className="bg-blue-700 text-white font-mono text-3xl p-2">
              {teamA.points}
            </div>
          </div>
          <div className="flex justify-end">
            {teamAPlayers.map((player) => {
              return <PlayerIcon key={player.id} {...player} />;
            })}
          </div>
        </div>
        <div className="col-start-4 flex">
          {player?.id && faceOff?.playersAllowedToBuzz.includes(player?.id) ? (
            <QuestionBuzzer />
          ) : null}
        </div>
        <div className="col-span-3 col-start-5 bg-slate-800  rounded-lg">
          <div className="flex flex-row-reverse justify-end p-2 gap-2">
            <div className="bg-slate-800 px-2 flex gap-2 items-center">
              {strikes.map((x, i) => {
                return (
                  <span
                    key={i}
                    className={`font-mono text-2xl ${
                      (faceOff?.teamBStrikes || 0) > i
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    X
                  </span>
                );
              })}
            </div>
            <div className="bg-blue-700 text-white font-mono text-3xl p-2">
              {teamB.points}
            </div>
          </div>
          <div className="flex">
            {teamBPlayers.map((player) => {
              return <PlayerIcon key={player.id} {...player} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const PlayerIcon: React.FC<Player> = (player) => {
  const initals = useMemo(() => {
    const split = player.name.split(" ");
    if (split.length >= 2) {
      return `${split[0][0]}${split[1][0]}`.toUpperCase();
    } else if (player.name.length >= 2) {
      return `${player.name[0]}${player.name[1]}`.toUpperCase();
    }
    return `${player.name[0]}`.toUpperCase();
  }, [player.name]);

  const playerInControl = useGameStore(
    (state) => state.faceOff?.playerAllowedToAnswer === player.id
  );

  const borderColour = playerInControl
    ? "border-orange-500"
    : "border-blue-900";
  return (
    <div
      className={`flex justify-center items-center w-32 h-32 overflow-hidden relative m-2 border-4 border-blue-900 rounded-md bg-blue-600 ${borderColour}`}
    >
      <span className="text-3xl text-white">{initals}</span>
      <div className="absolute bottom-0 p-1 overflow-ellipsis left-0 right-0 line-clamp-1 text-center text-s bg-slate-800 bg-opacity-50 text-white">
        {player.name}
      </div>
    </div>
  );
};
