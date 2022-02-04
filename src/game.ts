import * as PIXI from "pixi.js";
import * as yarnBound from "yarn-bound";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";
import * as audio from "booyah/src/audio";
import * as util from "booyah/src/util";

import * as save from "./save";
import * as menu from "./menu";

import * as clock from "./clock";
import * as images from "./images";
import * as dialog from "./dialog";
import * as journal from "./journal";
import * as variable from "./variable";

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

  const container = document.getElementById("html-layer");
  const transformCss = `translate(${offset}px, 0px) scale(${scale})`;
  for (const prop of ["transform", "webkitTransform", "msTransform"]) {
    // @ts-ignore
    container.style[prop] = transformCss;
  }
}

// Common attributes for all DialogScene
//   - VariableStorage
//   - Clock
const variableStorage = new variable.VariableStorage({
  name: "Moi",
  time: "540",
  eval: "",
  sleep: "100",
  food: "100",
  learning: "0",
});
const globalHistory: yarnBound.Result[] = [];

// TODO: Move this to dialog rather than in the game
const _clock = new clock.Clock(new PIXI.Point(1920 - 557 / 2, 0));

export function installGameData(rootConfig: entity.EntityConfig) {
  rootConfig.variableStorage = variableStorage;
  rootConfig.globalHistory = globalHistory;
  rootConfig.clock = _clock;
  rootConfig.app.renderer.plugins.interaction.mouseOverRenderer = true;
}

const params = new URLSearchParams(window.location.search);
const startNode = params.get("startNode") || params.get("node") || "Start";

// prettier-ignore
const stateNames = [
  "D1_level1",
  "D1_level2",
  "D2_level1",
  "D2_level2",
  "End_Screen"
];

let startingLevel = "Start_Menu";

const states: { [k: string]: entity.EntityResolvable } = {
  Start_Menu: new save.StartMenu(),
};
for (const stateName of stateNames) {
  states[stateName] = new dialog.DialogScene(stateName, startNode);
  states[`journal_${stateName}`] = new journal.JournalScene(variableStorage);
}

async function levelLoader(entityConfig: entity.EntityConfig) {
  const levels: { [k: string]: string } = {};
  await Promise.all(
    stateNames.map(async (name) => {
      const response = await fetch(`levels/${name}.yarn`);
      const text = await response.text();
      levels[name] = text;
    })
  );

  entityConfig.levels = levels;
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

const fxAssets = [
  "AlarmClock_LOOP",
  "Bell_Meditation",
  "Click",
  "Dialog_TypeWriter_LOOP",
  "EatCook",
  "Failure",
  "Narration_TypeWriter_LOOP",
  "Notification",
  "PhoneRing_LOOP",
  "Sleep_LOOP",
  "Sports_LOOP",
  "Success",
  "Teleportation",
  "TVStarwars_LOOP",
  "Work_LOOP",
  "Chime_LOOP",
];

const musicAssets = [
  "Mysterious",
  "NegativeSad",
  "Neutral",
  "Tense",
  "Victory",
];

const fontAssets: string[] = ["Ubuntu", "Jura"];

const screenSize = new PIXI.Point(1920, 1080);

const splashScreen = "images/bg/outside/background.png";

booyah.go({
  startingScene: params.get("level") || params.get("scene") || startingLevel,
  states,
  transitions,
  graphicalAssets: images.graphicalAssets,
  fontAssets,
  fxAssets,
  musicAssets,
  screenSize,
  splashScreen,
  extraLoaders: [levelLoader],
  entityInstallers: [
    audio.installJukebox,
    audio.installFxMachine,
    menu.makeInstallMenu,
    installGameData,
  ],
});

// Resize now, and force the resize to happen when the window size changes
resizeHtmlLayer(screenSize);
window.addEventListener("resize", () => resizeHtmlLayer(screenSize));
