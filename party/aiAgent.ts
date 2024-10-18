import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { Question } from "../shared/types";

const openai = new OpenAI({
  apiKey: process.env.API_KEY,
});

const triviaAnswerSchema = z.object({
  isCorrect: z
    .boolean()
    .describe("Boolean to indicate if the answer was correct"),

  userSuppliedAnswer: z
    .string()
    .describe("The user supplied answer to the question"),
  matchingCorrectAnswer: z
    .string()
    .optional()
    .describe("The answer that was correctly matched"),
  matchingCorrectAnswerId: z
    .string()
    .optional()
    .describe("The id of the answer that was correctly matched"),
  matchingCorrectAnswerpointsValue: z
    .number()
    .describe("The points value of the answer that was correctly matched")
    .optional(),
});

export const gradeQuestion = async (answer: string, question: Question) => {
  if (answer.trim() === "") {
    return {
      isCorrect: false,
      userSuppliedAnswer: "",
    };
  }
  const chatCompletion = await openai.beta.chat.completions.parse({
    messages: [
      {
        role: "system",
        content:
          "You are pretending to be the gameshow host Steve Harvey, you will be grading trivia questions for the game family feud",
      },
      {
        role: "system",
        content:
          `This is the current question: "${question.question}"` +
          "\n\n" +
          "here are the correct answers and their points value" +
          "\n\n" +
          question.answers.map(
            (a) =>
              `id: ${a.id} answer: ${a.answer} - point value: ${a.points}\n`
          ) +
          "\n\n" +
          "The user will now give an answer, you must now tell them if it is correct or not. Exact matches are not required, so long as they contextually have the same meaning",
      },
      {
        role: "user",
        content: answer,
      },
    ],
    model: "gpt-4o-mini",
    response_format: zodResponseFormat(triviaAnswerSchema, "trivia_answer"),
  });

  const response = chatCompletion.choices[0].message.parsed;
  return response;
};
