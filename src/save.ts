import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";

import * as extension from "./extension";
import * as variable from "./variable";
import * as dialog from "./dialog";
import * as popup from "./popup";

export function save(ctx?: dialog.DialogScene) {
  if (!ctx) {
    localStorage.removeItem("save");
    localStorage.removeItem("visited");
    localStorage.removeItem("environment");
    localStorage.removeItem("variableStorage");
  } else {
    localStorage.setItem(
      "save",
      `${ctx.stateName}@${ctx.lastNodeData?.title ?? "Start"}`
    );
    localStorage.setItem("visited", JSON.stringify([...ctx.visited]));
    localStorage.setItem(
      "variableStorage",
      JSON.stringify(ctx.config.variableStorage.data)
    );
    localStorage.setItem("environment", JSON.stringify(ctx.graphics.last));
  }
}

export function loadSave() {
  const [level, node] = localStorage.getItem("save").split("@");
  const visited = new Set(JSON.parse(localStorage.getItem("visited")));
  const data = JSON.parse(localStorage.getItem("variableStorage"));
  const environment = JSON.parse(localStorage.getItem("environment"));
  const variableStorage = new variable.VariableStorage(data);
  return {
    level,
    node,
    visited,
    environment,
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

          this._on(it, "pointerup", () => {
            this.config.fxMachine.play("Click");

            const saveData = loadSave();
            this.config.variableStorage = saveData.variableStorage;

            // load saved node from saveData.node
            this._transition = entity.makeTransition(saveData.level);

            // @ts-ignore
            window.loadedNode = saveData.node;
            //@ts-ignore
            window.loadedVisited = saveData.visited;
            //@ts-ignore
            window.loadedEnvironment = saveData.environment;
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

        this._on(it, "pointerup", () => {
          this.config.fxMachine.play("Click");

          if (hasSave()) {
            this._activateChildEntity(
              new popup.Confirm(
                "Vous avez une partie en cours. Êtes vous sûr de vouloir en commencer une nouvelle ?",
                (ok) => {
                  if (ok) {
                    save();
                    this._transition = entity.makeTransition("D1_level1");
                  }
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
