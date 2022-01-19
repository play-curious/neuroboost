import * as PIXI from "pixi.js";
import "@pixi/graphics-extras";

import * as entity from "booyah/src/entity";

enum GaugeColor {
  Grey = 0x777777,
  Red = 0xb0160b,
  Yellow = 0xdbca2e,
  Green = 0x46de14,
}

export class Gauge extends entity.CompositeEntity {
  private _container: PIXI.Container;
  private _innerDisk: PIXI.Graphics;
  private _outerDisk: PIXI.Graphics;
  private _radius: number;

  constructor(private _position: PIXI.Point, private _image: PIXI.Sprite) {
    super();
    this._radius = _image.width / 2;
  }

  _setup() {
    this._innerDisk = new PIXI.Graphics();
    this._innerDisk.beginFill(GaugeColor.Green);
    this._innerDisk.drawCircle(50, 50, 50);
    this._outerDisk = new PIXI.Graphics();

    this._container = new PIXI.Container();
    this._container.position.copyFrom(this._position);
    this._container.addChild(this._innerDisk, this._image, this._outerDisk);
    this._entityConfig.container.addChild(this._container);
  }

  _teardown() {
    this._container = undefined;
  }

  public getGauge(): PIXI.Container {
    return this._container;
  }

  private colorByValue(value: number): number {
    if (value === undefined) return GaugeColor.Grey;

    if (value > 66) return GaugeColor.Green;
    else if (value > 33) return GaugeColor.Yellow;
    else return GaugeColor.Red;
  }

  changeValue(oldValue: number, newValue: number) {
    const oldColor = this.colorByValue(oldValue);
    const newColor = this.colorByValue(newValue);

    const gaugeAnimations: entity.EntityBase[] = [];
    const animationDuration = 1000;

    // Color change
    if (oldColor != newColor) {
      const oldRGB = [
        (oldColor >> 16) & 255,
        (oldColor >> 8) & 255,
        oldColor & 255,
      ];
      const newRGB = [
        (newColor >> 16) & 255,
        (newColor >> 8) & 255,
        newColor & 255,
      ];
      const difRGB = [
        newRGB[0] - oldRGB[0],
        newRGB[1] - oldRGB[1],
        newRGB[2] - oldRGB[2],
      ];
      gaugeAnimations.push(
        new tween.Tween({
          duration: animationDuration,
          easing: easing.easeInSine,
          from: 0,
          to: 100,
          onUpdate: (value) => {
            let newHex = 0;
            const valRGB = [
              oldRGB[0] + difRGB[0] * (value / 100),
              oldRGB[1] + difRGB[1] * (value / 100),
              oldRGB[2] + difRGB[2] * (value / 100),
            ];
            newHex = (valRGB[0] << 16) + (valRGB[1] << 8) + valRGB[2];

            this._innerDisk.clear();
            this._innerDisk.beginFill(newHex);
            this._innerDisk.drawCircle(
              this._radius,
              this._radius,
              this._radius
            );
          },
        })
      );
    }

    // Torus change
    const torusOffset = 3;
    const torusWidth = 10;
    const torusDiff = torusWidth / 2 + torusOffset;
    gaugeAnimations.push(
      new tween.Tween({
        duration: animationDuration,
        easing: easing.easeInSine,
        from: oldValue,
        to: newValue,
        onUpdate: (value) => {
          this._outerDisk.clear();
          this._outerDisk.beginFill(0xffffff);
          this._outerDisk.drawTorus(
            this._radius,
            this._radius,
            this._radius - torusDiff,
            this._radius + torusDiff,
            -(PIXI.PI_2 / 4),
            -(PIXI.PI_2 / 4) + PIXI.PI_2 * (value / 100)
          );
        },
      })
    );

    this._activateChildEntity(new entity.ParallelEntity(gaugeAnimations));
  }
}
