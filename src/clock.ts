import * as entity from "booyah/src/entity";
import * as PIXI from "pixi.js";

export const dayNames = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]

export function parseTime(time: string): [hours: number, minutes: number] {
  const parts = time.split(":");
  let h = 0,
    m = 0;
  if (parts.length === 1) {
    h = parseInt(parts[0]);
  } else if (parts.length === 2) {
    h = parseInt(parts[0]);
    m = parseInt(parts[1]);
  } else {
    throw new Error(`Can't parse time string "${time}`);
  }
  return [h, m];
}

export class Clock extends entity.CompositeEntity {
  private _days: number
  private _minutesSinceMidnight: number;
  private _pos: PIXI.IPoint;

  private _container: PIXI.Container;
  private _textBox: PIXI.Text;

  constructor(pos: PIXI.IPoint) {
    super();

    this._pos = pos;
  }

  _setup() {
    this._days = 0
    this._minutesSinceMidnight = 0

    this._container = new PIXI.Container();
    this._container.position.copyFrom(this._pos);

    const bg = new PIXI.Sprite(
      this.entityConfig.app.loader.resources["images/ui/clock.png"].texture
    );
    this._container.addChild(bg);

    this._textBox = new PIXI.Text("", {
      fill: "black",
      fontFamily: "Jura",
      fontSize: 40,
      leading: 10,
      align: "center",
    });
    this._textBox.position.set(270 / 2, 164 / 2);
    this._textBox.anchor.set(0.5);
    this._container.addChild(this._textBox);

    this._entityConfig.container.addChild(this._container);
  }

  _teardown() {
    this._entityConfig.container.removeChild(this._container);
  }

  private _updateText() {
    const hours = Math.floor(this._minutesSinceMidnight / 60);
    const minutes = this._minutesSinceMidnight % 60;
    const time = `${hours} : ${minutes < 10 ? "0" + minutes : minutes}`;
    const dayName = dayNames[this._days % 7];

    this._textBox.text = `${time}\n${dayName}`;
  }

  get minutesSinceMidnight(): number {
    return this._minutesSinceMidnight;
  }

  set minutesSinceMidnight(value: number) {
    this._minutesSinceMidnight = value;

    const dayMinutes = 60 * 24
    while(this._minutesSinceMidnight > dayMinutes) {
      this._minutesSinceMidnight -= dayMinutes
      this._days ++
    }

    this._updateText();
  }

  advanceTime(time: string) {

  }
}
