import * as _ from "underscore";
import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as easing from "booyah/src/easing";
import * as scroll from "booyah/src/scroll";
import * as tween from "booyah/src/tween";

import * as filter from "./graphics_filter";
import * as extension from "./extension";
import * as variable from "./variable";
import * as images from "./images";
import * as gauge from "./gauge";
import * as save from "./save";

// Initialize Underscore templates to resemble YarnSpinner
const templateSettings = {
  interpolate: /{\s*\$(.+?)\s*}/g,
};

const dialogRegexp = /^([a-z]+)(_([a-z]+))?:(.+)/i;

const maxLineLength = 68;

const typewriterDurationPerLetter = 50;

export class Graphics extends extension.ExtendedCompositeEntity {
  private _characters: Map<
    string,
    {
      container: PIXI.Container;
      entity: entity.ParallelEntity;
      holo: boolean;
    }
  >;

  private _graphicsState: save.GraphicsState;
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
  public currentGauges: string[];

  constructor() {
    super();

    // @ts-ignore
    window.graphics = this;
  }

  _setup(): void {
    this._graphicsState = {};

    this._container = new PIXI.Container();
    this._container.hitArea = new PIXI.Rectangle(
      0,
      0,
      this._entityConfig.app.view.width,
      this._entityConfig.app.view.height
    );
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

  public loadSave(loadedGraphicsState: save.GraphicsState) {
    if (loadedGraphicsState.lastBg)
      this.setBackground(
        loadedGraphicsState.lastBg,
        loadedGraphicsState.lastBgMood
      );
    if (loadedGraphicsState.lastCharacter)
      this.addCharacter(
        loadedGraphicsState.lastCharacter,
        loadedGraphicsState.lastMood
      );
    if (loadedGraphicsState.lastGauges)
      this.toggleGauges(true, ...loadedGraphicsState.lastGauges);
    if (loadedGraphicsState.lastMusic)
      this.config.jukebox.play(loadedGraphicsState.lastMusic);

    this._graphicsState = loadedGraphicsState;
  }

  public get graphicsState(): save.GraphicsState {
    return this._graphicsState;
  }

  public initGauges(gaugesList: (keyof variable.Gauges)[]) {
    this._gauges = {};
    for (let i = 0; i < gaugesList.length; i++) {
      const _gauge = gaugesList[i];
      this._gauges[_gauge] = new gauge.Gauge(
        new PIXI.Point(140 * i + 30 + 150, 15),
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

  public getGauge(name: string): gauge.Gauge {
    return this._gauges[name];
  }

  public setGauge(name: string, value: number) {
    if (this._gauges.hasOwnProperty(name)) {
      this._gauges[name].resetValue(value);
    } else {
      console.error(`Missing gauge: "${name}"`);
    }
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
    if (!this._nodeDisplay) return;

    this._container.removeChild(this._nodeDisplay);
    this._nodeDisplay = null;
  }

  public toggleGauges(visibility: boolean, ...gaugesName: string[]) {
    if (this.currentGauges === undefined) return;

    if (gaugesName.length === 0) {
      for (const gaugeName of this.currentGauges) {
        gaugesName.push(gaugeName);
      }
    }

    this._graphicsState.lastGauges = JSON.parse(JSON.stringify(gaugesName));
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
    path?: images.SpritePath & `images/closeups/${string}.png`
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

  public showTutorial(text: string, onClick: () => unknown) {
    this._dialogLayer.visible = false;

    this._nodeDisplay = new PIXI.Container();
    this._container.addChild(this._nodeDisplay);

    let textBox: PIXI.Text;
    {
      // Make tutorial text, but don't add it yet
      textBox = new PIXI.Text(text, {
        fill: "white",
        fontFamily: "Ubuntu",
        align: "center",
        fontSize: 40,
        leading: 10,
        wordWrap: true,
        wordWrapWidth: 1000,
      });
      textBox.anchor.set(0.5);
      textBox.position.set(
        this._entityConfig.app.view.width / 2,
        this._entityConfig.app.view.height / 2
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
      menuBackground.width = textBox.width + 300;
      menuBackground.height = textBox.height + 150;
      menuBackground.position.set(
        this._entityConfig.app.view.width / 2 - menuBackground.width / 2,
        this._entityConfig.app.view.height / 2 - menuBackground.height / 2
      );
      this._nodeDisplay.addChild(menuBackground);
    }

    this._once(this._container, "pointerup", () => {
      this.config.fxMachine.play("Click");

      this._container.interactive = false;
      this._container.buttonMode = false;

      this.hideNode();
      onClick();
    });
    this._container.interactive = true;
    this._container.buttonMode = true;

    this._nodeDisplay.addChild(textBox);
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

      const textSpeedOption: number =
        this.config.playOptions.getOption("textSpeed");

      if (textSpeedOption === 1) {
        // Just write the text
        dialogBox.text = baseText;

        this._container.interactive = true;
        this._container.buttonMode = true;
        this._once(this._container, "pointerup", () => {
          this.config.fxMachine.play("Click");

          this._container.interactive = false;
          this._container.buttonMode = false;
          this.hideNode();
          onBoxClick();
        });
      } else {
        // Do a nice typewriter animation

        // const writer = this.makeFxLoop(
        //   `${speaker ? "Dialog" : "Narration"}_TypeWriter_LOOP`,
        //   250
        // );

        const typewriterSpeed =
          typewriterDurationPerLetter * (1 - textSpeedOption);

        // const typewriterAnimation = new tween.Tween({
        //   from: 1,
        //   to: baseText.length,
        //   duration: baseText.length * typewriterSpeed,
        //   onSetup: () => {
        //     this._activateChildEntity(writer);
        //   },
        //   onUpdate: (value) => {
        //     dialogBox.text = baseText.slice(0, Math.round(value));
        //   },
        //   onTeardown: () => {
        //     dialogBox.text = baseText;
        //     this._deactivateChildEntity(writer);
        //     this._off(this._container, "pointerup", accelerate);
        //     this._once(this._container, "pointerup", () => {
        //       this._container.interactive = false;
        //       this._container.buttonMode = false;
        //       this.hideNode();
        //       onBoxClick();
        //     });
        //   },
        // });

        const typewriterAnimation = new TypewriterAnimation(
          baseText,
          dialogBox,
          typewriterSpeed
        );
        this._on(this, "deactivatedChildEntity", (e) => {
          if (e !== typewriterAnimation) return;

          this._off(this._container, "pointerup", accelerate);
          this._once(this._container, "pointerup", () => {
            this._container.interactive = false;
            this._container.buttonMode = false;
            this.hideNode();
            onBoxClick();
          });
        });

        const accelerate = () => {
          if (typewriterAnimation.isSetup)
            this._deactivateChildEntity(typewriterAnimation);
        };

        this._activateChildEntity(typewriterAnimation);

        this._once(this._container, "pointerup", accelerate);
        this._container.interactive = true;
        this._container.buttonMode = true;
      }
    }
  }

  public setChoice(
    nodeOptions: Record<string, string>[],
    onBoxClick: (choiceId: number) => unknown,
    backOptionIndex?: number
  ) {
    // This works for both links between nodes and shortcut options
    this._dialogLayer.visible = false;

    this._nodeDisplay = new PIXI.Container();
    this._container.addChild(this._nodeDisplay);

    const isSubchoice = typeof backOptionIndex !== "undefined";
    if (isSubchoice) {
      // Catch all the clicks outside of the options
      const clickCatcher = new PIXI.Container();
      clickCatcher.hitArea = new PIXI.Rectangle(
        0,
        0,
        this._entityConfig.app.view.width,
        this._entityConfig.app.view.height
      );
      clickCatcher.interactive = true;
      this._on(clickCatcher, "pointerup", () => {
        this.hideNode();
        onBoxClick(backOptionIndex);
      });
      this._nodeDisplay.addChild(clickCatcher);
    }

    const animationShifting = 120;
    let currentY: number = 1080 - 40;
    const box_tweens: entity.EntityBase[] = [];
    for (let i: number = 0; i < nodeOptions.length; i++) {
      if (backOptionIndex === Number(nodeOptions[i].id)) continue;

      const choicebox = new PIXI.Container();
      choicebox.addChild(
        this.makeSprite(
          i === (backOptionIndex ? 1 : 0)
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
          }),
          new entity.FunctionCallEntity(() => {
            choicebox.interactive = true;
            choicebox.buttonMode = true;

            this._on(choicebox, "pointerup", () => {
              this.config.dialogScene.addToHistory(
                "[choice]",
                nodeOptions[i].text
              );
              this.hideNode();
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

    if (isSubchoice) {
      const arrow_back = new PIXI.Container();
      arrow_back.addChild(this.makeSprite("images/ui/arrow_return.png"));
      arrow_back.scale.set(0.65);
      arrow_back.position.set(10, 1080 - (arrow_back.height + 10));

      arrow_back.interactive = true;
      arrow_back.buttonMode = true;
      this._on(arrow_back, "pointerup", () => {
        this.hideNode();
        onBoxClick(backOptionIndex);
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
    nodeOptions: Record<string, string>[],
    onBoxClick: (choiceId: number) => unknown
  ) {
    this._dialogLayer.visible = false;

    this._nodeDisplay = new PIXI.Container();

    const highlightJSON = require("../vectors/hitbox.json");

    const freeboxTweens: entity.EntityBase[] = [];
    const [animationShifting, baseAlpha] = [120, 0.6];
    let freechoicesFound = 0;
    for (let i = 0; i < nodeOptions.length; i++) {
      const [choiceText, jsonValue] = nodeOptions[i].text.trim().split("@");
      if (!highlightJSON.hasOwnProperty(jsonValue)) continue;
      freechoicesFound++;

      const path = `images/ui/highlights/${jsonValue}.png` as images.SpritePath;

      let highlight: PIXI.Sprite;
      if (_.has(this.entityConfig.app.loader.resources, path)) {
        highlight = this.makeSprite(path, (it) => {
          it.alpha = 0;
        });

        this._nodeDisplay.addChild(highlight);
      } else {
        throw new Error(`Missing highlight sprite ${path}`);
      }

      const hitboxPositions = highlightJSON[jsonValue];
      highlight.hitArea = new PIXI.Polygon(hitboxPositions);

      freeboxTweens.push(
        new entity.EntitySequence([
          new entity.WaitingEntity(Math.min(i, 1) * animationShifting * i),
          new tween.Tween({
            obj: highlight,
            property: "alpha",
            duration: 900,
            easing: easing.easeInSine,
            from: 0,
            to: baseAlpha,
          }),
          new entity.FunctionCallEntity(() => {
            highlight.interactive = true;
            highlight.buttonMode = true;

            this._on(highlight, "pointerup", () => {
              this.config.dialogScene.addToHistory("[freechoice]", choiceText);
              this.hideNode();
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
          }),
        ])
      );

      this._nodeDisplay.addChild(highlight);
    }

    this._container.addChild(this._nodeDisplay);
    this._activateChildEntity(new entity.ParallelEntity(freeboxTweens));

    console.assert(freechoicesFound === nodeOptions.length);
  }

  /**
   * Set background
   *
   * @param bg Background's name
   * @param mood Background's mood (time of the day)
   */
  public setBackground(bg: string, mood?: string) {
    // Check if background change
    if (
      bg === this._graphicsState.lastBg &&
      mood === this._graphicsState.lastBgMood
    )
      return;

    // Register last background
    this._graphicsState.lastBg = bg;
    this._graphicsState.lastBgMood = mood;

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

  /**
   *
   *
   * @param character if null or undefined, it will remove current character
   * @param mood
   */
  public addCharacter(character?: string, mood?: string) {
    // Check if character or mood change
    if (
      character === this._graphicsState.lastCharacter &&
      mood === this._graphicsState.lastMood
    )
      return;

    //console.log(this._lastCharacter, this._lastMood, "->", character, mood);

    // Remove characters
    const characterChanged = character !== this._graphicsState.lastCharacter;
    this.removeCharacters(characterChanged);

    // Register last character & mood
    this._graphicsState.lastCharacter = character;
    this._graphicsState.lastMood = mood;

    // save.save(this.config.dialogScene);

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

      // Place character on screen
      this._characterLayer.addChild(characterCE.container);
    }
  }

  public removeCharacters(withAnimation: boolean = true) {
    for (const [id, character] of this._characters) {
      this._characters.delete(id);

      if (withAnimation) {
        if (character.holo) {
          this._activateChildEntity(
            new tween.Tween({
              duration: 250,
              easing: easing.easeInCubic,
              from: 100,
              to: 0,
              onUpdate: (value: number) => {
                character.container.position.y = (100 - value) * 5.4 + 80;
                character.container.scale.y = value / 100;
                character.container.position.x = -(100 - value) * 9.6 + 250;
                character.container.scale.x = (100 - value) / 100 + 1;
              },
            })
          );
        } else {
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
        }
      } else {
        this._characterLayer.removeChild(character.container);
      }
    }

    delete this._graphicsState.lastCharacter;
    delete this._graphicsState.lastMood;
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

// const typewriterAnimation = new tween.Tween({
//   from: 1,
//   to: baseText.length,
//   duration: baseText.length * typewriterSpeed,
//   onSetup: () => {
//     this._activateChildEntity(writer);
//   },
//   onUpdate: (value) => {
//     dialogBox.text = baseText.slice(0, Math.round(value));
//   },
//   onTeardown: () => {
//     dialogBox.text = baseText;
//     this._deactivateChildEntity(writer);
//     this._off(this._container, "pointerup", accelerate);
//     this._once(this._container, "pointerup", () => {
//       this._container.interactive = false;
//       this._container.buttonMode = false;
//       this.hideNode();
//       onBoxClick();
//     });
//   },
// });

const typewriterAnimationDefaults = {
  pause: 1000,
};

class TypewriterAnimation extends entity.EntityBase {
  private _elapsedTime: number;
  private _lastLetterTime: number;
  private _lettersShown: number;
  private _letters: string;
  private _timePerLetter: number[];

  constructor(
    public readonly baseText: string,
    public readonly textBox: PIXI.Text,
    public readonly defaultTimePerLetter: number
  ) {
    super();
  }

  _setup() {
    this._elapsedTime = 0;
    this._lastLetterTime = 0;
    this._lettersShown = 0;

    // Regexp to match pause command. The `y` flag allows us to use the lastIndex attribute correctly
    const pauseRegExp = /<(\s*)pause(\s*)(\d*)(\s*)>/y;

    // Create a table of time per letter
    this._letters = "";
    this._timePerLetter = [];
    let lastTimePerLetter = this.defaultTimePerLetter;
    for (let i = 0; i < this.baseText.length; i++) {
      let foundCommand = false;
      if (this.baseText[i] === "<") {
        pauseRegExp.lastIndex = i;
        const result = pauseRegExp.exec(this.baseText);
        if (result) {
          // Matched pause command.
          foundCommand = true;

          // Find the time (optional)
          const timePerLetter =
            (result[3] && parseInt(result[3])) ||
            typewriterAnimationDefaults["pause"];

          lastTimePerLetter += timePerLetter;
          i += result[0].length - 1; // `i` will be incremented in the loop
        }
      }

      if (!foundCommand) {
        this._timePerLetter.push(lastTimePerLetter);
        this._letters += this.baseText[i];

        lastTimePerLetter = this.defaultTimePerLetter;
      }
    }
  }

  _update() {
    // TODO: handle pause amounts (in additional milliseconds)
    // TODO: start and stop fx
    // TODO: Commands mess up word spacing
    // TODO: Remove commands from text when not using typewriter

    this._elapsedTime += this._lastFrameInfo.timeSinceLastFrame;

    if (
      this._elapsedTime >
      this._lastLetterTime + this._timePerLetter[this._lettersShown]
    ) {
      this._lettersShown++;
      this.textBox.text = this._letters.slice(0, this._lettersShown);
      this._lastLetterTime = this._elapsedTime;

      if (this._lettersShown === this._letters.length - 1) {
        this._transition = entity.makeTransition();
      }
    }
  }

  protected _teardown(frameInfo: entity.FrameInfo): void {
    // Show entire text
    this.textBox.text = this._letters;
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
