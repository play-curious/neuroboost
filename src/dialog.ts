import * as _ from "underscore";
import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";

import * as save from "./save";
import * as clock from "./clock";
import * as command from "./command";
import * as variable from "./variable";
import * as graphics from "./graphics";
import * as extension from "./extension";

import * as yarnBound from "yarn-bound";

declare module "yarn-bound" {
  interface Metadata {
    tags?: string;
    bg?: string;
    show?: string;
    choiceId?: number;
  }
}

export function isText(
  result: yarnBound.Result
): result is yarnBound.TextResult {
  return result instanceof yarnBound.TextResult;
}

export function isCommand(
  result: yarnBound.Result
): result is yarnBound.CommandResult {
  return result instanceof yarnBound.CommandResult;
}

export function isOption(
  result: yarnBound.Result
): result is yarnBound.OptionsResult {
  return result instanceof yarnBound.OptionsResult;
}

export class DialogScene extends extension.ExtendedCompositeEntity {
  private _lastNodeData: yarnBound.Metadata;
  private _selectedOptions: string[];
  private _autoshowOn: boolean;

  public runner: yarnBound.YarnBound<variable.VariableStorage>;
  public graphics: graphics.Graphics;
  public visited: Set<string>;

  constructor(
    public readonly stateName: string,
    public readonly startNode: string
  ) {
    super();
  }

  get metadata() {
    return this.runner.currentResult.metadata;
  }

  _setup(): void {
    save.save(this.stateName);

    this._initRunner();

    command.fxLoops.clear();

    this._autoshowOn = false;
    this._selectedOptions = [];
    this.visited = new Set();

    // Setup graphics
    this.graphics = new graphics.Graphics();
    this._activateChildEntity(
      this.graphics,
      entity.extendConfig({ container: this.config.container })
    );

    // Setup clock
    this._activateChildEntity(
      this.config.clock,
      entity.extendConfig({ container: this.graphics.getUi() })
    );
    this.config.clock.minutesSinceMidnight = Number(
      this.config.variableStorage.get("time")
    );

    // Hide gauges by default
    this.graphics.toggleGauges(false);
    this._advance(-1);

    this._parseFileTags();
  }

  private _initRunner() {
    this.runner = new yarnBound.YarnBound({
      dialogue: this.config.levels[this.stateName],
      startAt: this.startNode,
      variableStorage: this.config.variableStorage,
      functions: {},
    });
    this.runner.history = this.config.globalHistory;

    for (const funcName in command.functions) {
      this.runner.registerFunction(
        funcName,
        command.functions[funcName].bind(this)
      );
    }
    
    this.runner.advance();
  }

  private _parseFileTags() {
    if (this.metadata.filetags) {
      // Show gauges as specified in file tags
      for (const tag of this.metadata.filetags) {
        if (tag.startsWith("gauges")) {
          const values = tag.split(":")[1].trim();
          const gauges = values.split(" ");
          this.graphics.toggleGauges(true, ...gauges);
        }
      }
    }
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
    // If result is undefined, stop here
    if (this.metadata.hasOwnProperty("isDialogueEnd")) {
      this._transition = entity.makeTransition();
      return;
    }

    if (selectId !== -1) this.runner.advance(selectId);

    // If result is undefined, stop here
    if (this.runner.currentResult === undefined) {
      this._transition = entity.makeTransition();
      return;
    }

    this.graphics.hideNode();
    this.graphics.showDialogLayer();

    // Check if the node data has changed
    if (this._lastNodeData?.title !== this.metadata.title) {
      this._onChangeNodeData(this._lastNodeData, this.metadata);
      this._lastNodeData = this.metadata;
    }

    const result = this.runner.currentResult;

    if (isText(result)) {
      this._handleDialog();
    } else if (isOption(result)) {
      if (this._hasTag(this.metadata, "freechoice")) {
        this._handleFreechoice();
      } else {
        this._handleChoice();
      }
    } else if (isCommand(result)) {
      this._handleCommand();
    } else {
      console.error("Unknown bondage result:", this.runner.currentResult);
      throw new Error(`Unknown bondage result`);
    }
  }

  private _handleDialog(placeholder?: string, id?: number) {
    const textResult = this.runner.currentResult as yarnBound.TextResult;
    const text = placeholder || (this.runner.currentResult as yarnBound.TextResult).text;
    let speaker = "";
    if (!placeholder && textResult.markup[0]?.name === "character") {
      speaker = textResult.markup[0].properties["name"];
    }
    this.graphics.showDialog(
      text,
      speaker,
      this.config.variableStorage.get("name"),
      this._autoshowOn,
      this._advance.bind(this)
    );
  }

  private _handleChoice() {
    const result = this.runner.currentResult;

    if (!isOption(result))
      throw new Error("Called _handleChoice for unknown result");

    this.metadata.choiceId
      ? this.metadata.choiceId++
      : (this.metadata.choiceId = 0);
    const options: Record<string, string>[] = [];

    let indexOfBack = 0;
    for (let i = 0; i < result.options.length; i++) {
      const option = result.options[i];

      const selectedOptionId = `${this.metadata.title}|${this.metadata.choiceId}|${i}`;
      if (
        option.hashtags.includes("once") &&
        this._selectedOptions.includes(selectedOptionId)
      )
        continue;

      options.push({
        text: option.text,
        id: `${i}`,
      });

      if (option.text === "back") indexOfBack = i;
    }

    if(options.length === 1 && indexOfBack !== -1){
      this._handleDialog("Vous ne pouvez rien faire ici...", indexOfBack);
      return;
    }
    
    options.reverse();

    this.graphics.setChoice(
      options,
      (id) => {
        this.config.fxMachine.play("Click");
        this._selectedOptions.push(
          `${this.metadata.title}|${this.metadata.choiceId}|${id}`
        );
        this._advance.bind(this)(id);
      },
      this._hasTag(this.metadata, "subchoice") ? indexOfBack : undefined
    );
  }

  private _handleFreechoice() {
    const result = this.runner.currentResult;

    if (!isOption(result))
      throw new Error("Called _handleChoice for unknown result");

    const options: string[] = [];
    for (const option of result.options) {
      if (option.isAvailable) options.push(option.text);
    }

    this.graphics.setFreechoice(options, (id) => {
      this.config.fxMachine.play("Click");
      this._advance.bind(this)(id);
    });
  }

  private _handleCommand(): void {
    // If the text was inside <<here>>, it will get returned as a CommandResult string, which you can use in any way you want
    const result = this.runner.currentResult;

    if (!isCommand(result))
      throw new Error("Called _handleCommand for unknown result");

    const cmd = result.command;
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

  private _onChangeNodeData(
    oldNodeData: yarnBound.Metadata,
    newNodeData: yarnBound.Metadata
  ) {
    // By default, autoshow is off
    this._autoshowOn = false;
    let noUi: boolean = false;
    let bg: string;
    let bg_mood: string;
    let character: string;

    for (let tag of newNodeData.tags.split(/\s+/)) {
      tag = tag.trim();
      if (tag === "") continue;

      if (tag.startsWith("bg|")) {
        if (bg) console.warn("Trying to set background twice");

        [bg, bg_mood] = tag.split("|")[1].trim().split("_");
      } else if (tag.startsWith("show|")) {
        if (character) console.warn("Trying to set character twice");

        character = tag.split("|")[1].trim();
      } else if (tag === "autoshow") {
        this._autoshowOn = true;
      } else if (tag === "noUi") {
        noUi = true;
      } else {
        console.warn("Unknown tag in node data", tag);
      }
    }

    if (noUi) this.graphics.hideUi();
    else this.graphics.showUi();

    if (bg) this.graphics.setBackground(bg, bg_mood);
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
