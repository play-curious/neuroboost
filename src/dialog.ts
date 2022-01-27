import * as _ from "underscore";

import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";

import * as clock from "./clock";
import * as command from "./command";
import * as variable from "./variable";
import * as graphics from "./graphics";
import * as extension from "./extension";

import * as yarnBound from "yarn-bound";

declare module "yarn-bound" {
  interface Metadata {
    tags?: string
    bg?: string;
    show?: string;
  }
}

export class DialogScene extends extension.ExtendedCompositeEntity {
  private _lastNodeData: yarnBound.Metadata;
  private _autoshowOn: boolean;

  public runner: yarnBound.YarnBound<variable.VariableStorage>;
  public graphics: graphics.Graphics;

  constructor(
    public readonly scriptName: string,
    public readonly startNode = "Start",
    public readonly variableStorage: variable.VariableStorage,
    public readonly clock: clock.Clock
  ) {
    super();
  }

  get metadata() {
    return this.runner.currentResult.metadata;
  }

  _setup(): void {
    command.fxLoops.clear();

    this._autoshowOn = false;

    // Setup graphics
    this.graphics = new graphics.Graphics(this.variableStorage.data);
    this._activateChildEntity(
      this.graphics,
      entity.extendConfig({ container: this.config.container })
    );

    // Setup clock
    this._activateChildEntity(
      this.clock,
      entity.extendConfig({ container: this.graphics.getUi() })
    );
    this.clock.minutesSinceMidnight = Number(this.variableStorage.get("time"));

    this._advance(-1);
  }

  public loadRunner(runner: yarnBound.YarnBound<variable.VariableStorage>){
    this.runner = runner;
    console.log(this.runner)
    for(const funcName in command.functions)
      this.runner.registerFunction(funcName, command.functions[funcName].bind(this));
  }

  _onSignal(frameInfo: entity.FrameInfo, signal: string, data?: any) {
    if (signal === "gainedVisibility") {
      booyah.changeGameState("playing");
    }
  }

  private _hasTag(nodeData: yarnBound.Metadata, tag: string): boolean {
    return nodeData.tags?.match(tag)?.length > 0;
  }

  private _advance(selectId?: number): void {
    this.graphics.hideNode();
    this.graphics.showDialogLayer();

    if(selectId !== -1)
      this.runner.advance(selectId);

    // If result is undefined, stop here
    if (this.metadata.hasOwnProperty("isDialogueEnd")) {
      this._transition = entity.makeTransition();
      return;
    }

    // Check if the node data has changed
    if (this._lastNodeData?.title !== this.metadata.title) {
      this._onChangeNodeData(this._lastNodeData, this.metadata);
      this._lastNodeData = this.metadata;
    }

    if (this.runner.currentResult instanceof yarnBound.TextResult) {
      this._handleDialog();
    } else if (this.runner.currentResult instanceof yarnBound.OptionsResult) {
      debugger;
      if (this._hasTag(this.metadata, "freechoice")) {
        this._handleFreechoice();
      } else {
        this._handleChoice();
      }
    } else if (this.runner.currentResult instanceof yarnBound.CommandResult) {
      this._handleCommand();
    } else {
      throw new Error(`Unknown bondage result ${this.runner.currentResult}`);
    }
  }

  private _handleDialog() {
    const text = (this.runner.currentResult as yarnBound.TextResult).text;
    this.graphics.showDialog(
      text,
      this.variableStorage.get("name"),
      this._autoshowOn,
      this._advance.bind(this)
    );
  }

  private _handleChoice() {
    const options: string[] = [];
    for(const option of (this.runner.currentResult as yarnBound.OptionsResult).options){
      if(option.isAvailable)
        options.push(option.text);
    }
    this.graphics.setChoice(
      options,
      (id) => {
        this.config.fxMachine.play("Click");
        this._advance.bind(this)(id);
      },
      this._hasTag(this.metadata, "subchoice") ?
      options.indexOf("back") : undefined
    );
  }

  private _handleCommand(): void {
    // If the text was inside <<here>>, it will get returned as a CommandResult string, which you can use in any way you want
    const cmd = (this.runner.currentResult as yarnBound.CommandResult).command;
    const commandParts = cmd.trim().split(/\s+/);

    // Attempt to call a method based on the command
    if (!(commandParts[0] in command.commands)) {
      console.warn(`No matching command "${commandParts[0]}"`);
      this._advance();
      return;
    }

    command.commands[commandParts[0]].bind(this)(
      ...commandParts.slice(1).map((arg) => arg.trim())
    );

    this._advance();
  }

  private _handleFreechoice() {
    const options: string[] = [];
    for(const option of (this.runner.currentResult as yarnBound.OptionsResult).options){
      if(option.isAvailable)
        options.push(option.text);
    }

    this.graphics.setFreechoice(
      options, (id) => {
        this.config.fxMachine.play("Click");
        this._advance.bind(this)(id);
      }
    );
  }

  private _onChangeNodeData(oldNodeData: yarnBound.Metadata, newNodeData: yarnBound.Metadata) {
    //console.log("changing node data", oldNodeData, " --> ", newNodeData);
    // Parse tags

    // By default, autoshow is off
    this._autoshowOn = false;
    let bg: string;
    let character: string;

    for (let tag of newNodeData.tags.split(" ")) {
      tag = tag.trim();
      if (tag === "") continue;

      if (tag.startsWith("bg|")) {
        if (bg) console.warn("Trying to set background twice");

        bg = tag.split("|")[1].trim();
      } else if (tag.startsWith("show|")) {
        if (character) console.warn("Trying to set character twice");

        character = tag.split("|")[1].trim();
      } else if (tag === "autoshow") {
        this._autoshowOn = true;
      } else {
        console.warn("Unknown tag in node data", tag);
      }
    }

    if (bg) this.graphics.setBackground(bg);
    this.graphics.addCharacter(character);

    this.emit("changeNodeData", oldNodeData, newNodeData);
  }

  activate(
    e: entity.EntityBase,
    config?: entity.EntityConfigResolvable,
    transition?: entity.Transition
  ) {
    this._activateChildEntity(e, config, transition);
  }

  deactivate(e: entity.EntityBase) {
    this._deactivateChildEntity(e);
  }
}
