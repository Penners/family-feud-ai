import { sendEvent } from "../socket";
import { useGameStore, usePlayerInfo } from "../store";

export const StealOrPass: React.FC = () => {
  const state = useGameStore((state) => state.faceOff);
  const { player } = usePlayerInfo();
  if (state?.stage !== "STEAL_OR_PASS") return null;
  if (state.teamInControl !== player?.team) return null;
  return (
    <div className="fixed left-0 right-0 top-0 bottom-0 flex bg-opacity-60 bg-black z-[10000] items-center justify-center">
      <div className="bg-white p-4 min-w-[]">
        <h2 className="p-2 text-center">Steal or Pass?</h2>
        <div className="flex justify-evenly gap-2">
          <button
            onClick={() => {
              sendEvent({ event: "stealOrPass", play: true });
            }}
            type="button"
            className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5  dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
          >
            Steal
          </button>
          <button
            onClick={() => {
              sendEvent({ event: "stealOrPass", play: false });
            }}
            type="button"
            className="focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5  dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900"
          >
            Pass
          </button>
        </div>
      </div>
    </div>
  );
};
