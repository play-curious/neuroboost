import * as extension from "./extension";
import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import * as _ from "underscore";

export class MiniGame extends extension.ExtendedCompositeEntity {}

export class Juggling extends MiniGame {
  private container: PIXI.Container;
  private balls: Ball[] = [];

  _setup() {
    this.container = new PIXI.Container();
    this.config.container.addChild(this.container);
    this._activateChildEntity(this.addBall());
  }

  _update() {}

  _teardown() {
    this.config.container.removeChild(this.container);
    this.container = null;
  }

  addBall() {
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        const ball = new Ball();
        this.balls.push(ball);
        this._activateChildEntity(
          ball,
          entity.extendConfig({
            container: this.container,
          })
        );
        this._on(ball, "new-ball", () => {
          this._activateChildEntity(this.addBall());
        });
      }),
    ]);
  }
}

export class Ball extends extension.ExtendedCompositeEntity {
  private sprite: PIXI.Sprite;
  private speed = 0;
  private hits = 0;

  _setup() {
    this.sprite = this.makeSprite(
      "images/mini_games/juggling/ball.png",
      (it) => {
        it.anchor.set(0.5);
        it.interactive = true;
        it.buttonMode = true;
        it.position.set(_.random(1920), -it.height);
        this.config.container.addChild(it);
        this._on(it, "pointerdown", () => {
          this.speed *= -1;
          this.hits++;
          if (this.hits > 2) {
            this.hits = 0;
            this.emit("new-ball");
          }
        });
      }
    );
  }

  _update() {
    this.speed++;
    this.sprite.position.y += this.speed;
    if (this.sprite.position.y > 1080 + this.sprite.height / 2) {
      // todo: FAIL
      this._transition = entity.makeTransition();
    }
  }
}
