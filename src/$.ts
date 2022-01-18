import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";

/**
 * Extension for add useful entity utils
 * @param ctx
 */
export default function $(ctx: entity.EntityBase) {
  return {
    loopFX(
      name: `${string}_LOOP`,
      loopDuration: number
    ): entity.EntitySequence {
      return new entity.EntitySequence(
        [
          new entity.FunctionCallEntity(() => {
            ctx.entityConfig.fxMachine.play(name);
          }),
          new entity.WaitingEntity(loopDuration),
        ],
        { loop: true }
      );
    },
    sprite(
      path: `images/${string}.png`,
      edit?: (it: PIXI.Sprite) => unknown
    ): PIXI.Sprite {
      const sprite = new PIXI.Sprite(
        ctx.entityConfig.app.loader.resources[path].texture
      );

      edit?.(sprite);

      return sprite;
    },
  };
}
