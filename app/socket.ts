import PartySocket from "partysocket";
import { useClientStore, useGameStore } from "./store";
import type { CLIENT_EVENTS_TYPE, SERVER_EVENTS } from "../shared/events";
import { playSound } from "./utils/sounds";

let SOCK_REF: PartySocket | undefined;
export const getSocketRef = () => SOCK_REF;
export const initSocket = (room: string) => {
  if (SOCK_REF) {
    if (SOCK_REF.room !== room) {
      SOCK_REF.updateProperties({
        room: room,
      });
      SOCK_REF.reconnect();
    }
    return SOCK_REF;
  }
  SOCK_REF = new PartySocket({
    host: window.location.host,
    room: room,
    async query() {
      const { token, userId } = await fetch(`/parties/main/${room}`)
        .then((res) => res.json() as Promise<{ token: string; userId: string }>)
        .then((data) => data);
      useClientStore.getState().setUserId(userId);
      return { token };
    },
  });
  SOCK_REF.addEventListener("open", () => {
    useClientStore.getState().setIsConnected(true);
  });
  SOCK_REF.addEventListener("close", () => {
    useClientStore.getState().setIsConnected(false);
  });
  SOCK_REF.addEventListener("error", () => {
    useClientStore.getState().setIsConnected(false);
  });
  SOCK_REF.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data) as SERVER_EVENTS;
    if (payload.event === "sync:state") {
      useGameStore.getState().syncState(payload.data);
    }
    if (payload.event === "play:sound") {
      playSound(payload.sound as any);
    }
  });
};

export const sendEvent = (event: CLIENT_EVENTS_TYPE) => {
  getSocketRef()?.send(JSON.stringify(event));
};
