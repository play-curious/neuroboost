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
import * as gauge from "./gauge";

import * as yarnBound from "yarn-bound";
import * as chapter_menus from "./chapter_menus";
import { levelType, translateDialog } from "./wrapper/i18n";
import i18n from "./generated/i18n";
import { TextResult } from "yarn-bound";

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

// Setup level order
export const dialogScenes = [
  "Prologue",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7",
];

export const debuggingDialogScenes = [
  "characters",
  "backgrounds",
  "test_simulation",
  "test_deadline",
  "test_round",
  "test_highlight_sages",
  "test_highlight_party",
];

export class DialogScene extends extension.ExtendedCompositeEntity {
  public lastNodeData: yarnBound.Metadata;
  public runner: yarnBound.YarnBound<variable.VariableStorage>;
  public graphics: graphics.Graphics;
  public visited: Set<string>;
  public visitedPermanent: Set<string>;
  public selectedOptions: string[];
  public enabled: boolean;

  private _startNode: string;

  constructor(public levelName: string) {
    super();
  }

  get metadata() {
    return this.runner.currentResult.metadata;
  }

  get history(): [type: string, text: string][] {
    return this.config.history.texts;
  }

  get lastHistory() {
    return this.config.history.lastTime;
  }

  set lastHistory(val) {
    this.config.history.lastTime = val;
  }

  addToHistory(type: string, text: string) {
    if (this.config.clock.minutesSinceMidnight !== this.lastHistory) {
      this.lastHistory = this.config.clock.minutesSinceMidnight;
      this.history.push(["time", this.config.clock.text]);
    }
    this.history.push([type, text]);

    if (this.history.length > 149) {
      if (this.history[2][0] === "time") {
        this.history.splice(0, 2);
      } else {
        this.history.splice(1, 1);
      }
    }
  }

  getHistoryText(): PIXI.Text[] {
    let texts: PIXI.Text[] = [];
    this.history.forEach((val, i) => {
      let txt;
      if (val[0].includes("choice")) {
        txt = `[${val[1]}]`;
      } else if (val[0].includes("time")) {
        txt = `----------------\n${val[1]}\n----------------`;
      } else if (val[0]) {
        txt = `<b>${val[0].split("@")[0].split("_")[0]}</b>: ${val[1]}`;
      } else {
        txt = `<i>${val[1]}</i>`;
      }

      texts[i] = this.makeText(txt, {
        fontFamily: "Ubuntu",
        fontSize: 30,
        fill: 0xffffff,
        wordWrap: true,
        wordWrapWidth: 1700,
      });
    });

    return texts;
  }

  _setup(): void {
    //@ts-ignore
    window.dialogScene = this;

    // TODO: this is incorrect, should provide child entities with the dialogScene
    this._entityConfig.dialogScene = this;
    this.config.dialogScene = this;

    this.enabled = true;
    this.selectedOptions = [];

    this._startNode = this._enteringTransition.params?.startNode || "Start";

    const loadedChapterData = this._enteringTransition.params
      ?.loadedChapterData as save.CurrentChapter;
    if (loadedChapterData) {
      this._startNode = loadedChapterData.nodeName;
      this.levelName = loadedChapterData.levelName;

      this.visited = new Set(loadedChapterData.visited);
      this.visitedPermanent = new Set(loadedChapterData.visitedPermanent);

      // this.config.history = saveData.history;
    } else {
      this.visited = new Set();
      this.visitedPermanent = new Set();
    }

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

    if (loadedChapterData)
      this.graphics.loadSave(loadedChapterData.graphicsState);

    this._advance(-1);
  }

  private _initRunner() {
    this.runner = new yarnBound.YarnBound({
      dialogue: this.config.levels[this.levelName],
      startAt: this._startNode,
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
          const gauges = values.split(",");
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

    // Check if the node data has changed
    if (this.lastNodeData?.title !== this.metadata.title) {
      this._onChangeNodeData(this.lastNodeData, this.metadata);
      this.lastNodeData = this.metadata;

      this._saveProgress();
    }

    const result = this.runner.currentResult;

    if (isText(result)) {
      const textResult = this.runner.currentResult as yarnBound.TextResult;

      if (result.text.trim().length === 0) {
        // Occasionnally Yarn will give us an empty line. Skip to the next
        this._advance();
      } else if (textResult.markup[0]?.properties["name"] === "Tutorial") {
        this._handleTutorial();
      } else {
        this.graphics.showDialogLayer();
        this._handleDialog();
      }
    } else if (isOption(result)) {
      this.graphics.showDialogLayer();
      this._handleChoice();
    } else if (isCommand(result)) {
      this._handleCommand();
    } else {
      console.error("Unknown bondage result:", this.runner.currentResult);
      throw new Error(`Unknown bondage result`);
    }
  }

  private _handleTutorial() {
    const textResult = this.runner.currentResult as yarnBound.TextResult;
    this.graphics.showTutorial(textResult.text.trim(), () => {
      this._advance();
    });
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

    let lineId;
    for (let hash of textResult.hashtags) {
      if (hash.startsWith("line")) {
        lineId = hash.split(":")[1].trim();
      }
    }
    let translatedText = text;
    if (lineId) {
      translatedText = translateDialog(
        this,
        this.levelName.toLowerCase() as levelType,
        lineId as i18n[keyof i18n][levelType][number]["id"],
        text
      );
    }

    this.graphics.showDialog(
      translatedText,
      speaker,
      this.config.variableStorage.get("name"),
      () => {
        this.addToHistory(speaker, text);
        this._advance.bind(this)(id);
      }
    );
  }

  private _handleChoice() {
    const result = this.runner.currentResult as TextResult;

    if (!isOption(result))
      throw new Error("Called _handleChoice for unknown result");

    this.metadata.choiceId !== undefined
      ? this.metadata.choiceId++
      : (this.metadata.choiceId = 0);

    const options: Record<string, string>[] = [];

    let indexOfBack;
    let freeChoiceCount = 0;
    for (let i = 0; i < result.options.length; i++) {
      const option = result.options[i];
      const optionText = option.text.trim();

      let lineId;
      for (let hash of result.hashtags) {
        if (hash.startsWith("line")) {
          lineId = hash.split(":")[1].trim();
        }
      }
      let translatedText = optionText;
      if (lineId) {
        translatedText = translateDialog(
          this,
          this.levelName.toLowerCase() as levelType,
          lineId as i18n[keyof i18n][levelType][number]["id"],
          optionText
        );
      }

      if (optionText.includes("@")) {
        freeChoiceCount++;
      }

      const selectedOptionId = `${this.metadata.title}|${this.metadata.choiceId}|${i}`;
      if (
        (option.hashtags.includes("once") &&
          this.selectedOptions.includes(selectedOptionId)) ||
        !option.isAvailable
      )
        continue;

      options.push({
        text: translatedText,
        id: `${i}`,
      });

      if (optionText === "back") indexOfBack = i;
    }

    if (
      this._hasTag(this.metadata, "subchoice") &&
      options.length === 1 &&
      indexOfBack !== -1
    ) {
      this._handleDialog(
        "Vous ne pouvez plus rien faire ici pour le moment.",
        indexOfBack
      );
      return;
    }

    if (freeChoiceCount > 0) {
      if (freeChoiceCount < options.length)
        throw new Error("Cannot mix free choices and normal choices");

      // Show highlight zones
      this.graphics.setFreechoice(options, (id) => {
        this._advance.bind(this)(id);
      });
    } else {
      // Regular choice
      options.reverse();

      this.graphics.setChoice(
        options,
        (id) => {
          this.selectedOptions.push(
            `${this.metadata.title}|${this.metadata.choiceId}|${id}`
          );
          this._advance.bind(this)(id);
        },
        this._hasTag(this.metadata, "subchoice") ? indexOfBack : undefined
      );
    }
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

  private _saveProgress() {
    if (this._hasTag(this.lastNodeData, "nosave")) return;

    save.updateCurrentChapter({
      levelName: this.levelName,
      nodeName: this.metadata.title,
      visited: Array.from(this.visited),
      visitedPermanent: Array.from(this.visitedPermanent),
      graphicsState: this.graphics.graphicsState,
    });
    save.updateVariableStorage(this._entityConfig.variableStorage.data);
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
    // TODO: why is this necessary?
    this.graphics.hideNode();
  }

  enable() {
    this.enabled = true;
    this._advance();
  }

  /** Automatically simulate effects on sleep & food gauges */
  simulateGauges(minutes: number, gaugesToIgnore: string[]): void {
    // Need about 8 hours of sleep per day (15% for 2:15)
    const sleepPerHour = 15 / 2.25;
    // No more than 9 between meals (25% for 2:15)
    const foodPerHour = 25 / 2.25;

    if (!gaugesToIgnore.includes("sleep")) {
      const oldValue = this.config.variableStorage.get("sleep");
      const simulatedSleep = (sleepPerHour * minutes) / 60;
      const newValue = Math.max(Number(oldValue) - simulatedSleep, 0);
      this.config.variableStorage.set("sleep", `${newValue}`);
    }

    if (!gaugesToIgnore.includes("food")) {
      const oldValue = this.config.variableStorage.get("food");
      const simulatedFood = (foodPerHour * minutes) / 60;
      const newValue = Math.max(Number(oldValue) - simulatedFood, 0);
      this.config.variableStorage.set("food", `${newValue}`);
    }
  }

  showAndSaveScore(score: string, hintWords: string[]): entity.Entity {
    const scoreNumber: number = Number(score);
    save.updateCompletedLevel(this.levelName, scoreNumber);
    // Look up the index of the chapter to get the number
    const chapter = dialogScenes.indexOf(this.levelName);
    const hint = hintWords.join(" ");

    this.entityConfig.fxMachine.play("Success");
    return new chapter_menus.ScoreMenu({
      chapter,
      score: scoreNumber,
      hint,
    });
  }

  calculateC7Score(): number {
    const motivation: number = Number(
      this.entityConfig.variableStorage.get("motivationFred")
    );
    console.log(motivation);
    if (motivation >= 7) {
      return 3;
    }
    if (motivation >= 5) {
      return 2;
    }
    if (motivation >= 4) {
      return 1;
    }
    return 0;
  }

  calculateScore(): number {
    const vars = this.config.variableStorage;

    const learning = parseInt(vars.get("learning"));

    // If learning is red, 0 stars
    if (learning < gauge.gaugeLevels["learning"].minMedium) return 0;
    // If learning is yellow 1 star
    if (learning < gauge.gaugeLevels["learning"].minHigh) return 1;

    // If any other (shown) gauges are red, 2 stars
    for (const gaugeName of this.graphics.currentGauges) {
      if (variable.InvertedGauges.includes(gaugeName)) {
        if (
          // @ts-ignore
          parseInt(vars.get(gaugeName)) >= gauge.gaugeLevels[gaugeName].minHigh
        )
          return 2;
      } else {
        if (
          // @ts-ignore
          parseInt(vars.get(gaugeName)) < gauge.gaugeLevels[gaugeName].minLow
        )
          return 2;
      }
    }

    // 3 stars!
    return 3;
  }
}
