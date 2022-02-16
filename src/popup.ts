import * as _ from "underscore";
import * as PIXI from "pixi.js";

import * as extension from "./extension";
import * as variable from "./variable";

abstract class Popup extends extension.ExtendedCompositeEntity {
    protected _container: PIXI.Container;
    // private _textArea: PIXI.Container;
    protected _okButton: PIXI.Container;

    public constructor(
        public readonly _callback: () => unknown
    ){
        super();
    }

    _setup(): void {
        const containerOffset = 70;
        this._container = new PIXI.Container();
        this._container.position.x = containerOffset;
        this._container.interactive = true;
        const blackBackground = new PIXI.Graphics()
            .beginFill(0x333333, 0.8)
            .drawRect(0-containerOffset, 0, variable.width, variable.height)
            .endFill();
        blackBackground.alpha = 1;
        this._container.addChild(
            blackBackground,
            this.makeSprite("images/ui/popup/background.png"),
            // this.makeSprite("images/ui/popup/textarea.png"),
            this.makeSprite("images/ui/popup/ok_button.png")
        );

        

        // this._textArea = new PIXI.Container;
        // {
        //     this._textArea.position.set(324, 425);
        //     this._textArea.hitArea = new PIXI.Rectangle(0, 0, 1141, 75);
        //     this._textArea.interactive = true;
        //     this._textArea.buttonMode = true;
        //     this._container.addChild(this._textArea);
        // }
        
        this._okButton = new PIXI.Container;
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
            )
            this._container.addChild(this._okButton);
        }
        this._on(this._okButton, "pointerup", () => {
            this._teardown();
            this._callback();
        });

        this.config.container.addChild(this._container);
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
        public readonly _callback: () => unknown
    ){
        super(_callback);
    }

    _setup(): void {
        super._setup();
        
        this._container.addChild(
            this.makeSprite("images/ui/popup/cancel_button.png"),
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
                  wordWrapWidth: 1301,
                },
                (it) => {
                    it.anchor.set(0, 0.5);
                    it.position.set(221, 416)
                }
            )
        );
        this._container.addChild(this._msgBox);

        this._cancelButton = new PIXI.Container;
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
            )
            this._container.addChild(this._cancelButton);
        }
        this._on(this._cancelButton, "pointerup", this._teardown);
    }

    _teardown(): void {
        super._teardown();
    }
}