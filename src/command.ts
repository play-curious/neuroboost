import * as _ from "underscore";

import * as entity from "booyah/src/entity";

import * as dialog from "./dialog";
import * as variable from "./variable";
import * as miniGame from "./mini_game";
import * as clock from "./clock";
import * as save from "./save";
import * as popup from "./popup";
import * as journal from "./journal";
import * as title from "./title";

export type Command = (this: dialog.DialogScene, ...args: string[]) => unknown;
export type YarnFunction = (
  this: dialog.DialogScene,
  ...args: any[]
) => unknown;

export const fxLoops: Map<string, entity.EntitySequence> = new Map();
export const savedGauges: Map<keyof variable.Gauges, number> = new Map();

export const commands: Record<string, Command> = {
  // Shortcut for _changeCharacter()
  show(character: string, mood?: string): void {
    this.graphics.addCharacter(character, mood);
  },

  // Shortcut for _changeCharacter()
  hide(instantaneous?): void {
    this.graphics.removeCharacters(instantaneous === undefined);
  },

  prompt<VarName extends keyof variable.Variables>(
    varName: VarName,
    message: string,
    _default: variable.Variables[VarName]
  ) {
    const promptPopup = new popup.Prompt(message.replace(/_/g, " "), (text) => {
      this.config.variableStorage.set(
        varName,
        text || (_default.replace(/_/g, " ") as any)
      );
    });
    return promptPopup;
  },

  hideUi() {
    this.graphics.hideUi();
  },

  showUi() {
    this.graphics.showUi();
  },

  hideDialog() {
    this.graphics.hideDialogLayer();
  },

  showDialog() {
    this.graphics.hideDialogLayer();
  },

  eval(code: string) {
    const evaluated = eval(code);
    this.config.variableStorage.set("eval", evaluated);
  },

  // CLOCK

  setTime(time: clock.ResolvableTime, day?: string) {
    let [, , minutesSinceMidnight] = clock.parseTime(time);
    if (day) {
      minutesSinceMidnight += Number(day) * clock.dayMinutes;
    } else {
      const currentMinutesSinceMidnight = Math.floor(
        Number(this.config.variableStorage.get("time")) / clock.dayMinutes
      );
      minutesSinceMidnight += currentMinutesSinceMidnight * clock.dayMinutes;
    }

    this.config.variableStorage.set("time", `${minutesSinceMidnight}`);

    this.config.clock.setTime(minutesSinceMidnight);
  },

  /** @deprecated */
  advanceTime(
    time: clock.ResolvableTime,
    maxTime?: clock.ResolvableTime,
    stepTime?: clock.ResolvableTime
  ) {
    console.warn(
      "<<advanceTime>> is deprecated. Use <<advanceTimeBy>> or <<advanceTimeTo>> instead"
    );

    const [, , minutesToAdvance] = clock.parseTime(time);

    let minutesToStop, minutesStep;
    if (maxTime) {
      minutesToStop = clock.parseTime(maxTime)[2];
      minutesStep = clock.parseTime(stepTime)[2];
    }

    const minutesSinceMidnight = Number(
      this.config.variableStorage.get("time")
    );
    let newMinutes = minutesSinceMidnight + minutesToAdvance;
    minutesToStop +=
      Math.floor(minutesSinceMidnight / clock.dayMinutes) * clock.dayMinutes;

    // Cut the time if it goes over restriction
    while (newMinutes - minutesStep >= minutesToStop) newMinutes -= minutesStep;

    this.config.variableStorage.set("time", `${newMinutes}`);

    this.config.clock.advanceTime(newMinutes);
  },

  /**
   * Makes time clock forward by a certain amount.
   * Automatically adjusts food and sleep meters
   */
  advanceTimeBy(time: clock.ResolvableTime, ...gaugesToIgnore: string[]) {
    const [, , minutesToAdvance] = clock.parseTime(time);

    const minutesSinceMidnight = Number(
      this.config.variableStorage.get("time")
    );
    const newMinutes = minutesSinceMidnight + minutesToAdvance;

    this.config.variableStorage.set("time", `${newMinutes}`);

    this.config.clock.advanceTime(newMinutes);
    this.simulateGauges(minutesToAdvance, gaugesToIgnore);
  },

  /** Makes the clock move forward until a certain time */
  advanceTimeUntil(time: clock.ResolvableTime, ...gaugesToIgnore: string[]) {
    const oldMinutesSinceMidnight = Number(
      this.config.variableStorage.get("time")
    );
    let [, , newMinutesSinceMidnight] = clock.parseTime(time);

    // OPT: This loop is inefficient but won't be called more than 7 times in the current scenario
    while (newMinutesSinceMidnight <= oldMinutesSinceMidnight) {
      // Must have gone to the next day
      newMinutesSinceMidnight += clock.dayMinutes;
    }

    this.config.variableStorage.set("time", `${newMinutesSinceMidnight}`);

    this.config.clock.advanceTime(newMinutesSinceMidnight);

    const minutesToAdvance = newMinutesSinceMidnight - oldMinutesSinceMidnight;
    this.simulateGauges(minutesToAdvance, gaugesToIgnore);
  },

  hideClock() {
    this.config.clock.hidden = true;
  },

  showClock() {
    this.config.clock.hidden = false;
  },

  // GAUGES

  showGauges(...gaugesName: string[]) {
    this.graphics.toggleGauges(true, ...gaugesName);
  },

  hideGauges(...gaugesName: string[]) {
    this.graphics.toggleGauges(false, ...gaugesName);
  },

  setGauge<VarName extends keyof variable.Gauges>(
    gaugeName: VarName,
    value: variable.Gauges[VarName]
  ) {
    this.config.variableStorage.set(gaugeName, `${value}`);
    this.graphics.setGauge(gaugeName, Number(value));
  },

  addToGauge<VarName extends keyof variable.Gauges>(
    gaugeName: VarName,
    value: variable.Gauges[VarName]
  ) {
    let oldValue = this.config.variableStorage.get(gaugeName);
    const newValue = Math.min(Number(oldValue) + Number(value), 100);
    this.config.variableStorage.set(gaugeName, `${newValue}`);
  },

  removeFromGauge<VarName extends keyof variable.Gauges>(
    gaugeName: VarName,
    value: variable.Gauges[VarName]
  ) {
    let oldValue = this.config.variableStorage.get(gaugeName);
    const newValue = Math.max(Number(oldValue) - Number(value), 0);
    this.config.variableStorage.set(gaugeName, `${newValue}`);
  },

  saveGauges<VarName extends keyof variable.Gauges>(...names: VarName[]) {
    savedGauges.clear();
    names.forEach((name) => {
      savedGauges.set(name, Number(this.config.variableStorage.get(name)));
    });
  },

  loadGauges() {
    savedGauges.forEach((id, key) => {
      this.config.variableStorage.set(key, `${savedGauges.get(key)}`);
    });
  },

  // MUSIC FX

  music(musicName?: string) {
    this.graphics.graphicsState.lastMusic = musicName;
    this.config.jukebox.play(musicName);
  },

  fx(fxName: string) {
    this.config.fxMachine.play(fxName);
  },

  loopFX(fxName: `${string}_LOOP`, loopDuration: `${number}`) {
    const duration = Number(loopDuration);

    if (fxLoops.has(fxName))
      return console.warn(`${fxName} fx is already activated`);

    const loop = this.makeFxLoop(fxName, duration);

    this.activate(loop);

    fxLoops.set(fxName, loop);
  },

  stopFX(fxName: `${string}_LOOP`) {
    const loop = fxLoops.get(fxName);

    if (loop) {
      this.deactivate(loop);
      fxLoops.delete(fxName);
      this.config.fxMachine.stop(fxName);
    } else {
      console.warn(`${fxName} fx is already deactivated`);
    }
  },

  // FADES

  fadeIn(duration: `${number}` = "500", hexColor: string = "#00000") {
    const color = "#" + hexColor.replace(/^(?:0x|#)/, "");
    return this.graphics.fadeIn(Number(duration), color);
  },

  fadeOut(duration: `${number}` = "500") {
    return this.graphics.fadeOut(Number(duration));
  },

  // fade(duration: `${number}` = "1000", hexColor: string = "#00000") {
  //   const color = "#" + hexColor.replace(/^(?:0x|#)/, "");
  //   this.graphics.fade(Number(duration), color);
  // },

  setBackground(name: string, mood?: string) {
    this.graphics.setBackground(name, mood);
  },

  // NODE INFO

  /**
   * Mark a node as visited
   * @param node Node to mark as visited
   */
  visit(node: string) {
    if (!node || node.includes('"'))
      throw new Error("Please give a valid node title in << visit >>");

    this.visited.add(node);
  },

  /**
   * Mark a node as visited permanently
   * @param node Node to mark as visited
   */
  visitPermanent(node: string) {
    if (!node || node.includes('"'))
      throw new Error("Please give a valid node title in << visitPermanent >>");

    this.visitedPermanent.add(node);
  },

  resetLevel() {
    this.selectedOptions = [];
    this.visited = new Set();
  },

  minigame(className: string) {
    this.disable();
    this.activate(
      new entity.EntitySequence([
        // @ts-ignore
        new miniGame[className](),
        new entity.FunctionCallEntity(() => {
          this.enable();
        }),
      ]),
      entity.extendConfig({
        // @ts-ignore
        container: this.graphics._miniGameLayer,
      })
    );
  },

  showJournal(name: string): void {
    if (!name) {
      throw new Error("Missing argument journal name");
    }

    this.graphics.setBackground("bedroom", "night");

    this.disable();
    this.activate(
      new entity.EntitySequence([
        new journal.JournalScene(name),
        new entity.FunctionCallEntity(() => {
          // Restore background
          this.graphics.setBackground(
            this.graphics.graphicsState.lastBg,
            this.graphics.graphicsState.lastBgMood
          );
          this.enable();
        }),
      ])
    );
  },

  showTitle(...words: string[]): entity.Entity {
    const text = words.join(" ");
    return new title.Title(text);
  },

  empty() {},
};

export const functions: Record<string, YarnFunction> = {
  visited(...nodes: string[]): boolean {
    if (nodes.length === 0)
      throw new Error("Please give valid nodes titles in visited()");

    return nodes.every(
      (node) => this.visited.has(node) || this.visitedPermanent.has(node)
    );
  },

  getGauge(gauge: string): number {
    return this.graphics.getGaugeValue(gauge);
  },

  // save() {
  //   save.save(this);
  // },

  // resetSave() {
  //   save.deleteSave();
  // },

  // hasSave(): boolean {
  //   return save.hasSave();
  // },

  isTimeOver(time: clock.ResolvableTime, day?: string): boolean {
    let [, , minutesSinceMidnight] = clock.parseTime(time);
    const currentMinutesSinceMidnight = Math.floor(
      Number(this.config.variableStorage.get("time"))
    );

    let nbrDay = Number(day);

    if (day === undefined) {
      nbrDay = Math.floor(currentMinutesSinceMidnight / clock.dayMinutes);
    }

    minutesSinceMidnight += clock.dayMinutes * nbrDay;
    return currentMinutesSinceMidnight >= minutesSinceMidnight;
  },
};
