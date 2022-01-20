import * as PIXI from "pixi.js";
import * as howler from "howler";

import * as narration from "booyah/src/narration";
import * as entity from "booyah/src/entity";
import * as booyah from "booyah/src/booyah";
import * as audio from "booyah/src/audio";

import * as variable from "./variable";
import * as images from "./images";
import * as clock from "./clock";
import * as util from "booyah/src/util";

export abstract class ExtendedCompositeEntity extends entity.CompositeEntity {
  get config(): ExtendedEntityConfig {
    return this._entityConfig as ExtendedEntityConfig;
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
    path: images.StaticSpritePath,
    edit?: (it: PIXI.Sprite) => unknown
  ): PIXI.Sprite {
    const sprite = new PIXI.Sprite(
      this.config.app.loader.resources[path].texture
    );

    edit?.(sprite);

    return sprite;
  }

  makeAnimatedSprite(
    path: images.AnimatedSpritePath,
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
    styles: Partial<PIXI.TextStyle> & { fontFamily: "Ubuntu" | "Jura" },
    edit?: (it: PIXI.Text) => unknown
  ): PIXI.Text {
    const pixiText = new PIXI.Text(text, styles);

    edit?.(pixiText);

    return pixiText;
  }
}

interface ExtendedEntityConfig extends entity.EntityConfig {
  variableStorage: variable.VariableStorage;
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
}
