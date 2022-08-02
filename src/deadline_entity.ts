import * as entity from "booyah/src/entity";
import * as graphics from "./graphics";
import * as PIXI from "pixi.js";
import * as extension from "./extension";
import * as tween from "booyah/src/tween";

export class DeadlineEntity extends extension.ExtendedCompositeEntity {
  private static _ANIMATION_DURATION: number = 300;
  private _container: PIXI.Container;
  private _text: PIXI.Text;
  private _missed: boolean;
  private _icon: PIXI.Sprite;
  private _shake: graphics.ScreenShake;

  public constructor(
    public readonly deadlinename: string,
    public readonly hour: string,
    public readonly minutes: string
  ) {
    super();
  }

  protected _setup(
    frameInfo: entity.FrameInfo,
    entityConfig: entity.EntityConfig
  ): void {
    this._missed = false;
    this._container = new PIXI.Container();
    this._entityConfig.container.addChild(this._container);
    this._text = new PIXI.Text(
      this.deadlinename + " à " + this.hour + "h" + this.minutes,
      {
        fontFamily: "Jura",
        fontSize: 35,
        fill: "black",
      }
    );
    const textbg = new PIXI.Sprite(
      this._entityConfig.app.loader.resources["images/ui/deadline.png"].texture
    );

    this._icon = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[
        "images/ui/deadline_ring.png"
      ].texture
    );
    const x = 1650 - this._container.width - textbg.width + 1;
    const y = 5;

    //masking
    const mask = new PIXI.Graphics()
      .beginFill(0xffffff)
      .drawRect(x, y, textbg.width, textbg.height)
      .endFill();
    this._container.mask = mask;

    this._text.position.set(
      textbg.width / 2 - this._text.width / 2 + 30,
      textbg.height / 2 - this._text.height / 2
    );
    this._container.addChild(textbg);
    textbg.addChild(this._text);
    textbg.addChild(this._icon);
    this._icon.tint = 0;
    this._icon.position.set(30, textbg.height / 2 - this._icon.height / 2);
    this._container.position.set(x, y);
    const animP = new tween.Tween({
      obj: this._container.position,
      property: "x",
      from: x + this._container.width,
      to: x,
      duration: DeadlineEntity._ANIMATION_DURATION,
    });
    this._activateChildEntity(animP);
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

  public remove() {
    const animP = new tween.Tween({
      obj: this._container.position,
      property: "x",
      from: this._container.position.x,
      to: this._container.position.x + this._container.width,
      duration: DeadlineEntity._ANIMATION_DURATION,
    });
    const td = new entity.EntitySequence([
      animP,
      new entity.FunctionCallEntity(() => {
        this._transition = entity.makeTransition();
      }),
    ]);
    this._activateChildEntity(td);
  }

  public _teardown(frameInfo: entity.FrameInfo) {
    this._entityConfig.container.removeChild(this._container);
  }
}
