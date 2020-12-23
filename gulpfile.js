const { src, dest, watch, series, parallel, lastRun, task } = require("gulp");
const browserSync = require("browser-sync").create();
const fs = require("fs");
const { argv } = require("yargs");
const sass = require("gulp-sass");
const cssnano = require("cssnano");
const path = require("path");
const plugins = require("gulp-load-plugins")();
const autoprefixer = require("autoprefixer");
const npmRun = require("npm-run");

const port = argv.port || 9000;

/**
 *------------------------ NEED TO DECLARE OPTION HERE ------------------------------------------
 */
const shopifyHost = "";
const password = "";
const themeID = "";
// const proxy = `${shopifyHost}?preview_theme_id=${themeID}`;
const proxy = `${shopifyHost}`;

const debounce = (func, wait) => {
  let timeout;
  return function (...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

function buildCss(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`${path.basename(filePath)} does not exist.`);
    return;
  }

  return new Promise((resolve, reject) => {
    src(filePath)
      .pipe(sass.sync().on("error", sass.logError))
      .pipe(
        plugins.postcss([
          cssnano({ safe: true, autoprefixer: true }),
          autoprefixer({
            overrideBrowserslist: ["safari >= 10", "last 1 version", "ios >= 10", "ie >= 10"],
          }),
        ])
      )
      .on("error", function (err) {
        console.log(err.toString());
      })
      .pipe(plugins.rename(path.basename(filePath, ".scss") + ".css"))
      .pipe(dest("theme/assets"))
      .on("end", function () {
        console.log(path.basename(filePath) + ": Finish");
      });
  });
}

function cssTask(filePath) {
  let fileName = path.basename(filePath, ".scss");
  let sourceTree = JSON.parse(fs.readFileSync("./app.config.json"));
  Object.keys(sourceTree)
    .filter((item) => sourceTree[item].indexOf(fileName) != -1)
    .map((item) => {
      let filePath = "app/styles/" + item + ".scss";
      buildCss(filePath);
    });
}

async function removeCss(filePath) {
  fs.unlinkSync("theme/assets/" + path.basename(filePath, ".scss") + ".css");
  console.log("Deleted " + path.basename(filePath));
}

async function startServer() {
  browserSync.init({
    proxy,
    port,
    snippetOptions: {
      // Provide a custom Regex for inserting the snippet.
      rule: {
        match: /<\/body>/i,
        fn: function (snippet, match) {
          return snippet + match;
        },
      },
    },
  });

  watch("./app/styles/.common/*.scss").on("change", cssTask);
  watch("./app/styles/*.scss").on("change", buildCss);
  watch("./app/styles/*.scss").on("unlink", removeCss);
  watch(".tmp/theme.update").on(
    "change",
    debounce(function () {
      browserSync.reload("*.css");
    }, 500)
  );
}

async function build() {
  console.time("test");
  let arrPromise = fs
    .readdirSync("app/styles/", { withFileTypes: true })
    .filter((item) => !item.isDirectory())
    .map((item) => {
      let filePath = "app/styles/" + item.name;
      return new Promise((resolve, reject) => {
        src(filePath)
          .pipe(sass.sync().on("error", sass.logError))
          .pipe(
            plugins.postcss([
              cssnano({ safe: true, autoprefixer: true }),
              autoprefixer({
                overrideBrowserslist: ["safari >= 10", "last 1 version", "ios >= 10", "ie >= 10"],
              }),
            ])
          )
          .on("error", function (err) {
            console.log(err.toString());
          })
          .pipe(plugins.rename(path.basename(filePath, ".scss") + ".css"))
          .pipe(dest("theme/assets"))
          .on("end", function () {
            console.log(path.basename(filePath) + ": Finish");
            resolve(path.basename(filePath, ".scss") + ".css");
          });
      });
    });

  Promise.all(arrPromise).then((res) => {
    console.timeEnd("test");
    npmRun.exec(
      `cd theme && theme deploy -a --allow-live ${res.map((item) => "assets/" + item).join(" ")}`,
      function (err, stdout, stderr) {
        if (stdout) console.log(stdout);
        if (stderr) console.log(stderr);
      }
    );
  });
}

exports.serve = startServer;
exports.build = build;
