import EasySpeech from "easy-speech";

EasySpeech.detect();
const SPEECH_OKAY = EasySpeech.init({ maxTimeout: 5000, interval: 250 })
  .then(() => {
    console.debug("load complete");

    console.log(EasySpeech.voices());
  })
  .catch((e) => console.error(e));

const AudioCache = {
  CORRECT: new Audio("/sounds/correct.mp3"),
  INCORRECT: new Audio("/sounds/incorrect.trimmed.mp3"),
  BUZZ_IN: new Audio("/sounds/buzz-in.mp3"),
  INTRO: new Audio("/sounds/introduction.mp3"),
} as const;

export const playSound = async (
  sound: keyof typeof AudioCache,
  abortSignal?: AbortSignal
) => {
  let audio = AudioCache[sound];
  if (!audio) {
    throw new Error("Not a valid sound");
  }
  audio = new Audio(audio.src);

  return new Promise((resolve, reject) => {
    try {
      const onEnd = () => {
        audio.removeEventListener("ended", onEnd);
        resolve(true);
      };
      if (abortSignal) {
        abortSignal.addEventListener("abort", () => {
          audio.pause();
          onEnd();
          resolve(true);
        });
      }
      audio.addEventListener("ended", onEnd);
      audio.currentTime = 0;
      audio.play();
    } catch (e) {
      console.error(e);
      reject(e);
    }
  });
};
