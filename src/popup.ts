import * as _ from "underscore";

import * as PIXI from "pixi.js";
import { GlitchFilter } from "@pixi/filter-glitch";
import { CRTFilter } from "pixi-filters";

import * as entity from "booyah/src/entity";

import * as extension from "./extension";
import * as variable from "./variable";

abstract class Popup extends extension.ExtendedCompositeEntity {
  private _glitch: PIXI.Filter & GlitchFilter;
  private _holo: PIXI.Filter & CRTFilter;

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

    this._okButton = new PIXI.Container();
    {
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

    this._glitchSetup();
  }

  _teardown(): void {
    this.config.container.removeChild(this._container);
    this._container = undefined;
  }

  _glitchSetup(): void {
    this._glitch = new GlitchFilter({
      red: [0, 0],
      blue: [0, 0],
      green: [0, 0],
      offset: 0,
      slices: 10,
    }) as any;
    this._holo = new CRTFilter({
      curvature: 0,
      lineWidth: 0.5,
      lineContrast: 0.3,
      noise: 0.15,
    }) as any;

    this._container.filters = [this._glitch, this._holo];

    const shifting = 5;
    const frequency = 2000;

    this._activateChildEntity(
      new entity.FunctionalEntity({
        update: () => {
          this._holo.seed = Math.random();
          this._holo.time = (this._holo.time + 0.1) % 20;
        },
      })
    );

    this._activateChildEntity(
      new entity.EntitySequence(
        [
          () =>
            new entity.WaitingEntity(
              Math.floor(10 + Math.random() * frequency)
            ),
          () =>
            new entity.FunctionCallEntity(() => {
              this._glitch.red = [
                Math.floor(Math.random() * shifting),
                Math.floor(Math.random() * shifting),
              ];
              this._glitch.green = [
                Math.floor(Math.random() * shifting),
                Math.floor(Math.random() * shifting),
              ];
              this._glitch.offset = Math.floor(1 + Math.random() * 2);
              this._glitch.slices = Math.floor(10 + Math.random() * 15);
            }),
          () =>
            new entity.WaitingEntity(
              Math.floor(10 + Math.random() * (frequency / 4))
            ),
          () =>
            new entity.FunctionCallEntity(() => {
              this._glitch.red = [0, 0];
              this._glitch.green = [0, 0];
              this._glitch.offset = 0;
            }),
        ],
        {
          loop: true,
        }
      )
    );
  }
}

export class Confirm extends Popup {
  private _cancelButton: PIXI.Container;
  private _msgBox: PIXI.Container;

  public constructor(
    public readonly _message: string,
    readonly _callback: () => unknown
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
      this._transition = entity.makeTransition();
    });

    this._on(this._okButton, "pointerup", () => {
      this._transition = entity.makeTransition();
      this._callback();
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
