import type * as Party from "partykit/server";
import {
  CLIENT_EVENTS,
  type CLIENT_EVENTS_TYPE,
  type SERVER_EVENTS,
} from "../shared/events";
import type { GameState, Player, Question, TeamId } from "../shared/types";
import cookie from "cookie";
import jwt from "@tsndr/cloudflare-worker-jwt";
import { loadFeudQuestion } from "./utilts";
import { gradeQuestion } from "./aiAgent";
import { FaceOff } from "./FaceOff";
const APP_KEY = "supersafe1";

interface ConnState {
  userId: string;
}

export default class Server implements Party.Server {
  seenQuestions: string[] = [];
  gameState: GameState = {
    stage: "LOBBY",
    players: [],
    teams: {
      a: { name: "Family #1", points: 0 },
      b: { name: "Family #2", points: 0 },
    },
  };

  constructor(readonly room: Party.Room) {}

  static async onBeforeConnect(request: Party.Request, lobby: Party.Lobby) {
    try {
      const token = new URL(request.url).searchParams.get("token") ?? "";
      const session = await jwt.verify(token, APP_KEY);
      if (!session) {
        throw new Error("Invalid token");
      }
      const { payload } = jwt.decode<{ id: string }>(token);
      if (!payload || !payload.id) {
        throw new Error("Error no user id in JWT");
      }
      // pass any information to the onConnect handler in headers (optional)
      request.headers.set("X-User-ID", payload.id);
      // forward the request onwards on onConnect
      return request;
    } catch (e) {
      // authentication failed!
      // short-circuit the request before it's forwarded to the party
      return new Response("Unauthorized", { status: 401 });
    }
  }

  getConnectionTags(
    connection: Party.Connection,
    context: Party.ConnectionContext
  ): string[] | Promise<string[]> {
    const maybeUserId = context.request.headers.get("X-User-ID");
    if (maybeUserId) {
      return [maybeUserId];
    } else {
      return [];
    }
  }

  getUserIdFromConn(conn: Party.Connection<ConnState>) {
    return conn.state?.userId;
  }

  getUserIdFromRequest(req: Party.ConnectionContext["request"]) {
    return req.headers.get("X-User-ID") || "";
  }

  onConnect(conn: Party.Connection<ConnState>, ctx: Party.ConnectionContext) {
    const userId = this.getUserIdFromRequest(ctx.request);
    conn.setState((state) => ({ ...state, userId }));
    this.syncState([userId]);
  }

  sendEvent(event: SERVER_EVENTS, targets?: Player["id"][]) {
    const payload = JSON.stringify(event);
    if (targets && targets.length > 0) {
      for (const tag of targets) {
        for (const conn of this.room.getConnections(tag)) {
          conn.send(payload);
        }
      }
    } else {
      this.room.broadcast(payload);
    }
  }

  onMessage(message: string, sender: Party.Connection<ConnState>) {
    try {
      const parsedEvent = CLIENT_EVENTS.parse(JSON.parse(message));
      switch (parsedEvent.event) {
        case "answerQuestion":
          this.answerQuestion(parsedEvent, sender);
          break;
        case "pressBuzzer":
          this.pressBuzzer(parsedEvent, sender);
          break;
        case "playerJoined":
          this.playerJoined(parsedEvent, sender);
          break;
        case "voteStart":
          this.voteStart(parsedEvent, sender);
          break;
        case "playOrPass":
          this.playOrPass(parsedEvent, sender);
          break;
        case "stealOrPass":
          this.stealOrPass(parsedEvent, sender);
          break;
      }
    } catch (e) {
      console.error(e);
    }
  }
  onAlarm(): void | Promise<void> {}

  onPlayerLeave(player: Player) {
    // evaulate if the game can continue... TODO
  }

  onError(
    conn: Party.Connection<ConnState>,
    error: Error
  ): void | Promise<void> {
    console.error(`There was an error with conn ${conn.state?.userId}`, error);
    this.schedulePruneForUser(conn);
  }

  onClose(conn: Party.Connection<ConnState>) {
    this.schedulePruneForUser(conn);
  }

  async onRequest(req: Party.Request) {
    const cookies = cookie.parse(req.headers.get("cookie") ?? "");
    const id =
      cookies["x-token"] &&
      (await jwt.verify(cookies["x-token"], APP_KEY).catch(() => false))
        ? jwt.decode<{ id: string }>(cookies["x-token"])?.payload?.id
        : crypto.randomUUID();

    const payload = await jwt.sign({ id }, APP_KEY);
    const res = Response.json({ token: payload, userId: id });
    res.headers.set(
      "Set-Cookie",
      cookie.serialize("x-token", payload, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      })
    );

    return res;
  }

  schedulePruneForUser(conn: Party.Connection<ConnState>) {
    const allUserSocks = this.room.getConnections(conn.state?.userId);
    if (Array.from(allUserSocks).length === 0) {
      console.log(`Scheduling Alarm to prune players`);
      this.room.storage.setAlarm(Date.now() + 5 * 1000);
    }
  }

  syncState(targets?: Player["id"][]) {
    this.sendEvent({ event: "sync:state", data: this.gameState }, targets);
  }

  playOrPass(
    event: Extract<CLIENT_EVENTS_TYPE, { event: "playOrPass" }>,
    conn: Party.Connection<ConnState>
  ) {
    const userId = this.getUserIdFromConn(conn);
    const player = this.gameState.players.find((p) => p.id === userId);
    if (this.gameState.faceOff && player) {
      this.gameState.faceOff.playOrPassDecision(player, event.play);
    }
  }

  stealOrPass(
    event: Extract<CLIENT_EVENTS_TYPE, { event: "stealOrPass" }>,
    conn: Party.Connection<ConnState>
  ) {
    const userId = this.getUserIdFromConn(conn);
    const player = this.gameState.players.find((p) => p.id === userId);
    if (this.gameState.faceOff && player) {
      this.gameState.faceOff.stealOrPassDecision(player, event.play);
    }
  }

  voteStart(
    event: Extract<CLIENT_EVENTS_TYPE, { event: "voteStart" }>,
    conn: Party.Connection<ConnState>
  ) {
    const team1HasPlayers = this.gameState.players.find((a) => a.team === "a");
    const team2HasPlayers = this.gameState.players.find((a) => a.team === "b");
    if (
      this.gameState.stage === "LOBBY" &&
      team1HasPlayers &&
      team2HasPlayers
    ) {
      this.gameState.stage = "INTRO";
      this.syncState();
      // this.sendEvent({ event: "play:sound", sound: "INTRO" });
      // setTimeout(() => this.startGame(), 1000 * 13);
      this.startGame();
    }
  }

  startGame() {
    if (this.gameState.stage === "INTRO") {
      this.gameState.stage = "FACE_OFF";
      this.startFeud();
    }
  }

  handleFaceOff(
    event: Extract<CLIENT_EVENTS_TYPE, { event: "answerQuestion" }>,
    conn: Party.Connection<ConnState>,
    response: Awaited<ReturnType<typeof gradeQuestion>>
  ) {}

  async answerQuestion(
    event: Extract<CLIENT_EVENTS_TYPE, { event: "answerQuestion" }>,
    conn: Party.Connection<ConnState>
  ) {
    const userId = this.getUserIdFromConn(conn);
    const player = this.gameState.players.find((p) => p.id === userId);

    if (
      this.gameState.stage === "FACE_OFF" &&
      this.gameState.faceOff &&
      player
    ) {
      await this.gameState.faceOff.answerQuestion(player, event.answer);
    }

    this.syncState();
  }
  pressBuzzer(
    event: Extract<CLIENT_EVENTS_TYPE, { event: "pressBuzzer" }>,
    conn: Party.Connection<ConnState>
  ) {
    const userId = this.getUserIdFromConn(conn);
    const player = this.gameState.players.find((p) => p.id === userId);
    if (
      this.gameState.faceOff &&
      this.gameState.stage === "FACE_OFF" &&
      player
    ) {
      this.gameState.faceOff.buzzer(player);
    }
    this.syncState();
  }
  playerJoined(
    event: Extract<CLIENT_EVENTS_TYPE, { event: "playerJoined" }>,
    conn: Party.Connection<ConnState>
  ) {
    const id = this.getUserIdFromConn(conn);
    const existingUser = this.gameState.players.find(
      (player) => player.id === id
    );
    if (existingUser) {
      if (event.name) existingUser.name = event.name;
      if (this.gameState.stage === "LOBBY") {
        existingUser.team = event.team;
      }
    } else if (id) {
      this.gameState.players.push({
        id,
        name: event.name ?? "Random Player",
        team: event.team,
      });
    }
    this.syncState();
  }

  startFeud() {
    const question = loadFeudQuestion(this.seenQuestions);
    console.log(JSON.stringify(question, null, 2));
    if (question) {
      this.gameState.faceOff = new FaceOff(
        question,
        this.gameState.players,
        gradeQuestion,
        [
          () => {
            this.syncState();
            if (this.gameState.faceOff?.stage === "END") {
              const state = this.gameState.faceOff;
              if (state.winningTeam === "a") {
                this.gameState.teams.a.points +=
                  state.board.points * this.seenQuestions.length;
              }
              if (state.winningTeam === "a") {
                this.gameState.teams.b.points +=
                  state.board.points * this.seenQuestions.length;
              }

              if (this.seenQuestions.length < 4) {
                setTimeout(() => {
                  this.startFeud();
                }, 1000 * 10);
              } else {
                this.syncState();
              }
            }
          },
        ]
      );
      this.gameState.faceOff.start();
    }
  }
}

Server satisfies Party.Worker;
