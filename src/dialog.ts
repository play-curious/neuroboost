import * as _ from "underscore";

import * as PIXI from "pixi.js";
import * as booyah from "booyah/src/booyah";
import * as easing from "booyah/src/easing";
import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as util from "booyah/src/util";
import * as clock from "./clock";

import * as graphics from "./graphics";

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
  private _autoshowOn: boolean;
  private _variableStorage: VariableStorage;
  private _previousNodeData: YarnSpinner.NodeData;
  private _moreTags: Record<string, string>;

  private _graphics: graphics.Graphics;

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

    // Setup graphics
    this._graphics = new graphics.Graphics(this._variableStorage.data);
    this._graphics.setup(this._lastFrameInfo, this.entityConfig);

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
      entity.extendConfig({ container: this._graphics.getUi() })
    );

    this._runner = new bondage.Runner("");
    this._runner.setVariableStorage(this._variableStorage);
    this._runner.load(this.entityConfig.jsonAssets[this.scriptName]);

    // Advance the dialogue manually from the node titled 'Start'
    this._nodeIterator = this._runner.run(this.startNode);
    this._advance();
  }

  _onSignal(frameInfo: entity.FrameInfo, signal: string, data?: any) {
    if(signal === "gainedVisibility"){
      booyah.changeGameState("playing");
    }
  }

  private _advance(): void {
    console.log("GRAPHICS", this._graphics);
    this._graphics.hideNode();
    this._graphics.showDialogLayer();

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
    this._graphics.showDialog(text, this._variableStorage.get("name"), this._autoshowOn, this._advance.bind(this));
  }

  private _handleChoice(nodeValue: YarnSpinner.ChoiceNode) {
    this._graphics.setChoice(nodeValue.options,
      (id) => {
        nodeValue.select(id);
        this._advance();
      },
      () => {
        this._nodeIterator = this._runner.run(this._moreTags["subchoice"]);
        this._advance();
      }
      );
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
    this._graphics.setFreechoice(nodeValue.options, (id) => {
      nodeValue.select(id);
      this._advance();
    });
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

    if (bg) this._graphics.setBackground(bg);
    this._graphics.setCharacter(character);

    this.emit("changeNodeData", oldNodeData, newNodeData);
  }

  // Shortcut for _changeCharacter()
  show(character: string): void {
    this._graphics.setCharacter(character);
  }

  // Shortcut for _changeCharacter()
  hide(): void {
    this._graphics.setCharacter();
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
  
  moreTags(...tags: string[]): void {
    for(const tag of tags){
      const [key, value] = tag.split(":");
      this._moreTags[key] = value;
    }
  }
}
