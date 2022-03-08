import * as extension from "./extension";
import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";

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
  private temde: { container: PIXI.Container; entity: entity.ParallelEntity };
  private temdeArm: PIXI.Sprite;
  private hits: number;
  private textScore: PIXI.Text;
  public balls: Ball[];
  public zone = {
    x: 1920 / 2,
    y: 100,
    width: 1920 / 2 - 100,
    height: 1080 - 100,
  };

  _setup() {
    super._setup();
    this.hits = 0;
    this.balls = [];
    this.textScore = this.makeText(
      "",
      {
        fontFamily: "Ubuntu",
        align: "center",
        fill: 0xffffff,
      },
      (it) => {
        it.scale.set(3);
        it.anchor.set(0.5);
        it.position.set(1920 / 2, 1080 - 200);
        this.container.addChild(it);
      }
    );
    this.temde = this.makeCharacter("temde", "", "", false);
    this.temde.container.scale.x = -1.1;
    this.temde.container.position.x = 1500;
    this.temdeArm = this.makeSprite("images/characters/temde/arm.png", (it) => {
      it.position.set(-it.width, this.zone.height);
      this.container.addChild(it);
    });
    this.container.addChild(this.temde.container);
    // todo: add background and character ?
    this.config.container.addChild(this.container);
    this._activateChildEntity(
      this.temde.entity,
      entity.extendConfig({
        container: this.temde.container,
      })
    );
    this._activateChildEntity(
      new entity.EntitySequence([
        // todo: explain script
        this.addBall(),
      ]),
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
    this.hits = 0;
    this._teardown();
    this._deactivateAllChildEntities();
    this._off();
    this._setup();
  }

  hit() {
    this.hits++;
    this.updateText();
    if (this.hits > this.balls.length) {
      this.hits = 0;
      if (this.balls.length < 5) {
        this._activateChildEntity(this.addBall());
        this.updateText();
      } else {
        // todo: Success script
        this.updateText();
        alert("Success!");
        this._transition = entity.makeTransition();
      }
    }
  }

  fail() {
    // todo: FAIL script
    if (confirm("Retry?")) this.retry();
    else this._transition = entity.makeTransition();
  }

  updateText() {
    this.textScore.text = `${this.hits} / ${this.balls.length} / 5`;
  }

  addBall() {
    return new entity.EntitySequence([
      // todo: animation with temde arm
      new entity.ParallelEntity([
        // arm opacity
        new tween.Tween({
          from: -this.temdeArm.width,
          to: 0,
          duration: 500,
          onUpdate: (value) => {
            this.temdeArm.position.x = value;
          },
        }),
        // arm position
        new tween.Tween({
          from: 0,
          to: 1,
          duration: 500,
          onUpdate: (value) => {
            this.temdeArm.alpha = value;
          },
        }),
      ]),
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

  constructor(private game: Juggling) {
    super();
  }

  _setup() {
    this.index = this.game.balls.indexOf(this);
    this.sprite = this.makeSprite(
      "images/mini_games/juggling/ball.png",
      (it) => {
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
          this.game.hit();
        });
      }
    );
  }

  _update() {
    this.speed += 0.2 - this.index * 0.05;
    this.sprite.rotation = Date.now() / 200;
    this.sprite.position.y += this.speed;
    if (this.sprite.position.y < this.game.zone.y) {
      this.sprite.alpha = this.sprite.position.y / this.game.zone.y;
    }
    if (
      this.sprite.position.y >
      this.game.zone.y + this.game.zone.height + this.sprite.height / 2
    ) {
      this.game.fail();
      this._transition = entity.makeTransition();
    }
  }

  _teardown() {
    this.config.container.removeChild(this.sprite);
  }
}
