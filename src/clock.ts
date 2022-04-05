import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as extension from "./extension";

export type ResolvableTime = `${number}:${number}`;

export const dayMinutes = 60 * 24;

export const dayNames = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

export function parseTime(
  time: ResolvableTime
): [hours: number, minutes: number, minutesSinceMidnight: number] {
  const [_h, _m] = time.split(":");
  const h = Number(_h);
  const m = Number(_m ?? 0);

  if (isNaN(h) || isNaN(m))
    throw new Error(`Can't parse time string "${time}"`);

  return [h, m, h * 60 + m];
}

export class Clock extends extension.ExtendedCompositeEntity {
  private _minutesSinceMidnight: number;
  private _hidden: boolean;

  private _container: PIXI.Container;
  private _textBox: PIXI.Text;
  private _clockTween: tween.Tween;

  constructor(private _position: PIXI.IPoint) {
    super();
  }

  _setup() {
    this._minutesSinceMidnight = 0;

    this._container = new PIXI.Container();
    this._container.position.copyFrom(this._position);

    this._container.addChild(this.makeSprite("images/ui/clock.png"));

    this._textBox = this.makeText(
      "0:00",
      {
        fill: "black",
        fontFamily: "Jura",
        fontSize: 40,
        leading: 10,
        align: "center",
      },
      (it) => {
        it.anchor.set(0.5);
        it.position.set(270 / 2, 164 / 2);
      }
    );

    this._container.addChild(this._textBox);

    this.config.container.addChild(this._container);
  }

  _teardown() {
    this.config.container.removeChild(this._container);
  }

  private _updateText() {
    const days = Math.floor(this._minutesSinceMidnight / dayMinutes);
    const hours = Math.floor(
      (this._minutesSinceMidnight - days * dayMinutes) / 60
    );
    const minutes = this._minutesSinceMidnight % 60;
    const time = `${hours} : ${minutes < 10 ? "0" + minutes : minutes}`;
    const dayName = dayNames[days % 7];

    this._textBox.text = `${time}\n${dayName}`;
  }

  get hidden(): boolean {
    return this._hidden;
  }

  set hidden(hidden: boolean) {
    this._container.visible = !hidden;
    this._hidden = hidden;
  }

  get minutesSinceMidnight(): number {
    return this._minutesSinceMidnight;
  }

  set minutesSinceMidnight(value: number) {
    this._minutesSinceMidnight = value;

    this._updateText();
  }

  get text(): string {
    return this._textBox.text;
  }

  setTime(newMinutes: number) {
    if (this._clockTween) this._deactivateChildEntity(this._clockTween);

    this.minutesSinceMidnight = newMinutes;
  }

  advanceTime(newMinutes: number) {
    if (this._clockTween) this._deactivateChildEntity(this._clockTween);

    const currentMinutes = this._minutesSinceMidnight;
    this._clockTween = new tween.Tween({
      duration: 2000,
      easing: easing.easeInOutQuint,
      from: currentMinutes,
      to: newMinutes,
      onUpdate: (value) => {
        this.minutesSinceMidnight = Math.round(value);
      },
      onTeardown: () => {
        this.minutesSinceMidnight = newMinutes;
        this._clockTween = undefined;
      },
    });

    this._activateChildEntity(this._clockTween);
  }

  isTimeOver(time: ResolvableTime, day?: string) {}
}
