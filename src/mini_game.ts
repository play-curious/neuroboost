import * as extension from "./extension";
import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import * as _ from "underscore";

export class MiniGame extends extension.ExtendedCompositeEntity {}

export class Juggling extends MiniGame {
  private container: PIXI.Container;
  public balls: Ball[];

  _setup() {
    this.balls = [];
    this.container = new PIXI.Container();
    // todo: add background and character ?
    this.config.container.addChild(this.container);
    this._activateChildEntity(
      new entity.EntitySequence([
        // todo: explain script
        this.addBall(),
      ])
    );
  }

  _update() {}

  _teardown() {
    this.config.container.removeChild(this.container);
    this.balls = [];
    this.container = null;
  }

  addBall() {
    return new entity.EntitySequence([
      // todo: animation ?
      new entity.FunctionCallEntity(() => {
        const ball = new Ball(this);
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
        this._on(ball, "fail", () => {
          // todo: FAIL script
          this._transition = entity.makeTransition();
        });
      }),
    ]);
  }
}

export class Ball extends extension.ExtendedCompositeEntity {
  private sprite: PIXI.Sprite;
  private speed = 0;
  private hits = 0;
  private index = 0;

  constructor(private game: Juggling) {
    super();
  }

  _setup() {
    this.index = this.game.balls.indexOf(this);
    this.sprite = this.makeSprite(
      "images/mini_games/juggling/ball.png",
      (it) => {
        it.anchor.set(0.5);
        it.scale.set(0.4);
        it.interactive = true;
        it.buttonMode = true;
        it.position.set((1920 / 5) * this.index + 1920 / 10, -200);
        this.config.container.addChild(it);
        this._on(it, "pointerdown", () => {
          this.speed *= -1;
          this.hits++;
          if (this.hits > 2) {
            this.hits = 0;
            if (this.game.balls.length < 5) this.emit("new-ball");
          }
        });
      }
    );
  }

  _update() {
    this.speed += 0.3 - this.index * 0.05;
    this.sprite.rotation = Date.now() / 200;
    this.sprite.position.y += this.speed;
    if (this.sprite.position.y > 1080 + this.sprite.height / 2) {
      this.emit("fail");
      this._transition = entity.makeTransition();
    }
  }
}
