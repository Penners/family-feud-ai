import { useLoaderData, useParams, useRouteLoaderData } from "react-router-dom";
import { AnwserBoard } from "../components/AnwserBoard";
import Counter from "../components/Counter";
import { JoinScreen } from "../components/JoinScreen";
import { QuestionBuzzer } from "../components/QuestionBuzzer";
import { useEffect, useMemo } from "react";
import { initSocket } from "../socket";
import { useClientStore, useGameStore } from "../store";
import { LobbyScreen } from "../components/LobbyScreen";
import { PlayerBar } from "../components/PlayerBar";
import { PlayOrPassModal } from "../components/PlayOrPassModal";
import { StealOrPass } from "../components/StealOrPassModal";

export const Game: React.FC<{}> = () => {
  let { gameId } = useParams();
  const gameState = useGameStore();
  const players = useGameStore((state) => state.players);
  const playerId = useClientStore((state) => state.userId);
  const isInGame = useMemo(() => {
    return players.find((player) => player.id === playerId);
  }, [players, playerId]);
  useEffect(() => {
    if (gameId) {
      const socketRef = initSocket(gameId);

      return () => {
        socketRef?.close();
      };
    }
  }, [gameId]);
  return (
    <>
      {isInGame ? (
        <>
          {gameState.stage === "LOBBY" && <LobbyScreen />}
          {gameState.stage === "FACE_OFF" && (
            <>
              <PlayOrPassModal />
              <StealOrPass />
              <AnwserBoard />
              {/* <Counter />
              <QuestionBuzzer /> */}
              <PlayerBar />
            </>
          )}
        </>
      ) : (
        <JoinScreen />
      )}
      <pre>{JSON.stringify(gameState, null, 2)}</pre>
    </>
  );
};
