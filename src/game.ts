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
import * as miniGame from "./mini_game";

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
  journalAnswers: {},
  ballsJuggled: 0,
  isDebugMode: false,
  sleep: "100",
  food: "100",
  learning: "0",
  mentalLoad: "0",
  stress: "0",
});
const globalHistory: yarnBound.Result[] = [];

// TODO: Move this to dialog rather than in the game
const _clock = new clock.Clock(new PIXI.Point(1920 - 557 / 2, 0));

export function installGameData(rootConfig: entity.EntityConfig) {
  rootConfig.variableStorage = variableStorage;
  rootConfig.globalHistory = globalHistory;
  rootConfig.clock = _clock;
  rootConfig.app.renderer.plugins.interaction.mouseOverRenderer = true;
  rootConfig.debug = false;
}

const params = new URLSearchParams(window.location.search);
const startingNode = params.get("startNode") || params.get("node") || "Start";
const startingScene =
  params.get("level") || params.get("scene") || "Start_Menu";

// prettier-ignore
const stateNames = [
  "D1_level1",
  "journal_method",
  "D1_level2",
  "D2_level1",
  "journal_food",
  "journal_sleep",
  "D2_level2",
  "D3_level1",
  "D3_level2",
  "D4_level1",
  "D4_level2",
  "D3_level1",
  "D3_level2",
  "D4_level1",
  "D4_level2",
  "D5_level1",
  "D5_level2",
  "D6_level1",
  "D7_level1",
  "End_Screen",
];

/*
  missing journal after
  - D3_level1
  - D4_level1
  - D5_level1
  - D6_level1
  - D7_level1
 */

const states: { [k: string]: entity.EntityResolvable } = {
  Start_Menu: new save.StartMenu(),
};
for (const stateName of stateNames) {
  if (stateName.includes("journal"))
    states[`${stateName}`] = new journal.JournalScene(
      variableStorage,
      stateName.split("_")[1]
    );
  else
    states[stateName] = new dialog.DialogScene(
      stateName,
      stateName === startingScene ? startingNode : "Start"
    );
}

async function levelLoader(entityConfig: entity.EntityConfig) {
  const levels: Record<string, string> = {};
  await Promise.all(
    stateNames.map(async (name) => {
      if (!name.includes("journal")) {
        const response = await fetch(`levels/${name}.yarn`);
        const text = await response.text();
        levels[name] = text;
      }
    })
  );

  entityConfig.levels = levels;
}

const transitions: Record<string, entity.Transition> = {};
let i = 1;
let previousState = "";
for (const state in states) {
  if (i !== 1) transitions[previousState] = entity.makeTransition(state);
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
  "Spawn",
  "Warp",
];

const musicAssets = [
  "Mysterious",
  "NegativeSad",
  "Neutral",
  "Tense",
  "Victory",
  "Danse",
  "DanseQuiet",
  "Solo1",
  "Solo2",
];

const fontAssets: string[] = ["Ubuntu", "Jura"];

const screenSize = new PIXI.Point(1920, 1080);

const splashScreen = "images/bg/outside/background.png";

booyah.go({
  startingScene,
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
