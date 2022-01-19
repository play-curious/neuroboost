import * as _ from "underscore";
import * as PIXI from "pixi.js";

import MultiStyleText from "pixi-multistyle-text";

import * as entity from "booyah/src/entity";
import * as easing from "booyah/src/easing";
import * as tween from "booyah/src/tween";
import * as util from "booyah/src/util";

import * as extension from "./extension";
import * as variable from "./variable";
import * as gauge from "./gauge";

// Initilize Underscore templates to ressemble YarnSpinner
const templateSettings = {
  interpolate: /{\s*\$(.+?)\s*}/g,
};

const dialogRegexp = /^(\w+)(\s\w+)?:(.+)/;

export class Graphics extends extension.ExtendedCompositeEntity {
  private _fade: PIXI.Graphics;
  private _lastBg: string;
  private _lastCharacter: string;
  private _lastMood: string;

  private _container: PIXI.Container;
  private _backgroundLayer: PIXI.Container;
  private _backgroundEntity: entity.ParallelEntity;
  private _fxLayer: PIXI.Container;
  private _characterLayer: PIXI.Container;
  private _characterEntity: entity.ParallelEntity;
  private _closeupLayer: PIXI.Container;
  private _uiLayer: PIXI.Container;
  private _dialogLayer: PIXI.Container;
  private _dialogSpeaker: PIXI.Container;

  private _nodeDisplay: PIXI.Container;

  private _gauges: Record<string, gauge.Gauge>;

  constructor(private readonly _variableStorageData: variable.Variables) {
    super();
  }

  _setup(): void {
    this._container = new PIXI.Container();
    this.config.container.addChild(this._container);

    this._backgroundLayer = new PIXI.Container();
    this._container.addChild(this._backgroundLayer);

    this._characterLayer = new PIXI.Container();
    this._container.addChild(this._characterLayer);

    this._closeupLayer = new PIXI.Container();
    this._container.addChild(this._closeupLayer);

    this._fxLayer = new PIXI.Container();
    this._container.addChild(this._fxLayer);

    this._uiLayer = new PIXI.Container();
    this._container.addChild(this._uiLayer);

    this._dialogLayer = new PIXI.Container();
    this._dialogLayer.addChild(this.makeSprite("images/ui/dialog.png"));
    this._container.addChild(this._dialogLayer);

    this._dialogSpeaker = new PIXI.Container();
    this._dialogSpeaker.addChild(
      this.makeSprite("images/ui/dialog_speaker.png")
    );
    this._dialogSpeaker.position.set(202, 601);
    this._dialogLayer.addChild(this._dialogSpeaker);

    this._gauges = {};
    const gaugesList: (keyof variable.Gauges)[] = ["sleep", "food"];
    for (let i = 0; i < gaugesList.length; i++) {
      const _gauge = gaugesList[i];
      this._gauges[_gauge] = new gauge.Gauge(
        new PIXI.Point(140 * i + 10, 0),
        new PIXI.Sprite(
          this.entityConfig.app.loader.resources[
            `images/ui/gauges/${_gauge}.png`
          ].texture
        ),
        _gauge
      );
      this._activateChildEntity(
        this._gauges[_gauge],
        entity.extendConfig({ container: this._container })
      );
      this._gauges[_gauge].getGauge().visible = false;
    }

    this._fade = new PIXI.Graphics()
      .beginFill(0xffffff)
      .drawRect(0, 0, 1920, 1080)
      .endFill();
    this._fade.alpha = 0;
    this._fxLayer.addChild(this._fade);
  }

  public getGaugeValue(name: string): number {
    if (this._gauges.hasOwnProperty(name)) return this._gauges[name].getValue();
    return undefined;
  }

  public getUi(): PIXI.Container {
    return this._uiLayer;
  }

  /**
   * Show user interface
   */
  public showUi() {
    this._uiLayer.visible = true;
  }

  /**
   * Hide user interface
   */
  public hideUi() {
    this._uiLayer.visible = false;
  }

  /**
   * Show node
   */
  public showNode() {}

  /**
   * Show node
   */
  public hideNode() {
    if (this._nodeDisplay) this._container.removeChild(this._nodeDisplay);
    this._nodeDisplay = null;
  }

  public toggleGauges(visibility: boolean, ...gaugesName: string[]) {
    if (gaugesName.length === 0) {
      for (const gaugeName in this._gauges) {
        this._gauges[gaugeName].getGauge().visible = visibility;
      }
    } else {
      for (const gaugeName of gaugesName) {
        this._gauges[gaugeName].getGauge().visible = visibility;
      }
    }
  }

  /**
   *
   *
   * @param closeup
   * @returns
   */
  public showCloseup(closeup?: string): void {
    this._closeupLayer.removeChildren();
    if (!closeup) return;

    this._closeupLayer.addChild(
      this.makeSprite(`images/closeups/${closeup}.png`, (it) => {
        it.position.set(400, 10);
      })
    );
  }

  /**
   *
   */
  public hideCloseup(): void {
    this.showCloseup();
  }

  public showDialogLayer() {
    this._dialogLayer.visible = true;
  }

  public showDialog(
    text: string,
    name: string,
    autoShow: boolean,
    onBoxClick: () => unknown
  ) {
    // Use underscore template to interpolate variables
    const interpolatedText = _.template(
      text,
      templateSettings
    )(this._variableStorageData);

    let speaker: string, mood: string, dialog: string;
    if (dialogRegexp.test(interpolatedText)) {
      let match = dialogRegexp.exec(interpolatedText);

      speaker = match[1].trim();
      mood = match[2]?.trim();
      dialog = match[3].trim();
    }

    this._nodeDisplay = new PIXI.Container();
    this._container.addChild(this._nodeDisplay);

    if (speaker) {
      this._dialogSpeaker.visible = true;
      this._nodeDisplay.addChild(
        this.makeText(
          speaker.toLowerCase() === "you" ? name : speaker,
          {
            fontFamily: "Jura",
            fill: "white",
            fontSize: 50,
          },
          (it) => {
            it.anchor.set(0.5);
            it.position.set(
              this._dialogSpeaker.x + this._dialogSpeaker.width / 2,
              this._dialogSpeaker.y + this._dialogSpeaker.height / 2
            );
          }
        )
      );

      if (autoShow && speaker.toLowerCase() !== "you") {
        this.setCharacter(speaker.toLowerCase(), mood?.toLowerCase());
      }
    } else {
      this._dialogSpeaker.visible = false;
    }

    const hitBox = new PIXI.Container();
    {
      hitBox.position.set(140, 704);
      hitBox.hitArea = new PIXI.Rectangle(0, 0, 1634, 322);
      hitBox.interactive = true;
      hitBox.buttonMode = true;
      this._nodeDisplay.addChild(hitBox);
    }

    {
      const dialogBox = new MultiStyleText("", {
        default: {
          fill: "white",
          fontFamily: "Ubuntu",
          fontSize: 40,
          fontStyle: speaker ? "normal" : "italic",
          wordWrap: true,
          wordWrapWidth: 1325,
          leading: 10,
        },
        i: {
          fontStyle: "italic",
        },
        b: {
          fontWeight: "bold",
          fontStyle: speaker ? "normal" : "italic",
        },
        bi: {
          fontWeight: "bold",
          fontStyle: "italic",
        },
      });
      dialogBox.position.set(140 + 122, 704 + 33);

      this._nodeDisplay.addChild(dialogBox);

      const defilementDurationPerLetter = 25;

      const baseText = (dialog || interpolatedText).trim();

      const writer = this.makeFxLoop(
        `${speaker ? "Dialog" : "Narration"}_TypeWriter_LOOP`,
        250
      );

      const defilement = new tween.Tween({
        from: 1,
        to: baseText.length,
        duration: baseText.length * defilementDurationPerLetter,
        onSetup: () => {
          this._activateChildEntity(writer);
        },
        onUpdate: (value) => {
          dialogBox.text = baseText.slice(0, Math.round(value));
        },
        onTeardown: () => {
          dialogBox.text = baseText;
          this._deactivateChildEntity(writer);
          this._off(hitBox, "pointerup", accelerate);
          this._on(hitBox, "pointerup", onBoxClick);
        },
      });

      const accelerate = () => {
        if (defilement.isSetup) this._deactivateChildEntity(defilement);
      };

      this._activateChildEntity(defilement);

      this._once(hitBox, "pointerup", accelerate);
    }
  }

  public setChoice(
    nodeOptions: string[],
    onBoxClick: (choiceId: number) => unknown,
    subchoice?: () => unknown
  ) {
    // This works for both links between nodes and shortcut options
    this._dialogLayer.visible = false;

    this._nodeDisplay = new PIXI.Container();
    this._container.addChild(this._nodeDisplay);

    const animationShifting = 120;
    let currentY: number = 1080 - 40;
    const box_tweens: entity.EntityBase[] = [];
    for (let i: number = 0; i < nodeOptions.length; i++) {
      const choicebox = new PIXI.Container();
      choicebox.addChild(
        this.makeSprite(
          i === 0
            ? "images/ui/choicebox_contour_reversed.png"
            : i === nodeOptions.length - 1
            ? "images/ui/choicebox_contour.png"
            : "images/ui/choicebox_empty.png"
        )
      );

      currentY -= choicebox.height + 20;
      choicebox.pivot.set(choicebox.width / 2, choicebox.y);

      choicebox.position.set(1920 * 2 * (i % 2 ? -1 : 1), currentY);

      box_tweens.push(
        new entity.EntitySequence([
          new entity.WaitingEntity(
            Math.min(nodeOptions.length - (1 + i), 1) *
              animationShifting *
              (nodeOptions.length - (1 + i))
          ),
          new tween.Tween({
            duration: 800,
            easing: easing.easeOutQuint,
            from: i % 2 ? -1920 / 2 : (3 * 1920) / 2,
            to: 1920 / 2,
            onUpdate: (value) => {
              choicebox.position.x = value;
            },
            onTeardown: () => {
              choicebox.interactive = true;
              choicebox.buttonMode = true;

              this._on(choicebox, "pointerup", () => {
                onBoxClick(nodeOptions.length - (1 + i));
              });

              this._on(choicebox, "mouseover", () => {
                this._activateChildEntity(
                  new tween.Tween({
                    duration: 200,
                    easing: easing.easeOutBack,
                    from: 1,
                    to: 1.03,
                    onUpdate: (value) => {
                      choicebox.scale.set(value);
                    },
                  })
                );
              });
              this._on(choicebox, "mouseout", () => {
                this._activateChildEntity(
                  new tween.Tween({
                    duration: 200,
                    easing: easing.easeOutBack,
                    from: 1.03,
                    to: 1,
                    onUpdate: (value) => {
                      choicebox.scale.set(value);
                    },
                  })
                );
              });
            },
          }),
        ])
      );

      choicebox.addChild(
        this.makeText(
          nodeOptions[nodeOptions.length - (1 + i)],
          {
            fill: 0xfdf4d3,
            fontFamily: "Ubuntu",
            fontSize: 40,
          },
          (it) => {
            it.anchor.set(0.5);
            it.position.set(choicebox.width / 2, choicebox.height / 2);
          }
        )
      );

      this._nodeDisplay.addChild(choicebox);
    }

    this._activateChildEntity(new entity.ParallelEntity(box_tweens));

    if (subchoice !== undefined) {
      const arrow_back = new PIXI.Container();
      arrow_back.addChild(this.makeSprite("images/ui/arrow_return.png"));
      arrow_back.scale.set(0.65);
      arrow_back.position.set(10, 1080 - (arrow_back.height + 10));

      arrow_back.interactive = true;
      arrow_back.buttonMode = true;
      this._on(arrow_back, "pointerup", () => {
        subchoice();
      });

      this._nodeDisplay.addChild(arrow_back);
    }
  }

  public setFreechoice(
    nodeOptions: string[],
    onBoxClick: (choiceId: number) => unknown
  ) {
    this._dialogLayer.visible = false;

    this._nodeDisplay = new PIXI.Container();

    const highlightJSON = require("../vectors/hitbox.json");

    const freeboxTweens: entity.EntityBase[] = [];
    const [animationShifting, baseAlpha] = [120, 0.6];
    let freechoicesFound = 0;
    for (let i = 0; i < nodeOptions.length; i++) {
      const [choiceText, jsonValue] = nodeOptions[i].split("@");
      if (!highlightJSON.hasOwnProperty(jsonValue)) continue;
      freechoicesFound++;

      let highlight: PIXI.Sprite;
      if (
        _.has(
          this.entityConfig.app.loader.resources,
          `images/ui/highlights/${jsonValue}.png`
        )
      ) {
        highlight = this.makeSprite(
          `images/ui/highlights/${jsonValue}.png`,
          (it) => {
            it.alpha = 0;
          }
        );

        this._nodeDisplay.addChild(highlight);
      } else continue;

      const hitboxPositions = highlightJSON[jsonValue];
      highlight.hitArea = new PIXI.Polygon(hitboxPositions);

      freeboxTweens.push(
        new entity.EntitySequence([
          new entity.WaitingEntity(Math.min(i, 1) * animationShifting * i),
          new tween.Tween({
            duration: 1000,
            easing: easing.easeOutBack,
            from: 0,
            to: baseAlpha,
            onUpdate: (value) => {
              highlight.alpha = value;
            },
            onTeardown: () => {
              highlight.interactive = true;
              highlight.buttonMode = true;

              this._on(highlight, "pointerup", () => {
                onBoxClick(i);
              });

              this._on(highlight, "mouseover", () => {
                this._activateChildEntity(
                  new tween.Tween({
                    duration: 200,
                    easing: easing.easeOutBack,
                    from: baseAlpha,
                    to: 1,
                    onUpdate: (value) => {
                      highlight.alpha = value;
                    },
                  })
                );
              });
              this._on(highlight, "mouseout", () => {
                this._activateChildEntity(
                  new tween.Tween({
                    duration: 200,
                    easing: easing.easeOutBack,
                    from: 1,
                    to: baseAlpha,
                    onUpdate: (value) => {
                      highlight.alpha = value;
                    },
                  })
                );
              });
            },
          }),
        ])
      );

      this._nodeDisplay.addChild(highlight);
    }
    if (freechoicesFound === nodeOptions.length) {
      this._container.addChild(this._nodeDisplay);
      this._activateChildEntity(new entity.ParallelEntity(freeboxTweens));
    } else if (freechoicesFound === 0) {
      for (let i = 0; i < nodeOptions.length; i++) {
        nodeOptions[i] = nodeOptions[i].split("@")[0];
      }
      this.setChoice(nodeOptions, onBoxClick);
    } else {
      throw new Error("Missing freechoice(s) in freechoice.json");
    }
  }

  /**
   * Set background
   *
   * @param bg Background's name
   */
  public setBackground(bg: string) {
    if (bg === this._lastBg) return;

    const folderName: `images/${string}` = `images/bg/${bg}`;
    const fileName: `images/${string}.png` = `${folderName}/base.png`;
    const fileNameJson = `${folderName}/base.json`;
    if (!_.has(this.entityConfig.app.loader.resources, fileName)) {
      console.warn("Missing asset for background", bg);
      return;
    }

    // Remove existing
    this._backgroundLayer.removeChildren();
    if (this._backgroundEntity !== undefined) {
      if (this.childEntities.indexOf(this._backgroundEntity) != -1)
        this._deactivateChildEntity(this._backgroundEntity);
      this._backgroundEntity = undefined;
    }

    // Set background base
    this._backgroundLayer.addChild(this.makeSprite(fileName));

    // Set animations
    if (_.has(this.entityConfig.app.loader.resources, fileNameJson)) {
      this._backgroundEntity = new entity.ParallelEntity();
      this._activateChildEntity(
        this._backgroundEntity,
        entity.extendConfig({ container: this._backgroundLayer })
      );

      let baseJson = this.config.app.loader.resources[fileNameJson].data;
      for (const bgPart of baseJson.sprites) {
        // Load animated texture
        if (
          _.has(
            this.config.app.loader.resources,
            `${folderName}/${bgPart.model}.json`
          )
        ) {
          const animatedSpriteEntity = util.makeAnimatedSprite(
            this.config.app.loader.resources[
              `${folderName}/${bgPart.model}.json`
            ]
          );
          animatedSpriteEntity.sprite.anchor.set(0.5, 0.5);
          animatedSpriteEntity.sprite.x = bgPart.x;
          animatedSpriteEntity.sprite.y = bgPart.y;

          animatedSpriteEntity.sprite.animationSpeed = 0.33;
          this._backgroundEntity.addChildEntity(animatedSpriteEntity);
        }
      }
    }

    this._lastBg = bg;
  }

  /**
   *
   *
   * @param character if null or undefined, it will remove current character
   * @param mood
   */
  public setCharacter(character?: string, mood?: string): void {
    //if (mood === undefined) mood = "happy";

    if (character === this._lastCharacter && mood === this._lastMood) return;

    // Remove all previous characters
    this._characterLayer.removeChildren();

    if (this._characterEntity !== undefined) {
      if (this.childEntities.indexOf(this._characterEntity) != -1)
        this._deactivateChildEntity(this._characterEntity);
      this._characterEntity = undefined;
    }

    if (character && character !== "you") {
      const characterContainer = new PIXI.Container();
      this._characterEntity = new entity.ParallelEntity();
      this._activateChildEntity(
        this._characterEntity,
        entity.extendConfig({ container: characterContainer })
      );

      const baseDir = `images/characters/${character}`;

      let baseJson =
        this.config.app.loader.resources[`${baseDir}/base.json`].data;
      if (!_.has(baseJson, mood)) mood = baseJson["default"];

      // Load animations JSON
      for (const bodyPart of baseJson[mood]) {
        if (
          _.has(
            this.config.app.loader.resources,
            `${baseDir}/${bodyPart.model}.json`
          )
        ) {
          const animatedSpriteEntity = util.makeAnimatedSprite(
            this.config.app.loader.resources[
              `${baseDir}/${bodyPart.model}.json`
            ]
          );
          animatedSpriteEntity.sprite.anchor.set(0.5, 0.5);
          animatedSpriteEntity.sprite.x = bodyPart.x;
          animatedSpriteEntity.sprite.y = bodyPart.y;

          if (_.has(bodyPart, "scale")) {
            animatedSpriteEntity.sprite.scale.set(
              bodyPart.scale,
              bodyPart.scale
            );
            console.log(bodyPart.scale);
          }

          animatedSpriteEntity.sprite.animationSpeed = 0.33;
          this._characterEntity.addChildEntity(animatedSpriteEntity);
        } else {
          console.log(`Missing : ${baseDir}/${bodyPart.model}.json`);
        }
      }

      // Place character on screen
      this._characterLayer.addChild(characterContainer);
      characterContainer.setTransform(250, 80, 1.1, 1.1);
      //characterContainer.setTransform(0, 0, 1, 1); // For test, do not remove
    }

    this._lastCharacter = character;
    this._lastMood = mood;
  }

  public fade(color: string, IN: boolean, OUT: boolean, duration: number) {
    this._fade.tint = eval(color.replace("#", "0x"));

    this._activateChildEntity(
      new entity.EntitySequence([
        new entity.FunctionCallEntity(() => {
          this._fade.alpha = 0;
        }),
        new tween.Tween({
          duration: IN && OUT ? duration / 2 : IN ? duration : 0,
          from: 0,
          to: 1,
          onUpdate: (value) => {
            this._fade.alpha = value;
          },
        }),
        new tween.Tween({
          duration: IN && OUT ? duration / 2 : OUT ? duration : 0,
          from: 1,
          to: 0,
          onUpdate: (value) => {
            this._fade.alpha = value;
          },
        }),
        new entity.FunctionCallEntity(() => {
          this._fade.alpha = 0;
        }),
      ])
    );
  }

  fadeIn(color: string, duration: number) {
    this._fade.tint = eval(color.replace("#", "0x"));

    this._activateChildEntity(
      new entity.EntitySequence([
        new entity.FunctionCallEntity(() => {
          this._fade.alpha = 0;
        }),
        new tween.Tween({
          duration: duration,
          from: 0,
          to: 1,
          onUpdate: (value) => {
            this._fade.alpha = value;
          },
        }),
        new entity.FunctionCallEntity(() => {
          this._fade.alpha = 1;
        }),
      ])
    );
  }

  fadeOut(color: string, duration: number) {
    this._fade.tint = eval(color.replace("#", "0x"));

    this._activateChildEntity(
      new entity.EntitySequence([
        new entity.FunctionCallEntity(() => {
          this._fade.alpha = 1;
        }),
        new tween.Tween({
          duration: duration,
          from: 1,
          to: 0,
          onUpdate: (value) => {
            this._fade.alpha = value;
          },
        }),
        new entity.FunctionCallEntity(() => {
          this._fade.alpha = 0;
        }),
      ])
    );
  }
}
