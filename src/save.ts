import * as PIXI from "pixi.js";
import * as extension from "./extension";
import * as entity from "booyah/src/entity";

export function save(stateName?: string) {
  if (!stateName) {
    console.log("removed save");
    localStorage.removeItem("save");
  } else {
    console.log("saved game state:", stateName);
    localStorage.setItem("save", stateName);
  }
}

export function loadSave(): string {
  const stateName = localStorage.getItem("save");
  console.log("loaded game state:", stateName);
  return stateName;
}

export function hasSave(): boolean {
  return !!localStorage.getItem("save");
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
        "images/ui/start_menu_button.png",
        (it) => {
          it.anchor.set(0.5);
          it.buttonMode = true;
          it.interactive = true;
          it.position.set(1920 / 2, 1080 * 0.4);
          it.addChild(
            this.makeText(
              "Continuer",
              {
                fontFamily: "Ubuntu",
                fill: 0xffffff,
              },
              (txt) => {
                txt.anchor.set(0.5);
                txt.scale.set(2);
                //txt.position.set(it.width / 2, it.height / 2);
              }
            )
          );

          this.container.addChild(it);

          this._on(it, "click", () => {
            this._transition = entity.makeTransition(loadSave());
          });
        }
      );
    }

    this.newGameButton = this.makeSprite(
      "images/ui/start_menu_button.png",
      (it) => {
        it.anchor.set(0.5);
        it.buttonMode = true;
        it.interactive = true;
        it.position.set(1920 / 2, hasSave() ? 1080 * 0.6 : 1080 / 2);
        it.addChild(
          this.makeText(
            "Nouvelle partie",
            {
              fontFamily: "Ubuntu",
              fill: 0xffffff,
            },
            (txt) => {
              txt.anchor.set(0.5);
              txt.scale.set(2);
              //txt.position.set(it.width / 2, it.height / 2);
            }
          )
        );

        this.container.addChild(it);

        this._on(it, "click", () => {
          save();

          this._transition = entity.makeTransition("D1_level1");
        });
      }
    );

    this.config.container.addChild(this.container);
  }

  _teardown() {
    this.config.container.removeChild(this.container);
  }
}
