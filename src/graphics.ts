import * as _ from "underscore";
import * as PIXI from "pixi.js";

import MultiStyleText from "pixi-multistyle-text";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as util from "booyah/src/util";
import * as easing from "booyah/src/easing";

import * as variable from "./variable";

// Initilize Underscore templates to ressemble YarnSpinner
const templateSettings = {
  interpolate: /{\s*\$(.+?)\s*}/g,
};

const dialogRegexp = /^(\w+)(\s\w+)?:(.+)/;

export class Graphics extends entity.CompositeEntity {
  private _lastBg: string;
  private _lastCharacter: string;
  private _lastMood: string;

  private _container: PIXI.Container;
  private _backgroundLayer: PIXI.Container;
  private _backgroundEntity: entity.ParallelEntity;
  private _characterLayer: PIXI.Container;
  private _characterEntity: entity.ParallelEntity;
  private _closeupLayer: PIXI.Container;
  private _uiLayer: PIXI.Container;
  private _dialogLayer: PIXI.Container;
  private _dialogSpeaker: PIXI.Container;

  private _nodeDisplay: PIXI.Container;

  constructor(private readonly _variableStorageData: variable.Variables) {
    super();
  }

  _setup(): void {
    this._container = new PIXI.Container();
    this._entityConfig.container.addChild(this._container);

    this._backgroundLayer = new PIXI.Container();
    this._container.addChild(this._backgroundLayer);

    this._characterLayer = new PIXI.Container();
    this._container.addChild(this._characterLayer);

    this._closeupLayer = new PIXI.Container();
    this._container.addChild(this._closeupLayer);

    this._uiLayer = new PIXI.Container();
    this._container.addChild(this._uiLayer);

    this._dialogLayer = new PIXI.Container();
    this._dialogLayer.addChild(
      new PIXI.Sprite(
        this.entityConfig.app.loader.resources["images/ui/dialog.png"].texture
      )
    );
    this._container.addChild(this._dialogLayer);

    this._dialogSpeaker = new PIXI.Container();
    this._dialogSpeaker.addChild(
      new PIXI.Sprite(
        this.entityConfig.app.loader.resources[
          "images/ui/dialog_speaker.png"
        ].texture
      )
    );
    this._dialogSpeaker.position.set(202, 601);
    this._dialogLayer.addChild(this._dialogSpeaker);
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

  /**
   *
   *
   * @param closeup
   * @returns
   */
  public showCloseup(closeup?: string): void {
    this._closeupLayer.removeChildren();
    if (!closeup) return;

    const sprite = new PIXI.Sprite(
      this.entityConfig.app.loader.resources[
        `images/closeups/${closeup}.png`
      ].texture
    );
    sprite.position.set(400, 10);

    this._closeupLayer.addChild(sprite);
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

    let speaker, mood, dialog: string;
    if (dialogRegexp.test(interpolatedText)) {
      let match = dialogRegexp.exec(interpolatedText);

      speaker = match[1].trim();
      mood = match[2];
      dialog = match[3].trim();

      if (mood !== undefined) mood = mood.trim();
    }

    this._nodeDisplay = new PIXI.Container();
    this._container.addChild(this._nodeDisplay);

    if (speaker) {
      this._dialogSpeaker.visible = true;
      const speakerName = speaker.toLowerCase() === "you" ? name : speaker;
      const speakerText = new PIXI.Text(speakerName, {
        fill: "white",
        fontFamily: "Jura",
        fontSize: 50,
      });
      speakerText.position.set(
        this._dialogSpeaker.x + this._dialogSpeaker.width / 2,
        this._dialogSpeaker.y + this._dialogSpeaker.height / 2
      );
      speakerText.anchor.set(0.5);
      this._nodeDisplay.addChild(speakerText);

      const speakerLow = speaker.toLowerCase();
      if (
        autoShow ||
        (this._lastCharacter === speakerLow && this._lastMood !== mood)
      ) {
        this.setCharacter(speakerLow, mood);
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

      const accelerate = () => {
        if (defilement.isSetup) this._deactivateChildEntity(defilement);
      };

      const defilement = new tween.Tween({
        from: 1,
        to: baseText.length,
        duration: baseText.length * defilementDurationPerLetter,
        onUpdate: (value) => {
          dialogBox.text = baseText.slice(0, Math.round(value));
        },
        onTeardown: () => {
          dialogBox.text = baseText;
          this._off(hitBox, "pointerup", accelerate);
          this._on(hitBox, "pointerup", onBoxClick);
        },
      });

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
        new PIXI.Sprite(
          this.entityConfig.app.loader.resources[
            i === 0 ? "images/ui/choicebox_contour_reversed.png"
            : (i === nodeOptions.length - 1 ? "images/ui/choicebox_contour.png"
            : "images/ui/choicebox_empty.png")
          ].texture
        )
      );

      currentY -= choicebox.height + 20;
      choicebox.pivot.set(
        choicebox.width / 2,
        choicebox.y
      );
      
      choicebox.position.set(
        1920 * 2 * ((i % 2) ? -1 : 1),
        currentY,
      );
      
      const optionText = new PIXI.Text(nodeOptions[nodeOptions.length - (1 + i)], {
        fill: 0xfdf4d3,
        fontFamily: "Ubuntu",
        fontSize: 40,
      });
      
      optionText.anchor.set(0.5, 0.5);
      optionText.position.set(choicebox.width / 2, choicebox.height / 2);
      box_tweens.push(new entity.EntitySequence([
        new entity.WaitingEntity(Math.min(nodeOptions.length - (1 + i) ,1) * animationShifting * (nodeOptions.length - (1 + i))),
        new tween.Tween({
          duration: 800,
          easing: easing.easeOutQuint,
          from: ((i % 2) ? -1920 / 2 : (3 * 1920) / 2),
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
          }
        })
      ]));

      choicebox.addChild(optionText);
      this._nodeDisplay.addChild(choicebox);
    }

    this._activateChildEntity(
      new entity.ParallelEntity(box_tweens)
    );

    if (subchoice !== undefined) {
      const arrow_back = new PIXI.Container();
      arrow_back.addChild(
        new PIXI.Sprite(
          this.entityConfig.app.loader.resources[
            "images/ui/arrow_return.png"
          ].texture
        )
      );
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

    const freechoicesJSON =
      this._entityConfig.app.loader.resources[`images/ui/freechoice.json`].data;

    this._nodeDisplay = new PIXI.Container();

    const freeboxTweens: entity.EntityBase[] = [];
    const animationShifting = 120;
    let freechoicesFound = 0;
    for (let i = 0; i < nodeOptions.length; i++) {
      const [choiceText, jsonValue] = nodeOptions[i].split("@");
      if (!freechoicesJSON.hasOwnProperty(jsonValue)) continue;
      freechoicesFound++;

      const freechoicebox_bg = new PIXI.Graphics();
      freechoicebox_bg.beginFill(0x1033aa);
      freechoicebox_bg.drawRect(-75, -20, 150, 40);

      const freechoicebox_text = new PIXI.Text(choiceText);
      freechoicebox_text.anchor.set(0.5, 0.5);

      const freechoicebox = new PIXI.Container();
      freechoicebox.addChild(freechoicebox_bg, freechoicebox_text);

      const currentData = freechoicesJSON[jsonValue];
      freechoicebox.position.set(currentData.x, currentData.y);
      freechoicebox.scale.set(0);

      freeboxTweens.push(new entity.EntitySequence([
        new entity.WaitingEntity(Math.min(i, 1) * animationShifting * i),
        new tween.Tween({
          duration: 650,
          easing: easing.easeOutBack,
          from: 0,
          to: 1,
          onUpdate: (value) => {
            freechoicebox.scale.set(value);
          },
          onTeardown: () => {
            freechoicebox.interactive = true;
            freechoicebox.buttonMode = true;

            this._on(freechoicebox, "pointerup", () => {
              onBoxClick(i);
            });

            this._on(freechoicebox, "mouseover", () => {
              this._activateChildEntity(
                new tween.Tween({
                  duration: 200,
                  easing: easing.easeOutBack,
                  from: 1,
                  to: 1.03,
                  onUpdate: (value) => {
                    freechoicebox.scale.set(value);
                  },
                })
              );
            });
            this._on(freechoicebox, "mouseout", () => {
              this._activateChildEntity(
                new tween.Tween({
                  duration: 200,
                  easing: easing.easeOutBack,
                  from: 1.03,
                  to: 1,
                  onUpdate: (value) => {
                    freechoicebox.scale.set(value);
                  },
                })
              );
            });
          }
        })
      ]))

      this._nodeDisplay.addChild(freechoicebox);
    }
    if (freechoicesFound === nodeOptions.length) {
      this._container.addChild(this._nodeDisplay);
      this._activateChildEntity(
        new entity.ParallelEntity(freeboxTweens)
      );
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

    const folderName = `images/bg/${bg}`;
    const fileName = `${folderName}/base.png`;
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
    const background = new PIXI.Sprite(
      this.entityConfig.app.loader.resources[fileName].texture
    );
    this._backgroundLayer.addChild(background);

    // Set animations
    if (_.has(this.entityConfig.app.loader.resources, fileNameJson)) {
      this._backgroundEntity = new entity.ParallelEntity();
      this._activateChildEntity(
        this._backgroundEntity,
        entity.extendConfig({ container: this._backgroundLayer })
      );

      let baseJson = this._entityConfig.app.loader.resources[fileNameJson].data;
      for (const bgPart of baseJson.sprites) {
        const animatedSpriteEntity = util.makeAnimatedSprite(
          this._entityConfig.app.loader.resources[
            `${folderName}/${bgPart.model}.json`
          ]
        );
        animatedSpriteEntity.sprite.anchor.set(0.5, 0.5);
        animatedSpriteEntity.sprite.x = bgPart.x;
        animatedSpriteEntity.sprite.y = bgPart.y;

        animatedSpriteEntity.sprite.animationSpeed = (1 / bgPart.speed) * 0.33;
        this._backgroundEntity.addChildEntity(animatedSpriteEntity);
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
    if (mood === undefined) mood = "neutral";

    if (character === this._lastCharacter && mood === this._lastMood) return;

    // Remove all previous characters
    this._characterLayer.removeChildren();
    this._lastCharacter = character;
    this._lastMood = mood;

    if (this._characterEntity !== undefined) {
      if (this.childEntities.indexOf(this._characterEntity) != -1)
        this._deactivateChildEntity(this._characterEntity);
      this._characterEntity = undefined;
    }

    if (character !== undefined && character !== "") {
      const characterContainer = new PIXI.Container();
      this._characterEntity = new entity.ParallelEntity();
      this._activateChildEntity(
        this._characterEntity,
        entity.extendConfig({ container: characterContainer })
      );

      const baseDir = `images/characters/${character}`;
      const basePng = baseDir + `/base_${mood}.png`;

      // Moving textures
      if (_.has(this.entityConfig.app.loader.resources, basePng)) {
        // Base
        const baseSprite = new PIXI.Sprite(
          this.entityConfig.app.loader.resources[basePng].texture
        );
        baseSprite.anchor.set(0, 0);
        baseSprite.pivot.set(
          (baseSprite.width - 1920) / 2,
          (baseSprite.height - 1080) / 2
        );

        characterContainer.addChild(baseSprite);

        // Load animations JSON
        let baseJson =
          this._entityConfig.app.loader.resources[`${baseDir}/base.json`].data;
        for (const bodyPart of baseJson[mood]) {
          const animatedSpriteEntity = util.makeAnimatedSprite(
            this._entityConfig.app.loader.resources[
              `${baseDir}/${bodyPart.model}.json`
            ]
          );
          animatedSpriteEntity.sprite.anchor.set(0.5, 0.5);
          animatedSpriteEntity.sprite.x = bodyPart.x;
          animatedSpriteEntity.sprite.y = bodyPart.y;

          animatedSpriteEntity.sprite.animationSpeed = 0.5;
          this._characterEntity.addChildEntity(animatedSpriteEntity);
        }

        // Place character on screen
        this._characterLayer.addChild(characterContainer);
        characterContainer.setTransform(350, 150, 1.1, 1.1);
      }

      // Static textures
      else if (
        _.has(this.entityConfig.app.loader.resources, baseDir + "/static.png")
      ) {
        // Base
        const baseSprite = new PIXI.Sprite(
          this.entityConfig.app.loader.resources[
            baseDir + "/static.png"
          ].texture
        );

        characterContainer.addChild(baseSprite);

        // Place character on screen
        this._characterLayer.addChild(characterContainer);
        characterContainer.setTransform(0, 0, 1, 1);
      } else {
        console.warn("Missing asset for character", character);
        return;
      }
    }
  }
}
