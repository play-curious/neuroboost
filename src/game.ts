import * as PIXI from "pixi.js";
import * as yarnBound from "yarn-bound";

import * as narration from "booyah/src/narration";
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
import * as toc from "./toc";
import _ from "underscore";

// Strange audio bug makes narration.VideoScene not work for this
const outroVideoScene = new entity.ParallelEntity([
  new entity.VideoEntity("game-by-play-curious", { scale: 2 }),
  new entity.FunctionCallEntity(function () {
    this._entityConfig.fxMachine.play("game-by-play-curious");
  }),
]);

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
  journalAnswers: {},
  ballsJuggled: 0,
  isDebugMode: false,
  mentalLoad: "0",
  learning: "0",
  stress: "0",
  sleep: "100",
  name: "Moi",
  time: "540",
  eval: "",
  food: "100",
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
  rootConfig.history = {
    texts: [],
    lastTime: 0,
  };
}

// Setup level order
const dialogScenes = [
  "Prologue",
  "C1",
  "C2",
  "D3_level2",
  "D4_level2",
  "D5_level2",
  "D6",
  "D7_level2",
];

const debuggingDialogScenes = ["characters", "backgrounds", "test_simulation"];

let states: { [k: string]: entity.EntityResolvable } = {
  // Start_Menu: new save.StartMenu(),
  toc: new toc.TableOfContents(),
  outro_video: outroVideoScene,
};

const allDialogScenes = dialogScenes.concat(debuggingDialogScenes);
for (const dialogScene of allDialogScenes) {
  states[dialogScene] = new dialog.DialogScene(dialogScene);
}

const transitions: Record<string, entity.TransitionDescriptor> = {};

// Each dialog scene leads to the next
for (let i = 0; i < dialogScenes.length - 1; i++) {
  transitions[dialogScenes[i]] = entity.makeTransition(dialogScenes[i + 1]);
}

// The last dialog scene goes to the outro video, then the end
transitions[dialogScenes.length - 1] = entity.makeTransition("outro_video");
transitions["outro_video"] = entity.makeTransition("end");

// The TOC transition is based on the type and index
transitions["toc"] = (transition: entity.Transition) => {
  const sceneType = transition.params.type as toc.SceneType;
  if (sceneType === "level") {
    // Jump to the level
    return entity.makeTransition(dialogScenes[transition.params.index]);
  } else if (sceneType == "sages") {
    // Jump to the sages part
    return entity.makeTransition(dialogScenes[transition.params.index], {
      startNode: "Assemblee_Sages",
    });
  } else {
    console.assert(sceneType === "journal");
    // Jump to the journal part
    return entity.makeTransition(dialogScenes[transition.params.index], {
      startNode: "Journal",
    });
  }
};

// TODO: only load yarn files as they are needed?
async function levelLoader(entityConfig: entity.EntityConfig) {
  const levels: Record<string, string> = {};
  await Promise.all(
    allDialogScenes.map(async (name) => {
      const response = await fetch(`levels/${name}.yarn`);
      const text = await response.text();
      levels[name] = text;
    })
  );

  entityConfig.levels = levels;
}

// const transitions: Record<string, entity.Transition> = {};
// let i = 0;
// let previousState = "";
// for (const state in states) {
//   if (i === 0) {
//     i++;
//     continue;
//   }
//   if (i !== 1) transitions[previousState] = entity.makeTransition(state);
//   previousState = state;
//   i++;
// }
// transitions[previousState] = entity.makeTransition("end");

const fxAssets = [
  "Narration_TypeWriter_LOOP",
  "Dialog_TypeWriter_LOOP",
  "AlarmClock_LOOP",
  "TVStarwars_LOOP",
  "Bell_Meditation",
  "PhoneRing_LOOP",
  "Teleportation",
  "Notification",
  "Sports_LOOP",
  "Sleep_LOOP",
  "Chime_LOOP",
  "Work_LOOP",
  "Success",
  "EatCook",
  "Failure",
  "Click",
  "Spawn",
  "Warp",
  "game-by-play-curious",
];

const musicAssets = [
  "AcousticGuitar",
  "NegativeSad",
  "Mysterious",
  "DanseQuiet",
  "Victory",
  "Neutral",
  "Tense",
  "Danse",
  "Solo1",
  "Solo2",
  "AcousticGuitar",
  "JungleBodyBeat",
];

const videoAssets = ["game-by-play-curious"];

const fontAssets: string[] = ["Ubuntu", "Jura"];

export const screenSize = new PIXI.Point(1920, 1080);

const splashScreen = "images/splash_screen.png";

const params = new URLSearchParams(window.location.search);
const startingScene = params.get("level") || params.get("scene") || "toc";
const startingNode = params.get("startNode") || params.get("node") || "Start";
const startingSceneParams = { startNode: startingNode };

booyah.go({
  startingScene,
  startingSceneParams,
  states,
  transitions,
  graphicalAssets: images.graphicalAssets,
  fontAssets,
  fxAssets,
  musicAssets,
  videoAssets,
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
document.addEventListener("fullscreenchange", () =>
  resizeHtmlLayer(screenSize)
); //
