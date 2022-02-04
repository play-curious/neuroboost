import * as _ from "underscore";
import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as easing from "booyah/src/easing";
import * as tween from "booyah/src/tween";

import * as extension from "./extension";
import * as character from "./character";
import * as variable from "./variable";
import * as images from "./images";
import * as gauge from "./gauge";

// Initialize Underscore templates to resemble YarnSpinner
const templateSettings = {
  interpolate: /{\s*\$(.+?)\s*}/g,
};

const dialogRegexp = /^([a-zA-Z]+)(_([a-zA-Z]+))?:(.+)/;

export class Graphics extends extension.ExtendedCompositeEntity {
  private _lastBg: string;
  private _lastBgMood: string;

  private _fade: PIXI.Graphics;
  private _container: PIXI.Container;
  private _backgroundLayer: PIXI.Container;
  private _backgroundEntity: entity.ParallelEntity;
  private _fxLayer: PIXI.Container;
  private _characterLayer: PIXI.Container;
  private _closeupLayer: PIXI.Container;
  private _uiLayer: PIXI.Container;
  private _dialogLayer: PIXI.Container;
  private _dialogSpeaker: PIXI.Container;

  private _nodeDisplay: PIXI.Container;

  private _gauges: Record<string, gauge.Gauge>;

  constructor() {
    super();
  }

  get last() {
    return {
      bg: this._lastBg,
      bgMood: this._lastBgMood,
    };
  }

  _setup(): void {
    this._container = new PIXI.Container();
    this.config.container.addChild(this._container);

    this._backgroundLayer = new PIXI.Container();
    this._characterLayer = new PIXI.Container();
    this._closeupLayer = new PIXI.Container();
    this._uiLayer = new PIXI.Container();
    this._dialogLayer = new PIXI.Container();
    this._fxLayer = new PIXI.Container();

    this._container.addChild(
      this._backgroundLayer,
      this._characterLayer,
      this._closeupLayer,
      this._uiLayer,
      this._dialogLayer,
      this._fxLayer
    );

    this._dialogSpeaker = new PIXI.Container();
    this._dialogSpeaker.position.set(202, 601);

    this._dialogLayer.addChild(
      this.makeSprite("images/ui/dialog.png"),
      this._dialogSpeaker
    );

    this._dialogSpeaker.addChild(
      this.makeSprite("images/ui/dialog_speaker.png")
    );

    this._gauges = {};
    const gaugesList: (keyof variable.Gauges)[] = ["learning", "sleep", "food"];
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
        entity.extendConfig({ container: this._uiLayer })
      );
    }

    this._fade = new PIXI.Graphics()
      .beginFill(0xffffff)
      .drawRect(0, 0, 1920, 1080)
      .endFill();
    this._fade.alpha = 0;
    this._fade.visible = false;
    this._fxLayer.addChild(this._fade);
  }

  _teardown() {
    this.config.container.removeChild(this._container);
    this._container = null;
  }

  public getGaugeValue(name: string): number {
    if (this._gauges.hasOwnProperty(name)) return this._gauges[name].getValue();
    return undefined;
  }

  public setGauge(name: string, value: number) {
    if (this._gauges.hasOwnProperty(name)) this._gauges[name].resetValue(value);
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

  public showCloseup(
    path?: images.StaticSpritePath & `images/closeups/${string}.png`
  ): void {
    this._closeupLayer.removeChildren();
    if (!path) return;

    this._closeupLayer.addChild(
      this.makeSprite(path, (it) => {
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
    playerName: string,
    autoShow: boolean,
    onBoxClick: () => unknown
  ) {
    // Use underscore template to interpolate variables
    const interpolatedText = _.template(
      text,
      templateSettings
    )(this.config.variableStorage.data);

    let speaker: string, mood: string, dialog: string;
    if (name) [speaker, mood] = name.split("_");

    this._nodeDisplay = new PIXI.Container();
    this._container.addChild(this._nodeDisplay);

    if (speaker) {
      this._dialogSpeaker.visible = true;
      this._nodeDisplay.addChild(
        this.makeText(
          speaker.toLowerCase() === "you" ? playerName : speaker,
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

      const speakerLC = speaker.toLowerCase();
      if (autoShow && speakerLC !== "you") {
        this.addCharacter(speakerLC, mood?.toLowerCase());
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
      const dialogBox = this.makeText(
        "",
        {
          fill: "white",
          fontFamily: "Ubuntu",
          fontSize: 40,
          fontStyle: speaker ? "normal" : "italic",
          wordWrap: true,
          wordWrapWidth: 1325,
          leading: 10,
          isSpeaker: !!speaker,
        },
        (it) => it.position.set(140 + 122, 704 + 33)
      );

      this._nodeDisplay.addChild(dialogBox);

      const defilementDurationPerLetter = 25;
      const baseText = (text || interpolatedText).trim();

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
    nodeOptions: Record<string, string>[],
    onBoxClick: (choiceId: number) => unknown,
    subchoice?: number
  ) {
    // This works for both links between nodes and shortcut options
    this._dialogLayer.visible = false;

    this._nodeDisplay = new PIXI.Container();
    this._container.addChild(this._nodeDisplay);
    const animationShifting = 120;
    let currentY: number = 1080 - 40;
    const box_tweens: entity.EntityBase[] = [];
    for (let i: number = 0; i < nodeOptions.length; i++) {
      if (subchoice === Number(nodeOptions[i].id)) continue;

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
                onBoxClick(Number(nodeOptions[i].id));
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
          nodeOptions[i].text,
          {
            fill: "#fdf4d3",
            fontFamily: "Ubuntu",
            fontSize: 40,
            fontStyle: "normal",
            wordWrap: true,
            wordWrapWidth: 1325,
            leading: 10,
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

    if (subchoice) {
      const arrow_back = new PIXI.Container();
      arrow_back.addChild(this.makeSprite("images/ui/arrow_return.png"));
      arrow_back.scale.set(0.65);
      arrow_back.position.set(10, 1080 - (arrow_back.height + 10));

      arrow_back.interactive = true;
      arrow_back.buttonMode = true;
      this._on(arrow_back, "pointerup", () => {
        onBoxClick(subchoice);
      });
      this._on(arrow_back, "mouseover", () => {
        this._activateChildEntity(
          new tween.Tween({
            duration: 200,
            easing: easing.easeOutBack,
            from: 0.65,
            to: 0.66,
            onUpdate: (value) => {
              arrow_back.scale.set(value);
            },
          })
        );
      });
      this._on(arrow_back, "mouseout", () => {
        this._activateChildEntity(
          new tween.Tween({
            duration: 200,
            easing: easing.easeOutBack,
            from: 0.66,
            to: 0.65,
            onUpdate: (value) => {
              arrow_back.scale.set(value);
            },
          })
        );
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

      const path: images.SpritePath & `images/ui/highlights/${string}.png` =
        `images/ui/highlights/${jsonValue}.png` as any;

      let highlight: PIXI.Sprite;
      if (_.has(this.entityConfig.app.loader.resources, path)) {
        highlight = this.makeSprite(path, (it) => {
          it.alpha = 0;
        });

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
      const options: Record<string, string>[] = [];
      for (let i = 0; i < nodeOptions.length; i++) {
        options.push({
          text: nodeOptions[i],
          id: i.toString(),
        });
      }
      this.setChoice(options, onBoxClick);
    } else if (freechoicesFound !== nodeOptions.length) {
      console.error("Free choice & choice are not compatible");
    } else {
      console.error("Should not happen");
    }
  }

  /**
   * Set background
   *
   * @param bg Background's name
   * @param mood Background's mood (time of the day)
   */
  public setBackground(bg: string, mood?: string) {
    // Check if background change
    if (bg === this._lastBg && mood === this._lastBgMood) return;

    // Register last background
    this._lastBg = bg;
    this._lastBgMood = mood;

    // Remove background
    this._backgroundLayer.removeChildren();
    if (this._backgroundEntity !== undefined) {
      if (this.childEntities.indexOf(this._backgroundEntity) != -1)
        this._deactivateChildEntity(this._backgroundEntity);
      this._backgroundEntity = undefined;
    }

    // Create Entity
    this._backgroundEntity = new entity.ParallelEntity();
    // Activate entity
    this._activateChildEntity(
      this._backgroundEntity,
      entity.extendConfig({ container: this._backgroundLayer })
    );

    // Set directory to access resources
    const baseDir = `images/bg/${bg}`;
    const baseJson = require(`../${baseDir}/base.json`);

    // If mood is incorrect, get default one
    if (!_.has(baseJson, mood)) mood = baseJson["default"];

    // For each part
    for (const bgPart of baseJson[mood]) {
      // Create animated sprite and set properties
      const animatedSpriteEntity = this.makeAnimatedSprite(
        `${baseDir}/${bgPart.model}.json` as any,
        (it) => {
          it.anchor.set(0.5);
          it.position.copyFrom(bgPart);
          it.animationSpeed = 0.33;

          if (_.has(bgPart, "alpha")) it.alpha = bgPart.alpha;
        }
      );

      // Add animated sprite to entity
      this._backgroundEntity.addChildEntity(animatedSpriteEntity);
    }
  }

  public removeCharacters(withAnimation: boolean = true) {
    const last = character.Character.current;

    if (last) {
      if (withAnimation) {
        this._activateChildEntity(last.hide());
      } else {
        this._deactivateChildEntity(last);
      }
    }

    this._lastCharacter = undefined;
  }

  /**
   *
   *
   * @param name if null or undefined, it will remove current character
   * @param mood
   */
  public addCharacter(name?: string, mood?: string): void {
    const last = character.Character.current;

    // Check if character or mood change
    if (last && name === last.name && mood === last.mood) return;

    // name changed ?
    const changed = !character.Character.current || name !== last.name;

    // Remove characters
    this.removeCharacters(changed);

    // If character or character not you
    if (name && name !== "you") {
      const char = new character.Character(name, mood);

      this._activateChildEntity(
        char,
        entity.extendConfig({ container: this._characterLayer })
      );

      if (changed) this._activateChildEntity(char.show());
    }
  }

  fadeIn(duration: number = 1000, color: string = "#000000") {
    if (!this._fade.visible)
      return new entity.EntitySequence([
        new entity.FunctionCallEntity(() => {
          this._fade.tint = eval(color.replace("#", "0x"));
          this._fade.visible = true;
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
      ]);
    return new entity.FunctionCallEntity(() => null);
  }

  fadeOut(duration: number = 1000) {
    if (this._fade.visible)
      return new entity.EntitySequence([
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
          this._fade.visible = false;
        }),
      ]);
    return new entity.FunctionCallEntity(() => null);
  }
}
