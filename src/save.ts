import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";

import * as extension from "./extension";
import * as variable from "./variable";
import * as popup from "./popup";

export function save(
  stateName?: string,
  variableStorage?: variable.VariableStorage
) {
  if (!stateName) {
    console.log("removed save");
    localStorage.removeItem("save");
    localStorage.removeItem("variableStorage");
  } else {
    console.log("saved game state:", stateName);
    localStorage.setItem("save", stateName);
    localStorage.setItem(
      "variableStorage",
      JSON.stringify(variableStorage.data)
    );
  }
}

export function loadSave(): {
  state: string;
  variableStorage: variable.VariableStorage;
} {
  const state = localStorage.getItem("save");
  const varstorage = JSON.parse(localStorage.getItem("variableStorage"));
  const variableStorage = new variable.VariableStorage(varstorage);
  console.log("loaded game data:", state, variableStorage);
  return {
    state,
    variableStorage,
  };
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
            const saveData = loadSave();
            this.config.variableStorage = saveData.variableStorage;
            this._transition = entity.makeTransition(saveData.state);
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
          if (hasSave()) {
            this._activateChildEntity(
              new popup.Confirm(
                "Vous avez une partie en cours. Êtes vous sûr de vouloir en commencer une nouvelle ?",
                () => {
                  save();
                  this._transition = entity.makeTransition("D1_level1");
                }
              )
            );
          } else {
            save();
            this._transition = entity.makeTransition("D1_level1");
          }
        });
      }
    );

    this.config.container.addChild(this.container);
  }

  _teardown() {
    this.config.container.removeChild(this.container);
  }
}
