import * as _ from "underscore";
import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";

import * as extension from "./extension";

export class Title extends extension.ExtendedCompositeEntity {
  private _container: PIXI.Container;
  private _isExiting: boolean;

  constructor(public readonly text: string) {
    super();
  }

  _setup() {
    this._isExiting = false;

    this._container = new PIXI.Container();
    this._container.alpha = 0;
    this._container.interactive = true;
    this._container.buttonMode = true;
    this._on(this._container, "pointerup", this._exit);
    this._entityConfig.container.addChild(this._container);

    {
      // Background
      const bg = new PIXI.Graphics();
      bg.beginFill(0);
      bg.drawRect(
        0,
        0,
        this.entityConfig.app.view.width,
        this.entityConfig.app.view.height
      );
      bg.endFill();
      this._container.addChild(bg);
    }

    {
      // Text
      const text = new PIXI.Text(this.text, {
        fontFamily: "Jura",
        fontSize: 72,
        fill: "white",
      });
      text.anchor.set(0.5);
      text.position.set(
        this.entityConfig.app.view.width / 2,
        this.entityConfig.app.view.height / 2
      );
      this._container.addChild(text);
    }

    {
      // Fade in, wait a second, fade out
      this._activateChildEntity(
        new entity.EntitySequence([
          new tween.Tween({
            obj: this._container,
            property: "alpha",
            to: 1,
            duration: 1000,
          }),
          new entity.WaitingEntity(1000),
          new entity.FunctionCallEntity(() => this._exit()),
        ])
      );
    }
  }

  _teardown() {
    this._entityConfig.container.removeChild(this._container);
  }

  private _exit() {
    // Can't exit twice
    if (this._isExiting) return;

    this._isExiting = true;

    this._activateChildEntity(
      new entity.EntitySequence([
        // Fade out
        new tween.Tween({
          obj: this._container,
          property: "alpha",
          to: 0,
          duration: 1000,
        }),
        // Request transition
        new entity.FunctionCallEntity(
          () => (this._transition = entity.makeTransition())
        ),
      ])
    );
  }
}
