import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";

export class Gauge extends entity.CompositeEntity {
  private _container: PIXI.Container;
  private _outerDisk: PIXI.Graphics;

  constructor(private _position: PIXI.Point, private _image: PIXI.Sprite) {
    super();
  }

  _setup() {
    this._container = new PIXI.Container();
    this._container.position.copyFrom(this._position);
    this._container.addChild(this._image);

    this._entityConfig.container.addChild(this._container);
  }

  _teardown() {
    this._entityConfig.container.removeChild(this._container);
  }

  changeValue(oldValue: number, newValue: number) {}
}
