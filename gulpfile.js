const util = require("gulp-util");
const transform = require("gulp-transform");
const rename = require("gulp-rename");
const gulp = require("gulp");
const path = require("path");
const tap = require("gulp-tap");
const cp = require("child_process");
const fs = require("fs");
const clean = require("gulp-clean");
const csvparse = require("csv-parse/lib/sync");
const ejs = require("ejs");
const hash = require("hash.js");
const download = require("gulp-download-stream");

const _ = require("underscore");
const PACKAGE = require("./package.json");

function images() {
  const template = fs.readFileSync(
    path.join(__dirname, "templates", "images.ts"),
    "utf8"
  );

  return gulp
    .src(["images/**/*.png"])
    .pipe(
      tap((file) => {
        file.imagePath = path
          .relative(__dirname, file.path)
          .replace(/\\/g, "/")
          .replace(/\.png$/, "");
        file.animated =
          path.basename(file.path) !== "base.png" &&
          fs.existsSync(file.path.replace(/\.png$/, ".json"));
      })
    )
    .pipe(
      util.buffer((err, files) => {
        fs.writeFileSync(
          path.join(__dirname, "src", "images.ts"),
          template
            .replace(
              '"$1"',
              "\n" +
                files
                  .filter((file) => file.animated)
                  .map((file) => `  | "${file.imagePath}.json"`)
                  .join("\n")
            )
            .replace(
              '"$2"',
              "\n" +
                files
                  .filter((file) => !file.animated)
                  .map((file) => `  | "${file.imagePath}.png"`)
                  .join("\n")
            )
            .replace(
              '"$3"',
              "\n" +
                files
                  .map(
                    (file) =>
                      `  "${
                        file.imagePath + (file.animated ? ".json" : ".png")
                      }",`
                  )
                  .join("\n") +
                "\n"
            )
        );
      })
    );
}

function downloadText() {
  if (!PACKAGE.textAssets)
    throw new Error(`Cannot find "textAssets" in package.json`);

  const downloadCommands = _.chain(PACKAGE.textAssets)
    .map((info, language) => {
      return _.map(info.sheets, (gid, name) => ({
        file: `${name}_${language}.tsv`,
        url: `https://docs.google.com/spreadsheets/d/${info.spreadsheet}/export?format=tsv&sheet&gid=${gid}`,
      }));
    })
    .flatten(true)
    .value();

  return download(downloadCommands).pipe(gulp.dest("text_src/"));
}

function watch(cb) {
  const spawn = cp.spawn("webpack serve --config webpack.dev.js", {
    shell: true,
  });

  spawn.stdout.on("data", (data) => {
    console.log(`${data}`.trim());
  });

  spawn.stderr.on("data", (data) => {
    console.error(`${data}`.trim());
  });

  spawn.on("close", () => cb());
  gulp.watch("images/**/*", images);
}

function yarnToCSV(file, info) {
  console.log(info.basename);

  // const yarnFile = fs.readFileSync(
  //   path.join(__dirname, "levels", file),
  //   "utf8"
  // );

  let currentNode = "";
  let readingHeader = true;
  let body = "LANGUAGE	ID	TEXT	FILE	NODE	LINE	LOCK	COMMENTAIRE	CHANGED?\n";
  let i = 1;
  for (let line of file.split("\n")) {
    line = line.trim();
    if (line === "===") {
      readingHeader = true;
    } else if (line === "---") {
      readingHeader = false;
    } else {
      if (readingHeader) {
        const [name, value] = line.split(": ");
        if (name === "title") {
          currentNode = value;
        }
      } else {
        let [text, id] = line.split("#line:");
        text = text.trim();
        if (
          id === undefined ||
          text === "-> back" ||
          (text.includes("->") && text.includes("@"))
        )
          continue;
        body += "en	";
        body += id + "	";
        body += text + "	";
        body += info.basename.substring(0, info.basename.length - 5) + "	";
        body += currentNode + "	";
        body += i + "	";
        const hashed = hash.sha1().update(text).digest("hex");
        body += hashed.substring(0, 8);
        body += "\n";
      }
    }
    i++;
  }

  return body;
}

function convertLevelsToCSV() {
  return gulp
    .src(["levels/D*.yarn", "levels/End_Screen.yarn"])
    .pipe(transform("utf8", yarnToCSV))
    .pipe(rename({ extname: ".tsv" }))
    .pipe(gulp.dest("levels/lang/en/"));
}

function buildEjsI18n(done) {
  const regex = /_(en|fr)\.json$/;
  const rawTexts = {};

  const jsonDir = fs
    .readdirSync(path.join(__dirname, "json"), "utf-8")
    .filter((filename) => regex.test(filename));

  for (const filename of jsonDir) {
    const match = regex.exec(filename);

    if (match) {
      const lang = match[1];
      const name = filename.replace(regex, "");
      const content = Object.values(
        require(path.join(__dirname, "json", filename))
      );

      if (rawTexts[lang]) {
        rawTexts[lang][name] = content;
      } else
        rawTexts[lang] = {
          [name]: content,
        };
    }
  }

  const context = {
    languages: Object.keys(rawTexts),
    filenames: [
      ...new Set(jsonDir.map((filename) => filename.replace(regex, ""))),
    ],
    rawTexts,
  };

  const template = fs.readFileSync(
    path.join(__dirname, "src", "templates", "i18n.ejs"),
    "utf-8"
  );

  const gen = ejs.render(template, context);

  fs.writeFileSync(
    path.join(__dirname, "src", "generated", "i18n.ts"),
    gen,
    "utf-8"
  );

  done();
}

function convertTsvTextToJson(csvText) {
  const lines = csvparse(csvText, {
    columns: true,
    delimiter: "\t",
    escape: false,
    quote: false,
  });

  const output = {};
  for (const line of lines) {
    if (line.ID === "") continue;

    const obj = {};
    for (const key in line) {
      obj[key.toLowerCase()] = line[key];
    }
    output[line.ID] = obj;
  }

  return JSON.stringify(output, null, 2);
}

function cleanTSV() {
  return gulp
    .src(["text_src", "levels_src"], { read: false, allowEmpty: true })
    .pipe(clean({ force: true }));
}

function convertText() {
  return gulp
    .src(["text_src/*.tsv"])
    .pipe(transform("utf8", convertTsvTextToJson))
    .pipe(rename({ extname: ".json" }))
    .pipe(gulp.dest("json/"));
}

const genTypes = gulp.series(buildEjsI18n);

const genJSON = gulp.series(
  gulp.parallel(downloadText),
  gulp.parallel(convertText),
  cleanTSV
);

exports.images = images;
exports.watch = gulp.series(images, watch);
exports.yarnToCSV = convertLevelsToCSV;
exports.json = genJSON;
exports.types = genTypes;

// Meta-tasks
exports.default = gulp.series(images, genJSON, genTypes);
