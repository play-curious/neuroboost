import { Filter } from "pixi.js";
import {
  GlitchFilter,
  CRTFilter,
  GlowFilter,
  AdjustmentFilter,
} from "pixi-filters";
import * as entity from "booyah/src/entity";

export type Glitch = GlitchFilter & Filter;
export type Holograph = CRTFilter & Filter;
export type Adjustment = AdjustmentFilter & Filter;
export type Glow = GlowFilter & Filter;

/**
 * Create a new glitch effect
 *
 * @returns A glitch container
 */
export function newGlitch() {
  return new GlitchFilter({
    red: [0, 0],
    blue: [0, 0],
    green: [0, 0],
    offset: 0,
    slices: 10,
  }) as Glitch;
}

export function newHolograph() {
  return new CRTFilter({
    curvature: 0,
    lineWidth: 0.5,
    lineContrast: 0.3,
    noise: 0.15,
  }) as Holograph;
}

export function newGlow(color = 0x2cd2d2) {
  return new GlowFilter({
    outerStrength: 5.0,
    color,
  }) as Glow;
}

export function newAdjustment() {
  return new AdjustmentFilter({
    saturation: 0.0,
    blue: 3.0,
    alpha: 0.75,
  }) as Adjustment;
}

/**
 * Create an entity sequence for the glitch animation
 *
 * @param glitch A GlitchFilter create with newGlitch
 * @returns A entity to activate
 */
export function wrapGlitch(glitch: GlitchFilter) {
  const shifting = 5;
  const frequency = 2000;

  return new entity.EntitySequence(
    [
      () =>
        new entity.WaitingEntity(Math.floor(10 + Math.random() * frequency)),
      () =>
        new entity.FunctionCallEntity(() => {
          glitch.red = [
            Math.floor(Math.random() * shifting),
            Math.floor(Math.random() * shifting),
          ];
          glitch.green = [
            Math.floor(Math.random() * shifting),
            Math.floor(Math.random() * shifting),
          ];
          glitch.offset = Math.floor(1 + Math.random() * 2);
          glitch.slices = Math.floor(10 + Math.random() * 15);
        }),
      () =>
        new entity.WaitingEntity(
          Math.floor(10 + Math.random() * (frequency / 4))
        ),
      () =>
        new entity.FunctionCallEntity(() => {
          glitch.red = [0, 0];
          glitch.green = [0, 0];
          glitch.offset = 0;
        }),
    ],
    {
      loop: true,
    }
  );
}

export function wrapGlitchHolo(glitch: GlitchFilter) {
  const shifting = 5;
  const frequency = 2000;

  return new entity.EntitySequence(
    [
      () =>
        new entity.WaitingEntity(Math.floor(10 + Math.random() * frequency)),
      () =>
        new entity.FunctionCallEntity(() => {
          glitch.blue = [
            Math.floor(Math.random() * shifting),
            Math.floor(Math.random() * shifting),
          ];
          glitch.offset = Math.floor(1 + Math.random() * 2);
          glitch.slices = Math.floor(10 + Math.random() * 15);
        }),
      () =>
        new entity.WaitingEntity(
          Math.floor(10 + Math.random() * (frequency / 4))
        ),
      () =>
        new entity.FunctionCallEntity(() => {
          glitch.red = [0, 0];
          glitch.green = [0, 0];
          glitch.offset = 0;
        }),
    ],
    {
      loop: true,
    }
  );
}

export function wrapHolograph(holo: CRTFilter) {
  return new entity.FunctionalEntity({
    update: () => {
      holo.seed = Math.random();
      holo.time = (holo.time + 0.1) % 20;
    },
  });
}
