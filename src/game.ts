import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as geom from "booyah/src/geom";

import * as dialog from "./dialog";
import * as journal from "./journal";

// Have the HTML layer match the canvas scale and x-offset
function resizeHtmlLayer(appSize: PIXI.Point): void {
  const canvasBbox = document
    .getElementById("pixi-canvas")
    .getBoundingClientRect();
  const canvasSize = new PIXI.Point(canvasBbox.width, canvasBbox.height);
  const scale = util.toFixedFloor(
    Math.min(canvasSize.x / appSize.x, canvasSize.y / appSize.y),
    2
  );
  const offset = util.toFixedFloor(canvasBbox.left, 2);

  console.log("setting scale", scale, "offset", offset);

  const container = document.getElementById("html-layer");
  const transformCss = `translate(${offset}px, 0px) scale(${scale})`;
  for (const prop of ["transform", "webkitTransform", "msTransform"]) {
    // @ts-ignore
    container.style[prop] = transformCss;
  }
}

const params = new URLSearchParams(window.location.search);
const startNode = params.get("startNode") || "Start";

const states: { [k: string]: entity.EntityResolvable } = {
  start: new dialog.DialogScene("level1", startNode),
  journal: new journal.JournalScene(),
  level2: new dialog.DialogScene("level2", startNode),
};

const transitions = {
  start: entity.makeTransition("journal"),
  journal: entity.makeTransition("level2"),
  level2: entity.makeTransition("end"),
};

const graphicalAssets = [
  // UI
  "images/ui/dialog.png",
  "images/ui/clock.png",
  "images/ui/journal_bg.png",
  "images/ui/journal_button.png",

  // Backgrounds
  "images/bg/bedroom.png",
  "images/bg/bedroom_night.png",
  "images/bg/class.png",
  "images/bg/desk.png",
  "images/bg/kitchen.png",
  "images/bg/party.png",
  "images/bg/circle.png",
  "images/bg/schema.png",

  // Closeups
  "images/closeups/shelf_disorganized.png",
  "images/closeups/shelf_organized.png",

  // Fred
  "images/characters/fred/static.png",
  // "images/characters/fred/cloth.json",
  // "images/characters/fred/hair.json",
  // "images/characters/fred/sleeves.json",

  "images/characters/azul/static.png",
  "images/characters/ledai/static.png",
  "images/characters/sapiens/static.png",
  "images/characters/temde/static.png",
];

const fontAssets: string[] = ["Ubuntu", "Jura"];

const jsonAssets = [
  { key: "level1", url: "text/level1.json" },
  { key: "level2", url: "text/level2.json" },
];

const screenSize = new PIXI.Point(1920, 1080);

const splashScreen = "images/bg/outside.png";

booyah.go({
  states,
  transitions,
  graphicalAssets,
  fontAssets,
  jsonAssets,
  screenSize,
  splashScreen,
});

// Resize now, and force the resize to happen when the window size changes
resizeHtmlLayer(screenSize);
window.addEventListener("resize", () => resizeHtmlLayer(screenSize));
