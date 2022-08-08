import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as extension from "./extension";

export enum EnterType {
  UP,
  DOWN,
  LEFT,
  RIGHT,
}

export interface SlideOptions {
  text?: string;
  icon?: string;
  animationDuration?: number;
  enterStyle?: EnterType;
  icon_x?: number;
  icon_y?: number;
  icon_size?: number;
}

export abstract class SlideTextEntity extends extension.ExtendedCompositeEntity {
  private _animationDuration: number;
  private _background: string;
  private _iconPath: string;
  private _enterStyle: EnterType;
  private _options: SlideOptions;
  private _onRemove: (it: SlideTextEntity) => void;

  protected _container: PIXI.Container;
  protected _text: PIXI.Text;
  protected _icon: PIXI.Sprite;

  protected constructor(
    private _x: number,
    private _y: number,
    background: string,
    options: SlideOptions
  ) {
    super();
    this._options = options;
    this._animationDuration = options.animationDuration ?? 250;
    this._background = background;

    if (options.text) {
      this._text = new PIXI.Text(options.text, {
        fontFamily: "Jura",
        fontSize: 35,
        fill: "black",
      });
    }
    this._iconPath = options.icon;
    this._enterStyle = options.enterStyle ?? EnterType.LEFT;
  }

  protected _setup(
    frameInfo: entity.FrameInfo,
    entityConfig: entity.EntityConfig
  ): void {
    this._container = new PIXI.Container();
    this._entityConfig.container.addChild(this._container);

    const textbg = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[this._background].texture
    );
    const x = this._x;
    const y = this._y;
    //masking
    this._container.mask = new PIXI.Graphics()
      .beginFill(0xffffff)
      .drawRect(
        x +
          (this._enterStyle == EnterType.LEFT
            ? -textbg.width
            : this._enterStyle == EnterType.RIGHT
            ? textbg.width
            : 0),
        y +
          (this._enterStyle == EnterType.UP
            ? -textbg.height
            : this._enterStyle == EnterType.DOWN
            ? textbg.height
            : 0),
        textbg.width,
        textbg.height
      )
      .endFill();

    if (this._text) {
      this._text.position.set(
        textbg.width / 2 - this._text.width / 2 + 30,
        textbg.height / 2 - this._text.height / 2
      );
      textbg.addChild(this._text);
    }

    if (this._iconPath) {
      this._icon = new PIXI.Sprite(
        this._entityConfig.app.loader.resources[this._iconPath].texture
      );
      this._icon.tint = 0;
      this._icon.position.set(
        this._options.icon_x ?? 30,
        this._options.icon_y ?? textbg.height / 2 - this._icon.height / 2
      );
      this._icon.scale.set(this._options.icon_size ?? 1);
      textbg.addChild(this._icon);
    }

    this._container.position.set(x, y);
    this._container.addChild(textbg);
    const animP = new tween.Tween({
      obj: this._container.position,
      property: [EnterType.RIGHT, EnterType.LEFT].includes(this._enterStyle)
        ? "x"
        : "y",
      duration: this._animationDuration,
      ...(this._enterStyle == EnterType.RIGHT
        ? {
            to: this._container.position.x + this._container.width,
          }
        : this._enterStyle == EnterType.LEFT
        ? {
            to: this._container.position.x - this._container.width,
          }
        : this._enterStyle == EnterType.DOWN
        ? {
            to: this._container.position.y + this._container.height,
          }
        : {
            to: this._container.position.y - this._container.height,
          }),
    });
    this._activateChildEntity(animP);
  }

  public remove() {
    const animP = new tween.Tween({
      obj: this._container.position,
      property: [EnterType.RIGHT, EnterType.LEFT].includes(this._enterStyle)
        ? "x"
        : "y",
      ...(this._enterStyle == EnterType.RIGHT
        ? {
            to: this._container.position.x - this._container.width,
          }
        : this._enterStyle == EnterType.LEFT
        ? {
            to: this._container.position.x + this._container.width,
          }
        : this._enterStyle == EnterType.DOWN
        ? {
            to: this._container.position.y - this._container.height,
          }
        : {
            to: this._container.position.y + this._container.height,
          }),
      duration: this._animationDuration,
    });
    const td = new entity.EntitySequence([
      animP,
      new entity.FunctionCallEntity(() => {
        if (this._onRemove) {
          this._onRemove(this);
        }
        this._transition = entity.makeTransition();
      }),
    ]);
    this._activateChildEntity(td);
  }

  public onRemove(cb: (it: SlideTextEntity) => void) {
    this._onRemove = cb;
  }

  public _teardown(frameInfo: entity.FrameInfo) {
    this._entityConfig.container.removeChild(this._container);
  }
}
