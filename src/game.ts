import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";
import { util } from "prettier";

// Bondage is loaded as global variable
declare const bondage: any;

class MainScene extends entity.EntityBase {
  private _runner: any;
  private _nodeIterator: any;
  private _nodeValue: any;

  private _container: PIXI.Container;
  private _background: PIXI.Graphics;
  private _nodeDisplay: PIXI.DisplayObject;

  private _setup(): void {
    this._container = new PIXI.Container();
    this._entityConfig.container.addChild(this._container);

    this._background = new PIXI.Graphics();
    this._container.addChild(this._background);
    this.changeBackground("0x0");

    this._runner = new bondage.Runner();
    this._runner.load(this.entityConfig.jsonAssets["script"]);

    // Advance the dialogue manually from the node titled 'Start'
    this._nodeIterator = this._runner.run("Start");
    this._advance();
  }

  private _advance(): void {
    if (this._nodeDisplay) this._container.removeChild(this._nodeDisplay);
    this._nodeDisplay = null;

    this._nodeValue = this._nodeIterator.next().value;
    // If result is undefined, stop here
    if (!this._nodeValue) {
      console.log("Reached end");
      this._transition = entity.makeTransition();
      return;
    }

    console.log("nodeValue", this._nodeValue);
    console.log("tags", this._nodeValue.data.tags);
    console.log("data", this._runner.variables.data);

    if (this._nodeValue instanceof bondage.TextResult) {
      console.log("text result", this._nodeValue.text);

      this._nodeDisplay = new PIXI.Text(this._nodeValue.text, {
        fill: "white",
      });
      this._nodeDisplay.interactive = true;
      this._nodeDisplay.buttonMode = true;
      this._on(this._nodeDisplay, "pointerup", this._advance);
      this._container.addChild(this._nodeDisplay);
    } else if (this._nodeValue instanceof bondage.OptionsResult) {
      // This works for both links between nodes and shortcut options
      console.log("options result", this._nodeValue.options);

      this._nodeDisplay = new PIXI.Container();
      this._container.addChild(this._nodeDisplay);

      for (let i = 0; i < this._nodeValue.options.length; i++) {
        const optionText = new PIXI.Text(this._nodeValue.options[i], {
          fill: "yellow",
        });
        optionText.position.set(10, 20 + i * 40);
        optionText.interactive = true;
        optionText.buttonMode = true;
        this._on(optionText, "pointerup", () => {
          this._nodeValue.select(i);
          this._advance();
        });
        (this._nodeDisplay as PIXI.Container).addChild(optionText);
      }
      // Select based on the option's index in the array (if you don't select an option, the dialog will continue past them)
      // this._nodeValue.select(1);
    } else if (this._nodeValue instanceof bondage.CommandResult) {
      // If the text was inside <<here>>, it will get returned as a CommandResult string, which you can use in any way you want
      console.log("command result", this._nodeValue.text);
      this._handleCommand(this._nodeValue.text);
    } else {
      throw new Error(`Unknown bondage result ${this._nodeValue}`);
    }
  }

  private _handleCommand(command: string): void {
    const commandParts = command.split(" ");

    // Attempt to call a method based on the command
    if (!(commandParts[0] in this)) {
      throw new Error(`No matching command "${commandParts[0]}"`);
    }

    // @ts-ignore
    this[commandParts[0]](...commandParts.slice(1));

    this._advance();
  }

  changeBackground(color: string): void {
    const colorAsNumber = parseInt(color);

    this._background.beginFill(colorAsNumber);
    this._background.drawRect(
      0,
      0,
      this._entityConfig.app.screen.width,
      this._entityConfig.app.screen.height
    );
    this._background.endFill();
  }
}

const states: { [k: string]: entity.EntityResolvable } = {
  start: new MainScene(),
};

const transitions = {
  start: entity.makeTransition("end"),
};

const jsonAssets = [{ key: "script", url: "text/script.json" }];

booyah.go({
  states,
  transitions,
  jsonAssets,
});
