/**
 * Script to check if Yarnspinner files contain duline IDs that are not unique.
 *
 * Call like
 *  `ts-node check_duplicate_line_ids.ts ../../levels/*.yarn`
 */

const { Command } = require("commander");
const fs = require("fs");
const path = require("path");

const program = new Command();

program
  .description("Check if translations contain line IDs that are not unique")
  .argument("<yarn_file...>", "Yarn files to inspect")
  .action((yarnFiles: string) => go(yarnFiles));

program.parse();

interface LineRecord {
  id: string;
  filename: string;
  lineNumber: number;
}

function lineRecordToString(lineRecord: LineRecord): string {
  return `id ${lineRecord.id} at ${lineRecord.filename}:${lineRecord.lineNumber}`;
}

function go(filenames: string) {
  for (const filename of filenames) {
    const lineIdToRecords: Record<string, LineRecord[]> = {};
    const yarnFile = fs.readFileSync(filename, "utf8");
    let duplicateCount = 0;
    let lineNumber = 0;

    for (const line of yarnFile.split("\n")) {
      lineNumber++;

      let [text, id] = line.split("#line:");
      if (!id) continue;

      id = id.trim();
      const currentRecord = { id, filename, lineNumber };
      const existingRecords = lineIdToRecords[id];
      if (!existingRecords) {
        // Add to records
        lineIdToRecords[id] = [currentRecord];
      } else {
        duplicateCount++;
        lineIdToRecords[id].push(currentRecord);
      }
    }

    console.log(
      `Completed ${filename}. ${duplicateCount} duplicate line IDs found`
    );

    for (const lineRecords of Object.values(lineIdToRecords)) {
      if (lineRecords.length === 1) continue;

      for (const record of lineRecords) {
        console.log(lineRecordToString(record));
      }
      console.log("");
    }
  }
}
