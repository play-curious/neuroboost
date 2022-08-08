/**
 * Script to merge previous translation with new scripts, updating the yarn file and creating a new TSV translation file.
 *
 * Call like
 *  `ts-node prepare_translation.ts ../../levels/C1.yarn ../../levels/old_translations/D1*.tsv > ../../levels/lang/en/C1.tsv`
 */

// TODO: update yarn file with line tags

const { Command } = require("commander");
const fs = require("fs");
const path = require("path");
const csvparse = require("csv-parse/lib/sync");
// @ts-ignore
const crypto = require("node:crypto");
const hash = require("hash.js");

interface InputTsvRecord {
  LANGUAGE: string;
  ID: string;
  TEXT: string;
  FILE: string;
  NODE: string;
  LINE: string;
  LOCK: string;
  COMMENTAIRE: string;
  "CHANGED?": string;
}

interface OutputTsvRecord {
  LANGUAGE: string;
  ID: string;
  ORIGINAL_TEXT: string;
  TEXT: string;
  FILE: string;
  NODE: string;
  LINE: string;
  LOCK: string;
  COMMENTAIRE: string;
  "CHANGED?": string;
}

const program = new Command();

program
  .description(
    "Prepare translation by creating new TSV files from existing translations and updated files"
  )
  .argument("<yarn_file>", "New Yarn file to translate")
  .argument(
    "<existing_translations...>",
    "TSV files to check for existing translations"
  )
  .action((yarnFile: string, existingTranslations: string[]) => {
    go(yarnFile, existingTranslations);
  });

program.parse();

function shouldSkipLine(line: string): boolean {
  return (
    line === "" ||
    line.startsWith("<<") ||
    line === "-> back" ||
    (line.includes("->") && line.includes("@"))
  );
}

function findLineTranslation(
  existingTranslations: InputTsvRecord[][],
  id: string
): InputTsvRecord | undefined {
  for (const existingTranslation of existingTranslations) {
    for (const record of existingTranslation) {
      if (record.ID === id) return record;
    }
  }

  return;
}

function go(yarnFilename: string, existingTranslationsFilenames: string[]) {
  const basename = path.basename(yarnFilename);

  // Load text files in memory
  const yarnFile = fs.readFileSync(yarnFilename, "utf8");
  // Parse existing translations in TSV format
  const existingTranslations: InputTsvRecord[][] =
    existingTranslationsFilenames.map((filename) => {
      const csvText = fs.readFileSync(filename, "utf8");
      return csvparse(csvText, {
        columns: true,
        delimiter: "\t",
      });
    });

  let outputTsvRecords: OutputTsvRecord[] = [];

  // Read input file line by line
  let currentNode = "";
  let readingHeader = true;
  let lineNumber = 1;
  for (let line of yarnFile.split("\n")) {
    line = line.trim();
    if (line === "===") {
      readingHeader = true;
    } else if (line === "---") {
      readingHeader = false;
    } else if (readingHeader) {
      const [name, value] = line.split(": ");
      if (name === "title") {
        currentNode = value;
      }
    } else if (!shouldSkipLine(line)) {
      // Try to find line tag
      let [text, id] = line.split("#line:");
      if (id) {
        text = text.trim();

        // Line tag exists, try to find it in the translations table
        const record = findLineTranslation(existingTranslations, id);
        if (!record) {
          // The translation can't be found. Keep the line ID
          const output: OutputTsvRecord = {
            LANGUAGE: "en",
            ID: id,
            ORIGINAL_TEXT: text,
            TEXT: "",
            FILE: basename,
            NODE: currentNode,
            LINE: lineNumber.toString(),
            LOCK: hashLine(text),
            COMMENTAIRE: "",
            "CHANGED?": "Missing",
          };
          outputTsvRecords.push(output);
        } else {
          // The translation was found
          // Copy the result to the output table

          const newHash = hashLine(text);
          const hasChanged = newHash !== record.LOCK;

          const output: OutputTsvRecord = {
            LANGUAGE: "en",
            ID: id,
            ORIGINAL_TEXT: text,
            TEXT: record.TEXT,
            FILE: basename,
            NODE: currentNode,
            LINE: lineNumber.toString(),
            LOCK: newHash,
            COMMENTAIRE: record.COMMENTAIRE,
            "CHANGED?": hasChanged ? "Yes" : "No",
          };
          outputTsvRecords.push(output);
        }
      } else {
        // New line

        // @ts-ignore
        const id = "0" + crypto.randomBytes(3).toString("hex");

        const output: OutputTsvRecord = {
          LANGUAGE: "en",
          ID: id,
          ORIGINAL_TEXT: line,
          TEXT: "",
          FILE: basename,
          NODE: currentNode,
          LINE: lineNumber.toString(),
          LOCK: hashLine(text),
          COMMENTAIRE: "",
          "CHANGED?": "New",
        };
        outputTsvRecords.push(output);
      }
    }
    lineNumber++;
  }

  // let body = "LANGUAGE	ID	TEXT	FILE	NODE	LINE	LOCK	COMMENTAIRE	CHANGED?\n";

  const output = generateTsvOutput(outputTsvRecords);
  console.log(output);
}

function generateTsvOutput(outputTsvRecords: OutputTsvRecord[]): string {
  const columns: Array<keyof OutputTsvRecord> = [
    "LANGUAGE",
    "ID",
    "ORIGINAL_TEXT",
    "TEXT",
    "FILE",
    "NODE",
    "LINE",
    "LOCK",
    "COMMENTAIRE",
    "CHANGED?",
  ];

  // Start with header
  let body = columns.join("	") + "\n";

  for (const outputRecord of outputTsvRecords) {
    body += columns.map((column) => outputRecord[column]).join("	") + "\n";
  }

  return body;
}

function hashLine(text: string): string {
  const hashed = hash.sha1().update(text).digest("hex");
  return hashed.substring(0, 8);
}
