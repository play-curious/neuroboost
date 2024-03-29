import * as _ from "underscore";
import * as PIXI from "pixi.js";
import * as filters from "pixi-filters";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as util from "booyah/src/util";

import * as extension from "./extension";
import * as save from "./save";
import * as dialog from "./dialog";
import { translateInterface, translateTitle } from "./wrapper/i18n";
import i18n from "./generated/i18n";

export type SceneType = "level" | "sages" | "journal";

const yellow = 0xf9c560;
const subtitleFontSize = 34;

export class TableOfContents extends extension.ExtendedCompositeEntity {
  private _container: PIXI.Container;
  private _makeButton = makeButton; // "import" function

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
      const text = new PIXI.Text(
        translateInterface(this, "menu_chapitre_titre"),
        {
          fontFamily: "Jura",
          fontSize: 52,
          fill: "white",
        }
      );
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
        const chapterData = save.getCompletedChapter(
          dialog.dialogScenes[chapter]
        );

        const gridCell = new PIXI.Point(
          gridStart.x + column * (columnWidth + columnPadding),
          gridStart.y + row * rowHeight
        );

        {
          const line = new PIXI.Sprite(
            this._entityConfig.app.loader.resources[
              "images/ui/line-expand.png"
            ].texture
          );
          line.width = columnWidth;
          line.position.copyFrom(gridCell);
          this._container.addChild(line);
        }

        {
          const line = new PIXI.Container();
          line.position.set(gridCell.x, gridCell.y + indent.y);
          line.hitArea = new PIXI.Rectangle(0, 0, columnWidthAfterIndent, 50);
          line.interactive = true;
          line.buttonMode = true;
          this._applyHoveringEffects(line);
          this._on(line, "pointerup", () =>
            this._pickScene("level", currentChapter)
          );
          this._container.addChild(line);

          {
            const titleText =
              chapter === 0
                ? translateInterface(this, "chapitre_prologue")
                : `${chapter} - ${translateTitle(
                    this,
                    chapter as any,
                    "short"
                  )}`;
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
            const starWidth = 40;
            for (let i = 0; i < 3; i++) {
              const starVariant =
                chapterData.score > i ? "highlight" : "greyed";
              const fileName = `images/ui/star-${starVariant}.png`;
              const sprite = new PIXI.Sprite(
                this._entityConfig.app.loader.resources[fileName].texture
              );
              sprite.anchor.set(1, 0);
              sprite.position.set(columnWidth - (2 - i) * starWidth, 0);
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
            this._applyHoveringEffects(line, yellow);
            this._on(line, "pointerup", () =>
              this._pickScene("sages", currentChapter)
            );
            this._container.addChild(line);

            {
              const sagesText = translateInterface(this, "menu_chapitre_sages");
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
              const variant = chapterData.completedSages
                ? "highlight"
                : "greyed";
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
            this._applyHoveringEffects(line, yellow);
            this._on(line, "pointerup", () =>
              this._pickScene("journal", currentChapter)
            );
            this._container.addChild(line);

            {
              const textContent = translateInterface(
                this,
                "menu_chapitre_ecrire"
              );
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
              const variant = chapterData.completedJournal
                ? "highlight"
                : "greyed";
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

    if (save.getCurrentChapter()) {
      // Make continue button
      const buttonContainer = this._makeButton(
        translateInterface(this, "menu_chapitre_continuer"),
        500
      );
      buttonContainer.position.set(this._entityConfig.app.view.width / 2, 950);
      this._on(buttonContainer, "pointerup", this._continue);
      this._container.addChild(buttonContainer);
    }
  }

  protected _teardown(frameInfo: entity.FrameInfo): void {
    this._entityConfig.container.removeChild(this._container);
    this._container = null;
  }

  private _pickScene(type: SceneType, index: number): void {
    this._entityConfig.fxMachine.play("Click");
    this._transition = entity.makeTransition("pick", { type, index });
  }

  private _continue(): void {
    this._entityConfig.fxMachine.play("Click");
    this._transition = entity.makeTransition("continue");
  }

  private _applyHoveringEffects(
    obj: PIXI.DisplayObject,
    color = 0xffffff
  ): void {
    this._on(obj, "pointerover", () => {
      // @ts-ignore
      obj.filters = [new filters.OutlineFilter(2, color)];
    });
    this._on(obj, "pointerout", () => (obj.filters = []));
  }
}

export class ScoreMenuOptions {
  /** Number of the chapter, eg. "Chapitre 1" */
  chapter: number;
  score: number;
  hint: string = "";
}

export class ScoreMenu extends extension.ExtendedCompositeEntity {
  private _options: ScoreMenuOptions;
  private _container: PIXI.Container;
  private _makeButton = makeButton; // "import" function

  constructor(public options: Partial<ScoreMenuOptions>) {
    super();

    this._options = util.fillInOptions(options, new ScoreMenuOptions());
  }

  _setup() {
    this._container = new PIXI.Container();
    this._entityConfig.container.addChild(this._container);
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
      menuBackground.width = 1222;
      menuBackground.height = 827;
      menuBackground.position.set(356, 124);
      this._container.addChild(menuBackground);
    }

    {
      // Title
      const text = new PIXI.Text(
        translateInterface(this, "score_menu_reussi", {
          chapterNumber: this._options.chapter,
        }),
        {
          fontFamily: "Jura",
          fontSize: 52,
          fill: "white",
        }
      );
      text.anchor.set(0.5, 0);
      text.position.set(this._entityConfig.app.view.width / 2, 170);
      this._container.addChild(text);
    }

    {
      const line = new PIXI.Sprite(
        this._entityConfig.app.loader.resources[
          "images/ui/line-expand.png"
        ].texture
      );
      line.width = 1052;
      line.anchor.set(0.5, 0);
      line.position.set(this._entityConfig.app.view.width / 2, 257);
      this._container.addChild(line);
    }

    {
      // Make stars
      const starWidth = 128;
      for (let i = 0; i < 3; i++) {
        const starVariant = this._options.score > i ? "highlight" : "greyed";
        const fileName = `images/ui/star-big-${starVariant}.png`;
        const sprite = new PIXI.Sprite(
          this._entityConfig.app.loader.resources[fileName].texture
        );
        sprite.position.set(763 + starWidth * i, 342);
        this._container.addChild(sprite);
      }
    }

    {
      // Make score message
      const text = translateInterface(
        this,
        ("score_" +
          this._options.score) as i18n[keyof i18n]["interface"][number]["id"]
      );
      const message = new PIXI.Text(text, {
        fontFamily: "Ubuntu",
        fontStyle: "bold",
        fontSize: 42,
        fill: "white",
      });
      message.anchor.set(0.5);
      message.position.set(this._entityConfig.app.view.width / 2, 537);
      this._container.addChild(message);
    }

    {
      // Make message
      const message = new PIXI.Text(this._options.hint, {
        fontFamily: "Ubuntu",
        fontStyle: "italic",
        fontSize: subtitleFontSize,
        fill: yellow,
        align: "center",
        wordWrap: true,
        wordWrapWidth: 740,
      });
      message.anchor.set(0.5);
      message.position.set(this._entityConfig.app.view.width / 2, 617);
      this._container.addChild(message);
    }

    {
      // Make restart button
      const buttonContainer = this._makeButton(
        translateInterface(this, "score_menu_recommencer"),
        333
      );
      buttonContainer.position.set(609, 731);
      this._on(buttonContainer, "pointerup", this._restartLevel);
      this._container.addChild(buttonContainer);
    }
    {
      // Make TOC button
      const buttonContainer = this._makeButton(
        translateInterface(this, "score_menu_choisir_chapitre"),
        333
      );
      buttonContainer.position.set(970, 731);
      this._on(buttonContainer, "pointerup", this._gotoToc);
      this._container.addChild(buttonContainer);
    }
    {
      // Make continue button
      const buttonContainer = this._makeButton(
        translateInterface(this, "score_menu_continuer"),
        333
      );
      buttonContainer.position.set(1331, 731);
      this._on(buttonContainer, "pointerup", this._continue);
      this._container.addChild(buttonContainer);
    }
  }

  protected _teardown(frameInfo: entity.FrameInfo): void {
    this._entityConfig.container.removeChild(this._container);
    this._container = null;
  }

  private _restartLevel() {
    this._entityConfig.fxMachine.play("Click");

    // Tell the state machine to restart the current level without save params
    const stateDescriptor = entity.makeTransition(
      this._entityConfig.gameStateMachine.lastTransition.name
    );
    this._entityConfig.gameStateMachine.changeState(stateDescriptor);
  }

  private _gotoToc() {
    this._entityConfig.fxMachine.play("Click");

    // Tell the state machine to return to the TOC
    this._entityConfig.gameStateMachine.changeState("toc");
  }

  private _continue() {
    this._entityConfig.fxMachine.play("Click");

    // Simply stop this menu, the dialog will continue
    this._transition = entity.makeTransition();
  }
}

function makeButton(label: string, width: number): PIXI.Container {
  const buttonContainer = new PIXI.Container();
  buttonContainer.buttonMode = true;
  buttonContainer.interactive = true;

  const normal = new PIXI.Graphics();
  normal.lineStyle(2, yellow);
  normal.drawRect(-width / 2, 0, width, 70);
  buttonContainer.addChild(normal);

  const hover = new PIXI.Graphics();
  hover.beginFill(yellow);
  hover.drawRect(-width / 2, 0, width, 70);
  hover.endFill();
  hover.visible = false;
  hover.alpha = 0.5;
  buttonContainer.addChild(hover);

  {
    const text = new PIXI.Text(label, {
      fontFamily: "Ubuntu",
      fontSize: subtitleFontSize,
      fill: yellow,
    });
    text.anchor.set(0.5, 0.5);
    text.position.set(0, 35);
    buttonContainer.addChild(text);
  }

  this._on(buttonContainer, "pointerover", () => {
    normal.visible = false;
    hover.visible = true;
  });
  this._on(buttonContainer, "pointerout", () => {
    normal.visible = true;
    hover.visible = false;
  });

  return buttonContainer;
}
