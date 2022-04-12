import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";

import * as extension from "./extension";
import * as variable from "./variable";
import * as dialog from "./dialog";
import * as popup from "./popup";

export interface SaveData {
  levelName: string;
  nodeName: string;
  history: {
    texts: [type: string, text: string][];
    lastTime: number;
  };
  /** Set<string> */
  visited: string[];
  /** Set<string> */
  visitedPermanent: string[];
  lastGraphics: Partial<{
    lastBg: string;
    lastBgMood: string;
    lastCharacter: string;
    lastMood: string;
    lastMusic: string;
    lastGauges: string[];
  }>;
  variableStorage: variable.Variables;
}

export function deleteSave() {
  localStorage.removeItem("save");
}

/** When called with a dialog scene, saves the scene in local storage.
 *  When called with null or undefined, removes save.
 */
export function save(ctx?: dialog.DialogScene) {
  if (!ctx) {
    deleteSave();
  } else {
    const data: SaveData = {
      levelName: ctx.levelName,
      nodeName: ctx.lastNodeData?.title ?? "Start",
      lastGraphics: ctx.graphics.last,
      variableStorage: ctx.config.variableStorage.data,
      visited: [...ctx.visited],
      visitedPermanent: [...ctx.visitedPermanent],
      history: ctx.config.history,
    };

    console.log("save.ts debug", JSON.stringify(data.lastGraphics, null, 2));

    localStorage.setItem("save", JSON.stringify(data));
  }
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
              }
            )
          );

          this.container.addChild(it);

          this._on(it, "pointerup", () => {
            this.config.fxMachine.play("Click");

            //@ts-ignore
            window.loadSave = true;

            // load saved node from saveData.node
            const saveData: SaveData = JSON.parse(localStorage.getItem("save"));
            this._transition = entity.makeTransition(saveData.levelName);
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
                    deleteSave();
                    this._transition = entity.makeTransition("D1_level1");
                  }
                }
              )
            );
          } else {
            deleteSave();
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
