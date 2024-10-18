import { assert, describe, expect, it } from "vitest";
import type { Player, Question } from "../shared/types";
import { FaceOff } from "./FaceOff";

const question: Question = {
  id: "test",
  season: "test",
  question: "What is a test",
  numberOfAnswers: 6,
  answers: [
    {
      id: "one",
      answer: "one",
      points: 90,
    },
    {
      id: "two",
      answer: "two",
      points: 80,
    },
    {
      id: "three",
      answer: "three",
      points: 70,
    },
    {
      id: "four",
      answer: "four",
      points: 60,
    },
    {
      id: "five",
      answer: "dive",
      points: 50,
    },
    {
      id: "six",
      answer: "six",
      points: 40,
    },
  ],
};

const gradeQuestion = async (text: string, question: Question) => {
  const correct = question.answers.find((a) => a.answer === text);

  return {
    isCorrect: !!correct,
    userSuppliedAnswer: text,
    matchingCorrectAnswer: correct?.answer,
    matchingCorrectAnswerId: correct?.id,
    matchingCorrectAnswerpointsValue: correct?.points,
  };
};

const players: Player[] = [
  {
    id: "a:1",
    team: "a",
    name: "a:1",
  },
  {
    id: "b:1",
    team: "b",
    name: "b:1",
  },
  {
    id: "a:2",
    team: "a",
    name: "a:2",
  },
  {
    id: "b:2",
    team: "b",
    name: "b:2",
  },
];

describe("Setup", () => {
  it("Transitions immediately on highest possible answer", async () => {
    const game1 = new FaceOff(question, players, gradeQuestion, []);
    game1.start();
    const response = game1.buzzer(players[0]);
    await game1.answerQuestion(players[0], question.answers[0].answer);

    expect(game1.stage).toEqual("PLAY_OR_PASS");
    expect(game1.teamInControl).toEqual(players[0].team);

    const game2 = new FaceOff(question, players, gradeQuestion, []);
    game2.start();
    game2.buzzer(players[0]);
    await game2.answerQuestion(players[0], question.answers[1].answer);
    await game2.answerQuestion(players[1], question.answers[0].answer);

    expect(game2.stage).toEqual("PLAY_OR_PASS");
    expect(game2.teamInControl).toEqual(players[1].team);

    const game3 = new FaceOff(question, players, gradeQuestion, []);
    game3.start();
    game3.buzzer(players[0]);
    await game3.answerQuestion(players[0], question.answers[2].answer);
    await game3.answerQuestion(players[1], "");
    await game3.answerQuestion(players[2], question.answers[0].answer);

    expect(game3.stage).toEqual("PLAY_OR_PASS");
    expect(game3.teamInControl).toEqual(players[2].team);
  });

  it("Picks the winner of the setup round based on the highest points answer", async () => {
    const game1 = new FaceOff(question, players, gradeQuestion, []);
    game1.start();
    game1.buzzer(players[0]);

    await game1.answerQuestion(players[0], question.answers[3].answer);
    assert(
      await game1.answerQuestion(players[0], question.answers[3].answer),
      "Not allowed"
    );
    await game1.answerQuestion(players[1], question.answers[2].answer);

    expect(game1.stage).toEqual("PLAY_OR_PASS");
    expect(game1.teamInControl).toEqual(players[1].team);

    const game2 = new FaceOff(question, players, gradeQuestion, []);
    game2.start();
    game2.buzzer(players[0]);

    assert(
      (await game2.answerQuestion(players[0], question.answers[3].answer)) ===
        undefined,
      "no error"
    );
    assert(
      await game2.answerQuestion(players[0], question.answers[3].answer),
      "error"
    );
    assert((await game2.answerQuestion(players[1], "")) === undefined, "error");

    expect(game2.stage).toEqual("PLAY_OR_PASS");
    expect(game2.teamInControl).toEqual(players[0].team);

    const game3 = new FaceOff(question, players, gradeQuestion, []);
    game3.start();
    game3.buzzer(players[0]);

    await game3.answerQuestion(players[0], "");
    assert(
      await game3.answerQuestion(players[0], question.answers[3].answer),
      "Not allowed"
    );

    await game3.answerQuestion(players[1], question.answers[2].answer);

    expect(game3.stage).toEqual("PLAY_OR_PASS");
    expect(game3.teamInControl).toEqual(players[1].team);
  });

  it("Ends the game if none of the teams can provide a correct answer", async () => {
    const game = new FaceOff(question, players, gradeQuestion, []);
    game.start();
    game.buzzer(players[0]);
    await game.answerQuestion(players[0], "");
    await game.answerQuestion(players[1], "");
    await game.answerQuestion(players[2], "");
    await game.answerQuestion(players[3], "");

    const res = await game.answerQuestion(players[3], "");
    expect(res).toBeInstanceOf(Error);

    expect(game.stage).toEqual("END");
  });
});

describe("Play or pass", () => {
  it("The winner of the setup round is given the choice to pass or play", async () => {
    const game = new FaceOff(question, players, gradeQuestion, []);
    // setup 1 team winners
    game.start();
    await game.buzzer(players[0]);
    await game.answerQuestion(players[0], question.answers[0].answer);
    expect(game.stage).toBe("PLAY_OR_PASS");
    expect(game.teamInControl).toBe(players[0].team);
  });
  it("Choosing pass transitions the game to inplay but gives control to the opposing team", async () => {
    const game = new FaceOff(question, players, gradeQuestion, []);
    // setup 1 team winners
    game.start();
    await game.buzzer(players[0]);
    await game.answerQuestion(players[0], question.answers[0].answer);
    expect(game.stage).toBe("PLAY_OR_PASS");
    expect(game.teamInControl).toBe(players[0].team);
    await game.playOrPassDecision(players[0], false);
    expect(game.stage).toBe("IN_PLAY");
    expect(game.teamInControl).toBe(players[1].team);
  });

  it("Choosing play transitions the game to inplay the team who won the setup retain control", async () => {
    const game = new FaceOff(question, players, gradeQuestion, []);
    // setup 1 team winners
    game.start();
    await game.buzzer(players[0]);
    await game.answerQuestion(players[0], question.answers[0].answer);
    expect(game.stage).toBe("PLAY_OR_PASS");
    expect(game.teamInControl).toBe(players[0].team);
    await game.playOrPassDecision(players[0], true);
    expect(game.stage).toBe("IN_PLAY");
    expect(game.teamInControl).toBe(players[0].team);
  });

  it("A player from the opposing team cannot make a play or pass decision", async () => {
    const game = new FaceOff(question, players, gradeQuestion, []);
    // setup 1 team winners
    game.start();
    await game.buzzer(players[0]);
    await game.answerQuestion(players[0], question.answers[0].answer);
    expect(game.stage).toBe("PLAY_OR_PASS");
    expect(await game.playOrPassDecision(players[1], true)).toBeInstanceOf(
      Error
    );
  });
});
