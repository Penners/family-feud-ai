import { JSDOM } from "jsdom";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const __dirname = path.resolve();

function hash(input) {
  return crypto.createHash("md5").update(input).digest("hex");
}

async function main() {
  const input = await fs.readdir(path.join(__dirname, "rawhtml"));
  const output = await Promise.all(
    input.map(async (file) => {
      const [season, noOfQs] = file.replace(".html", "").split("-");
      console.log(`Parsing: ${file}`);
      const data = await parseFile(
        path.join(__dirname, "rawhtml", file),
        season
      );
      await fs.writeFile(
        path.join(__dirname, "output", `${season}-${noOfQs}.json`),
        JSON.stringify(data, null, 2)
      );
      console.log(`Writing: ${season}-${noOfQs}.json`);
      return data;
    })
  );

  fs.writeFile(
    path.join(__dirname, "output", "megalist.json"),
    JSON.stringify(output.flat(), null, 2)
  );
}

async function parseFile(path, season) {
  const file = await fs.readFile(path).then((file) => file.toString());

  const dom = new JSDOM(file);
  const document = dom.window.document;
  const questions = [];
  const t = "body > center > table > tbody > tr > td[valign='TOP'] > p > font";
  document.querySelectorAll(t).forEach((node) => {
    questions.push(node.textContent);
  });

  const a = "body > center > table > tbody > tr > td > center > table > tbody";
  const answers = [];
  document.querySelectorAll(a).forEach((node) => {
    const collection = [];
    node.querySelectorAll("b").forEach((node) => {
      collection.push(node.textContent);
    });
    answers.push(collection);
  });

  const finished = [];
  questions.forEach((q, i) => {
    const temp = {
      id: hash(`${season}-${q.trim()}`),
      question: q.trim().replace(/(\r\n|\n|\r)/gm, ""),
      season,
      answers: [],
    };
    if (answers[i]) {
      for (let x = 0; x < answers[i].length; x += 2) {
        if (answers[i][x] && answers[i][x + 1]) {
          temp.answers.push({
            id: hash(`${season}-${q.trim()}-${answers[i][x].trim()}`),
            answer: answers[i][x].trim().replace(/(\r\n|\n|\r)/gm, ""),
            points: parseInt(answers[i][x + 1]),
          });
        }
      }
      temp.numberOfAnswers = temp.answers.length;
      temp.answers = temp.answers.sort((a, b) => b.points - a.points);
      finished.push(temp);
    }
  });

  return finished;
}

main();
