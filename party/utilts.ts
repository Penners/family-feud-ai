import type { Question } from "../shared/types";
import questions from "./../output/megalist.json";

function getRandomInt(max: number) {
  return Math.floor(Math.random() * (max - 0 + 1) + 0);
}

export const loadFeudQuestion = (seenIds?: string[]): Question | undefined => {
  let output: Question | undefined;
  const exclude = seenIds ? seenIds : [];
  const upper = questions.length;
  while (output === undefined) {
    const canididate = getRandomInt(upper);
    if (
      questions[canididate] !== undefined &&
      !exclude.includes(questions[canididate].id)
    ) {
      output = questions[canididate] as Question;
    }
  }

  return output;
};

export const getOpposingTeam = (teamId: string) => {
  return teamId === "a" ? "b" : "a";
};
