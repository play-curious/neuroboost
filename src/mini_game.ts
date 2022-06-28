import * as PIXI from "pixi.js";
import * as popup from "./popup";
import * as extension from "./extension";
import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";

const baseBallSpeed = 0.15;
const ballSpeedVariation = 0.1;

export abstract class MiniGame extends extension.ExtendedCompositeEntity {
  protected container: PIXI.Graphics;

  _setup() {
    this.container = new PIXI.Graphics();
    this.container.interactive = true;
    this.container
      .beginFill(0x000000, 0.5)
      .drawRect(0, 0, 1920, 1080)
      .endFill();
  }
}

export class Juggling extends MiniGame {
  // private temde: { container: PIXI.Container; entity: entity.ParallelEntity };
  // private temdeArm: PIXI.Sprite;
  private firstHitCount: number;
  private text: PIXI.Text;
  public balls: Ball[];
  public stopped: boolean;
  public zone = {
    x: 500,
    y: 100,
    width: 1920 / 2,
    height: 1080 - 100,
  };

  _setup() {
    super._setup();
    this.stopped = false;
    this.firstHitCount = 0;
    this.balls = [];
    this.text = this.makeText(
      "Cliquer sur une balle pour la jongler",
      {
        fontFamily: "Ubuntu",
        align: "center",
        fill: 0xffffff,
        fontSize: 50,
      },
      (it) => {
        it.scale.set(1);
        it.anchor.set(0.5);
        it.position.set(1920 / 2, 1080 - 200);
        this.container.addChild(it);
      }
    );

    this.config.container.addChild(this.container);

    this._activateChildEntity(
      new entity.EntitySequence([this.addBall()]),
      entity.extendConfig({
        container: this.container,
      })
    );
  }

  _teardown() {
    this.config.container.removeChildren();
    this.balls = [];
    this.container = null;
  }

  retry() {
    this.firstHitCount = 0;
    this._teardown();
    this._deactivateAllChildEntities();
    this._off();
    this._setup();
  }

  firstHit() {
    this.firstHitCount++;

    if (this.balls.length < 6) {
      this._activateChildEntity(this.addBall());
    } else {
      this.config.fxMachine.play("Success");
      this.stop();
      this.config.variableStorage.set("ballsJuggled", this.balls.length);
      this._transition = entity.makeTransition();
    }
  }

  fail() {
    this.config.fxMachine.play("Failure");
    this.stop();

    this._activateChildEntity(
      new popup.Confirm(
        `Tu as jonglé ${this.balls.length - 1} balles.\n\nRéessayer ?`,
        (retry) => {
          if (retry) this.retry();
          else {
            this.config.variableStorage.set(
              "ballsJuggled",
              this.balls.length - 1
            );
            this._transition = entity.makeTransition();
          }
        }
      )
    );
  }

  stop() {
    this.stopped = true;
  }

  addBall() {
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        const ball = new Ball(this);
        this.balls.push(ball);
        this._activateChildEntity(
          ball,
          entity.extendConfig({
            container: this.container,
          })
        );
      }),
    ]);
  }
}

export class Ball extends extension.ExtendedCompositeEntity {
  private sprite: PIXI.Sprite;
  private speed = 0;
  private index = 0;
  private wasHit: boolean;

  constructor(private game: Juggling) {
    super();
  }

  _setup() {
    this.wasHit = false;

    this.index = this.game.balls.indexOf(this);
    this.sprite = this.makeSprite(
      "images/mini_games/juggling/ball.png",
      (it) => {
        // Larger hitbox (real radius is 260)
        it.hitArea = new PIXI.Circle(0, 0, 500);
        it.anchor.set(0.5);
        it.scale.set(0.3);
        it.interactive = true;
        it.buttonMode = true;
        it.position.set(
          this.game.zone.x +
            (this.game.zone.width / 5) * this.index +
            this.game.zone.width / 10,
          -100
        );
        this.config.container.addChild(it);
        this._on(it, "pointerdown", () => {
          if (this.speed < 0) return;

          this.speed *= -1;
          this.config.fxMachine.play("Click");

          if (!this.wasHit) {
            this.game.firstHit();
            this.wasHit = true;
          }
        });
      }
    );
  }

  _update() {
    if (this.game.stopped) return;

    this.speed +=
      (baseBallSpeed + (2 * Math.random() - 1) * ballSpeedVariation) *
      this._lastFrameInfo.timeScale;
    this.sprite.rotation = (this._lastFrameInfo.timeScale * Date.now()) / 200;
    this.sprite.position.y += this.speed;
    if (this.sprite.position.y < this.game.zone.y) {
      this.sprite.alpha = this.sprite.position.y / this.game.zone.y;
    }
    if (
      this.sprite.position.y >
      this.game.zone.y + this.game.zone.height + this.sprite.height / 2
    ) {
      this.game.fail();
    }
  }

  _teardown() {
    this.config.container.removeChild(this.sprite);
  }
}
