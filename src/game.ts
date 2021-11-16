import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as audio from "booyah/src/audio";
import * as entity from "booyah/src/entity";
import * as narration from "booyah/src/narration";


class MainScene extends entity.EntityBase {
  _setup() {
    console.log("Setup called");
  }
}

const states: { [k: string]: entity.EntityResolvable } = {
  start: new MainScene()
};

booyah.go({
  states
});
