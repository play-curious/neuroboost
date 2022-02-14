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
export const savedGauges: Map<keyof variable.Gauges, number> = new Map();

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

  setTime(time: clock.ResolvableTime, day?: string) {
    let [, , minutesSinceMidnight] = clock.parseTime(time);
    if(day){
      minutesSinceMidnight += Number(day) * clock.dayMinutes;
    } else {
      const currentMinutesSinceMidnight = Math.floor(Number(
        this.config.variableStorage.get("time")
      ) / clock.dayMinutes);
      minutesSinceMidnight += currentMinutesSinceMidnight * clock.dayMinutes;
    }
    console.log("MinutesSinceMidnight", minutesSinceMidnight);
    this.config.variableStorage.set("time", `${minutesSinceMidnight}`);

    this.config.clock.setTime(minutesSinceMidnight);
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
    minutesToStop += Math.floor(minutesSinceMidnight / clock.dayMinutes) * clock.dayMinutes;

    // Cut the time if it goes over restriction
    while (newMinutes - minutesStep >= minutesToStop) newMinutes -= minutesStep;

    this.config.variableStorage.set("time", `${newMinutes}`);

    this.config.clock.advanceTime(newMinutes);
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

  saveGauges<VarName extends keyof variable.Gauges>(...names: VarName[]) {
    savedGauges.clear();
    names.forEach( name => {
      console.log(`save ${name}`);
      savedGauges.set(name, Number(this.config.variableStorage.get(name)));
    });
  },

  loadGauges() {
    savedGauges.forEach( (id, key) => {
      console.log(`load ${key}`);
      this.config.variableStorage.set(key, `${savedGauges.get(key)}`);
    });
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
  visit(node: string) {
    if (!node || node.includes('"'))
      throw new Error("Please give a valid node title in << visit >>");
    this.visited.add(node);
  },

  clearOnce(){
    this.selectedOptions = [];
  }
};

export const functions: Record<string, YarnFunction> = {
  visited(node: string): boolean {
    if (!node) throw new Error("Please give a valid node title in visited()");
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

  isTimeOver(time: clock.ResolvableTime, day?: string): boolean {
    debugger;
    let [, , minutesSinceMidnight] = clock.parseTime(time);
    const currentMinutesSinceMidnight = Math.floor(Number(
      this.config.variableStorage.get("time")
    ));
    
    let nbrDay = Number(day);

    if(day === undefined){
      nbrDay = Math.floor(currentMinutesSinceMidnight / clock.dayMinutes);
    }

    minutesSinceMidnight += clock.dayMinutes * nbrDay;
    return currentMinutesSinceMidnight >= minutesSinceMidnight;
  }
};
