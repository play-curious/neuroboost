import * as _ from "underscore";
import * as PIXI from "pixi.js";

import * as extension from "./extension";
import { FrameInfo, EntityConfig } from "booyah/src/entity";

export class Popup extends extension.ExtendedCompositeEntity {
    private _container: PIXI.Container;
    private _textArea: PIXI.Container;
    private _okButton: PIXI.Container;

    public constructor(
        public readonly message: string | {text: string, placeholder: string},
        public readonly callback: () => unknown
    ){
        super();
    }

    _setup(): void {
        this._container.addChild(
            this.makeSprite("images/ui/popup/background.png"),
            this.makeSprite("images/ui/popup/textarea.png"),
            this.makeSprite("images/ui/popup/ok_button.png")
        );

        this._textArea = new PIXI.Container;
        {
            this._textArea.position.set(324, 425);
            this._textArea.hitArea = new PIXI.Rectangle(0, 0, 1141, 75);
            this._textArea.interactive = true;
            this._textArea.buttonMode = true;
            this._container.addChild(this._textArea);
        }
        
        this._okButton = new PIXI.Container;
        {
            this._okButton.position.set(1203, 540);
            this._okButton.hitArea = new PIXI.Rectangle(0, 0, 262, 75);
            this._okButton.interactive = true;
            this._okButton.buttonMode = true;
            this._container.addChild(this._okButton);
        }

        this.config.container.addChild(this._container);
    }
}