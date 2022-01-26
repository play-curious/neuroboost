import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";
import * as audio from "booyah/src/audio";
import * as util from "booyah/src/util";

import * as dialog from "./dialog";
import * as journal from "./journal";

import * as clock from "./clock";
import * as images from "./images";
import * as variable from "./variable";

import * as yarnBound from "yarn-bound";

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
//   - Clock
const _variableStorage = new variable.VariableStorage({
  name: "Moi",
  time: "540",
  eval: "",
  sleep: "100",
  food: "100",
});
const globalHistory: yarnBound.Result[] = [];
function runnerMaker(file: string): yarnBound.YarnBound<variable.VariableStorage> {
  const runner = new yarnBound.YarnBound({
    dialogue: file,
    startAt: startNode,
    variableStorage: _variableStorage,
    functions: {}
  });
  runner.history = globalHistory;
  return runner;
};
const _clock = new clock.Clock(new PIXI.Point(1920 - 557 / 2, 0));

export function installGameDatas(rootConfig: entity.EntityConfig) {
  rootConfig.variableStorage = _variableStorage;
  rootConfig.clock = _clock;
  rootConfig.app.renderer.plugins.interaction.mouseOverRenderer = true;
}


// prettier-ignore
const statesName = [
  "D1_level1",
  "D1_level2",
  "D2_level1"
];

const states: { [k: string]: entity.EntityResolvable } = {};
for (const stateName of statesName) {
  states[stateName === statesName[0] ? "start" : stateName] =
    new dialog.DialogScene(
      stateName,
      startNode,
      _variableStorage,
      _clock
    );
  states[`journal_${stateName}`] = new journal.JournalScene(_variableStorage);
}

async function yarnsLoader(){
  const texts = await Promise.all(statesName.map(name => fetch(`levels/${name}.yarn`).then(async (response) => {
    return response.text()
  })))

  let i = 0
  for(const stateName in states){
    if(states[stateName] instanceof dialog.DialogScene){
      (states[stateName] as dialog.DialogScene).loadRunner(runnerMaker(texts[i]));
      i++
    }
  }
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

const splashScreen = "images/bg/outside/base.png";

booyah.go({
  states,
  transitions,
  graphicalAssets: images.graphicalAssets,
  fontAssets,
  fxAssets,
  musicAssets,
  screenSize,
  splashScreen,
  extraLoaders: [yarnsLoader],
  entityInstallers: [
    audio.installJukebox,
    audio.installFxMachine,
    installGameDatas,
  ],
});

// Resize now, and force the resize to happen when the window size changes
resizeHtmlLayer(screenSize);
window.addEventListener("resize", () => resizeHtmlLayer(screenSize));
