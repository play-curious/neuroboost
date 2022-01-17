import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as geom from "booyah/src/geom";

import * as dialog from "./dialog";
import * as journal from "./journal";

import * as clock from "./clock";
import * as variable from "./variable";

declare const bondage: any;

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
const startNode = params.get("startNode") || params.get("node") || "Start";

// Common attributes for all DialogScene
//   - VariableStorage
//   - Bondage.Runner
//   - Clock
const _variableStorage = new variable.VariableStorage({
  name: "Moi",
  time: "540",
  eval: "",
});
const _runner = new bondage.Runner("");
_runner.setVariableStorage(_variableStorage);
const _clock = new clock.Clock(new PIXI.Point(1920 - 557 / 2, 0));

const statesName = ["D1_level1", "D1_level2", "D2_level1"];

const states: { [k: string]: entity.EntityResolvable } = {};
for (const stateName of statesName) {
  states[stateName === statesName[0] ? "start" : stateName] =
    new dialog.DialogScene(
      stateName,
      startNode,
      _runner,
      _variableStorage,
      _clock
    );
  states[`journal_${stateName}`] = new journal.JournalScene(_variableStorage);
}

const transitions: Record<string, entity.Transition> = {};
let i = 0;
let previousState = "";
for (const state in states) {
  if (i != 0) transitions[previousState] = entity.makeTransition(state);
  previousState = state;
  i++;
}
transitions[previousState] = entity.makeTransition("end");

const jsonAssets: Array<string | { key: string; url: string }> = [];
for (const stateName of statesName) {
  jsonAssets.push({
    key: stateName,
    url: `text/${stateName}.json`,
  });
}

console.log(
  "Scenes(states):",
  states,
  "\n\nTransitions:\n",
  transitions,
  "\n\nJSONAssets:\n",
  jsonAssets
);

const graphicalAssets = [
  // UI
  "images/ui/dialog.png",
  "images/ui/dialog_speaker.png",
  "images/ui/clock.png",
  "images/ui/journal_bg.png",
  "images/ui/journal_button.png",
  "images/ui/choicebox_contour.png",
  "images/ui/choicebox_contour_reversed.png",
  "images/ui/choicebox_empty.png",
  "images/ui/arrow_return.png",

  // ////////////////////////////////////////////
  // Backgrounds

  // Bedroom
  "images/bg/bedroom/base.png",
  "images/bg/bedroom/base.json",
  "images/bg/bedroom/bocal.json",
  "images/bg/bedroom/flowers.json",
  "images/bg/bedroom/plants.json",
  "images/bg/bedroom/smoke.json",
  "images/bg/bedroom/steam.json",

  // Others
  "images/bg/bedroom_night/base.png",
  "images/bg/class/base.png",
  "images/bg/desk/base.png",
  "images/bg/kitchen/base.png",
  "images/bg/party/base.png",
  "images/bg/circle/base.png",
  "images/bg/schema/base.png",

  // ////////////////////////////////////////////
  // Closeups
  "images/closeups/shelf_disorganized.png",
  "images/closeups/shelf_organized.png",

  // ////////////////////////////////////////////
  // Characters

  // Fred
  "images/characters/fred/base.json",
  "images/characters/fred/base_neutral.png",
  "images/characters/fred/base_drunk.png",
  "images/characters/fred/base_excited.png",
  "images/characters/fred/cloth_a.json",
  "images/characters/fred/hair_a.json",
  "images/characters/fred/sleeves_a.json",

  // Others
  "images/characters/azul/static.png",
  "images/characters/ledai/static.png",
  "images/characters/sapiens/static.png",
  "images/characters/temde/static.png",

  // Freechoices
  "images/ui/freechoice.json",
];

const fontAssets: string[] = ["Ubuntu", "Jura"];

const screenSize = new PIXI.Point(1920, 1080);

const splashScreen = "images/bg/outside/base.png";

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
