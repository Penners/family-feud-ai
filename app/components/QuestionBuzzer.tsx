import { sendEvent } from "../socket";
import { useClientStore, useGameStore, usePlayerInfo } from "../store";

export const QuestionBuzzer: React.FC<{}> = () => {
  const { player } = usePlayerInfo();
  const playersAllowedToBuzz = useGameStore(
    (state) => state.faceOff?.playersAllowedToBuzz
  );
  if (!playersAllowedToBuzz || !player) return null;
  return (
    <button
      onClick={async () => {
        sendEvent({ event: "pressBuzzer" });
      }}
      disabled={!playersAllowedToBuzz.includes(player?.id)}
      className="min-w-48 min-h-48 bg-red-500 hover:bg-red-400-400 text-white font-bold py-2 px-4 border-b-4 border-red-700 hover:border-red-500 rounded-full mx-auto disabled:opacity-25"
    >
      Buzz
    </button>
  );
};
