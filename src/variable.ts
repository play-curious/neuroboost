import * as PIXI from "pixi.js";

export interface Variables {
  time: `${number}`;
  name: string;
  eval: string;
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

  set<VarName extends keyof Variables>(
    name: VarName,
    value: Variables[VarName]
  ) {
    this._data[name] = value;
    this.emit("change", name, value);
    this.emit(`change:${name}`, value);
  }

  get<VarName extends keyof Variables>(name: VarName): Variables[VarName] {
    return this._data[name];
  }

  get data(): Variables {
    return this._data;
  }
}
