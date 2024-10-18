import humanId from "human-id";
import { useMemo } from "react";

export const Home: React.FC<{}> = () => {
  const id = useMemo(
    () =>
      humanId({
        capitalize: false,
        separator: "-",
      }),
    []
  );
  return (
    <div className=" fixed left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 rounded-md">
      <a
        className="p-8 bg-green-500 text-xl rounded-md text-white"
        href={`/game/${id}`}
      >
        Create Game
      </a>
    </div>
  );
};
