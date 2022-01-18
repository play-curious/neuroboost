import * as entity from "booyah/src/entity";

export function loopFX(
  this: entity.EntityBase,
  name: `${string}_LOOP`,
  loopDuration: number
) {
  return new entity.EntitySequence(
    [
      new entity.FunctionCallEntity(() => {
        this._entityConfig.fxMachine.play(name);
      }),
      new entity.WaitingEntity(loopDuration),
    ],
    { loop: true }
  );
}
