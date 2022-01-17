import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";
import * as audio from "booyah/src/audio";
import * as util from "booyah/src/util";

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
  "images/bg/bedroom/fleurs.json",
  "images/bg/bedroom/plants.json",
  "images/bg/bedroom/smoke.json",
  "images/bg/bedroom/vapeur.json",
  //   - Highlights
  "images/ui/highlights/bureau.png",
  "images/ui/highlights/cuisine.png",
  "images/ui/highlights/lit.png",
  "images/ui/highlights/salon.png",

  // Bedroom night
  "images/bg/bedroom_night/base.png",
  "images/bg/bedroom_night/base.json",
  "images/bg/bedroom_night/bocal.json",
  "images/bg/bedroom_night/fleurs.json",
  "images/bg/bedroom_night/plants.json",
  "images/bg/bedroom_night/smoke.json",
  "images/bg/bedroom_night/vapeur.json",
  "images/bg/bedroom_night/nightShade.json",

  // Classroom
  "images/bg/class/base.png",
  "images/bg/class/base.json",
  "images/bg/class/desk_1.json",
  "images/bg/class/desk_2.json",
  "images/bg/class/desk_3.json",
  "images/bg/class/desk_4.json",
  "images/bg/class/desk_5.json",
  "images/bg/class/hologramme.json",
  "images/bg/class/music.json",
  "images/bg/class/plant_1.json",
  "images/bg/class/plant_2.json",

  // Circle
  "images/bg/circle/base.png",
  "images/bg/circle/base.json",
  "images/bg/circle/brain.json",
  "images/bg/circle/sapiens.json",

  // Party
  "images/bg/party/base.png",
  "images/bg/party/base.json",
  "images/bg/party/clignotantRB.json",
  "images/bg/party/clignotantBJ.json",
  "images/bg/party/characters.json",

  // Sport
  "images/bg/sport/base.png",
  "images/bg/sport/base.json",
  "images/bg/sport/bird.json",
  "images/bg/sport/plantsA.json",
  "images/bg/sport/plantsB.json",
  "images/bg/sport/treeLeft.json",
  "images/bg/sport/treeMiddle.json",

  // Others
  "images/bg/desk/base.png",
  "images/bg/outside/base.png",
  "images/bg/kitchen/base.png",
  "images/bg/schema/base.png",

  // ////////////////////////////////////////////
  // Closeups
  "images/closeups/shelf_disorganized.png",
  "images/closeups/shelf_organized.png",

  // ////////////////////////////////////////////
  // Characters

  // Fred
  "images/characters/fred/base.json",
  "images/characters/fred/base_drunk.png",
  "images/characters/fred/base_excited.png",
  "images/characters/fred/base_happy.png",
  "images/characters/fred/base_sad.png",
  "images/characters/fred/base_smiling.png",
  "images/characters/fred/base_surprised.png",

  "images/characters/fred/arm_drunk.json",
  "images/characters/fred/arm_happy.json",
  "images/characters/fred/eyes_b.json",
  "images/characters/fred/eyes_c.json",
  "images/characters/fred/eyes_d.json",
  "images/characters/fred/eyes_e.json",
  "images/characters/fred/eyes_f.json",
  "images/characters/fred/eyes_g.json",
  "images/characters/fred/hair_b.json",
  "images/characters/fred/scarf_b.json",
  "images/characters/fred/sleeves_b.json",
  "images/characters/fred/sleeves_c.json",
  "images/characters/fred/sleeves_d.json",
  "images/characters/fred/sleeves_e.json",
  "images/characters/fred/sleeves_f.json",
  "images/characters/fred/sleeves_g.json",

  // Others
  "images/characters/azul/static.png",
  "images/characters/ledai/static.png",
  "images/characters/sapiens/static.png",
  "images/characters/temde/static.png",
];

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
  graphicalAssets,
  fontAssets,
  jsonAssets,
  fxAssets,
  musicAssets,
  screenSize,
  splashScreen,
  entityInstallers: [audio.installJukebox, audio.installFxMachine],
});

// Resize now, and force the resize to happen when the window size changes
resizeHtmlLayer(screenSize);
window.addEventListener("resize", () => resizeHtmlLayer(screenSize));
