const util = require("gulp-util");
const transform = require("gulp-transform");
const rename = require("gulp-rename");
const gulp = require("gulp");
const path = require("path");
const tap = require("gulp-tap");
const cp = require("child_process");
const fs = require("fs");
const hash = require("hash.js");

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
        if(id === undefined
        || text === "-> back"
        || (text.includes("->") && text.includes("@"))) continue;
        body += "en	";
        body += id + "	";
        body += text + "	";
        body += info.basename.substring(0, info.basename.length-5) + "	";
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

exports.images = images;
exports.watch = gulp.series(images, watch);
exports.yarnToCSV = convertLevelsToCSV;

// Meta-tasks

exports.default = images;
