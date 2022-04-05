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
  public lastNodeData: yarnBound.Metadata;
  //public history: [type: string, text: string][];
  // private lastHistory: number;
  public runner: yarnBound.YarnBound<variable.VariableStorage>;
  public graphics: graphics.Graphics;
  public visited: Set<string>;
  public selectedOptions: string[];
  public enabled: boolean;

  constructor(public readonly stateName: string, public startNode: string) {
    super();
  }

  get metadata() {
    return this.runner.currentResult.metadata;
  }

  get history(): [type: string, text: string][]{
    return this.config.history.texts;
  }

  get lastHistory(){
    return this.config.history.lastTime;
  }

  set lastHistory(val){
    this.config.history.lastTime = val;
  }

  addToHistory(type: string, text: string){
    if(this.config.clock.minutesSinceMidnight !== this.lastHistory){
      this.lastHistory = this.config.clock.minutesSinceMidnight;
      this.history.push(["time", this.config.clock.text]);
    }
    this.history.push([type, text]);

    if(this.history.length > 149){
      if(this.history[2][0] === "time"){
        this.history.splice(0, 2);
      }
      else {
        this.history.splice(1, 1);
      }
    }
  }

  getHistoryText(): PIXI.Text[] {
    let texts: PIXI.Text[] = [];
    this.history.forEach((val, i) => {
      let txt;
      if(val[0].includes("choice")){
        txt = `[${val[1]}]`;
      } else if(val[0].includes("time")){
        txt = `----------------\n${val[1]}\n----------------`;
      } else if(val[0]){
        txt = `<b>${val[0].split("@")[0].split("_")[0]}</b>: ${val[1]}`;
      } else {
        txt = `<i>${val[1]}</i>`;
      }

      texts[i] = this.makeText(txt, {
        fontFamily: "Ubuntu",
        fontSize: 30,
        fill: 0xffffff,
        wordWrap: true,
        wordWrapWidth: 1700
      });
    });

    return texts;
  }

  _setup(): void {
    //@ts-ignore
    window.dialogScene = this;
    this._entityConfig.dialogScene = this;

    // this.history = [];
    // this.lastHistory = 0;
    this.enabled = true;
    this.selectedOptions = [];

    //@ts-ignore
    if (window.loadedVisited) {
      //@ts-ignore
      this.visited = window.loadedVisited;
      //@ts-ignore
      window.loadedVisited = undefined;
    } else {
      this.visited = new Set();
    }

    //@ts-ignore
    if (window.loadedNode) {
      //@ts-ignore
      this.startNode = window.loadedNode;
      //@ts-ignore
      window.loadedNode = undefined;
    }

    this.config.dialogScene = this;

    command.fxLoops.clear();

    // Setup graphics
    this.graphics = new graphics.Graphics();
    this._activateChildEntity(
      this.graphics,
      entity.extendConfig({ container: this.config.container })
    );

    // Init gauges
    this.graphics.initGauges([
      "learning",
      "sleep",
      "food",
      "mentalLoad",
      "stress",
    ]);

    // Setup clock
    this._activateChildEntity(
      this.config.clock,
      entity.extendConfig({ container: this.graphics.getUi() })
    );
    this.config.clock.minutesSinceMidnight = Number(
      this.config.variableStorage.get("time")
    );

    this._initRunner();
    this._parseFileTags();
    this._advance(-1);
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
          this.graphics.currentGauges = gauges;
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
    if (this.lastNodeData && !this._hasTag(this.lastNodeData, "nosave")) {
      save.save(this);
    }

    if (!this.enabled) return;

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

    // Check if the node data has changed
    if (this.lastNodeData?.title !== this.metadata.title) {
      this._onChangeNodeData(this.lastNodeData, this.metadata);
      this.lastNodeData = this.metadata;
    }

    const result = this.runner.currentResult;

    if (isText(result)) {
      this.graphics.showDialogLayer();
      this._handleDialog();
    } else if (isOption(result)) {
      this.graphics.showDialogLayer();
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
    const text =
      placeholder || (this.runner.currentResult as yarnBound.TextResult).text;
    let speaker = "";
    if (!placeholder && textResult.markup[0]?.name === "character") {
      speaker = textResult.markup[0].properties["name"];
    }

    if (this.config.variableStorage.get("isDebugMode")) {
      console.log("SKIPPED", textResult);
      this.addToHistory(speaker, text);
      this._advance(id);
      return;
    }

    this.graphics.showDialog(
      text,
      speaker,
      this.config.variableStorage.get("name"),
      () => {
        this.addToHistory(speaker, text);
        this._advance.bind(this)(id);
      }
    );
  }

  private _handleChoice() {
    const result = this.runner.currentResult;

    if (!isOption(result))
      throw new Error("Called _handleChoice for unknown result");

    this.metadata.choiceId !== undefined
      ? this.metadata.choiceId++
      : (this.metadata.choiceId = 0);

    const options: Record<string, string>[] = [];

    let indexOfBack = 0;
    for (let i = 0; i < result.options.length; i++) {
      const option = result.options[i];

      const selectedOptionId = `${this.metadata.title}|${this.metadata.choiceId}|${i}`;
      if (
        (option.hashtags.includes("once" as never) &&
          this.selectedOptions.includes(selectedOptionId)) ||
        !option.isAvailable
      )
        continue;

      options.push({
        text: option.text,
        id: `${i}`,
      });

      if (option.text === "back") indexOfBack = i;
    }

    if (
      this._hasTag(this.metadata, "subchoice") &&
      options.length === 1 &&
      indexOfBack !== -1
    ) {
      this._handleDialog("Vous ne pouvez rien faire ici...", indexOfBack);
      return;
    }

    options.reverse();

    this.graphics.setChoice(
      options,
      (id) => {
        this.config.fxMachine.play("Click");
        this.selectedOptions.push(
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

    const resultEntity = command.commands[commandParts[0]].bind(this)(
      ...commandParts.slice(1).map((arg) => arg.trim())
    );

    if (resultEntity) {
      this._activateChildEntity(
        new entity.EntitySequence([
          resultEntity,
          new entity.FunctionCallEntity(() => {
            this._advance();
          }),
        ])
      );
    } else {
      this._advance();
    }
  }

  private _onChangeNodeData(
    oldNodeData: yarnBound.Metadata,
    newNodeData: yarnBound.Metadata
  ) {
    if (!_.has(newNodeData, "tags")) {
      this.emit("changeNodeData", oldNodeData, newNodeData);
      return;
    }

    let noUi: boolean = false;

    for (let tag of newNodeData.tags.split(/\s+/)) {
      tag = tag.trim();
      if (tag === "") continue;

      if (tag === "noUi") {
        noUi = true;
      } else if (tag !== "freechoice" && tag !== "subchoice") {
        console.warn("Unknown tag in node data", tag);
      }
    }

    if (noUi) this.graphics.hideUi();
    else this.graphics.showUi();

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

  disable() {
    this.enabled = false;
    this.graphics.hideNode();
  }

  enable() {
    this.enabled = true;
    this.graphics.showNode();
    this._advance();
  }
}
