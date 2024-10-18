import "./styles.css";
import { createRoot } from "react-dom/client";
import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Home } from "./routes/Home";
import { Game } from "./routes/Game";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/game/:gameId",
    id: "game",
    element: <Game />,
  },
  {
    path: "*",
    loader: async () => {
      return Response.redirect("/", 301);
    },
  },
]);

function App() {
  return (
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
}

createRoot(document.getElementById("app")!).render(<App />);
