import * as _ from "underscore";
import * as PIXI from "pixi.js";
import MultiStyleText from "pixi-multistyle-text";

import * as booyah from "booyah/src/booyah";
import * as easing from "booyah/src/easing";
import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as util from "booyah/src/util";
import * as clock from "./clock";

// Bondage is loaded as a global variable
declare const bondage: any;

declare namespace YarnSpinner {
  interface NodeData {
    title: string;
    tags: string[];
    body: string;
  }

  interface TextNode {
    data: NodeData;
    lineNum: number;
    text: string;
  }

  interface ChoiceNode {
    lineNum: number[];
    options: string[];
    selected: number;
    select: (i: number) => void;
  }

  type Node = TextNode | ChoiceNode;

  interface VariableStorage {
    set: (name: string, value: string) => void;
    get: (name: string) => string;
  }
}

// Initilize Underscore templates to ressemble YarnSpinner
const templateSettings = {
  interpolate: /{\s*\$(.+?)\s*}/g,
};

const dialogRegexp = /^(\w+)(\s\w+)?:(.+)/;

/**
 * Variable Storage for YarnSpinner that emits events when data changes
 * Can be initialized with data
 *
 * Emits:
 * - change(name : string, value : string)
 * - change:${name}(value : string)
 */
export class VariableStorage
  extends PIXI.utils.EventEmitter
  implements YarnSpinner.VariableStorage
{
  private _data: { [k: string]: string } = {};

  constructor(initialData?: { [k: string]: string }) {
    super();

    if (initialData) {
      for (const name in initialData) this._data[name] = initialData[name];
    }
  }

  set(name: string, value: string): void {
    this._data[name] = value;
    this.emit("change", name, value);
    this.emit(`change:${name}`, value);
  }

  get(name: string): string {
    return this._data[name];
  }

  get data(): { [k: string]: string } {
    return this._data;
  }
}

export class DialogScene extends entity.CompositeEntity {
  private _runner: any;
  private _nodeIterator: any;
  private _nodeValue: YarnSpinner.Node;
  private _lastNodeData: YarnSpinner.NodeData;
  private _lastBg: string;
  private _lastCharacter: string;
  private _lastMood: string;
  private _autoshowOn: boolean;
  private _variableStorage: VariableStorage;
  private _previousNodeData: YarnSpinner.NodeData;
  private _moreTags: Record<string, string>;

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
  private _clock: clock.Clock;

  constructor(
    public readonly scriptName: string,
    public readonly startNode = "Start",
    public readonly startVariables?: { [k: string]: string }
  ) {
    super();
  }

  _setup(): void {
    this._autoshowOn = false;

    // Create variable storage
    if (this.startVariables) {
      this._variableStorage = new VariableStorage(this.startVariables);
    } else {
      // Use default values
      this._variableStorage = new VariableStorage();
      this._variableStorage.set("name", "Moi");
    }
    this._moreTags = {};
    // Reset time
    this._variableStorage.set("time", "540");

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

    // Setup clock
    this._clock = new clock.Clock(
      this._variableStorage,
      new PIXI.Point(1920 - 557 / 2, 0)
    );
    this._on(
      this._variableStorage,
      "change:time",
      (value) => (this._clock.minutesSinceMidnight = parseInt(value))
    );
    this._activateChildEntity(
      this._clock,
      entity.extendConfig({ container: this._uiLayer })
    );

    this._runner = new bondage.Runner("");
    this._runner.setVariableStorage(this._variableStorage);
    this._runner.load(this.entityConfig.jsonAssets[this.scriptName]);

    // Advance the dialogue manually from the node titled 'Start'
    this._nodeIterator = this._runner.run(this.startNode);
    this._advance();
  }

  private _advance(): void {
    if (this._nodeDisplay) this._container.removeChild(this._nodeDisplay);
    this._nodeDisplay = null;

    this._dialogLayer.visible = true;

    this._nodeValue = this._nodeIterator.next().value;
    // If result is undefined, stop here
    if (!this._nodeValue) {
      console.log("Reached end");
      this._transition = entity.makeTransition();
      return;
    }

    // Check if the node data has changed
    if (
      "data" in this._nodeValue &&
      this._nodeValue.data.title !== this._lastNodeData?.title
    ) {
      this._onChangeNodeData(this._lastNodeData, this._nodeValue.data);
      this._lastNodeData = this._nodeValue.data;
    }

    if(this._moreTags.hasOwnProperty("subchoice")){
      delete this._moreTags.freechoice;
    }
    
    if (this._nodeValue instanceof bondage.TextResult) {
      this._handleDialog((this._nodeValue as YarnSpinner.TextNode).text);
    } else if (this._nodeValue instanceof bondage.OptionsResult) {
      if(this._moreTags.hasOwnProperty("freechoice"))
        this._handleFreechoice(this._moreTags["freechoice"], this._nodeValue as YarnSpinner.ChoiceNode);
      else
        this._handleChoice(this._nodeValue as YarnSpinner.ChoiceNode);
    } else if (this._nodeValue instanceof bondage.CommandResult) {
      this._handleCommand((this._nodeValue as YarnSpinner.TextNode).text);
    } else {
      throw new Error(`Unknown bondage result ${this._nodeValue}`);
    }
  }

  private _handleDialog(text: string) {
    // Use underscore template to interpolate variables
    const interpolatedText = _.template(
      text,
      templateSettings
    )(this._variableStorage.data);

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
      const speakerName =
        speaker.toLowerCase() === "you"
          ? this._variableStorage.get("name")
          : speaker;
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
      (this._nodeDisplay as PIXI.Container).addChild(speakerText);

      const speakerLow = speaker.toLowerCase();
      if (
        this._autoshowOn ||
        (this._lastCharacter === speakerLow && this._lastMood !== mood)
      ) {
        this._changeCharacter(speakerLow, mood);
      }
    } else {
      this._dialogSpeaker.visible = false;
    }

    {
      const hitBox = new PIXI.Container();
      hitBox.position.set(140, 704);
      hitBox.hitArea = new PIXI.Rectangle(0, 0, 1634, 322);
      hitBox.interactive = true;
      hitBox.buttonMode = true;
      this._on(hitBox, "pointerup", this._advance);
      (this._nodeDisplay as PIXI.Container).addChild(hitBox);
    }

    {
      const dialogBox = new MultiStyleText(dialog || interpolatedText, {
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
      (this._nodeDisplay as PIXI.Container).addChild(dialogBox);
    }
  }

  private _handleChoice(nodeValue: YarnSpinner.ChoiceNode) {
    // This works for both links between nodes and shortcut options
    this._dialogLayer.visible = false;

    this._nodeDisplay = new PIXI.Container();
    this._container.addChild(this._nodeDisplay);

    let currentY: number;

    currentY = 1080 - 40;
      
    for (let i = 0; i < nodeValue.options.length; i++) {
      const choicebox = new PIXI.Container();
      if (i == 0) {
        let choicebox_reversed = new PIXI.Sprite(
          this.entityConfig.app.loader.resources[
            "images/ui/choicebox_contour.png"
          ].texture
        );
        choicebox_reversed.setTransform(
          1920/2,
          choicebox_reversed.height,
          1,
          -1,
          0,
          0,
          0,
          choicebox_reversed.width / 2,
          choicebox_reversed.y
        );

        choicebox.addChild(choicebox_reversed);
      } else if (i == nodeValue.options.length - 1) {
        const choicebox_contour = new PIXI.Sprite(
          this.entityConfig.app.loader.resources[
            "images/ui/choicebox_contour.png"
          ].texture
        );
        choicebox_contour.setTransform(
          1920/2, 0, 0, 0, 0, 0, 0, choicebox_contour.width/2, 0
        );
        choicebox.addChild(choicebox_contour);
      } else {
        const choicebox_empty = new PIXI.Sprite(
          this.entityConfig.app.loader.resources[
            "images/ui/choicebox_empty.png"
          ].texture
        );
        choicebox_empty.setTransform(
          1920/2, 0, 0, 0, 0, 0, 0, choicebox_empty.width/2, 0
        );
        choicebox.addChild(choicebox_empty);
      }
      currentY -= choicebox.height + 20;
      choicebox.setTransform(0, currentY);

      const optionText = new PIXI.Text(nodeValue.options[i], {
        fill: 0xfdf4d3,
        fontFamily: "Ubuntu",
        fontSize: 40,
      });
      optionText.anchor.set(0.5, 0.5);
      optionText.position.set(choicebox.width / 2, choicebox.height / 2);
      choicebox.interactive = true;
      choicebox.buttonMode = true;
      this._on(choicebox, "pointerup", () => {
        nodeValue.select(i);
        this._advance();
      });
      choicebox.addChild(optionText);
      this._nodeDisplay.addChild(choicebox);
    }

    // Can go back if from a freechoice (subchoice)
    if(this._moreTags.hasOwnProperty("subchoice")){
      const arrow_back = new PIXI.Container;
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
        this._nodeIterator = this._runner.run(this._moreTags["subchoice"]);
        this._advance();
      });

      this._nodeDisplay.addChild(arrow_back);
    }

  }

  private _handleCommand(command: string): void {
    // If the text was inside <<here>>, it will get returned as a CommandResult string, which you can use in any way you want

    const commandParts = command.split(" ");

    // Attempt to call a method based on the command
    if (!(commandParts[0] in this)) {
      console.warn(`No matching command "${commandParts[0]}"`);
      this._advance();
      return;
    }

    // @ts-ignore
    this[commandParts[0]](...commandParts.slice(1).map((arg) => arg.trim()));

    this._advance();
  }

  // TODO: Freechoice
  private _handleFreechoice(freechoice: string, nodeValue: YarnSpinner.ChoiceNode) {
    this._dialogLayer.visible = false;

    const freechoicesJSON = this._entityConfig.app.loader.resources[`images/ui/freechoice.json`].data;
    if(!freechoicesJSON.hasOwnProperty(freechoice))
      return;
    const currentFreechoices = freechoicesJSON[freechoice];

    this._nodeDisplay = new PIXI.Container;
    this._container.addChild(this._nodeDisplay);
    
    for (let i = 0; i < nodeValue.options.length; i++) {
      if(!currentFreechoices.hasOwnProperty(nodeValue.options[i]))
        return;
      const freechoicebox_bg = new PIXI.Graphics();
      freechoicebox_bg.beginFill(0x1033AA);
      freechoicebox_bg.drawRect(-75, -20, 150, 40);

      const freechoicebox_text = new PIXI.Text(nodeValue.options[i]);
      freechoicebox_text.anchor.set(0.5, 0.5);
      
      const freechoicebox = new PIXI.Container;
      freechoicebox.addChild(
        freechoicebox_bg,
        freechoicebox_text
      );

      const currentData = currentFreechoices[nodeValue.options[i]];
      freechoicebox.position.set(
        currentData.x,
        currentData.y
      );

      freechoicebox.interactive = true;
      freechoicebox.buttonMode = true;
      this._on(freechoicebox, "pointerup", () => {
        nodeValue.select(i);
        this._advance();
      });

      this._nodeDisplay.addChild(freechoicebox);
    }
  }

  private _onChangeNodeData(
    oldNodeData: YarnSpinner.NodeData,
    newNodeData: YarnSpinner.NodeData
  ) {
    console.log("changing node data", oldNodeData, " --> ", newNodeData);

    // Parse tags

    // By default, autoshow is off
    this._autoshowOn = false;
    this._moreTags = {};
    this._previousNodeData = oldNodeData;

    let bg: string;
    let character: string;
    for (let tag of newNodeData.tags) {
      tag = tag.trim();
      if (tag === "") continue;

      if (tag.startsWith("bg:")) {
        if (bg) console.warn("Trying to set background twice");

        bg = tag.split(":")[1].trim();
      } else if (tag.startsWith("show:")) {
        if (character) console.warn("Trying to set character twice");

        character = tag.split(":")[1].trim();
      } else if (tag === "autoshow") {
        this._autoshowOn = true;
      } else {
        console.warn("Unknown tag in node data", tag);
      }
    }

    if (bg) this.changeBackground(bg);
    this._changeCharacter(character);

    this.emit("changeNodeData", oldNodeData, newNodeData);
  }

  changeBackground(bg: string): void {
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
      console.log("HERE");

      this._backgroundEntity = new entity.ParallelEntity();
      this._activateChildEntity(
        this._backgroundEntity,
        entity.extendConfig({ container: this._backgroundLayer })
      );

      let baseJson = this._entityConfig.app.loader.resources[fileNameJson].data;
      for (const bgPart of baseJson.sprites) {
        console.log(bgPart);

        const animatedSpriteEntity = util.makeAnimatedSprite(
          this._entityConfig.app.loader.resources[
            `${folderName}/${bgPart.model}.json`
          ]
        );
        animatedSpriteEntity.sprite.x = bgPart.x;
        animatedSpriteEntity.sprite.y = bgPart.y;

        animatedSpriteEntity.sprite.animationSpeed = (1 / bgPart.speed) * 0.33;
        this._backgroundEntity.addChildEntity(animatedSpriteEntity);
      }
    }

    this._lastBg = bg;
  }

  // Shortcut for _changeCharacter()
  show(character: string): void {
    this._changeCharacter(character);
  }

  // Shortcut for _changeCharacter()
  hide(): void {
    this._changeCharacter();
  }

  prompt(varName: string, message: string, _default: string) {
    // TODO: replace this with HTML form

    // {
    //   // todo: use entity for waiting input
    //   const form = document.createElement("form")
    //   form.innerHTML = `
    //     <label> ${message.replace(/_/g, " ")}
    //       <input type=text name=name value="${_default.replace(/_/g, " ")}">
    //     </label>
    //     <input type=submit name=Ok >
    //   `
    //   form.onsubmit = (event) => {
    //     event.preventDefault()
    //
    //   }
    // }

    const value = prompt(
      message.replace(/_/g, " "),
      _default.replace(/_/g, " ")
    )?.trim();
    this._variableStorage.set(varName, value || _default.replace(/_/g, " "));
  }

  eval(code: string) {
    const evaluated = eval(code);
    this._variableStorage.set("eval", evaluated);
  }

  setTime(time: string) {
    const [h, m] = clock.parseTime(time);
    this._variableStorage.set("time", (h * 60 + m).toString());
  }

  advanceTime(time: string) {
    this._activateChildEntity(this._clock.advanceTime(time));
  }

  hideUi() {
    this._uiLayer.visible = false;
  }

  showUi() {
    this._uiLayer.visible = true;
  }

  showCloseup(closeup?: string): void {
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

  hideCloseup(): void {
    this.showCloseup();
  }

  moreTags(...tags: string[]): void {
    for(const tag of tags){
      const [key, value] = tag.split(":");
      this._moreTags[key] = value;
    }
  }

  // If character is null or undefined, will just remove current character
  private _changeCharacter(character?: string, mood?: string): void {
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
      characterContainer.position.set(1920 / 2, 0);
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
