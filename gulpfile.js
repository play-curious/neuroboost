const util = require("gulp-util");
const gulp = require("gulp");
const path = require("path");
const tap = require("gulp-tap");
const cp = require("child_process");
const fs = require("fs");

function handleImages() {
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
  gulp.watch("images/**/*", handleImages);
}

exports.handleImages = handleImages;
exports.watch = gulp.series(handleImages, watch);

// Meta-tasks

exports.default = handleImages;
