import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";

import * as dialog from "./dialog";

const params = new URLSearchParams(window.location.search);
const startNode = params.get("startNode") || "Start";

const states: { [k: string]: entity.EntityResolvable } = {
  start: new dialog.DialogScene("level1", startNode),
};

const transitions = {
  start: entity.makeTransition("end"),
};

const graphicalAssets = [
  // UI
  "images/ui/dialog.png",
  "images/ui/clock.png",

  // Backgrounds
  "images/bg/bedroom.png",
  "images/bg/bedroom_night.png",

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

const fontAssets: string[] = ["Ubuntu"];

const jsonAssets = [{ key: "level1", url: "text/level1.json" }];

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
