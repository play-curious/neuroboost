import * as _ from "underscore";
import * as PIXI from "pixi.js";
import * as filters from "pixi-filters";

import * as entity from "booyah/src/entity";
import * as easing from "booyah/src/easing";
import * as scroll from "booyah/src/scroll";
import * as tween from "booyah/src/tween";
import * as util from "booyah/src/util";

import * as filter from "./graphics_filter";
import * as extension from "./extension";
import * as variable from "./variable";
import * as images from "./images";
import * as gauge from "./gauge";
import * as save from "./save";
import * as deadline from "./deadline_entity";
import { SimpleLightmapFilter } from "pixi-filters";
import { Sprite } from "pixi.js";

// Initialize Underscore templates to resemble YarnSpinner
const templateSettings = {
  interpolate: /{\s*\$(.+?)\s*}/g,
};

const dialogRegexp = /^([a-z]+)(_([a-z]+))?:(.+)/i;

const maxLineLength = 68;

const typewriterDurationPerLetter = 50;

const choiceFadeDuration = 150;
const choiceColor = 0xf4dc70;

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
  private _bubbleFilter: PIXI.Filter;

  private _screenShake?: ScreenShake;
  private _deadline?: deadline.DeadlineEntity;
  private _blur?: Blur;

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

    // If the screenshake finishes, remove it as an attribute
    this._on(this, "deactivatedChildEntity", (entity) => {
      if (entity === this._screenShake) this._screenShake = null;
    });

    let renderer = PIXI.autoDetectRenderer({
      width: this._backgroundLayer.width,
      height: this._backgroundLayer.height,
    });
    renderer.render(this._backgroundLayer);
    //TODO : find a way to solve this typing issue (not a threat for running, but could be in the future)
    this._bubbleFilter = new filters.SimpleLightmapFilter(
      this._entityConfig.app.loader.resources["images/ui/bubble.png"].texture
    );
    this._backgroundLayer.filters = [this._bubbleFilter];
    this._bubbleFilter.enabled = false;
  }

  _teardown() {
    this.config.container.removeChild(this._container);
    this._container = null;
  }

  public addBubble() {
    this._bubbleFilter.enabled = true;
    this.graphicsState.inBubble = true;
  }

  public removeBubble() {
    this._bubbleFilter.enabled = false;
    this.graphicsState.inBubble = false;
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
    if (loadedGraphicsState.lastDeadline) {
      this.addDeadline(
        loadedGraphicsState.lastDeadline.name,
        loadedGraphicsState.lastDeadline.time
      );
      if (loadedGraphicsState.lastDeadline.missed) {
        this.missDeadline();
      }
    }
    if (loadedGraphicsState.inBubble) {
      this.addBubble();
    } else {
      this.removeBubble();
    }
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
        const pauseRegExp = /<(\s*)pause(\s*)(\d*)(\s*)>/g;
        const cleanedText = baseText.replace(pauseRegExp, "");
        dialogBox.text = cleanedText;

        this._container.interactive = true;
        this._container.buttonMode = true;

        // This complicated way of doing things is just avoid a "click-though menu problem"
        // that we can't figure out
        const onDialogClick = () => {
          if (this._lastFrameInfo.gameState === "paused") return;

          this._off(this._container, "pointerup", onDialogClick);

          this.config.fxMachine.play("Click");

          this._container.interactive = false;
          this._container.buttonMode = false;
          this.hideNode();
          onBoxClick();
        };
        this._on(this._container, "pointerup", onDialogClick);
      } else {
        // Do a nice typewriter animation
        const typewriterSpeed =
          typewriterDurationPerLetter * (1 - textSpeedOption);
        const typewriterAnimation = new TypewriterAnimation({
          baseText,
          textBox: dialogBox,
          defaultLetterDuration: typewriterSpeed,
          isNarration: !speaker,
        });
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

        // This complicated way of doing things is just avoid a "click-though menu problem"
        // that we can't figure out
        const accelerate = () => {
          if (this._lastFrameInfo.gameState === "paused") return;

          this._off(this._container, "pointerup", accelerate);

          if (typewriterAnimation.isSetup)
            this._deactivateChildEntity(typewriterAnimation);
        };

        this._activateChildEntity(typewriterAnimation);

        this._on(this._container, "pointerup", accelerate);
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
    let clickCatcher: PIXI.Container;
    if (isSubchoice) {
      // Catch all the clicks outside of the options
      clickCatcher = new PIXI.Container();
      clickCatcher.hitArea = new PIXI.Rectangle(
        0,
        0,
        this._entityConfig.app.view.width,
        this._entityConfig.app.view.height
      );
      // Starts inactive, but activates when the animation of options terminates
      clickCatcher.interactive = false;
      this._on(clickCatcher, "pointerup", () => {
        this.hideNode();
        this.config.fxMachine.play("Click");
        onBoxClick(backOptionIndex);
      });
      this._nodeDisplay.addChild(clickCatcher);
    }

    const animationShifting = 120;
    let currentY: number = 1080 - 40;
    const box_tweens: entity.EntityBase[] = [];
    const boxList: PIXI.Container[] = [];
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
      boxList.push(choicebox);

      const choicetext: PIXI.Text = new PIXI.Text(nodeOptions[i].text, {
        fill: 0xfdf4d3,
        fontFamily: "Ubuntu",
        fontSize: 40,
        fontStyle: "normal",
        wordWrap: true,
        wordWrapWidth: 1325,
        leading: 10,
      });
      choicetext.anchor.set(0.5);
      choicetext.position.set(choicebox.width / 2, choicebox.height / 2);

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
            // Make the background click catcher active
            if (clickCatcher) clickCatcher.interactive = true;

            choicebox.interactive = true;
            choicebox.buttonMode = true;

            this._once(choicebox, "pointerup", () => {
              this._activateChildEntity(
                new entity.EntitySequence([
                  () => {
                    this.config.fxMachine.play("Click");
                    choicetext.style.fill = choiceColor;
                    const tweensFade: tween.Tween[] = [];
                    for (const box of boxList) {
                      if (box !== choicebox) {
                        box.interactive = false;
                        tweensFade.push(
                          new tween.Tween({
                            obj: box,
                            to: 0,
                            property: "alpha",
                            duration: choiceFadeDuration,
                          })
                        );
                      }
                    }
                    return new entity.ParallelEntity(tweensFade);
                  },
                  new entity.WaitingEntity(200),
                  new entity.FunctionCallEntity(() => {
                    this.config.dialogScene.addToHistory(
                      "[choice]",
                      nodeOptions[i].text
                    );
                    this.hideNode();
                    onBoxClick(Number(nodeOptions[i].id));
                  }),
                ])
              );
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

      choicebox.addChild(choicetext);

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
        this.config.fxMachine.play("Click");
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

    const boxList: PIXI.Container[] = [];
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
      boxList.push(highlight);

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

            this._once(highlight, "pointerup", () => {
              this._activateChildEntity(
                new entity.EntitySequence([
                  () => {
                    this.config.fxMachine.play("Click");
                    const tweensFade: tween.Tween[] = [];
                    for (const box of boxList) {
                      if (box !== highlight) {
                        box.interactive = false;
                        tweensFade.push(
                          new tween.Tween({
                            obj: box,
                            to: 0,
                            property: "alpha",
                            duration: choiceFadeDuration,
                          })
                        );
                      }
                    }
                    return new entity.ParallelEntity(tweensFade);
                  },
                  new entity.WaitingEntity(200),
                  new entity.FunctionCallEntity(() => {
                    this.config.dialogScene.addToHistory(
                      "[freechoice]",
                      choiceText
                    );
                    this.hideNode();
                    onBoxClick(i);
                  }),
                ])
              );
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

  public addDeadline(name: string, timestamp: string) {
    //if(!timestamp.match("\d{2}:\d{2}")) throw "Dead line error : timestamp must be like HH:MM";

    this.removeDeadline();
    let hours: string = timestamp.split(":")[0];
    let minutes: string = timestamp.split(":")[1];
    this._deadline = new deadline.DeadlineEntity(name, hours, minutes);
    this._activateChildEntity(
      this._deadline,
      entity.extendConfig({ container: this._uiLayer })
    );
    this._on(this, "deactivatedChildEntity", (e) => {
      if (e === this._deadline) {
        this._deadline = null;
      }
    });
    this._graphicsState.lastDeadline = {
      missed: false,
      time: timestamp,
      name,
    };
  }

  public missDeadline() {
    if (!this._deadline) return;

    this._deadline.missed();
    this._graphicsState.lastDeadline.missed = true;
  }

  public removeDeadline() {
    if (!this._deadline) return;

    this._deadline.remove();
    this._graphicsState.lastDeadline = null;
  }

  public addScreenShake(amount = 20, time = 500) {
    if (this._screenShake) return;

    this._screenShake = new ScreenShake(amount, time);
    this._activateChildEntity(
      this._screenShake,
      entity.extendConfig({ container: this._container })
    );
  }

  public addBlur(amount: number): void {
    if (this._blur) return;

    this._blur = new Blur(amount);
    this._activateChildEntity(
      this._blur,
      entity.extendConfig({ container: this._backgroundLayer })
    );
  }

  public removeBlur(): void {
    if (!this._blur) return;

    this._deactivateChildEntity(this._blur);
    this._blur = null;
  }
}

const typewriterDefaultCharacterDurations: Record<string, number> = {
  pause: 1000,
  ".": 500,
  ",": 150,
  "!": 500,
  "?": 500,
  ":": 300,
  "…": 500,
};

const typewriterSpecialCharacters = Object.keys(
  typewriterDefaultCharacterDurations
);

class TypewriterAnimationOptions {
  baseText: string;
  textBox: PIXI.Text;
  defaultLetterDuration: number;
  isNarration: boolean;
}

class TypewriterAnimation extends entity.EntityBase {
  private _options: TypewriterAnimationOptions;
  private _elapsedTime: number;
  private _lastLetterTime: number;
  private _lettersShown: number;
  private _letters: string;
  private _durationPerLetter: number[];

  private _fxName: string;
  private _lastFxTime: number;

  constructor(options: Partial<TypewriterAnimationOptions>) {
    super();

    this._options = util.fillInOptions(
      options,
      new TypewriterAnimationOptions()
    );
  }

  _setup() {
    this._elapsedTime = 0;
    this._lastLetterTime = 0;
    this._lettersShown = 0;

    this._fxName = `${
      this._options.isNarration ? "Narration" : "Dialog"
    }_TypeWriter_LOOP`;
    this._lastFxTime = 0;

    // Regexp to match pause command. The `y` flag allows us to use the lastIndex attribute correctly
    const pauseRegExp = /<(\s*)pause(\s*)(\d*)(\s*)>/y;

    // Create a table of duration per letter
    this._letters = "";
    this._durationPerLetter = [];
    let nextLetterDuration = this._options.defaultLetterDuration;
    for (let i = 0; i < this._options.baseText.length; i++) {
      let foundCommand = false;
      if (this._options.baseText[i] === "<") {
        pauseRegExp.lastIndex = i;
        const result = pauseRegExp.exec(this._options.baseText);
        if (result) {
          // Matched pause command.
          foundCommand = true;

          // Find the time (optional)
          const pauseDuration =
            (result[3] && parseInt(result[3])) ||
            typewriterDefaultCharacterDurations["pause"];

          nextLetterDuration = pauseDuration;
          i += result[0].length - 1; // `i` will be incremented in the loop
        }
      }

      if (!foundCommand) {
        this._durationPerLetter.push(nextLetterDuration);
        this._letters += this._options.baseText[i];

        // After ponctuation, insert a pause
        if (typewriterSpecialCharacters.includes(this._options.baseText[i])) {
          nextLetterDuration =
            typewriterDefaultCharacterDurations[this._options.baseText[i]];
        } else {
          nextLetterDuration = this._options.defaultLetterDuration;
        }
      }
    }

    this._playFx();
  }

  _update() {
    // TODO: Commands mess up word spacing
    // TODO: Remove commands from text when not using typewriter

    const fxDuration = 250;

    this._elapsedTime += this._lastFrameInfo.timeSinceLastFrame;

    const nextLetterDuration = this._durationPerLetter[this._lettersShown];
    if (this._elapsedTime > this._lastLetterTime + nextLetterDuration) {
      this._lettersShown++;
      this._options.textBox.text = this._letters.slice(0, this._lettersShown);
      this._lastLetterTime = this._elapsedTime;

      if (this._elapsedTime > this._lastFxTime + fxDuration) {
        this._playFx();
      }

      if (this._lettersShown === this._letters.length - 1) {
        this._transition = entity.makeTransition();
      }
    }
  }

  protected _teardown(frameInfo: entity.FrameInfo): void {
    // Show entire text
    this._options.textBox.text = this._letters;
  }

  private _playFx() {
    this._entityConfig.fxMachine.play(this._fxName);
    this._lastFxTime = this._elapsedTime;
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

export class ScreenShake extends entity.EntityBase {
  private _originalPos: PIXI.Point;
  private _elapsedTime: number;

  constructor(public readonly amount = 20, public readonly time = 500) {
    super();
  }

  protected _setup(
    frameInfo: entity.FrameInfo,
    entityConfig: entity.EntityConfig
  ): void {
    this._originalPos = this._entityConfig.container.position.clone();
    this._elapsedTime = 0;
  }

  protected _update(frameInfo: entity.FrameInfo): void {
    this._elapsedTime += frameInfo.timeSinceLastFrame;

    if (this._elapsedTime > this.time) {
      this._transition = entity.makeTransition();
      return;
    }

    this._entityConfig.container.position.set(
      this._originalPos.x + (Math.random() - 0.5) * this.amount,
      this._originalPos.y + (Math.random() - 0.5) * this.amount
    );
  }

  protected _teardown(frameInfo: entity.FrameInfo): void {
    this._entityConfig.container.position = this._originalPos;
  }
}

class Blur extends entity.EntityBase {
  private _blurFilter: filters.KawaseBlurFilter;

  constructor(public readonly amount = 4) {
    super();
  }

  protected _setup(
    frameInfo: entity.FrameInfo,
    entityConfig: entity.EntityConfig
  ): void {
    this._blurFilter = new filters.KawaseBlurFilter(this.amount);

    if (!this._entityConfig.container.filters)
      this._entityConfig.container.filters = [];
    this._entityConfig.container.filters.push(this._blurFilter);
  }

  protected _teardown(frameInfo: entity.FrameInfo): void {
    this._entityConfig.container.filters = util.removeFromArray(
      this._entityConfig.container.filters,
      this._blurFilter
    );
    this._blurFilter = null;
  }
}
