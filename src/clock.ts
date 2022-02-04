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
  private _days: number;
  private _minutesSinceMidnight: number;
  private _hidden: boolean;

  private _container: PIXI.Container;
  private _textBox: PIXI.Text;

  constructor(private _position: PIXI.IPoint) {
    super();
  }

  _setup() {
    this._days = 0;
    this._minutesSinceMidnight = 0;

    this._container = new PIXI.Container();
    this._container.position.copyFrom(this._position);

    this._container.addChild(this.makeSprite("images/ui/clock.png"));

    this._textBox = this.makeText(
      "",
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
    const hours = Math.floor(this._minutesSinceMidnight / 60);
    const minutes = this._minutesSinceMidnight % 60;
    const time = `${hours} : ${minutes < 10 ? "0" + minutes : minutes}`;
    const dayName = dayNames[this._days % 7];

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

    while (this._minutesSinceMidnight >= dayMinutes) {
      this._minutesSinceMidnight -= dayMinutes;
      this._days++;
    }

    this._updateText();
  }

  advanceTime(newMinutes: number) {
    //const [h, m, hm] = parseTime(time);
    const currentMinutes = this._minutesSinceMidnight;
    //const newMinutes = currentMinutes + hm;

    return new tween.Tween({
      duration: 2000,
      easing: easing.easeInOutQuint,
      from: currentMinutes,
      to: newMinutes,
      onUpdate: (value) => {
        this.minutesSinceMidnight = Math.round(value);
      },
      onTeardown: () => {
        this.minutesSinceMidnight = newMinutes;
      },
    });
  }
}
