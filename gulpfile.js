const gulp = require("gulp");
const transform = require("gulp-transform");
const rename = require("gulp-rename");
const cp = require("child_process");

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
}

exports.convertTextToJson = convertTextToJson;
exports.watch = gulp.series(convertTextToJson, watch);

// Meta-tasks

exports.default = convertTextToJson;
