import * as _ from "underscore";

import * as PIXI from "pixi.js";
import * as filter from "./graphics_filter";

import * as entity from "booyah/src/entity";

import * as extension from "./extension";
import * as variable from "./variable";

abstract class Popup extends extension.ExtendedCompositeEntity {
  private _glitch: filter.Glitch;
  private _holo: filter.Holograph;

  protected _container: PIXI.Container;
  protected _okButton: PIXI.Container;

  protected _containerOffset: number;

  public constructor(public readonly _callback: (...args: any) => unknown) {
    super();
  }

  _setup(): void {
    this._containerOffset = 70;
    this._container = new PIXI.Container();
    this._container.position.x = this._containerOffset;
    this._container.interactive = true;
    const blackBackground = new PIXI.Graphics()
      .beginFill(0x333333, 0.8)
      .drawRect(0 - this._containerOffset, 0, variable.width, variable.height)
      .endFill();
    blackBackground.alpha = 1;
    this._container.addChild(
      blackBackground,
      this.makeSprite("images/ui/popup/background.png"),
      this.makeSprite("images/ui/popup/ok_button.png")
    );

    {
      this._okButton = new PIXI.Container();
      this._okButton.position.set(1203, 540);
      this._okButton.hitArea = new PIXI.Rectangle(0, 0, 262, 75);
      this._okButton.interactive = true;
      this._okButton.buttonMode = true;
      this._okButton.addChild(
        this.makeText(
          "OK",
          {
            fontFamily: "Jura",
            fill: "white",
            fontSize: 50,
            //fontWeight: "bold"
          },
          (it) => {
            it.anchor.set(0.5);
            it.position.set(131, 37);
          }
        )
      );
      this._container.addChild(this._okButton);
    }

    this.config.container.addChild(this._container);

    this._glitch = filter.newGlitch();
    this._holo = filter.newHolograph();
    this._container.filters = [this._glitch, this._holo];
    this._activateChildEntity(filter.wrapHolograph(this._holo));
    this._activateChildEntity(filter.wrapGlitch(this._glitch));
  }

  _teardown(): void {
    this.config.container.removeChild(this._container);
    this._container = undefined;
  }
}

export class Confirm extends Popup {
  private _cancelButton: PIXI.Container;
  private _msgBox: PIXI.Container;

  public constructor(
    public readonly _message: string,
    readonly _callback: (validated: boolean) => unknown
  ) {
    super(_callback);
  }

  _setup(): void {
    super._setup();

    this._container.addChild(
      this.makeSprite("images/ui/popup/cancel_button.png")
    );

    this._msgBox = new PIXI.Container();
    this._msgBox.addChild(
      this.makeText(
        this._message,
        {
          fontFamily: "Jura",
          fill: "white",
          fontSize: 50,
          fontWeight: "bold",
          wordWrap: true,
          wordWrapWidth: 1261,
        },
        (it) => {
          it.anchor.set(0, 0.5);
          it.position.set(241, 416);
        }
      )
    );
    this._container.addChild(this._msgBox);

    this._cancelButton = new PIXI.Container();
    {
      this._cancelButton.position.set(872, 540);
      this._cancelButton.hitArea = new PIXI.Rectangle(0, 0, 262, 75);
      this._cancelButton.interactive = true;
      this._cancelButton.buttonMode = true;
      this._cancelButton.addChild(
        this.makeText(
          "Annuler",
          {
            fontFamily: "Jura",
            fill: "white",
            fontSize: 50,
            //fontWeight: "bold"
          },
          (it) => {
            it.anchor.set(0.5);
            it.position.set(131, 37);
          }
        )
      );
      this._container.addChild(this._cancelButton);
    }
    this._on(this._cancelButton, "pointerup", () => {
      this.config.fxMachine.play("Click");

      this._transition = entity.makeTransition();
      this._callback(false);
    });

    this._on(this._okButton, "pointerup", () => {
      this.config.fxMachine.play("Click");

      this._transition = entity.makeTransition();
      this._callback(true);
    });
  }
}

export class Prompt extends Popup {
  private _msgBox: PIXI.Container;
  private _textInput: HTMLInputElement;

  public constructor(
    public readonly _message: string,
    readonly _callback: (text: string) => unknown,
    public readonly _placeholder?: string
  ) {
    super(_callback);
  }

  _setup(): void {
    super._setup();

    this._container.addChild(this.makeSprite("images/ui/popup/textarea.png"));

    this._msgBox = new PIXI.Container();
    this._msgBox.addChild(
      this.makeText(
        this._message,
        {
          fontFamily: "Jura",
          fill: "white",
          fontSize: 50,
          fontWeight: "bold",
          wordWrap: true,
          wordWrapWidth: 1261,
        },
        (it) => {
          it.anchor.set(0, 0.5);
          it.position.set(241, 366);
        }
      )
    );
    this._container.addChild(this._msgBox);

    this._textInput = document.createElement("input");
    {
      document.getElementById("html-layer").append(this._textInput);
      this._textInput.setAttribute("type", "text");
      this._textInput.setAttribute("maxlength", "14");
      this._textInput.onkeydown = (ev) => {
        return /[a-z]/i.test(ev.key);
      };
      this._textInput.style.position = "absolute";
      this._textInput.style.left = `${330 + this._containerOffset}px`;
      this._textInput.style.top = "428px";
      this._textInput.style.width = "1137px";
      this._textInput.style.height = "71px";
      this._textInput.style.fontSize = "50px";
      this._textInput.style.fontFamily = "Ubuntu";
      this._textInput.style.color = "white";
      this._textInput.style.border = "none";
      this._textInput.style.borderRadius = "2%";
      this._textInput.style.background = "transparent";
      this._textInput.style.resize = "none";

      this._on(this._okButton, "pointerup", () => {
        const textContent = this._textInput.value;
        this._transition = entity.makeTransition();
        this._callback(textContent);
      });
    }
  }

  _teardown(): void {
    this._textInput.remove();
    super._teardown();
  }
}
