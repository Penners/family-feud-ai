import { useEffect } from "react";
import type { FeudBoardAnswer } from "../../shared/types";
import { useGameStore } from "../store";
import { playSound } from "../utils/sounds";
import { usePrevious } from "../utils/hooks";

const Anwser: React.FC<FeudBoardAnswer & { index: number }> = (props) => {
  const shouldShow = props.text !== undefined;
  return (
    <div className="flex border-white border-4">
      <div className={`flex flex-grow p-4 bg-blue-900 text-white`}>
        {shouldShow ? (
          props.text
        ) : (
          <div className="rounded-full bg-blue-400 inline-flex h-full w-[40px] mx-auto justify-center items-center">
            {props.index + 1}
          </div>
        )}
      </div>
      {shouldShow ? (
        <div className="p-4 bg-blue-800 text-white font-extrabold">
          {shouldShow ? props.points : null}
        </div>
      ) : null}
    </div>
  );
};

export const AnwserBoard: React.FC<{}> = () => {
  const board = useGameStore((state) => state.faceOff?.board);
  if (!board) return null;
  return (
    <div className="bg-black rounded-3xl border-yellow-600 border-8 p-3">
      <div className="p-4 bg-blue-900 text-white text-2xl mb-4">
        {board.question}
      </div>
      <div className="p-4 bg-blue-900 text-white text-2xl mb-4">
        {board?.currentAttempt ?? "..."}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {board.answers.map((a, i) => {
          return <Anwser key={a.id} {...{ ...a, index: i }} />;
        })}
      </div>
    </div>
  );
};
