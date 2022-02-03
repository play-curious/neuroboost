import * as PIXI from "pixi.js";
import * as extension from "./extension";
import * as entity from "booyah/src/entity";

export function save(stateName?: string) {
  if (!stateName) localStorage.removeItem("save");
  localStorage.setItem("save", stateName);
}

export function loadSave(): string {
  return localStorage.getItem("save");
}

export function hasSave(): boolean {
  return !!loadSave();
}

export class StartMenu extends extension.ExtendedCompositeEntity {
  container: PIXI.Container;
  background: entity.AnimatedSpriteEntity;
  continueButton?: PIXI.Sprite;
  newGameButton: PIXI.Sprite;

  _setup() {
    this.container = new PIXI.Container();
    this.background = this.makeAnimatedSprite(
      "images/bg/outside/background.json"
    );

    this._activateChildEntity(
      this.background,
      entity.extendConfig({
        container: this.container,
      })
    );

    if (hasSave()) {
      this.continueButton = this.makeSprite(
        "images/ui/choicebox_empty.png",
        (it) => {
          it.anchor.set(0.5);
          it.buttonMode = true;
          it.interactive = true;
          it.position.set(1920 / 2, 1080 * 0.3);

          this._on(it, "click", () => {
            const stateName = loadSave();

            this._transition = entity.makeTransition(stateName);
          });
        }
      );
    }

    this.newGameButton = this.makeSprite(
      "images/ui/choicebox_empty.png",
      (it) => {
        it.anchor.set(0.5);
        it.buttonMode = true;
        it.interactive = true;
        it.position.set(1920 / 2, hasSave() ? 1080 * 0.7 : 1080 / 2);

        this._on(it, "click", () => {
          save();

          this._transition = entity.makeTransition("D1_level1");
        });
      }
    );
  }

  _teardown() {
    // todo: teardown
  }
}
