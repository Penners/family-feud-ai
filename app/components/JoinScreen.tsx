import { getSocketRef } from "../socket";

export const JoinScreen: React.FC<{}> = () => {
  return (
    <form
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-white p-2 flex gap-4 border-gray-500"
      onSubmit={(e) => {
        e.preventDefault();
        const socket = getSocketRef();
        const formData = new FormData(e.currentTarget);
        const input = formData.get("name")?.toString() ?? "";
        if (socket && input.trim().length > 2) {
          socket.send(
            JSON.stringify({
              event: "playerJoined",
              name: formData.get("name")?.toString().trim(),
            })
          );
        }
      }}
    >
      <input
        className="min-w-96 p-4"
        autoFocus
        type="text"
        name="name"
        placeholder="Your name"
        minLength={3}
        required
      />
      <input
        type="submit"
        value="Join"
        className="p-4 bg-green-500 text-white rounded-md px-8"
      />
    </form>
  );
};
