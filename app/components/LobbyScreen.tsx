import { useMemo } from "react";
import { useGameStore } from "../store";
import { sendEvent } from "../socket";

export const LobbyScreen: React.FC = () => {
  const players = useGameStore((state) => state.players);
  const teams = useGameStore((state) => state.teams);
  const [teamA, TeamB, lobbyPlayers] = useMemo(() => {
    const teamA = [];
    const teamB = [];
    const lobby = [];
    for (const player of players) {
      if (player.team === "a") {
        teamA.push(player);
      } else if (player.team === "b") {
        teamB.push(player);
      } else {
        lobby.push(player);
      }
    }
    return [teamA, teamB, lobby];
  }, [players]);
  return (
    <div className="bg-white rounded-lg min-h-[75%] max-h-[75%] min-w-[80%] fixed left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 p-4 flex flex-col">
      <div className="flex flex-row justify-evenly gap-4 mb-4">
        <div className="flex-1 p-2">{teams.a.name}</div>
        <div className="flex-1">
          <button
            onClick={() => {
              sendEvent({ event: "voteStart" });
            }}
            type="button"
            className="min-w-full focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
          >
            Start Game
          </button>
        </div>
        <div className="flex-1 p-2">{teams.b.name}</div>
      </div>
      <div className=" flex justify-evenly gap-4 flex-1">
        <div className="flex flex-col flex-1">
          <div className="flex-grow overflow-y-auto p-4 bg-slate-100 mb-4 rounded-lg">
            <div>
              {teamA.map((player) => {
                return <div key={player.id}>{player.name}</div>;
              })}
            </div>
          </div>

          <button
            onClick={() => {
              sendEvent({ event: "playerJoined", team: "a" });
            }}
            type="button"
            className="min-w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
          >
            Join Team
          </button>
        </div>
        <div className="flex flex-col flex-1">
          <div className="flex-grow overflow-y-auto p-4 bg-slate-100 mb-4 rounded-lg">
            <div>
              {lobbyPlayers.map((player) => {
                return <div key={player.id}>{player.name}</div>;
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-col flex-1">
          <div className="flex-grow overflow-y-auto p-4 bg-slate-100 mb-4 rounded-lg">
            {TeamB.map((player) => {
              return <div key={player.id}>{player.name}</div>;
            })}
          </div>

          <button
            onClick={() => {
              sendEvent({ event: "playerJoined", team: "b" });
            }}
            type="button"
            className=" text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5  dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
          >
            Join Team
          </button>
        </div>
      </div>
    </div>
  );
};
