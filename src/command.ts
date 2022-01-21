import * as dialog from "./dialog";
import * as variable from "./variable";
import * as images from "./images";
import * as clock from "./clock";
import * as entity from "booyah/src/entity";

export type Command = (this: dialog.DialogScene, ...args: string[]) => unknown;

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
    this._variableStorage.set(
      varName,
      value || (_default.replace(/_/g, " ") as any)
    );
  },

  eval(code: string) {
    const evaluated = eval(code);
    this.variableStorage.set("eval", evaluated);
  },

  setTime(time: clock.ResolvableTime) {
    let [, , minutesSinceMidnight] = clock.parseTime(time);

    while (minutesSinceMidnight >= clock.dayMinutes)
      minutesSinceMidnight -= clock.dayMinutes;

    this.variableStorage.set("time", `${minutesSinceMidnight}`);

    this.clock.minutesSinceMidnight = minutesSinceMidnight;
  },

  advanceTime(time: clock.ResolvableTime) {
    const [, , minutesToAdvance] = clock.parseTime(time);
    const minutesSinceMidnight = Number(this.variableStorage.get("time"));
    let newMinutes = minutesSinceMidnight + minutesToAdvance;

    while (newMinutes >= clock.dayMinutes) newMinutes -= clock.dayMinutes;

    this.variableStorage.set("time", `${newMinutes}`);

    this.activate(this.clock.advanceTime(time));
  },

  hideClock() {
    this.clock.hidden = true;
  },

  showClock() {
    this.clock.hidden = false;
  },

  setGauge<VarName extends keyof variable.Gauges>(
    gaugeName: VarName,
    value: variable.Gauges[VarName]
  ) {
    this.variableStorage.set(gaugeName, value);
  },

  addToGauge<VarName extends keyof variable.Gauges>(
    gaugeName: VarName,
    value: variable.Gauges[VarName]
  ) {
    let oldValue = this.variableStorage.get(gaugeName);
    const newValue = Math.min(Number(oldValue) + Number(value), 100);
    this.variableStorage.set(gaugeName, `${newValue}`);
  },

  removeFromGauge<VarName extends keyof variable.Gauges>(
    gaugeName: VarName,
    value: variable.Gauges[VarName]
  ) {
    let oldValue = this.variableStorage.get(gaugeName);
    const newValue = Math.max(Number(oldValue) - Number(value), 0);
    this.variableStorage.set(gaugeName, `${newValue}`);
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
    gaugesName.pop();
    this.graphics.toggleGauges(true, ...gaugesName);
  },

  hideGauges(...gaugesName: string[]) {
    gaugesName.pop();
    this.graphics.toggleGauges(false, ...gaugesName);
  },

  fadeIn(duration: `${number}` = "1000", hexColor: string = "#00000") {
    const color = "#" + hexColor.replace(/^(?:0x|#)/, "");
    this.graphics.fadeIn(Number(duration), color);
  },

  fadeOut(duration: `${number}` = "1000") {
    this.graphics.fadeOut(Number(duration));
  },
};