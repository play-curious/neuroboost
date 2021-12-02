import * as _ from "underscore";
import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";

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
  interpolate: /\{\s*\$(.+?)\s*\}/g,
};

const dialogRegexp = /^(\w+):(.+)/;

const characterAnimations: { [key: string]: string[] } = {
  fred: ["cloth", "hair", "sleeves"],
};

function parseTime(time: string): [number, number] {
  const parts = time.split(":");
  let h = 0,
    m = 0;
  if (parts.length === 1) {
    h = parseInt(parts[0]);
  } else if (parts.length === 2) {
    h = parseInt(parts[0]);
    m = parseInt(parts[1]);
  } else {
    throw new Error(`Can't parse time string "${time}`);
  }
  return [h, m];
}

/**
 * Variable Storage for YarnSpinner that emits events when data changes
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
  private _autoshowOn: boolean;
  private _variableStorage: VariableStorage;

  private _container: PIXI.Container;
  private _background: PIXI.Sprite;
  private _characterLayer: PIXI.Container;
  // private _characterEntity: entity.ParallelEntity;
  private _closeupLayer: PIXI.Container;
  private _uiLayer: PIXI.Container;
  private _dialogLayer: PIXI.Container;

  private _nodeDisplay: PIXI.DisplayObject;
  private _clock: Clock;

  constructor(
    public readonly scriptName: string,
    public readonly startNode = "Start"
  ) {
    super();
  }

  _setup(): void {
    this._autoshowOn = false;

    // Create variable storage with default values
    this._variableStorage = new VariableStorage();
    this._variableStorage.set("name", "NAME");
    this._variableStorage.set("time", "540");

    this._container = new PIXI.Container();
    this._entityConfig.container.addChild(this._container);

    this._background = new PIXI.Sprite();
    this._container.addChild(this._background);

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

    // Setup clock
    this._clock = new Clock(new PIXI.Point(1920 - 557 / 2, 0));
    this._on(
      this._variableStorage,
      "change:time",
      (value) => (this._clock.minutesSinceMidnight = parseInt(value))
    );
    this._activateChildEntity(
      this._clock,
      entity.extendConfig({ container: this._uiLayer })
    );

    this._runner = new bondage.Runner();
    this._runner.setVariableStorage(this._variableStorage);
    this._runner.load(this.entityConfig.jsonAssets[this.scriptName]);

    // Advance the dialogue manually from the node titled 'Start'
    this._nodeIterator = this._runner.run(this.startNode);
    this._advance();
  }

  private _advance(): void {
    if (this._nodeDisplay) this._container.removeChild(this._nodeDisplay);
    this._nodeDisplay = null;

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

    console.log("nodeValue", this._nodeValue);
    // console.log("data", this._runner.variables.data);

    if (this._nodeValue instanceof bondage.TextResult) {
      this._handleDialog((this._nodeValue as YarnSpinner.TextNode).text);
    } else if (this._nodeValue instanceof bondage.OptionsResult) {
      this._handleChoice(this._nodeValue as YarnSpinner.ChoiceNode);
    } else if (this._nodeValue instanceof bondage.CommandResult) {
      this._handleCommand((this._nodeValue as YarnSpinner.TextNode).text);
    } else {
      throw new Error(`Unknown bondage result ${this._nodeValue}`);
    }
  }

  private _handleDialog(text: string) {
    // console.log("text result", text);

    // Use underscore template to interpolate variables
    const interpolatedText = _.template(
      text,
      templateSettings
    )(this._variableStorage.data);

    let speaker, dialog: string;
    if (dialogRegexp.test(interpolatedText)) {
      let match = dialogRegexp.exec(interpolatedText);
      speaker = match[1].trim();
      dialog = match[2].trim();
    }

    this._nodeDisplay = new PIXI.Container();
    this._container.addChild(this._nodeDisplay);

    if (speaker && speaker.toLowerCase() !== "you") {
      const speakerText = new PIXI.Text(speaker, {
        fill: "white",
        fontFamily: "Jura",
        fontSize: 50,
      });
      speakerText.position.set(437, 637);
      speakerText.anchor.set(0.5);
      (this._nodeDisplay as PIXI.Container).addChild(speakerText);

      if (this._autoshowOn) {
        this._changeCharacter(speaker.toLowerCase());
      }
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
      const dialogBox = new PIXI.Text(dialog || interpolatedText, {
        fill: "white",
        fontFamily: "Ubuntu",
        fontSize: 40,
        fontStyle: speaker ? "normal" : "italic",
        wordWrap: true,
        wordWrapWidth: 1325,
        leading: 10,
      });
      dialogBox.position.set(140 + 122, 704 + 33);
      (this._nodeDisplay as PIXI.Container).addChild(dialogBox);
    }
  }

  private _handleChoice(nodeValue: YarnSpinner.ChoiceNode) {
    // This works for both links between nodes and shortcut options
    // console.log("options result", nodeValue.options);

    this._nodeDisplay = new PIXI.Container();
    this._container.addChild(this._nodeDisplay);

    let lastY = 704 + 33;
    for (let i = 0; i < nodeValue.options.length; i++) {
      const optionText = new PIXI.Text(nodeValue.options[i], {
        fill: 0xfdf4d3,
        fontFamily: "Ubuntu",
        fontSize: 40,
      });
      optionText.position.set(140 + 122, lastY);
      optionText.interactive = true;
      optionText.buttonMode = true;
      this._on(optionText, "pointerup", () => {
        nodeValue.select(i);
        this._advance();
      });
      (this._nodeDisplay as PIXI.Container).addChild(optionText);

      lastY += optionText.height + 10;
    }
  }

  private _handleCommand(command: string): void {
    // If the text was inside <<here>>, it will get returned as a CommandResult string, which you can use in any way you want
    // console.log("command result", command);

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

  private _onChangeNodeData(
    oldNodeData: YarnSpinner.NodeData,
    newNodeData: YarnSpinner.NodeData
  ) {
    console.log("changing node data", oldNodeData, " --> ", newNodeData);

    // Parse tags

    // By default, autoshow is off
    this._autoshowOn = false;

    for (let tag of newNodeData.tags) {
      tag = tag.trim();
      if (tag === "") continue;

      let bg: string;
      let character: string;
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

      if (bg) this.changeBackground(bg);
      this._changeCharacter(character);
    }

    this.emit("changeNodeData", oldNodeData, newNodeData);
  }

  changeBackground(bg: string): void {
    if (bg === this._lastBg) return;

    const fileName = `images/bg/${bg}.png`;
    if (!_.has(this.entityConfig.app.loader.resources, fileName)) {
      console.warn("Missing asset for background", bg);
      return;
    }

    this._background.texture =
      this.entityConfig.app.loader.resources[fileName].texture;

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

  input(name: string) {
    // TODO: replace this with HTML form
    const value = prompt();
    this._variableStorage.set(name, value);
  }

  setTime(time: string) {
    const [h, m] = parseTime(time);
    this._variableStorage.set("time", (h * 60 + m).toString());
  }

  advanceTime(time: string) {
    const [h, m] = parseTime(time);
    const currentMinutes = parseInt(this._variableStorage.get("time"));
    const newMinutes = currentMinutes + h * 60 + m;
    this._variableStorage.set("time", newMinutes.toString());
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

  // If character is null or undefined, will just remove current character
  private _changeCharacter(character?: string): void {
    if (character === this._lastCharacter) return;

    // Remove all previous characters
    this._characterLayer.removeChildren();

    // if (this._characterEntity)
    //   this._deactivateChildEntity(this._characterEntity);

    if (character) {
      const characterContainer = new PIXI.Container();
      characterContainer.position.set(1920 / 2, 0);

      // this._characterEntity = new entity.ParallelEntity();
      // this._activateChildEntity(
      //   this._characterEntity,
      //   entity.extendConfig({ container: characterContainer })
      // );

      const baseDir = `images/characters/${character}`;

      {
        if (
          !_.has(
            this.entityConfig.app.loader.resources,
            baseDir + "/static.png"
          )
        ) {
          console.warn("Missing asset for character", character);
          return;
        }

        const baseSprite = new PIXI.Sprite(
          this.entityConfig.app.loader.resources[
            baseDir + "/static.png"
          ].texture
        );
        baseSprite.scale.set(0.6);
        characterContainer.addChild(baseSprite);
      }

      // for (const animation of characterAnimations[character]) {
      //   const animatedSpriteEntity = util.makeAnimatedSprite(
      //     this._entityConfig.app.loader.resources[
      //       `${baseDir}/${animation}.json`
      //     ]
      //   );

      // this._characterEntity.addChildEntity(animatedSpriteEntity);

      this._characterLayer.addChild(characterContainer);
    }

    this._lastCharacter = character;
  }
}

class Clock extends entity.EntityBase {
  private _minutesSinceMidnight: number;
  private _pos: PIXI.IPoint;

  private _container: PIXI.Container;
  private _textBox: PIXI.Text;

  constructor(pos: PIXI.IPoint, minutesSinceMidnight: number = 0) {
    super();

    this._pos = pos;
    this._minutesSinceMidnight = minutesSinceMidnight;
  }

  _setup() {
    this._container = new PIXI.Container();
    this._container.position.copyFrom(this._pos);

    const bg = new PIXI.Sprite(
      this.entityConfig.app.loader.resources["images/ui/clock.png"].texture
    );
    this._container.addChild(bg);

    this._textBox = new PIXI.Text("", {
      fill: "black",
      fontFamily: "Jura",
      fontSize: 40,
      leading: 10,
      align: "center",
    });
    this._textBox.position.set(270 / 2, 164 / 2);
    this._textBox.anchor.set(0.5);
    this._container.addChild(this._textBox);

    this._entityConfig.container.addChild(this._container);
  }

  _teardown() {
    this._entityConfig.container.removeChild(this._container);
  }

  private _updateText() {
    const hours = Math.floor(this._minutesSinceMidnight / 60);
    const minutes = this._minutesSinceMidnight % 60;
    const time = `${hours} : ${minutes < 10 ? "0" + minutes : minutes}`;

    // TODO: make this configurable
    const day = "Lundi";

    this._textBox.text = `${time}\n${day}`;
  }

  get minutesSinceMidnight(): number {
    return this._minutesSinceMidnight;
  }

  set minutesSinceMidnight(value: number) {
    this._minutesSinceMidnight = value;
    this._updateText();
  }
}
