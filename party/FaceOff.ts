import type { Player, Question } from "../shared/types";
import type { gradeQuestion } from "./aiAgent";
import { getOpposingTeam } from "./utilts";

const highest = (a: number, b: number) => (a >= b ? a : b);

export class FaceOff {
  stage:
    | "PENDING"
    | "SETUP"
    | "PLAY_OR_PASS"
    | "IN_PLAY"
    | "STEAL_OR_PASS"
    | "STEAL"
    | "END" = "PENDING";

  answerLog: {
    text: string;
    playerId: string;
    team: string;
    isCorrect: boolean;
    points: number;
    stage: FaceOff["stage"];
  }[] = [];

  playersAllowedToBuzz: string[] = [];
  playerAllowedToAnswer?: string;
  answerClosesAt?: Date;

  teamInControl?: "a" | "b";

  teamAStrikes = 0;
  teamBStrikes = 0;

  board: {
    question: string;
    points: number;
    currentAttempt?: string;
    answers: {
      id: string;
      points?: number;
      text?: string;
    }[];
  };
  winningTeam?: string;
  #question: Question;
  #timer?: ReturnType<typeof setTimeout>;
  #listeners: ((
    event: { event: "sync:state" } | { event: "play:sound"; sound: string }
  ) => void)[];
  constructor(
    question: Question,
    public players: Player[],
    private gradeQuestionFunc: typeof gradeQuestion,
    listeners: (() => void)[]
  ) {
    this.#listeners = listeners || [];
    this.#question = question;
    this.board = {
      question: question.question,
      points: 0,
      answers: question.answers.map((a) => ({ id: a.id })),
    };
  }

  sync() {
    this.#listeners.forEach((cb) => cb({ event: "sync:state" }));
  }

  playSound(sound: string) {
    this.#listeners.forEach((cb) => cb({ event: "play:sound", sound }));
  }

  start() {
    this.stage = "SETUP";
    this.playersAllowedToBuzz = [];
    const teamACaptain = this.players.find((player) => player.team === "a");
    const teamBCaptain = this.players.find((player) => player.team === "b");
    if (teamACaptain) this.playersAllowedToBuzz.push(teamACaptain.id);
    if (teamBCaptain) this.playersAllowedToBuzz.push(teamBCaptain.id);
    this.sync();
  }

  playOrPassDecision(player: Player, play: boolean) {
    if (!player.team) {
      return new Error("Player not on team");
    }
    if (this.stage !== "PLAY_OR_PASS") {
      return new Error("Not allowed");
    }
    if (player.team !== this.teamInControl) {
      return new Error("Team not allowed to vote");
    }
    this.stage = "IN_PLAY";
    if (!play) {
      this.teamInControl = getOpposingTeam(player.team);
    }
    const previousPlayerId = this.answerLog.findLast(
      (a) => a.team === this.teamInControl
    )?.playerId;
    const previousPlayer = this.players.find((p) => p.id === previousPlayerId);
    if (previousPlayer) {
      this.setPlayerAllowedToAnswer(this.pickNextPlayer(previousPlayer));
    }
    this.sync();
  }

  buzzer(player: Player) {
    if (this.stage !== "SETUP" || this.playersAllowedToBuzz.length === 0) {
      return Error("Buzzer not open");
    }
    if (!this.playersAllowedToBuzz?.includes(player.id)) {
      return Error("Player not allowed to buzz");
    }
    this.playSound("BUZZ_IN");
    this.playersAllowedToBuzz = [];
    this.setPlayerAllowedToAnswer(player);
    this.sync();
  }

  isAllowedToAnswer(player: Player) {
    return this.playerAllowedToAnswer?.includes(player.id);
  }

  async answerQuestion(player: Player, text: string) {
    if (this.isAllowedToAnswer(player)) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
      if (this.stage === "SETUP") {
        return this.setupQuestion(player, text);
      }
      if (this.stage === "IN_PLAY") {
        return this.inplayQuestion(player, text);
      }
      if (this.stage === "STEAL") {
        return this.stealQuestion(player, text);
      }
    }
    return Error("Player not allowed to answer");
  }

  pickNextPlayer(player: Player): Player {
    const candidates = this.players.filter((p) => p.team === player.team);
    if (candidates.length === 1) return player;
    const currentIndex = candidates.findIndex((p) => p.id === player.id);
    if (currentIndex + 1 < candidates.length) {
      return candidates[currentIndex + 1];
    } else if (currentIndex + 1 === candidates.length) {
      return candidates[0];
    }
    return player;
  }

  private async gradeQuestion(text: string, player: Player) {
    this.playerAllowedToAnswer = undefined;
    this.answerClosesAt = undefined;
    this.board.currentAttempt = text.trim() ?? "...";
    this.sync();
    const response = await this.gradeQuestionFunc(text, this.#question);

    const alreadyOnBoard =
      response?.isCorrect === true &&
      !!this.board.answers.find(
        (a) => response.matchingCorrectAnswerId === a.id && a.text !== undefined
      );

    this.answerLog.push({
      isCorrect: response?.isCorrect && !alreadyOnBoard ? true : false,
      text: text,
      playerId: player.id,
      team: player.team as string,
      stage: this.stage,
      points:
        response?.matchingCorrectAnswerpointsValue !== undefined &&
        response?.isCorrect &&
        !alreadyOnBoard
          ? response.matchingCorrectAnswerpointsValue
          : 0,
    });

    if (alreadyOnBoard) {
      this.playSound("INCORRECT");
      return {
        isCorrect: false,
        userSuppliedAnswer: text.trim(),
      };
    }

    if (this.board?.answers && response?.isCorrect) {
      this.playSound("CORRECT");
      this.board.points =
        this.board.points + (response.matchingCorrectAnswerpointsValue || 0);
      this.board.answers = this.board?.answers.map((a) => {
        if (a.id === response.matchingCorrectAnswerId) {
          a.text = response.matchingCorrectAnswer;
          a.points = response.matchingCorrectAnswerpointsValue;
        }
        return a;
      });
    }
    return response;
  }

  private async setupQuestion(player: Player, text: string) {
    const response = await this.gradeQuestion(text, player);
    if (response?.isCorrect) {
      const isHighestPossibleAnswer =
        this.#question.answers.findIndex(
          (q) => q.id === response.matchingCorrectAnswerId
        ) === 0;

      if (isHighestPossibleAnswer) {
        return this.transitionToPassOrPlay(player.team as string);
      }
    }

    if (this.answerLog.length % 2 === 0) {
      const candidate1 = this.answerLog[this.answerLog.length - 1];
      const candidate2 = this.answerLog[this.answerLog.length - 2];
      if (candidate1.points > candidate2.points)
        return this.transitionToPassOrPlay(candidate1.team);
      if (candidate1.points < candidate2.points)
        return this.transitionToPassOrPlay(candidate2.team);
    }

    const shouldEndGame =
      this.answerLog.length >=
      highest(
        this.players.filter((a) => a.team === "a").length,
        this.players.filter((a) => a.team === "b").length
      ) *
        2;

    if (shouldEndGame) {
      this.transitionToEnd();
    }

    if (this.answerLog.length === 1) {
      const nextPlayer = this.players.find(
        (p) => p.team === getOpposingTeam(player.team as string)
      );
      if (nextPlayer) {
        return this.setPlayerAllowedToAnswer(nextPlayer);
      } else {
        throw new Error("Fatal error, game cannot find next candidate player");
      }
    } else {
      const prevPlayerId = this.answerLog[this.answerLog.length - 2]?.playerId;
      const prevPlayer = this.players.find(
        (player) => player.id === prevPlayerId
      );
      if (!prevPlayer) {
        throw new Error("Fatal error, game cannot find next candidate player");
      }
      const nextPlayer = this.pickNextPlayer(prevPlayer);
      return this.setPlayerAllowedToAnswer(nextPlayer);
    }
  }

  private async inplayQuestion(player: Player, text: string) {
    if (!player.team) {
      return new Error("Player needs team");
    }
    const response = await this.gradeQuestion(text, player);
    if (response?.isCorrect !== undefined && response.isCorrect === false) {
      if (player.team === "a") {
        this.teamAStrikes++;
      }
      if (player.team === "b") {
        this.teamBStrikes++;
      }
    }

    const winCondition =
      this.board.answers.filter((a) => !!a.text).length ===
      this.#question.answers.length;

    if (winCondition) {
      return this.transitionToEnd(player.team);
    }

    const teamStrikes =
      player.team === "a" ? this.teamAStrikes : this.teamBStrikes;
    if (teamStrikes >= 3) {
      return this.transitionToStealOrPass(player.team);
    } else {
      return this.setPlayerAllowedToAnswer(this.pickNextPlayer(player));
    }
  }

  private async stealQuestion(player: Player, text: string) {
    const response = await this.gradeQuestion(text, player);
    if (response?.isCorrect) {
      return this.transitionToEnd(player.team);
    } else {
      return this.transitionToEnd(getOpposingTeam(player.team as string));
    }
  }

  private setPlayerAllowedToAnswer(player: Player) {
    this.playerAllowedToAnswer = player.id;
    this.answerClosesAt = new Date(Date.now() + 10 * 1000);
    this.#timer = setTimeout(() => {
      this.answerQuestion(player, "");
    }, this.answerClosesAt.getTime() - Date.now());
    this.sync();
  }

  private transitionToPassOrPlay(team: string) {
    this.stage = "PLAY_OR_PASS";
    this.playerAllowedToAnswer = undefined;
    this.playersAllowedToBuzz = [];
    this.teamInControl = team as "a" | "b";
    this.sync();
  }

  private transitionToStealOrPass(teamThatJustLost: string) {
    this.stage = "STEAL_OR_PASS";
    this.teamInControl = getOpposingTeam(teamThatJustLost);
    this.sync();
  }

  stealOrPassDecision(player: Player, play: boolean) {
    if (this.teamInControl !== player.team) {
      return new Error("Not allowed");
    }

    if (!play) {
      return this.transitionToEnd(getOpposingTeam(player.team as string));
    }

    this.setPlayerAllowedToAnswer(player);
    this.teamInControl = player.team;
    this.stage = "STEAL";
    this.sync();
  }

  private transitionToEnd(winningTeam?: string) {
    this.winningTeam = winningTeam;
    this.stage = "END";
    this.board.answers.map((a) => {
      const answer = this.#question.answers.find((ca) => ca.id === a.id);
      a.text = answer?.answer;
      a.points = answer?.points;
      return a;
    });
    this.sync();
  }

  getState() {}
}
