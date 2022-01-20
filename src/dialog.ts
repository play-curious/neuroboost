import * as _ from "underscore";

import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";

import * as clock from "./clock";
import * as command from "./command";
import * as variable from "./variable";
import * as graphics from "./graphics";
import * as extension from "./extension";

// Bondage is loaded as a global variable
declare const bondage: any;

interface NodeData {
  title: string;
  tags: string[];
  body: string;
}

interface TextNode {
  data: NodeData;
  lineNum: number;
  text: string;
}

interface ChoiceNode {
  lineNum: number[];
  options: string[];
  selected: number;
  data: NodeData;
  select: (i: number) => void;
}

type Node = TextNode | ChoiceNode;

export class DialogScene extends extension.ExtendedCompositeEntity {
  private _nodeIterator: any;
  private _nodeValue: Node;
  private _lastNodeData: NodeData;
  private _autoshowOn: boolean;
  private _previousNodeDatas: NodeData[];

  public graphics: graphics.Graphics;

  constructor(
    public readonly scriptName: string,
    public readonly startNode = "Start",
    private _runner: any,
    public readonly variableStorage: variable.VariableStorage,
    public readonly clock: clock.Clock
  ) {
    super();
  }

  _setup(): void {
    command.fxLoops.clear();

    this._autoshowOn = false;
    this._previousNodeDatas = [];

    // Setup graphics
    this.graphics = new graphics.Graphics(this.variableStorage.data);
    this._activateChildEntity(
      this.graphics,
      entity.extendConfig({ container: this.config.container })
    );

    // Setup clock
    this._activateChildEntity(
      this.clock,
      entity.extendConfig({ container: this.graphics.getUi() })
    );
    this.clock.minutesSinceMidnight = Number(this.variableStorage.get("time"));

    this._runner.registerFunction("isFirstTime", (data: any) => {
      for (const nodeData of this._previousNodeDatas) {
        if (!nodeData) continue;
        if (nodeData.title == data.title) return false;
      }
      return true;
    });
    this._runner.registerFunction("getGauge", (data: any, gauge: string) => {
      return this.graphics.getGaugeValue(gauge);
    });
    this._runner.load(this.entityConfig.jsonAssets[this.scriptName]);

    // Advance the dialogue manually from the node titled 'Start'
    this._nodeIterator = this._runner.run(this.startNode);
    this._advance();
  }

  _onSignal(frameInfo: entity.FrameInfo, signal: string, data?: any) {
    if (signal === "gainedVisibility") {
      booyah.changeGameState("playing");
    }
  }

  private _hasTag(nodeData: NodeData, tag: string): boolean {
    return nodeData.tags.includes(tag);
  }

  private _advance(): void {
    this.graphics.hideNode();
    this.graphics.showDialogLayer();

    this._nodeValue = this._nodeIterator.next().value;
    // If result is undefined, stop here
    if (!this._nodeValue) {
      this._transition = entity.makeTransition();
      return;
    }

    // Check if the node data has changed
    if (
      "data" in this._nodeValue &&
      this._nodeValue.data.title !== this._lastNodeData?.title
    ) {
      this._onChangeNodeData(this._lastNodeData, this._nodeValue.data);
      this._previousNodeDatas.push(this._lastNodeData);
      this._lastNodeData = this._nodeValue.data;
    }

    if (this._nodeValue instanceof bondage.TextResult) {
      this._handleDialog((this._nodeValue as TextNode).text);
    } else if (this._nodeValue instanceof bondage.OptionsResult) {
      if (this._hasTag(this._nodeValue.data, "freechoice")) {
        this._handleFreechoice(
          this._nodeValue.data.title,
          this._nodeValue as ChoiceNode
        );
      } else {
        this._handleChoice(this._nodeValue as ChoiceNode);
      }
    } else if (this._nodeValue instanceof bondage.CommandResult) {
      this._handleCommand((this._nodeValue as TextNode).text);
    } else {
      throw new Error(`Unknown bondage result ${this._nodeValue}`);
    }
  }

  private _handleDialog(text: string) {
    this.graphics.showDialog(
      text,
      this.variableStorage.get("name"),
      this._autoshowOn,
      this._advance.bind(this)
    );
  }

  private _handleChoice(nodeValue: ChoiceNode) {
    this.graphics.setChoice(
      nodeValue.options,
      (id) => {
        nodeValue.select(id);
        this.config.fxMachine.play("Click");
        this._advance();
      },
      this._hasTag(nodeValue.data, "subchoice")
        ? () => {
            this._nodeIterator = this._runner.run(
              _.last(this._previousNodeDatas).title
            );
            this.config.fxMachine.play("Click");
            this._advance();
          }
        : undefined
    );
  }

  private _handleCommand(cmd: string): void {
    // If the text was inside <<here>>, it will get returned as a CommandResult string, which you can use in any way you want
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

  // TODO: Freechoice
  private _handleFreechoice(freechoice: string, nodeValue: ChoiceNode) {
    this.graphics.setFreechoice(nodeValue.options, (id) => {
      nodeValue.select(id);
      this.config.fxMachine.play("Click");
      this._advance();
    });
  }

  private _onChangeNodeData(oldNodeData: NodeData, newNodeData: NodeData) {
    //console.log("changing node data", oldNodeData, " --> ", newNodeData);

    // Parse tags

    // By default, autoshow is off
    this._autoshowOn = false;

    let bg: string;
    let character: string;
    for (let tag of newNodeData.tags) {
      tag = tag.trim();
      if (tag === "") continue;

      if (tag.startsWith("bg:")) {
        if (bg) console.warn("Trying to set background twice");

        bg = tag.split(":")[1].trim();
      } else if (tag.startsWith("show:")) {
        if (character) console.warn("Trying to set character twice");

        character = tag.split(":")[1].trim();
      } else if (tag === "autoshow") {
        this._autoshowOn = true;
      } else {
        console.warn("Unknown tag in node data", tag);
      }
    }

    if (bg) this.graphics.setBackground(bg);
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
