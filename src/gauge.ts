import * as PIXI from "pixi.js";
import "@pixi/graphics-extras";

import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as extension from "./extension";
import * as variable from "./variable";
import * as images from "./images";

import { newGlow } from "./graphics_filter";

export class Gauge extends extension.ExtendedCompositeEntity {
  private _container: PIXI.Container;
  private _innerDisk: PIXI.Sprite;
  private _outerDisk: PIXI.Graphics;
  private _popup: PIXI.Container;

  private _center: PIXI.Point;
  private _radius: number;

  private _currentTween: { animation: tween.Tween; to: number };

  private _value: number;
  private _inverted: boolean;

  constructor(
    private _position: PIXI.Point,
    private _image: PIXI.Sprite,
    public readonly name: keyof variable.Gauges,
    private readonly displayName: string,
    private readonly displayDescription: string
  ) {
    super();
  }

  _setup() {
    this._value = parseInt(this.config.variableStorage.get(this.name));
    this._inverted = variable.InvertedGauges.includes(this.name);

    this._innerDisk = new PIXI.Sprite();
    this._innerDisk.texture = this.makeSprite(
      this.colorByValue(this._value)
    ).texture;
    this._center = new PIXI.Point(
      this._innerDisk.width / 2,
      this._innerDisk.height / 2
    );
    this._radius = Math.min(this._innerDisk.width, this._innerDisk.height) / 2;

    this._image.anchor.set(0.5, 0.5);
    this._image.position.set(this._center.x, this._center.y);

    this._outerDisk = new PIXI.Graphics();

    this._popup = new PIXI.Container();
    this._popup.position.set(600, 200);
    this._popup.filters = [newGlow(0xffffff)];
    this._popup.addChild(
      this.makeText(
        this.displayName,
        { fontFamily: "Jura", fontStyle: "bolder" },
        (it) => {
          it.anchor.set(0, 1);
          it.scale.set(5);
        }
      ),
      this.makeText(this.displayDescription, { fontFamily: "Ubuntu" }, (it) => {
        it.anchor.set(0, 0);
        it.scale.set(3);
      }),
      this.makeText(`%`, { fontFamily: "Ubuntu" }, (it) => {
        it.anchor.set(1, 0.5);
        it.scale.set(7);
      })
    );

    this._container = new PIXI.Container();
    this._container.interactive = true;
    this._container.interactiveChildren = true;
    this._container.position.copyFrom(this._position);
    this._container.addChild(this._innerDisk, this._image, this._outerDisk);

    this.config.container.addChild(this._container);

    this._currentTween = {
      animation: undefined,
      to: 0,
    };

    this._container.scale.set(0.4);
    this._container.cursor = "info";

    this.resetValue(Number(this.config.variableStorage.get(this.name)));

    this.config.variableStorage.listen(`change:${this.name}`, (value) =>
      this.changeValue(Number(value))
    );

    let timeout: any;

    this._on(this._container, "mouseover", () => {
      console.log("over");
      timeout = window.setTimeout(() => {
        console.log("open");
        this._container.addChild(this._popup);
        (this._popup.children[2] as PIXI.Text).text = `${this.getValue()}%`;
      }, 500);
    });
    this._on(this._container, "mouseout", () => {
      console.log("out");
      clearTimeout(timeout);
      this._container.removeChild(this._popup);
    });
  }

  _teardown() {
    this.config.container.removeChild(this._container);
    this.config.variableStorage.off(`change:${this.name}`);
    this._container = undefined;
  }

  public getGauge(): PIXI.Container {
    return this._container;
  }

  public getValue(): number {
    if (this._currentTween.animation) return this._currentTween.to;
    return this._value;
  }

  colorByValue(value: number): images.StaticSpritePath {
    if (value > 66)
      return this._inverted
        ? "images/ui/gauges/innerDisk_red.png"
        : "images/ui/gauges/innerDisk_green.png";
    else if (value > 33) return "images/ui/gauges/innerDisk_yellow.png";
    else
      return this._inverted
        ? "images/ui/gauges/innerDisk_green.png"
        : "images/ui/gauges/innerDisk_red.png";
  }

  resetValue(value: number) {
    const torusOffset = -8;
    const torusWidth = 16;

    this._innerDisk.texture = this.makeSprite(
      this.colorByValue(this._value)
    ).texture;

    this._outerDisk.clear();
    this._outerDisk.beginFill(0xffffff);
    this._outerDisk.drawTorus(
      this._center.x,
      this._center.y,
      this._radius + torusOffset - torusWidth / 2,
      this._radius + torusOffset + torusWidth / 2,
      -(PIXI.PI_2 / 4) + PIXI.PI_2 / 150,
      -(PIXI.PI_2 / 4) + PIXI.PI_2 * ((value > 0.8 ? value : 0.8) / 100)
    );

    this._value = value;
  }

  changeValue(newValue: number) {
    if (newValue === this._value) return;
    if (this._currentTween.animation)
      this._deactivateChildEntity(this._currentTween.animation);

    this._currentTween.to = newValue;
    this._currentTween.animation = new tween.Tween({
      duration: 1200,
      easing: easing.easeInOutQuart,
      from: this._value,
      to: newValue,
      onUpdate: (value) => {
        this.resetValue(value);
      },
      onTeardown: () => {
        this.resetValue(newValue);
        this._currentTween.animation = null;
      },
    });
    this._activateChildEntity(this._currentTween.animation);
  }
}
