import * as PIXI from "pixi.js";

import time from "dayjs";

import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as extension from "./extension";

export type ResolvableTime = `${number}:${number}`;

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

export const days = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

export function minutesToDate(minutes: number) {
  return time(minutes * 60 * 1000);
}

export function dateToText(date: time.Dayjs) {
  return `${date.format("h:mm")}\n${days[date.get("day")]}`;
}

export class Clock extends extension.ExtendedCompositeEntity {
  private _hidden: boolean;

  private _container: PIXI.Container;
  private _textBox: PIXI.Text;

  constructor(private _position: PIXI.IPoint) {
    super();
  }

  _setup() {
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

  updateTextFromDate(newTime: time.Dayjs) {
    this._textBox.text = dateToText(newTime);
  }

  get date() {
    return minutesToDate(Number(this.config.variableStorage.get("time")));
  }

  get hidden(): boolean {
    return this._hidden;
  }

  set hidden(hidden: boolean) {
    this._container.visible = !hidden;
    this._hidden = hidden;
  }

  set minutesSinceMidnight(minutes: number) {
    this.config.variableStorage.set("time", `${minutes}`);
    this.updateTextFromDate(minutesToDate(minutes));
  }

  advanceTime(addedMinutes: number) {
    const savedMinutes = Number(this.config.variableStorage.get("time"));
    const finalMinutes = savedMinutes + addedMinutes;

    this.config.variableStorage.set("time", `${finalMinutes}`);

    const date = minutesToDate(Math.round(savedMinutes));

    let cachedMinutes = savedMinutes;

    return new tween.Tween({
      duration: 2000,
      easing: easing.easeInOutQuint,
      from: savedMinutes,
      to: finalMinutes,
      onUpdate: (minutes) => {
        const added = minutes - cachedMinutes;
        cachedMinutes = minutes;
        this.updateTextFromDate(date.add(added, "minutes"));
      },
      onTeardown: () => {
        this.updateTextFromDate(minutesToDate(finalMinutes));
      },
    });
  }
}
