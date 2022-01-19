import * as PIXI from "pixi.js";
import "@pixi/graphics-extras";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";
import { values } from "underscore";

export class Gauge extends entity.CompositeEntity {
  private _container: PIXI.Container;
  private _innerDisk: PIXI.Sprite;
  private _outerDisk: PIXI.Graphics;

  private _center: PIXI.Point;
  private _radius: number;

  private _currentTween: {animation: tween.Tween, to: number};

  private _value: number;

  constructor(private _position: PIXI.Point, private _image: PIXI.Sprite, public readonly name: string) {
    super();
    this._value = 100;
  }

  _setup() {
    this._innerDisk = new PIXI.Sprite();
    this._innerDisk.texture =
      this.entityConfig.app.loader.resources[
        this.colorByValue(this._value)
      ].texture;
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
    this._entityConfig.container.addChild(this._container);

    this._currentTween = {
      animation: undefined,
      to: 0
    };

    this._container.scale.set(0.4);

    this.resetValue(Number(this.entityConfig.variableStorage.get(this.name)));

    this._on(this.entityConfig.variableStorage, `change:${this.name}`,
      (value) => (this.changeValue(Number(value)))
    );
  }

  _teardown() {
    this._container = undefined;
  }

  public getGauge(): PIXI.Container {
    return this._container;
  }

  public getValue(): number {
    if(this._currentTween.animation)
      return this._currentTween.to;
    return this._value;
  }

  private colorByValue(value: number): string {
    if (value > 66) return "images/ui/gauges/innerDisk_green.png";
    else if (value > 33) return "images/ui/gauges/innerDisk_yellow.png";
    else return "images/ui/gauges/innerDisk_red.png";
  }

  resetValue(value: number) {
    const torusOffset = -8;
    const torusWidth = 16;

    this._innerDisk.texture =
      this.entityConfig.app.loader.resources[
        this.colorByValue(this._value)
      ].texture;

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
    if(newValue === this._value) return;
    if (this._currentTween.animation) this._deactivateChildEntity(this._currentTween.animation);
    
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
