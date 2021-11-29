import * as _ from "underscore";
import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";

// Bondage is loaded as a global variable
declare const bondage: any;

namespace YarnSpinner {
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
  }

  type Node = TextNode | ChoiceNode;
}

// Initilize Underscore templates to ressemble YarnSpinner
const templateSettings = {
  interpolate: /\{\s*\$(.+?)\s*\}/g,
};

const dialogRegexp = /^(\w+):(.+)/;

const characterAnimations: { [key: string]: string[] } = {
  fred: ["cloth", "hair", "sleeves"],
};

export class DialogScene extends entity.CompositeEntity {
  private _runner: any;
  private _nodeIterator: any;
  private _nodeValue: YarnSpinner.Node;
  private _lastNodeData: YarnSpinner.NodeData;
  private _lastBg: string;
  private _lastCharacter: string;

  private _container: PIXI.Container;
  private _background: PIXI.Sprite;
  private _characterLayer: PIXI.Container;
  private _characterEntity: entity.ParallelEntity;
  private _uiLayer: PIXI.Container;

  private _nodeDisplay: PIXI.DisplayObject;

  constructor(public readonly scriptName: string) {
    super();
  }

  _setup(): void {
    this._container = new PIXI.Container();
    this._entityConfig.container.addChild(this._container);

    this._background = new PIXI.Sprite();
    this._container.addChild(this._background);

    this._characterLayer = new PIXI.Container();
    this._container.addChild(this._characterLayer);

    this._uiLayer = new PIXI.Container();
    this._uiLayer.addChild(
      new PIXI.Sprite(
        this.entityConfig.app.loader.resources["images/ui/dialog.png"].texture
      )
    );
    this._container.addChild(this._uiLayer);

    this._runner = new bondage.Runner();
    this._runner.load(this.entityConfig.jsonAssets[this.scriptName]);

    // Advance the dialogue manually from the node titled 'Start'
    this._nodeIterator = this._runner.run("Start");
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
      this._nodeValue.data &&
      this._nodeValue.data.title !== this._lastNodeData?.title
    ) {
      this._onChangeNodeData(this._lastNodeData, this._nodeValue.data);
      this._lastNodeData = this._nodeValue.data;
    }

    console.log("nodeValue", this._nodeValue);
    console.log("tags", this._nodeValue.data?.tags);
    console.log("data", this._runner.variables.data);

    if (this._nodeValue instanceof bondage.TextResult) {
      console.log("text result", this._nodeValue.text);

      // Use underscore template to interpolate variables
      const interpolatedText = _.template(
        this._nodeValue.text,
        templateSettings
      )(this._runner.variables.data);

      let speaker, dialog: string;
      if (dialogRegexp.test(interpolatedText)) {
        let match = dialogRegexp.exec(interpolatedText);
        speaker = match[1];
        dialog = match[2].trim();
      }

      this._nodeDisplay = new PIXI.Container();
      this._container.addChild(this._nodeDisplay);

      if (speaker && speaker.toLowerCase() !== "you") {
        const speakerText = new PIXI.Text(speaker, {
          fill: "white",
          fontFamily: "Ubuntu",
          fontSize: 40,
        });
        speakerText.position.set(437, 637);
        speakerText.anchor.set(0.5);
        (this._nodeDisplay as PIXI.Container).addChild(speakerText);
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
          leading: 5,
        });
        dialogBox.position.set(140 + 122, 704 + 33);
        (this._nodeDisplay as PIXI.Container).addChild(dialogBox);
      }
    } else if (this._nodeValue instanceof bondage.OptionsResult) {
      // This works for both links between nodes and shortcut options
      console.log("options result", this._nodeValue.options);

      this._nodeDisplay = new PIXI.Container();
      this._container.addChild(this._nodeDisplay);

      let lastY = 704 + 33;
      for (let i = 0; i < this._nodeValue.options.length; i++) {
        const optionText = new PIXI.Text(this._nodeValue.options[i], {
          fill: 0xfdf4d3,
          fontFamily: "Ubuntu",
          fontSize: 40,
        });
        optionText.position.set(140 + 122, lastY);
        optionText.interactive = true;
        optionText.buttonMode = true;
        this._on(optionText, "pointerup", () => {
          this._nodeValue.select(i);
          this._advance();
        });
        (this._nodeDisplay as PIXI.Container).addChild(optionText);

        lastY += optionText.height + 10;
      }
      // Select based on the option's index in the array (if you don't select an option, the dialog will continue past them)
      // this._nodeValue.select(1);
    } else if (this._nodeValue instanceof bondage.CommandResult) {
      // If the text was inside <<here>>, it will get returned as a CommandResult string, which you can use in any way you want
      console.log("command result", this._nodeValue.text);
      this._handleCommand(this._nodeValue.text);
    } else {
      throw new Error(`Unknown bondage result ${this._nodeValue}`);
    }
  }

  private _handleCommand(command: string): void {
    const commandParts = command.split(" ");

    // Attempt to call a method based on the command
    if (!(commandParts[0] in this)) {
      throw new Error(`No matching command "${commandParts[0]}"`);
    }

    // @ts-ignore
    this[commandParts[0]](...commandParts.slice(1));

    this._advance();
  }

  private _onChangeNodeData(
    oldNodeData: YarnSpinner.NodeData,
    newNodeData: YarnSpinner.NodeData
  ) {
    console.log("changing node data", oldNodeData, " --> ", newNodeData);

    // Parse tags
    for (const tag of newNodeData.tags) {
      let bg: string;
      let character: string;
      if (tag.startsWith("bg:")) {
        if (bg) console.warn("Trying to set background twice");

        bg = tag.split(":")[1].trim();
      } else if (tag.startsWith("show:")) {
        if (character) console.warn("Trying to set character twice");

        character = tag.split(":")[1].trim();
      } else {
        console.warn("Unknown tag in node data", tag);
      }

      if (bg) this.changeBackground(bg);
      this.changeCharacter(character);
    }

    this.emit("changeNodeData", oldNodeData, newNodeData);
  }

  changeBackground(bg: string): void {
    if (bg === this._lastBg) return;

    const fileName = `images/bg/${bg}.png`;
    this._background.texture =
      this.entityConfig.app.loader.resources[fileName].texture;

    this._lastBg = bg;
  }

  // If character is null or undefined, will just remove current character
  changeCharacter(character?: string): void {
    if (character === this._lastCharacter) return;

    // Remove all previous characters
    this._characterLayer.removeChildren();

    if (this._characterEntity)
      this._deactivateChildEntity(this._characterEntity);

    if (character) {
      const characterContainer = new PIXI.Container();

      this._characterEntity = new entity.ParallelEntity();
      this._activateChildEntity(
        this._characterEntity,
        entity.extendConfig({ container: characterContainer })
      );

      const baseDir = `images/characters/${character}`;

      {
        const baseSprite = new PIXI.Sprite(
          this.entityConfig.app.loader.resources[baseDir + "/base.png"].texture
        );
        characterContainer.addChild(baseSprite);
      }

      for (const animation of characterAnimations[character]) {
        const animatedSpriteEntity = util.makeAnimatedSprite(
          this._entityConfig.app.loader.resources[
            `${baseDir}/${animation}.json`
          ]
        );
        this._characterEntity.addChildEntity(animatedSpriteEntity);
      }

      this._characterLayer.addChild(characterContainer);
    }

    this._lastCharacter = character;
  }
}
