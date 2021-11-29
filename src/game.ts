import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";

import * as dialog from "./dialog";

const states: { [k: string]: entity.EntityResolvable } = {
  start: new dialog.DialogScene("level1"),
};

const transitions = {
  start: entity.makeTransition("end"),
};

const graphicalAssets = [
  "images/bg/bedroom.png",
  "images/bg/bedroom_night.png",

  // Fred
  "images/characters/fred/base.png",
  "images/characters/fred/cloth.json",
  "images/characters/fred/hair.json",
  "images/characters/fred/sleeves.json",
];

const fontAssets: string[] = ["Ubuntu"];

const jsonAssets = [{ key: "level1", url: "text/level1.json" }];

const screenSize = new PIXI.Point(1920, 1080);

booyah.go({
  states,
  transitions,
  graphicalAssets,
  fontAssets,
  jsonAssets,
  screenSize,
});
