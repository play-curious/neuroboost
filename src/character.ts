import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as tween from "booyah/src/tween";
import * as entity from "booyah/src/entity";
import * as easing from "booyah/src/easing";

import * as extension from "./extension";

export class Character extends extension.ExtendedCompositeEntity {
  private hiddenX = 1500;
  private shownX = 250;
  private animationDuration = 800;

  constructor(
    public readonly name: string,
    public mood: string,
    public container: PIXI.Container
  ) {
    super();
  }

  _setup() {
    this.container = new PIXI.Container();

    // Set directory to access resources
    const baseDir = `images/characters/${this.name}`;
    const baseJson = require(`../${baseDir}/base.json`);

    // If mood is incorrect, get default one
    if (!_.has(baseJson, this.mood)) this.mood = baseJson["default"] as string;

    // For each part
    for (const bodyPart of baseJson[this.mood]) {
      if (
        _.has(
          this.config.app.loader.resources,
          `${baseDir}/${bodyPart.model}.json`
        )
      ) {
        // Create animated sprite and set properties
        const animatedSpriteEntity = this.makeAnimatedSprite(
          `${baseDir}/${bodyPart.model}.json` as any,
          (it) => {
            it.anchor.set(0.5);
            it.position.copyFrom(bodyPart);
            it.animationSpeed = 0.33;

            if (_.has(bodyPart, "scale")) {
              it.scale.set(bodyPart.scale);
            }
          }
        );

        this._activateChildEntity(
          animatedSpriteEntity,
          entity.extendConfig({
            container: this.container,
          })
        );
      } else {
        console.log(`Missing : ${baseDir}/${bodyPart.model}.json`);
      }
    }

    // Place character on screen

    this.container.position.set(250, 80);
    this.container.scale.set(1.1);
    //characterContainer.setTransform(0, 0, 1, 1); // For test, do not remove
  }

  show() {
    return new tween.Tween({
      duration: this.animationDuration,
      easing: easing.easeOutQuint,
      from: this.hiddenX,
      to: this.shownX,
      onUpdate: (value) => {
        this.container.position.x = value;
      },
    });
  }

  hide() {
    return new tween.Tween({
      duration: this.animationDuration,
      easing: easing.easeOutQuint,
      from: this.shownX,
      to: this.hiddenX,
      onUpdate: (value) => {
        this.container.position.x = value;
      },
    });
  }
}
