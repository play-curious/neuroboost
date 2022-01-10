
import * as _ from "underscore";
import * as PIXI from "pixi.js";
import MultiStyleText from "pixi-multistyle-text";
import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";

// Initilize Underscore templates to ressemble YarnSpinner
const templateSettings = {
    interpolate: /{\s*\$(.+?)\s*}/g,
};

const dialogRegexp = /^(\w+)(\s\w+)?:(.+)/;

export class Graphics extends entity.CompositeEntity {

    private _lastBg: string;
    private _lastCharacter: string;
    private _lastMood: string;

    private _container: PIXI.Container;
    private _backgroundLayer: PIXI.Container;
    private _backgroundEntity: entity.ParallelEntity;
    private _characterLayer: PIXI.Container;
    private _characterEntity: entity.ParallelEntity;
    private _closeupLayer: PIXI.Container;
    private _uiLayer: PIXI.Container;
    private _dialogLayer: PIXI.Container;
    private _dialogSpeaker: PIXI.Container;

    private _nodeDisplay: PIXI.DisplayObject;

    constructor(private readonly _variableStorageData: { [k: string]: string }) {
        super();
    }

    _setup(): void {

        console.log("HELLOOOO")

        this._container = new PIXI.Container();
        this._entityConfig.container.addChild(this._container);

        this._backgroundLayer = new PIXI.Container();
        this._container.addChild(this._backgroundLayer);

        this._characterLayer = new PIXI.Container();
        this._container.addChild(this._characterLayer);

        this._closeupLayer = new PIXI.Container();
        this._container.addChild(this._closeupLayer);

        this._uiLayer = new PIXI.Container();
        this._container.addChild(this._uiLayer);

        this._dialogLayer = new PIXI.Container();
        this._dialogLayer.addChild(
        new PIXI.Sprite(
            this.entityConfig.app.loader.resources["images/ui/dialog.png"].texture
        )
        );
        this._container.addChild(this._dialogLayer);

        this._dialogSpeaker = new PIXI.Container();
        this._dialogSpeaker.addChild(
        new PIXI.Sprite(
            this.entityConfig.app.loader.resources[
            "images/ui/dialog_speaker.png"
            ].texture
        )
        );
        this._dialogSpeaker.position.set(202, 601);
        this._dialogLayer.addChild(this._dialogSpeaker);

    }

    public getUi(): PIXI.Container {
        return this._uiLayer;
    }

    /**
     * Show user interface
     */
    public showUi() {
      this._uiLayer.visible = true;
    }

    /**
     * Hide user interface
     */
    public hideUi() {
        this._uiLayer.visible = false;
    }

    /**
     * Show node
     */
    public showNode() {

    }

    /**
     * Show node
     */
    public hideNode() {

        if (this._nodeDisplay)
            this._container.removeChild(this._nodeDisplay);
        this._nodeDisplay = null;
    }

    /**
     * 
     * 
     * @param closeup 
     * @returns 
     */
    public showCloseup(closeup?: string): void {
      this._closeupLayer.removeChildren();
      if (!closeup) return;
  
      const sprite = new PIXI.Sprite(
        this.entityConfig.app.loader.resources[
          `images/closeups/${closeup}.png`
        ].texture
      );
      sprite.position.set(400, 10);
  
      this._closeupLayer.addChild(sprite);
    }
  
    /**
     * 
     */
    public hideCloseup(): void {
      this.showCloseup();
    }

    public showDialogLayer() {
        this._dialogLayer.visible = true;
    }

    public showDialog(text: string, name: string, autoShow: boolean, onBoxClick: () => unknown) {
        // console.log("text result", text);

        // Use underscore template to interpolate variables
        const interpolatedText = _.template(
            text,
            templateSettings
        )(this._variableStorageData);
    
        let speaker, mood, dialog: string;
        if (dialogRegexp.test(interpolatedText)) {
            let match = dialogRegexp.exec(interpolatedText);
    
            speaker = match[1].trim();
            mood = match[2];
            dialog = match[3].trim();
    
            if (mood !== undefined) mood = mood.trim();
        }
    
        this._nodeDisplay = new PIXI.Container();
        this._container.addChild(this._nodeDisplay);
    
        if (speaker) {
            this._dialogSpeaker.visible = true;
            const speakerName =
            speaker.toLowerCase() === "you"
                ? name
                : speaker;
            const speakerText = new PIXI.Text(speakerName, {
            fill: "white",
            fontFamily: "Jura",
            fontSize: 50,
            });
            speakerText.position.set(
            this._dialogSpeaker.x + this._dialogSpeaker.width / 2,
            this._dialogSpeaker.y + this._dialogSpeaker.height / 2
            );
            speakerText.anchor.set(0.5);
            (this._nodeDisplay as PIXI.Container).addChild(speakerText);
    
            const speakerLow = speaker.toLowerCase();
            if (
                autoShow ||
            (this._lastCharacter === speakerLow && this._lastMood !== mood)
            ) {
            this.setCharacter(speakerLow, mood);
            }
        } else {
            this._dialogSpeaker.visible = false;
        }
    
        {
            const hitBox = new PIXI.Container();
            hitBox.position.set(140, 704);
            hitBox.hitArea = new PIXI.Rectangle(0, 0, 1634, 322);
            hitBox.interactive = true;
            hitBox.buttonMode = true;
            this._on(hitBox, "pointerup", onBoxClick);
            (this._nodeDisplay as PIXI.Container).addChild(hitBox);
        }
    
        {
            const dialogBox = new MultiStyleText(dialog || interpolatedText, {
            default: {
                fill: "white",
                fontFamily: "Ubuntu",
                fontSize: 40,
                fontStyle: speaker ? "normal" : "italic",
                wordWrap: true,
                wordWrapWidth: 1325,
                leading: 10,
            },
            i: {
                fontStyle: "italic",
            },
            b: {
                fontWeight: "bold",
                fontStyle: speaker ? "normal" : "italic",
            },
            bi: {
                fontWeight: "bold",
                fontStyle: "italic",
            },
            });
            dialogBox.position.set(140 + 122, 704 + 33);
            (this._nodeDisplay as PIXI.Container).addChild(dialogBox);
        } 
    }

    public setChoice(nodeOptions: string[], onBoxClick: (choiceId: number) => unknown) {
        // This works for both links between nodes and shortcut options
        // console.log("options result", nodeValue.options);
        this._dialogLayer.visible = false;

        this._nodeDisplay = new PIXI.Container();
        this._container.addChild(this._nodeDisplay);

        let currentY: number;

        let choicebox_contour = new PIXI.Sprite(
        this.entityConfig.app.loader.resources[
            "images/ui/choicebox_contour.png"
        ].texture
        );
        let choicebox_contour_reversed = new PIXI.Sprite();
        choicebox_contour_reversed.texture = choicebox_contour.texture.clone();
        choicebox_contour_reversed.setTransform(
        0,
        0,
        1,
        -1,
        0,
        0,
        0,
        0,
        choicebox_contour_reversed.y
        );
        let choicebox_empty = new PIXI.Sprite(
        this.entityConfig.app.loader.resources[
            "images/ui/choicebox_empty.png"
        ].texture
        );

        currentY = 1080 - 40;

        for (let i: number = 0; i < nodeOptions.length; i++) {
            const choicebox = new PIXI.Container();
            if (i == 0) {
                let choicebox_reversed = new PIXI.Sprite(
                this.entityConfig.app.loader.resources[
                        "images/ui/choicebox_contour.png"].texture
                );
                choicebox_reversed.setTransform(
                    0,
                    choicebox_contour_reversed.height,
                    1,
                    -1,
                    0,
                    0,
                    0,
                    0,
                    choicebox_contour_reversed.y
                );
                choicebox.addChild(choicebox_reversed);
            } else if (i == nodeOptions.length - 1) {
                choicebox.addChild(
                new PIXI.Sprite(
                    this.entityConfig.app.loader.resources[
                        "images/ui/choicebox_contour.png"
                    ].texture
                )
                );
            } else {
                choicebox.addChild(
                new PIXI.Sprite(
                    this.entityConfig.app.loader.resources[
                        "images/ui/choicebox_empty.png"
                    ].texture
                )
                );
            }
            currentY -= choicebox.height + 20;
            console.log(currentY, choicebox.height);
            choicebox.setTransform(0, currentY);

            const optionText = new PIXI.Text(nodeOptions[i], {
                fill: 0xfdf4d3,
                fontFamily: "Ubuntu",
                fontSize: 40,
            });
            optionText.anchor.set(0.5, 0.5);
            optionText.position.set(choicebox.width / 2, choicebox.height / 2);
            choicebox.interactive = true;
            choicebox.buttonMode = true;
            this._on(choicebox, "pointerup", () => {
                onBoxClick(i);
            });
            choicebox.addChild(optionText);
            (this._nodeDisplay as PIXI.Container).addChild(choicebox);
        }
    }

    /**
     * Set background
     * 
     * @param bg Background's name
     */
    public setBackground(bg: string) {

        if (bg === this._lastBg) return;

        const folderName = `images/bg/${bg}`;
        const fileName = `${folderName}/base.png`;
        const fileNameJson = `${folderName}/base.json`;
        if (!_.has(this.entityConfig.app.loader.resources, fileName)) {
        console.warn("Missing asset for background", bg);
        return;
        }

        // Remove existing
        this._backgroundLayer.removeChildren();
        if (this._backgroundEntity !== undefined) {
        if (this.childEntities.indexOf(this._backgroundEntity) != -1)
            this._deactivateChildEntity(this._backgroundEntity);
        this._backgroundEntity = undefined;
        }

        // Set background base
        const background = new PIXI.Sprite(
        this.entityConfig.app.loader.resources[fileName].texture
        );
        this._backgroundLayer.addChild(background);

        // Set animations
        if (_.has(this.entityConfig.app.loader.resources, fileNameJson)) {
            console.log("HERE");

            this._backgroundEntity = new entity.ParallelEntity();
            this._activateChildEntity(
                this._backgroundEntity,
                entity.extendConfig({ container: this._backgroundLayer })
            );

            let baseJson = this._entityConfig.app.loader.resources[fileNameJson].data;
            for (const bgPart of baseJson.sprites) {
                console.log(bgPart);

                const animatedSpriteEntity = util.makeAnimatedSprite(
                this._entityConfig.app.loader.resources[`${folderName}/${bgPart.model}.json`]);
                animatedSpriteEntity.sprite.anchor.set(0.5, 0.5);
                animatedSpriteEntity.sprite.x = bgPart.x;
                animatedSpriteEntity.sprite.y = bgPart.y;

                animatedSpriteEntity.sprite.animationSpeed = (1 / bgPart.speed) * 0.33;
                this._backgroundEntity.addChildEntity(animatedSpriteEntity);
            }
        }

        this._lastBg = bg;
    }

    /**
     * 
     * 
     * @param character if null or undefined, it will remove current character
     * @param mood
     */
    public setCharacter(character?: string, mood?: string): void {
        if (mood === undefined) mood = "neutral";

        if (character === this._lastCharacter && mood === this._lastMood) return;

        // Remove all previous characters
        this._characterLayer.removeChildren();
        this._lastCharacter = character;
        this._lastMood = mood;

        if (this._characterEntity !== undefined) {
        if (this.childEntities.indexOf(this._characterEntity) != -1)
            this._deactivateChildEntity(this._characterEntity);
        this._characterEntity = undefined;
        }

        if (character !== undefined && character !== "") {
        const characterContainer = new PIXI.Container();
        this._characterEntity = new entity.ParallelEntity();
        this._activateChildEntity(
            this._characterEntity,
            entity.extendConfig({ container: characterContainer })
        );

        const baseDir = `images/characters/${character}`;
        const basePng = baseDir + `/base_${mood}.png`;

        // Moving textures
        if (_.has(this.entityConfig.app.loader.resources, basePng)) {
            // Base
            const baseSprite = new PIXI.Sprite(
            this.entityConfig.app.loader.resources[basePng].texture
            );
            baseSprite.anchor.set(0, 0);
            baseSprite.pivot.set(
            (baseSprite.width - 1920) / 2,
            (baseSprite.height - 1080) / 2
            );

            characterContainer.addChild(baseSprite);

            // Load animations JSON
            let baseJson =
            this._entityConfig.app.loader.resources[`${baseDir}/base.json`].data;
            for (const bodyPart of baseJson[mood]) {
            const animatedSpriteEntity = util.makeAnimatedSprite(
                this._entityConfig.app.loader.resources[
                `${baseDir}/${bodyPart.model}.json`
                ]
            );
            animatedSpriteEntity.sprite.anchor.set(0.5, 0.5);
            animatedSpriteEntity.sprite.x = bodyPart.x;
            animatedSpriteEntity.sprite.y = bodyPart.y;

            animatedSpriteEntity.sprite.animationSpeed = 0.5;
            this._characterEntity.addChildEntity(animatedSpriteEntity);
            }

            // Place character on screen
            this._characterLayer.addChild(characterContainer);
            characterContainer.setTransform(350, 150, 1.1, 1.1);
        }

        // Static textures
        else if (
            _.has(this.entityConfig.app.loader.resources, baseDir + "/static.png")
        ) {
            // Base
            const baseSprite = new PIXI.Sprite(
            this.entityConfig.app.loader.resources[
                baseDir + "/static.png"
            ].texture
            );

            characterContainer.addChild(baseSprite);

            // Place character on screen
            this._characterLayer.addChild(characterContainer);
            characterContainer.setTransform(0, 0, 1, 1);
        } else {
            console.warn("Missing asset for character", character);
            return;
        }
        }
    }

}