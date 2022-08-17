import * as entity from "booyah/src/entity";
import * as graphics from "./graphics";
import * as PIXI from "pixi.js";
import * as extension from "./extension";
import * as tween from "booyah/src/tween";
import * as slide from "./slide_text_entity";
import { EnterType } from "./slide_text_entity";

export class DeadlineEntity extends slide.SlideTextEntity {
  private _missed: boolean;
  private _shake: graphics.ScreenShake;

  public constructor(
    public readonly deadlinename: string,
    public readonly hour: string,
    public readonly minutes: string
  ) {
    super(1650, 5, "images/ui/deadline.png", {
      text: deadlinename + " à " + hour + "h" + minutes,
      icon: "images/ui/deadline_ring.png",
    });
    this._missed = false;
  }

  public missed() {
    this._icon.tint = 0xffe538;
    this._text.style.fill = this._icon.tint;
    if (!this._shake) {
      this._shake = new graphics.ScreenShake(15, 700);
      this._activateChildEntity(
        this._shake,
        entity.extendConfig({ container: this._icon })
      );
    }
  }
}
