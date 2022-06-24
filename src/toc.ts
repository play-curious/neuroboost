import * as _ from "underscore";
import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";

import * as extension from "./extension";

export type SceneType = "level" | "sages" | "journal";

const yellow = 0xf9c560;
const subtitleFontSize = 34;

export class TableOfContents extends extension.ExtendedCompositeEntity {
  private _container: PIXI.Container;

  _setup() {
    this._container = new PIXI.Container();
    this._entityConfig.container.addChild(this._container);

    {
      // Make background
      const background = this.makeAnimatedSprite(
        "images/bg/outside/background.json"
      );
      this._activateChildEntity(
        background,
        entity.extendConfig({
          container: this._container,
        })
      );
    }

    {
      // Make menu background
      const menuBackground = new PIXI.NineSlicePlane(
        this._entityConfig.app.loader.resources[
          "images/ui/resizable_container.png"
        ].texture,
        116,
        125,
        116,
        125
      );
      menuBackground.width = 1230;
      menuBackground.height = 1028;
      menuBackground.position.set(354, 28);
      this._container.addChild(menuBackground);
    }

    {
      // Title
      const text = new PIXI.Text("Choix du chapitre", {
        fontFamily: "Jura",
        fontSize: 52,
        fill: "white",
      });
      text.position.set(432, 82);
      this._container.addChild(text);
    }

    const gridStart = new PIXI.Point(432, 156);
    const columnWidth = 476;
    const columnPadding = 75;
    const rowHeight = 197;
    const indent = new PIXI.Point(38, 32);
    const columnWidthAfterIndent = columnWidth - indent.x;

    let chapter = 0;
    for (let column = 0; column < 2; column++) {
      for (let row = 0; row < 4; row++) {
        const currentChapter = chapter; // Necessary to copy this variable for use within callbacks
        const gridCell = new PIXI.Point(
          gridStart.x + column * (columnWidth + columnPadding),
          gridStart.y + row * rowHeight
        );

        {
          const line = new PIXI.Sprite(
            this._entityConfig.app.loader.resources[
              "images/ui/line.png"
            ].texture
          );
          line.position.copyFrom(gridCell);
          this._container.addChild(line);
        }

        {
          const line = new PIXI.Container();
          line.position.set(gridCell.x + indent.x, gridCell.y + indent.y);
          line.hitArea = new PIXI.Rectangle(0, 0, columnWidthAfterIndent, 50);
          line.interactive = true;
          line.buttonMode = true;
          this._on(line, "pointerup", () =>
            this._pickScene("level", currentChapter)
          );
          this._container.addChild(line);

          {
            const titleText =
              chapter === 0 ? "Prologue" : `Chapitre ${chapter}`;
            const title = new PIXI.Text(titleText, {
              fontFamily: "Jura",
              fontStyle: "bold",
              fontSize: subtitleFontSize,
              fill: "white",
            });
            line.addChild(title);
          }

          if (chapter > 0) {
            // Make stars

            // TODO: get score
            const score = Math.floor(Math.random() * 3.9);
            const starWidth = 40;
            for (let i = 0; i < 3; i++) {
              const starVariant = score > i ? "highlight" : "greyed";
              const fileName = `images/ui/star-${starVariant}.png`;
              const sprite = new PIXI.Sprite(
                this._entityConfig.app.loader.resources[fileName].texture
              );
              sprite.anchor.set(1, 0);
              sprite.position.set(
                columnWidthAfterIndent - (2 - i) * starWidth,
                0
              );
              line.addChild(sprite);
            }
          }
        }

        if (chapter > 0) {
          {
            const line = new PIXI.Container();
            line.position.set(
              gridCell.x + indent.x,
              gridCell.y + indent.y + 53
            );
            line.hitArea = new PIXI.Rectangle(0, 0, columnWidthAfterIndent, 50);
            line.interactive = true;
            line.buttonMode = true;
            this._on(line, "pointerup", () =>
              this._pickScene("sages", currentChapter)
            );
            this._container.addChild(line);

            {
              const sagesText = "Accéder aux Sages";
              const sages = new PIXI.Text(sagesText, {
                fontFamily: "Ubuntu",
                fontStyle: "italic",
                fontSize: subtitleFontSize,
                fill: yellow,
              });
              line.addChild(sages);
            }

            {
              // Make sages check

              // TODO: get check from saved game
              const isChecked = Math.random() > 0.5;
              const variant = isChecked ? "highlight" : "greyed";
              const fileName = `images/ui/check-${variant}.png`;
              const sprite = new PIXI.Sprite(
                this._entityConfig.app.loader.resources[fileName].texture
              );
              sprite.anchor.set(1, 0);
              sprite.position.set(columnWidthAfterIndent, 0);
              line.addChild(sprite);
            }
          }

          {
            const line = new PIXI.Container();
            line.position.set(
              gridCell.x + indent.x,
              gridCell.y + indent.y + 106
            );
            line.hitArea = new PIXI.Rectangle(0, 0, columnWidthAfterIndent, 50);
            line.interactive = true;
            line.buttonMode = true;
            this._on(line, "pointerup", () =>
              this._pickScene("journal", currentChapter)
            );
            this._container.addChild(line);

            {
              const textContent = "Écrire sur le journal";
              const text = new PIXI.Text(textContent, {
                fontFamily: "Ubuntu",
                fontStyle: "italic",
                fontSize: subtitleFontSize,
                fill: yellow,
              });
              line.addChild(text);
            }

            {
              // Make journal check

              // TODO: get check from saved game
              const isChecked = Math.random() > 0.5;
              const variant = isChecked ? "highlight" : "greyed";
              const fileName = `images/ui/check-${variant}.png`;
              const sprite = new PIXI.Sprite(
                this._entityConfig.app.loader.resources[fileName].texture
              );
              sprite.anchor.set(1, 0);
              sprite.position.set(columnWidthAfterIndent, 0);
              line.addChild(sprite);
            }
          }
        }

        chapter++;
      }
    }
  }

  protected _teardown(frameInfo: entity.FrameInfo): void {
    this._entityConfig.container.removeChild(this._container);
    this._container = null;
  }

  private _pickScene(type: SceneType, index: number): void {
    this._transition = entity.makeTransition("pick", { type, index });
  }
}
