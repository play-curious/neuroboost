import * as PIXI from "pixi.js";
import "@pixi/graphics-extras";

import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as extension from "./extension";
import * as variable from "./variable";
import { SpritePath } from "./images";

export const gaugesNames = {
  learning: `Apprentissage`,
  sleep: `Énergie`,
  food: `Nutrition`,
  mentalLoad: `Charge Mentale`,
  stress: `Stress`,
};

export interface GaugeLimits {
  /** The minimum value for the gauge to be yellow */
  minMedium: number;

  /** The minimum value for the gauge to be green (or red, if inverted) */
  minHigh: number;
}

const defaultGaugeLimits = { minMedium: 33, minHigh: 66 };

export const gaugeLevels: Record<keyof typeof gaugesNames, GaugeLimits> = {
  learning: { minMedium: 50, minHigh: 80 },
  sleep: defaultGaugeLimits,
  food: defaultGaugeLimits,
  mentalLoad: defaultGaugeLimits,
  stress: defaultGaugeLimits,
};

export class Gauge extends extension.ExtendedCompositeEntity {
  private _container: PIXI.Container;
  private _innerDisk: PIXI.Sprite;
  private _outerDisk: PIXI.Graphics;

  private _tooltip: PIXI.Text;
  private _tooltipBg: PIXI.Graphics;

  private _center: PIXI.Point;
  private _radius: number;

  private _currentTween: { animation: tween.Tween; to: number };
  private _alphaTween: tween.Tween;

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

    this._container.hitArea = new PIXI.Circle(
      this._center.x,
      this._center.y,
      this._radius
    );
    this._container.interactive = true;
    const margin = 15;
    this._on(this._container, "pointerover", () => {
      let tooltipX = this._center.x;
      this._tooltip = this.makeText(
        `${gaugesNames[this.name]}\n${this._value.toFixed(0)} %`,
        {
          fill: "0xFFF",
          fontFamily: "Ubuntu",
          fontSize: 80,
          align: "center",
        },
        (it) => {
          it.anchor.set(0.5, 0);

          const tooltipCurrentPos =
            this._position.x + this._radius - it.width / 2 - margin;
          if (tooltipCurrentPos < 10) tooltipX += 10 - tooltipCurrentPos;
          it.position.set(tooltipX, 2 * this._radius + 50);
        }
      );
      this._tooltipBg = new PIXI.Graphics();
      this._tooltipBg.beginFill(0x373737, 0.7);
      this._tooltipBg.drawRoundedRect(
        tooltipX - this._tooltip.width / 2 - margin,
        this._tooltip.position.y - margin,
        this._tooltip.width + margin * 2,
        this._tooltip.height + margin * 2,
        30
      );
      this._container.addChild(this._tooltipBg, this._tooltip);
    });
    this._on(this._container, "pointerout", () => {
      this._container.removeChild(this._tooltip, this._tooltipBg);
      this._tooltip = undefined;
    });
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

  colorByValue(value: number): SpritePath {
    if (value > gaugeLevels[this.name].minHigh)
      return this._inverted
        ? "images/ui/gauges/innerDisk_red.png"
        : "images/ui/gauges/innerDisk_green.png";
    else if (value > gaugeLevels[this.name].minMedium)
      return "images/ui/gauges/innerDisk_yellow.png";
    else
      return this._inverted
        ? "images/ui/gauges/innerDisk_green.png"
        : "images/ui/gauges/innerDisk_red.png";
  }

  resetValue(value: number) {
    const torusOffset = -8;
    const torusWidth = 16;
    const scale = 4;

    this._innerDisk.texture = this.makeSprite(this.colorByValue(value)).texture;

    this._outerDisk.cacheAsBitmap = false;
    this._outerDisk.clear();
    // Black torus background
    this._outerDisk.beginFill(0x666666);
    this._outerDisk.drawTorus(
      scale * this._center.x,
      scale * this._center.y,
      scale * (this._radius + torusOffset - (torusWidth + 14) / 2),
      scale * (this._radius + torusOffset + (torusWidth + 14) / 2),
      -(PIXI.PI_2 / 4) + PIXI.PI_2 / 150,
      -(PIXI.PI_2 / 4) + PIXI.PI_2 * ((value > 0.8 ? value + 0.8 : 0.8) / 100)
    );
    // White torus foreground
    this._outerDisk.beginFill(0xffffff);
    this._outerDisk.drawTorus(
      scale * this._center.x,
      scale * this._center.y,
      scale * (this._radius + torusOffset - torusWidth / 2),
      scale * (this._radius + torusOffset + torusWidth / 2),
      -(PIXI.PI_2 / 4) + PIXI.PI_2 / 150,
      -(PIXI.PI_2 / 4) + PIXI.PI_2 * ((value > 0.8 ? value : 0.8) / 100)
    );
    this._outerDisk.cacheAsBitmap = true;
    this._outerDisk.scale.set(1 / scale);

    this._value = value;
  }

  changeValue(newValue: number) {
    if (this._currentTween.animation) {
      this._deactivateChildEntity(this._currentTween.animation);
      this._currentTween.animation = null;
    }

    this._currentTween.to = newValue;
    this._currentTween.animation = new tween.Tween({
      duration: 1200,
      easing: easing.easeInOutQuart,
      from: this._value,
      to: newValue,
      onSetup: () => {
        this._alphaTween = new tween.Tween({
          duration: 1200,
          easing: easing.linear,
          from: 0,
          to: 2 * PIXI.PI_2,
          onUpdate: (value) => {
            this._innerDisk.alpha = ((Math.cos(value) + 1) / 2) * 0.4 + 0.4;
          },
          onTeardown: () => {
            this._innerDisk.alpha = 1;
          },
        });
        this._activateChildEntity(this._alphaTween);
      },
      onUpdate: (value) => {
        this.resetValue(value);
      },
      onTeardown: () => {
        this.resetValue(newValue);
        this._currentTween.animation = null;
        this._deactivateChildEntity(this._alphaTween);
      },
    });
    this._activateChildEntity(this._currentTween.animation);
  }
}
