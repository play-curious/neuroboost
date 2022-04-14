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

const outroVideoScene = new narration.VideoScene({
  video: "game-by-play-curious",
  videoOptions: { scale: 2 },
  musicVolume: 2,
  skipButtonOptions: {
    position: { x: 150, y: 150 },
  },
});

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
  "journal_mentalWorkload",
  "D3_level2",
  "D4_level1",
  "journal_profiles",
  "D4_level2",
  "D5_level1",
  "journal_stress",
  "D5_level2",
  "D6",
  "journal_organisation",
  "D7_level1",
  "D7_level2",
];

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

states["End_Screen"] = outroVideoScene;

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
let i = 0;
let previousState = "";
for (const state in states) {
  if (i === 0) {
    i++;
    continue;
  }
  if (i !== 1) transitions[previousState] = entity.makeTransition(state);
  previousState = state;
  i++;
}
transitions[previousState] = entity.makeTransition("end");

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

const videoAssets = ["game-by-play-curious"]

const fontAssets: string[] = ["Ubuntu", "Jura"];

export const screenSize = new PIXI.Point(1920, 1080);

const splashScreen = "images/splash_screen.png";

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
  videoAssets,
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
);
