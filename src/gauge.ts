import * as PIXI from "pixi.js";
import "@pixi/graphics-extras";

import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as extension from "./extension";
import * as variable from "./variable";
import { StaticSpritePath } from "./images";

export class Gauge extends extension.ExtendedCompositeEntity {
  private _container: PIXI.Container;
  private _innerDisk: PIXI.Sprite;
  private _outerDisk: PIXI.Graphics;

  private _center: PIXI.Point;
  private _radius: number;

  private _currentTween: { animation: tween.Tween; to: number };

  private _value: number;
  private _inverted: boolean;

  constructor(
    private _position: PIXI.Point,
    private _image: PIXI.Sprite,
    public readonly name: keyof variable.Gauges
  ) {
    super();
  }

  _setup() {
    this._value = parseInt(this.config.variableStorage.get(this.name));
    this._inverted = variable.InvertedGauges.includes(this.name);

    this._innerDisk = new PIXI.Sprite();
    this._innerDisk.texture = this.makeSprite(this.colorByValue(this._value)).texture;
    this._center = new PIXI.Point(
      this._innerDisk.width / 2,
      this._innerDisk.height / 2
    );
    this._radius = Math.min(this._innerDisk.width, this._innerDisk.height) / 2;

    this._image.anchor.set(0.5, 0.5);
    this._image.position.set(this._center.x, this._center.y);

    this._outerDisk = new PIXI.Graphics();

    this._container = new PIXI.Container();
    this._container.position.copyFrom(this._position);
    this._container.addChild(this._innerDisk, this._image, this._outerDisk);
    this.config.container.addChild(this._container);

    this._currentTween = {
      animation: undefined,
      to: 0,
    };

    this._container.scale.set(0.4);

    this.resetValue(Number(this.config.variableStorage.get(this.name)));

    this.config.variableStorage.listen(`change:${this.name}`, (value) =>
      this.changeValue(Number(value))
    );
  }

  _teardown() {
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

  colorByValue(value: number): StaticSpritePath {
    if (value > 66) return this._inverted ? "images/ui/gauges/innerDisk_red.png" : "images/ui/gauges/innerDisk_green.png"
    else if (value > 33) return "images/ui/gauges/innerDisk_yellow.png";
    else return this._inverted ? "images/ui/gauges/innerDisk_green.png" : "images/ui/gauges/innerDisk_red.png"
  }

  resetValue(value: number) {
    const torusOffset = -8;
    const torusWidth = 16;

    this._innerDisk.texture = this.makeSprite(this.colorByValue(this._value)).texture;

    this._outerDisk.clear();
    this._outerDisk.beginFill(0xffffff);
    this._outerDisk.drawTorus(
      this._center.x,
      this._center.y,
      this._radius + torusOffset - torusWidth / 2,
      this._radius + torusOffset + torusWidth / 2,
      -(PIXI.PI_2 / 4) + PIXI.PI_2 / 150,
      -(PIXI.PI_2 / 4) + PIXI.PI_2 * ((value > 0 ? value : 0.8) / 100)
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
