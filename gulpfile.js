const transform = require("gulp-transform");
const rename = require("gulp-rename");
const util = require("gulp-util");
const gulp = require("gulp");
const path = require("path");
const tap = require("gulp-tap");
const cp = require("child_process");
const fs = require("fs");

function convertYarnToJson(text) {
  const allNodes = [];

  let currentNode = {};
  let readingHeader = true;
  let body = "";
  for (let line of text.split("\n")) {
    line = line.trim();
    if (line === "===") {
      // New node
      currentNode.body = body;
      if (!currentNode.hasOwnProperty("tags")) currentNode.tags = "";
      allNodes.push(currentNode);
      currentNode = {};
      readingHeader = true;
      body = "";
    } else if (line === "---") {
      // Done with header
      readingHeader = false;
    } else {
      if (readingHeader) {
        const [name, value] = line.split(": ");
        // Special treatment for position and color
        if (name === "position") {
          const position = value.split(",");
          currentNode.position = {
            x: parseInt(position[0]),
            y: parseInt(position[1]),
          };
        } else if (name === "colorID") {
          currentNode.colorID = parseInt(value);
        } else {
          currentNode[name] = value;
        }
      } else {
        // Add to body
        body += line + "\n";
      }
    }
  }

  return JSON.stringify(allNodes, null, 2);
}

function convertTextToJson() {
  return gulp
    .src(["text_src/*.yarn"])
    .pipe(transform("utf8", convertYarnToJson))
    .pipe(rename({ extname: ".json" }))
    .pipe(gulp.dest("text/"));
}

function handleImages() {
  const template = fs.readFileSync(
    path.join(__dirname, "templates", "images.ts"),
    "utf8"
  );

  return gulp
    .src("images/**/*.png")
    .pipe(
      tap((file) => {
        file.imagePath = path
          .relative(__dirname, file.path)
          .replace(/\\/g, "/")
          .replace(/\.png$/, "");
        file.animated = fs.existsSync(file.path.replace(/\.png$/, ".json"));
      })
    )
    .pipe(
      util.buffer((err, files) => {
        fs.writeFileSync(
          path.join(__dirname, "src", "images.ts"),
          template
            .replace(
              '"$1"',
              files
                .filter((file) => file.animated)
                .map((file) => `"${file.imagePath}.json"`)
                .join(" | ")
            )
            .replace(
              '"$2"',
              files
                .filter((file) => !file.animated)
                .map((file) => `"${file.imagePath}.png"`)
                .join(" | ")
            )
            .replace(
              '"$3"',
              files
                .map(
                  (file) =>
                    `"${file.imagePath + (file.animated ? ".json" : ".png")}"`
                )
                .join(", ")
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

  gulp.watch("text_src/**/*.yarn", convertTextToJson);
  gulp.watch("images/**/*", handleImages);
}

exports.handleImages = handleImages;
exports.convertTextToJson = convertTextToJson;
exports.watch = gulp.series(convertTextToJson, handleImages, watch);

// Meta-tasks

exports.default = gulp.series(convertTextToJson, handleImages);
