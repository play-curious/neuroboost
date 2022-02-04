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

export class DialogScene extends extension.ExtendedCompositeEntity {
  private _lastNodeData: yarnBound.Metadata;
  private _autoshowOn: boolean;
  private _selectedOptions: string[];

  public runner: yarnBound.YarnBound<variable.VariableStorage>;
  public disabledClick: boolean;
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

    this.disabledClick = false;
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
    this.disabledClick = true;
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

    this._activateChildEntity(
      new entity.EntitySequence([
        () =>
          (() => {
            const { lastBg, lastMood } = this.graphics.last;
            const [bg, mood] = this.metadata.tags
              .split(/\s+/)
              .find((tag) => tag.startsWith("bg|"))
              ?.replace("bg|", "")
              .split("_") || ["GNEUH"];
            return (bg !== "GNEUH" && bg !== lastBg) || mood !== lastMood;
          })() && this.metadata.title !== this._lastNodeData?.title
            ? this.graphics.fadeIn(200)
            : new entity.FunctionCallEntity(() => null),
        new entity.FunctionCallEntity(() => {
          this.graphics.hideNode();
          this.graphics.showDialogLayer();

          // Check if the node data has changed
          if (this._lastNodeData?.title !== this.metadata.title) {
            this._onChangeNodeData(this._lastNodeData, this.metadata);
            this._lastNodeData = this.metadata;
          }

          if (this.runner.currentResult instanceof yarnBound.TextResult) {
            this.activate(this.graphics.fadeOut(200));
            this._handleDialog();
          } else if (
            this.runner.currentResult instanceof yarnBound.OptionsResult
          ) {
            this.activate(this.graphics.fadeOut(200));
            if (this._hasTag(this.metadata, "freechoice")) {
              this._handleFreechoice();
            } else {
              this._handleChoice();
            }
          } else if (
            this.runner.currentResult instanceof yarnBound.CommandResult
          ) {
            this._handleCommand();
          } else {
            throw new Error(
              `Unknown bondage result ${this.runner.currentResult}`
            );
          }
        }),
        this.graphics.fadeOut(200),
        new entity.FunctionCallEntity(() => {
          this.disabledClick = false;
        }),
      ])
    );
  }

  private _handleDialog() {
    const textResult = this.runner.currentResult as yarnBound.TextResult;
    const text = (this.runner.currentResult as yarnBound.TextResult).text;
    let speaker = "";
    if (textResult.markup[0]?.name === "character") {
      speaker = textResult.markup[0].properties["name"];
    }
    this.graphics.showDialog(
      text,
      speaker,
      this.config.variableStorage.get("name"),
      this._autoshowOn,
      () => {
        if (this.disabledClick) return;
        this._advance.bind(this)();
      }
    );
  }

  private _handleChoice() {
    this.metadata.choiceId
      ? this.metadata.choiceId++
      : (this.metadata.choiceId = 0);
    const options: Record<string, string>[] = [];
    let indexOfBack = 0;
    for (
      let i = 0;
      i < (this.runner.currentResult as yarnBound.OptionsResult).options.length;
      i++
    ) {
      const option = (this.runner.currentResult as yarnBound.OptionsResult)
        .options[i];
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
    options.reverse();
    this.graphics.setChoice(
      options,
      (id) => {
        if (this.disabledClick) return;
        this.config.fxMachine.play("Click");
        this._selectedOptions.push(
          `${this.metadata.title}|${this.metadata.choiceId}|${id}`
        );
        this._advance.bind(this)(id);
      },
      this._hasTag(this.metadata, "subchoice") ? indexOfBack : undefined
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
    console.log("test");
    this._advance();
  }

  private _handleFreechoice() {
    const options: string[] = [];
    for (const option of (this.runner.currentResult as yarnBound.OptionsResult)
      .options) {
      if (option.isAvailable) options.push(option.text);
    }

    this.graphics.setFreechoice(options, (id) => {
      if (this.disabledClick) return;
      this.config.fxMachine.play("Click");
      this._advance.bind(this)(id);
    });
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
