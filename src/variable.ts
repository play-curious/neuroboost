import * as PIXI from "pixi.js";

export const width = 1920;
export const height = 1080;

export interface Variables extends Gauges {
  time: `${number}`;
  name: string;
  eval: string;
}

export interface Gauges {
  sleep: `${number}`;
  food: `${number}`;
  learning: `${number}`;
  mentalLoad: `${number}`;
  stress: `${number}`
}

/**
 * Variable Storage for YarnSpinner that emits events when data changes
 * Can be initialized with data
 *
 * Emits:
 * - change(name : string, value : string)
 * - change:${name}(value : string)
 */
export class VariableStorage extends PIXI.utils.EventEmitter {
  constructor(private _data: Variables) {
    super();
  }

  listen<VarName extends keyof Variables>(
    event: "change" | `change:${VarName}`,
    fn: (value: Variables[VarName]) => unknown
  ): this {
    this.on(event, fn);
    return this;
  }

  set<VarName extends keyof Variables>(
    name: VarName,
    value: Variables[VarName]
  ) {
    console.log("SET", name, value);
    this._data[name] = value;
    this.emit("change", name, value);
    this.emit(`change:${name}`, value);
  }

  get<VarName extends keyof Variables>(name: VarName): Variables[VarName] {
    console.log("GET", name, this._data[name]);
    return this._data[name];
  }

  get data(): Variables {
    return this._data;
  }
}
