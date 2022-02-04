import * as dialog from "./dialog";
import * as variable from "./variable";
import * as clock from "./clock";
import * as save from "./save";
import * as entity from "booyah/src/entity";

export type Command = (this: dialog.DialogScene, ...args: string[]) => unknown;
export type YarnFunction = (
  this: dialog.DialogScene,
  ...args: any[]
) => unknown;

export const fxLoops: Map<string, entity.EntitySequence> = new Map();

export const commands: Record<string, Command> = {
  // Shortcut for _changeCharacter()
  show(character: string): void {
    this.graphics.addCharacter(character);
  },

  // Shortcut for _changeCharacter()
  hide(): void {
    this.graphics.removeCharacters();
    //this.graphics.addCharacter();
  },

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
    this.config.variableStorage.set(
      varName,
      value || (_default.replace(/_/g, " ") as any)
    );
  },

  eval(code: string) {
    const evaluated = eval(code);
    this.config.variableStorage.set("eval", evaluated);
  },

  setTime(time: clock.ResolvableTime) {
    let [, , minutesSinceMidnight] = clock.parseTime(time);

    while (minutesSinceMidnight >= clock.dayMinutes)
      minutesSinceMidnight -= clock.dayMinutes;

    this.config.variableStorage.set("time", `${minutesSinceMidnight}`);

    this.config.clock.minutesSinceMidnight = minutesSinceMidnight;
  },

  advanceTime(
    time: clock.ResolvableTime,
    maxTime?: clock.ResolvableTime,
    stepTime?: clock.ResolvableTime
  ) {
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

    // Cut the time if it goes over restriction
    while (newMinutes - minutesStep > minutesToStop) newMinutes -= minutesStep;

    // Cut the time if it goes over one day
    while (newMinutes >= clock.dayMinutes) newMinutes -= clock.dayMinutes;

    this.config.variableStorage.set("time", `${newMinutes}`);

    this.activate(this.config.clock.advanceTime(newMinutes));
  },

  hideClock() {
    this.config.clock.hidden = true;
  },

  showClock() {
    this.config.clock.hidden = false;
  },

  setGauge<VarName extends keyof variable.Gauges>(
    gaugeName: VarName,
    value: variable.Gauges[VarName]
  ) {
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

  music(musicName: string) {
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

  showGauges(...gaugesName: string[]) {
    this.graphics.toggleGauges(true, ...gaugesName);
  },

  hideGauges(...gaugesName: string[]) {
    gaugesName.pop();
    this.graphics.toggleGauges(false, ...gaugesName);
  },

  fadeIn(duration: `${number}` = "1000", hexColor: string = "#00000") {
    const color = "#" + hexColor.replace(/^(?:0x|#)/, "");
    this.activate(this.graphics.fadeIn(Number(duration), color));
  },

  fadeOut(duration: `${number}` = "1000") {
    this.activate(this.graphics.fadeOut(Number(duration)));
  },

  setBackground(name: string) {
    const [bg, mood] = name.split("_");
    this.graphics.setBackground(bg, mood);
  },

  empty() {},

  /**
   * Mark a node as visited
   * @param node Node to mark as visited
   */
  visit(node: string = this.metadata.title) {
    this.visited.add(node);
  },
};

export const functions: Record<string, YarnFunction> = {
  isFirstTime(node: string = this.metadata.title): boolean {
    const visited = this.visited.has(node);
    console.log(node, "isFirstTime?", !visited);
    return !visited;
  },
  visited(node: string = this.metadata.title): boolean {
    const visited = this.visited.has(node);
    console.log(node, "visited?", visited);
    return visited;
  },
  getGauge(gauge: string): number {
    return this.graphics.getGaugeValue(gauge);
  },
  save() {
    save.save(this.stateName);
  },
  resetSave() {
    save.save();
  },
  hasSave(): boolean {
    return save.hasSave();
  },
};
