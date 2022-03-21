import * as _ from "underscore";
import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as easing from "booyah/src/easing";
import * as tween from "booyah/src/tween";

import * as extension from "./extension";
import * as variable from "./variable";
import * as images from "./images";
import * as gauge from "./gauge";
import * as filter from "./graphics_filter";

// Initialize Underscore templates to resemble YarnSpinner
const templateSettings = {
  interpolate: /{\s*\$(.+?)\s*}/g,
};

const dialogRegexp = /^([a-zA-Z]+)(_([a-zA-Z]+))?:(.+)/;

const maxLineLength = 68;

const defilementDurationPerLetter = 25;

export class Graphics extends extension.ExtendedCompositeEntity {
  private _lastBg: string;
  private _lastBgMood: string;
  private _lastCharacter: string;
  private _lastMood: string;
  private _characters: Map<
    string,
    {
      container: PIXI.Container;
      entity: entity.ParallelEntity;
    }
  >;

  private _fade: PIXI.Graphics;
  private _container: PIXI.Container;
  private _backgroundLayer: PIXI.Container;
  private _backgroundEntity: entity.ParallelEntity;
  private _fxLayer: PIXI.Container;
  private _characterLayer: PIXI.Container;
  private _closeupLayer: PIXI.Container;
  private _miniGameLayer: PIXI.Container;
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
      lastBg: this._lastBg,
      lastBgMood: this._lastBgMood,
      lastCharacter: this._lastCharacter,
      lastMood: this._lastMood,
    };
  }

  _setup(): void {
    this._container = new PIXI.Container();
    this.config.container.addChild(this._container);

    this._backgroundLayer = new PIXI.Container();
    this._characterLayer = new PIXI.Container();
    this._closeupLayer = new PIXI.Container();
    this._miniGameLayer = new PIXI.Container();
    this._uiLayer = new PIXI.Container();
    this._dialogLayer = new PIXI.Container();
    this._fxLayer = new PIXI.Container();

    this._container.addChild(
      this._backgroundLayer,
      this._characterLayer,
      this._closeupLayer,
      this._uiLayer,
      this._dialogLayer,
      this._fxLayer,
      this._miniGameLayer
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

    this._characters = new Map();

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

  public initGauges(gaugesList: (keyof variable.Gauges)[]) {
    this._gauges = {};
    for (let i = 0; i < gaugesList.length; i++) {
      const _gauge = gaugesList[i];
      this._gauges[_gauge] = new gauge.Gauge(
        new PIXI.Point(140 * i + 30, 15),
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
      this._gauges[_gauge].getGauge().visible = false;
    }
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
    if(gaugesName.length === 0){
      for (const gaugeName in this._gauges) {
        gaugesName.push(gaugeName);
      }
    }
    console.log(gaugesName);
    let i = 0;
    const gaugesTween: entity.EntityBase[] = [];
    for (const gaugeName of gaugesName) {
      const currentGauge = this._gauges[gaugeName].getGauge();
      currentGauge.position.y = visibility ? -(currentGauge.height + 30) : 15;
      gaugesTween.push(
        new entity.EntitySequence([
          new entity.WaitingEntity(i * 120),
          new tween.Tween({
            duration: 800,
            easing: easing.easeInOutBack,
            from: currentGauge.position.y,
            to: visibility ? 15 : -(currentGauge.height + 30),
            onSetup: () => {
              currentGauge.visible = true;
            },
            onUpdate: (value) => {
              currentGauge.position.y = value;
            },
            onTeardown: () => {
              currentGauge.visible = visibility;
            },
          }),
        ])
      );
      i++;
    }

    this._activateChildEntity(new entity.ParallelEntity(gaugesTween));
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

  public hideDialogLayer() {
    this._dialogLayer.visible = false;
  }

  public showDialog(
    text: string,
    name: string,
    playerName: string,
    onBoxClick: () => unknown
  ) {
    // Use underscore template to interpolate variables
    const interpolatedText = _.template(
      text,
      templateSettings
    )(this.config.variableStorage.data).trim();

    let speaker: string, mood: string, dialog: string;
    if (name) [speaker, mood] = name.split("_");

    this._nodeDisplay = new PIXI.Container();
    this._container.addChild(this._nodeDisplay);

    if (speaker) {
      this._dialogSpeaker.visible = true;
      this._nodeDisplay.addChild(
        this.makeText(
          speaker.toLowerCase() === "you" ? playerName : speaker.split("@")[0],
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
      if (speakerLC !== "you") {
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
          leading: 10,
          isSpeaker: !!speaker,
        },
        (it) => it.position.set(140 + 122, 704 + 33)
      );

      this._nodeDisplay.addChild(dialogBox);

      // Manually split text into lines to avoid words "jumping" from line to line
      const baseText = splitIntoLines(interpolatedText, maxLineLength);

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
          i === (subchoice ? 1 : 0)
            ? "images/ui/choicebox_contour_reversed.png"
            : i === nodeOptions.length - 1
            ? "images/ui/choicebox_contour.png"
            : "images/ui/choicebox_empty.png"
        )
      );

      currentY -= choicebox.height + 20;
      choicebox.pivot.set(choicebox.width / 2, choicebox.y);

      choicebox.position.set(1920 * 2 * (i % 2 ? 1 : -1), currentY);

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
            from: !(i % 2) ? -1920 / 2 : (3 * 1920) / 2,
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
    for (const [id, character] of this._characters) {
      this._characters.delete(id);

      if (withAnimation) {
        this._activateChildEntity(
          new tween.Tween({
            duration: 1500,
            easing: easing.easeOutQuint,
            from: 250,
            to: 1500,
            onUpdate: (value) => {
              character.container.position.x = value;
            },
            onTeardown: () => {
              this._characterLayer.removeChild(character.container);
              // this._deactivateChildEntity(character.entity);
            },
          })
        );
      } else {
        this._characterLayer.removeChild(character.container);
      }
    }

    this._lastCharacter = undefined;
    this._lastMood = undefined;
  }

  /**
   *
   *
   * @param character if null or undefined, it will remove current character
   * @param mood
   */
  public addCharacter(character?: string, mood?: string) {
    // Check if character or mood change
    if (character === this._lastCharacter && mood === this._lastMood) return;

    //console.log(this._lastCharacter, this._lastMood, "->", character, mood);

    // Remove characters
    const characterChanged = character !== this._lastCharacter;
    this.removeCharacters(characterChanged);

    // Register last character & mood
    this._lastCharacter = character;
    this._lastMood = mood;

    let displayMode: string;
    [character, displayMode] = character.split("@");

    // If character or character not you
    if (character && character !== "you" && character !== "???") {
      // Create container & Entity
      const characterCE = this.makeCharacter(
        character,
        mood,
        displayMode,
        characterChanged
      );

      // Add new container/entity to a map
      this._characters.set(character, characterCE);
      // Activate entity
      this._activateChildEntity(
        characterCE.entity,
        entity.extendConfig({ container: characterCE.container })
      );

      //

      // Place character on screen
      this._characterLayer.addChild(characterCE.container);
      //characterContainer.setTransform(0, 0, 1, 1); // For test, do not remove
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

  fade(duration: number = 1000, color: string = "#000000") {
    this._activateChildEntity(
      new entity.EntitySequence([
        new entity.FunctionCallEntity(() => {
          this._fade.tint = eval(color.replace("#", "0x"));
          this._fade.visible = true;
          this._fade.alpha = 1;
        }),
        new entity.WaitingEntity(duration / 4),
        // new tween.Tween({
        //   duration: duration,
        //   from: 0,
        //   to: 1,
        //   onUpdate: (value) => {
        //     this._fade.alpha = value;
        //   },
        // }),
        new tween.Tween({
          duration: duration,
          from: 1,
          to: 0,
          onUpdate: (value) => {
            this._fade.alpha = value;
          },
        }),
        new entity.FunctionCallEntity(() => {
          this._fade.visible = false;
          this._fade.alpha = 0;
        }),
      ])
    );
  }
}

function splitIntoLines(input: string, lineLength: number): string {
  // Manually split text into lines to avoid words "jumping" from line to line
  let result = "";
  let pos = 0;
  while (pos < input.length) {
    if (pos + lineLength >= input.length) {
      // Just add the remaining text
      result += input.slice(pos);
      pos += lineLength;
    } else {
      // Find the last space before the end of the line
      const lastSpacePos = input.lastIndexOf(" ", pos + lineLength);
      if (lastSpacePos === -1) {
        // No spaces (really big word?)
        result += input.slice(pos, pos + lineLength);
        pos += lineLength;
      } else {
        // Replace the last space with a newline, continue algorithm
        result += input.slice(pos, lastSpacePos) + "\n";
        pos = lastSpacePos + 1;
      }
    }
  }
  return result;
}
