import * as _ from "underscore";

import * as PIXI from "pixi.js";
import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";

import * as clock from "./clock";
import * as variable from "./variable";

import * as graphics from "./graphics";

// Bondage is loaded as a global variable
declare const bondage: any;

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
  data: NodeData;
  select: (i: number) => void;
}

type Node = TextNode | ChoiceNode;

export class DialogScene extends entity.CompositeEntity {
  private _runner: any;
  private _nodeIterator: any;
  private _nodeValue: Node;
  private _lastNodeData: NodeData;
  private _autoshowOn: boolean;
  private _variableStorage: variable.VariableStorage;
  private _previousNodeDatas: NodeData[];

  private _graphics: graphics.Graphics;

  private _clock: clock.Clock;

  constructor(
    public readonly scriptName: string,
    public readonly startNode = "Start"
  ) {
    super();
  }

  _setup(): void {
    this._autoshowOn = false;

    // Create variable storage
    this._variableStorage = new variable.VariableStorage({
      name: "Moi",
      time: "540",
      eval: "",
    });
    this._previousNodeDatas = [];

    // Setup graphics
    this._graphics = new graphics.Graphics(this._variableStorage.data);
    this._activateChildEntity(this._graphics);

    // Setup clock
    this._clock = new clock.Clock(new PIXI.Point(1920 - 557 / 2, 0));
    this._activateChildEntity(
      this._clock,
      entity.extendConfig({ container: this._graphics.getUi() })
    );
    this._clock.minutesSinceMidnight = Number(
      this._variableStorage.get("time")
    );

    this._runner = new bondage.Runner("");
    this._runner.setVariableStorage(this._variableStorage);
    this._runner.registerFunction('isFirstTime', (data: any) => {
      for(const nodeData of this._previousNodeDatas){
        if(!nodeData) continue;
        if(nodeData.title == data.title)
          return false;
      }
      return true;
    });
    this._runner.load(this.entityConfig.jsonAssets[this.scriptName]);

    // Advance the dialogue manually from the node titled 'Start'
    this._nodeIterator = this._runner.run(this.startNode);
    this._advance();
  }

  _onSignal(frameInfo: entity.FrameInfo, signal: string, data?: any) {
    if (signal === "gainedVisibility") {
      booyah.changeGameState("playing");
    }
  }

  private _hasTag(nodeData: NodeData, tag: string): boolean {
    return nodeData.tags.includes(tag);
  }

  private _advance(): void {
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
      this._previousNodeDatas.push(this._lastNodeData);
      this._lastNodeData = this._nodeValue.data;
    }

    if (this._nodeValue instanceof bondage.TextResult) {
      this._handleDialog((this._nodeValue as TextNode).text);
    } else if (this._nodeValue instanceof bondage.OptionsResult) {
      if (this._hasTag(this._nodeValue.data, "freechoice")) {
        this._handleFreechoice(
          this._nodeValue.data.title,
          this._nodeValue as ChoiceNode
        );
      } else {
        this._handleChoice(this._nodeValue as ChoiceNode);
      }
    } else if (this._nodeValue instanceof bondage.CommandResult) {
      this._handleCommand((this._nodeValue as TextNode).text);
    } else {
      throw new Error(`Unknown bondage result ${this._nodeValue}`);
    }
  }

  private _handleDialog(text: string) {
    this._graphics.showDialog(
      text,
      this._variableStorage.get("name"),
      this._autoshowOn,
      this._advance.bind(this)
    );
  }

  private _handleChoice(nodeValue: ChoiceNode) {
    this._graphics.setChoice(
      nodeValue.options,
      (id) => {
        nodeValue.select(id);
        this._advance();
      },
      this._hasTag(nodeValue.data, "subchoice") ? () => {
        this._nodeIterator = this._runner.run(_.last(this._previousNodeDatas).title);
        this._advance();
      } : undefined
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
  private _handleFreechoice(freechoice: string, nodeValue: ChoiceNode) {
    this._graphics.setFreechoice(nodeValue.options, (id) => {
      nodeValue.select(id);
      this._advance();
    });
  }

  private _onChangeNodeData(oldNodeData: NodeData, newNodeData: NodeData) {
    console.log("changing node data", oldNodeData, " --> ", newNodeData);

    // Parse tags

    // By default, autoshow is off
    this._autoshowOn = false;

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

  prompt<VarName extends keyof variable.Variables>(
    varName: VarName,
    message: string,
    _default: variable.Variables[VarName]
  ) {
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
    //   form.styles.(todo: set position to absolute and place it on middle screen)
    //   form.onsubmit = (event) => {
    //     event.preventDefault()
    //     if(ok) document.body.removeChild(form)
    //   }
    //   document.body.appendChild(form)
    // }

    const value = prompt(
      message.replace(/_/g, " "),
      _default.replace(/_/g, " ")
    )?.trim();
    this._variableStorage.set(
      varName,
      value || (_default.replace(/_/g, " ") as any)
    );
  }

  eval(code: string) {
    const evaluated = eval(code);
    this._variableStorage.set("eval", evaluated);
  }

  setTime(time: clock.ResolvableTime) {
    let [, , minutesSinceMidnight] = clock.parseTime(time);

    while (minutesSinceMidnight >= clock.dayMinutes)
      minutesSinceMidnight -= clock.dayMinutes;

    this._variableStorage.set("time", `${minutesSinceMidnight}`);

    this._clock.minutesSinceMidnight = minutesSinceMidnight;
  }

  advanceTime(time: clock.ResolvableTime) {
    const [, , minutesToAdvance] = clock.parseTime(time);
    const minutesSinceMidnight = Number(this._variableStorage.get("time"));
    let newMinutes = minutesSinceMidnight + minutesToAdvance;

    while (newMinutes >= clock.dayMinutes) newMinutes -= clock.dayMinutes;

    this._variableStorage.set("time", `${newMinutes}`);

    this._activateChildEntity(this._clock.advanceTime(time));
  }

  hideClock() {
    this._clock.hidden = true;
  }

  showClock() {
    this._clock.hidden = false;
  }
}
