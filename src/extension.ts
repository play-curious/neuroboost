import * as _ from "underscore";
import * as PIXI from "pixi.js";
import * as howler from "howler";
import * as yarnBound from "yarn-bound";
import MultiStyleText from "pixi-multistyle-text";

import * as narration from "booyah/src/narration";
import * as entity from "booyah/src/entity";
import * as booyah from "booyah/src/booyah";
import * as audio from "booyah/src/audio";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";
import * as util from "booyah/src/util";

import * as filter from "./graphics_filter";
import * as variable from "./variable";
import * as images from "./images";
import * as clock from "./clock";
import * as dialog from "./dialog";

export abstract class ExtendedCompositeEntity extends entity.CompositeEntity {
  static loadSave = false;

  get config(): ExtendedEntityConfig {
    return this._entityConfig as ExtendedEntityConfig;
  }

  makeCharacter(
    character: string,
    mood: string,
    displayMode: string,
    animate: boolean
  ): {
    container: PIXI.Container;
    entity: entity.ParallelEntity;
    holo: boolean;
  } {
    const CE = {
      container: new PIXI.Container(),
      entity: new entity.ParallelEntity(),
      holo: displayMode === "holo",
    };

    CE.container.setTransform(250, 80, 1, 1);

    // Set directory to access resources
    const baseDir = `images/characters/${character}`;
    const baseJson = require(`../${baseDir}/base.json`);

    // If mood is incorrect, get default one
    if (!_.has(baseJson, mood)) mood = baseJson["default"];

    // For each part
    for (const bodyPart of baseJson[mood]) {
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

        // Add animated sprite to entity
        CE.entity.addChildEntity(animatedSpriteEntity);
      } else {
        console.log(`Missing : ${baseDir}/${bodyPart.model}.json`);
      }
    }

    // Handle holographic filter
    if (displayMode === "holo") {
      const holo = filter.newHolograph();
      const glitch = filter.newGlitch();
      const adjust = filter.newAdjustment();
      const glow = filter.newGlow();
      CE.container.filters = [holo, glow, adjust, glitch];
      this._activateChildEntity(filter.wrapHolograph(holo as any));
      this._activateChildEntity(filter.wrapGlitchHolo(glitch as any));
    }

    // If character changed, do animation
    if (animate) {
      if (displayMode === "holo") {
        this._activateChildEntity(
          new tween.Tween({
            duration: 250,
            easing: easing.easeInCubic,
            from: 0,
            to: 100,
            onUpdate: (value: number) => {
              CE.container.position.y = (100 - value) * 5.4 + 80;
              CE.container.scale.y = value / 100;
              CE.container.position.x = -(100 - value) * 9.6 + 250;
              CE.container.scale.x = (100 - value) / 100 + 1;
            },
          })
        );
      } else {
        this._activateChildEntity(
          new tween.Tween({
            duration: 1500,
            easing: easing.easeOutQuint,
            from: 1500,
            to: 250,
            onUpdate: (value: number) => {
              CE.container.position.x = value;
            },
          })
        );
      }
    }

    return CE;
  }

  makeFxLoop(
    name: `${string}_LOOP`,
    loopDuration: number
  ): entity.EntitySequence {
    return new entity.EntitySequence(
      [
        new entity.FunctionCallEntity(() => {
          this.config.fxMachine.play(name);
        }),
        new entity.WaitingEntity(loopDuration),
      ],
      { loop: true }
    );
  }

  makeSprite(
    path: images.SpritePath,
    edit?: (it: PIXI.Sprite) => unknown
  ): PIXI.Sprite {
    const sprite = new PIXI.Sprite(
      this.config.app.loader.resources[path].texture
    );

    edit?.(sprite);

    return sprite;
  }

  makeAnimatedSprite(
    path: images.SpritePath,
    edit?: (it: PIXI.AnimatedSprite) => unknown
  ) {
    const spriteEntity = util.makeAnimatedSprite(
      this.config.app.loader.resources[path]
    );

    edit?.(spriteEntity.sprite);

    return spriteEntity;
  }

  makeText(
    text: string,
    options: Partial<PIXI.TextStyle> & {
      fontFamily: "Ubuntu" | "Jura";
    } & TextOptions,
    edit?: (it: PIXI.Text) => unknown
  ): PIXI.Text {
    const styles = options;

    delete styles.isSpeaker;

    const pixiText = new MultiStyleText(text, {
      default: styles,
      i: {
        fontStyle: "italic",
      },
      b: {
        fontWeight: "bold",
        fontStyle: options.isSpeaker ? "normal" : "italic",
      },
      bi: {
        fontWeight: "bold",
        fontStyle: "italic",
      },
    });

    edit?.(pixiText);

    return pixiText;
  }
}

interface ExtendedEntityConfig extends entity.EntityConfig {
  variableStorage: variable.VariableStorage;
  globalHistory: yarnBound.Result[];
  levels: Record<string, string>;
  container: PIXI.Container;
  clock: clock.Clock;
  directives: booyah.Directives;
  app: PIXI.Application;
  preloader: PIXI.Loader;
  playOptions: booyah.PlayOptions;
  musicAudio: Record<string, howler.Howl>;
  fxAudio: Record<string, howler.Howl>;
  videoAssets: Record<string, any>;
  jsonAssets: Record<string, any>;
  gameStateMachine: entity.StateMachine;
  menu: booyah.MenuEntity;
  muted: boolean;
  jukebox: audio.Jukebox;
  narrator: narration.SubtitleNarrator;
  fxMachine: audio.FxMachine;
  dialogScene: dialog.DialogScene;
  history: {
    texts: [type: string, text: string][];
    lastTime: number;
  };
}

export interface TextOptions {
  isSpeaker?: boolean;
}
