/**
 * Script to check if translations contain line IDs that are not unique.
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
  const lineIdToRecord: Record<string, LineRecord> = {};
  let duplicateCount = 0;

  for (const filename of filenames) {
    const yarnFile = fs.readFileSync(filename, "utf8");
    let lineNumber = 0;

    for (const line of yarnFile.split("\n")) {
      let [text, id] = line.split("#line:");
      if (!id) continue;

      id = id.trim();
      const currentRecord = { id, filename, lineNumber };
      const firstRecord = lineIdToRecord[id];
      if (!firstRecord) {
        // Add to records
        lineIdToRecord[id] = currentRecord;
      } else {
        duplicateCount++;

        console.log("Duplicate line id found:");
        console.log("First at ", lineRecordToString(firstRecord));
        console.log("Again at ", lineRecordToString(currentRecord));
      }
      lineNumber++;
    }
  }

  console.log(`Done. ${duplicateCount} duplicate line IDs found`);
}
