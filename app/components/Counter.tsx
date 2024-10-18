import { useState } from "react";
import PartySocket from "partysocket";
import usePartySocket from "partysocket/react";
import { playSound } from "../utils/sounds";
import { useParams } from "react-router-dom";

const test = {
  quipBeforeRevalinganswer:
    "Whoa, someone's been watching too many action movies!",
  isCorrect: true,
  pointsValue: 5,
  userSuppliedanswer: "Set it on fire",
  matchingCorrectanswer: "BLEW UP",
  quipAfterRevealinganswer:
    "That's one surefire way to get a divorce, alright!",
};

export default function Counter() {
  return (
    <button
      onClick={async () => {
        await playSound("CORRECT");
      }}
    >
      Click Me
    </button>
  );
}
