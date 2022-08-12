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
import * as chapter_menus from "./chapter_menus";
import _ from "underscore";

class RequestTransitionEntity extends entity.EntityBase {
  constructor(public readonly f: () => entity.Transition) {
    super();
  }

  _setup() {
    this._transition = this.f();
  }
}

function checkSave(): entity.Transition {
  // if no save exists, start with the prologue
  if (!save.hasSave()) return entity.makeTransition("Prologue");

  // Load variable storage from memory
  this._entityConfig.variableStorage.data = save.getVariableStorage();

  const loadedChapterData = save.getCurrentChapter();

  // If the save exists but doesn't specify a level, go to the table of contents
  if (!loadedChapterData) {
    return entity.makeTransition("toc");
  } else {
    // Go to the specified chapter, providing the chapter data
    return entity.makeTransition(loadedChapterData.levelName, {
      loadedChapterData,
    });
  }
}

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
const variableStorage = new variable.VariableStorage({
  journalAnswers: {},
  ballsJuggled: 0,
  isDebugMode: false,
  mentalLoad: "0",
  learning: "0",
  stress: "0",
  sleep: "100",
  name: "Apprenant",
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

let states: { [k: string]: entity.EntityResolvable } = {
  start: new RequestTransitionEntity(checkSave),
  toc: new chapter_menus.TableOfContents(),
  outro_video: outroVideoScene,
};

const allDialogScenes = dialog.dialogScenes.concat(
  dialog.debuggingDialogScenes
);
for (const dialogScene of allDialogScenes) {
  states[dialogScene] = new dialog.DialogScene(dialogScene);
}

const transitions: Record<string, entity.TransitionDescriptor> = {};

// Each dialog scene leads to the next
for (let i = 0; i < dialog.dialogScenes.length - 1; i++) {
  transitions[dialog.dialogScenes[i]] = entity.makeTransition(
    dialog.dialogScenes[i + 1]
  );
}

// The last dialog scene goes to the outro video, then the end
transitions[dialog.dialogScenes.length - 1] =
  entity.makeTransition("outro_video");
transitions["outro_video"] = entity.makeTransition("end");

// The TOC transition is based on the type and index
transitions["toc"] = (transition: entity.Transition) => {
  if (transition.name === "continue") {
    // Go to the specified chapter, providing the chapter data
    const loadedChapterData = save.getCurrentChapter();
    return entity.makeTransition(loadedChapterData.levelName, {
      loadedChapterData,
    });
  }

  // The player must have picked a level
  console.assert(transition.name === "pick");

  const sceneType = transition.params.type as chapter_menus.SceneType;
  if (sceneType === "level") {
    // Jump to the level
    return entity.makeTransition(dialog.dialogScenes[transition.params.index]);
  } else if (sceneType == "sages") {
    // Jump to the sages part
    return entity.makeTransition(dialog.dialogScenes[transition.params.index], {
      startNode: "Assemblee_Sages",
    });
  } else {
    console.assert(sceneType === "journal");
    // Jump to the journal part
    return entity.makeTransition(dialog.dialogScenes[transition.params.index], {
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
  "Neutral2",
  "Neutral3",
  "Tense",
  "Danse",
  "Solo1",
  "Solo2",
  "AcousticGuitar",
  "JungleBodyBeat",
];

const params = new URLSearchParams(window.location.search);

const lang = params.get("lang") ?? navigator.language;

const textAssetNames = ["journal", "interface", "c1"];

const jsonAssets = textAssetNames.map((key) => ({
  key,
  url: `json/${key}_${lang}.json`,
}));

const videoAssets = ["game-by-play-curious"];

const fontAssets: string[] = ["Ubuntu", "Jura"];

export const screenSize = new PIXI.Point(1920, 1080);

const splashScreen = "images/splash_screen.jpg";
const startingScene = params.get("level") || params.get("scene") || "start";
const startingNode = params.get("startNode") || params.get("node") || "Start";
const startingSceneParams = { startNode: startingNode };

booyah.go({
  rootConfig: {
    language: lang,
  },
  startingScene,
  startingSceneParams,
  states,
  transitions,
  graphicalAssets: images.graphicalAssets,
  jsonAssets,
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
