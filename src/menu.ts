import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";
import * as scroll from "booyah/src/scroll";
import * as util from "booyah/src/util";

import * as extension from "./extension";
import * as variable from "./variable";
import * as journal from "./journal";
import * as popup from "./popup";

interface Settings {
  fx: number;
  music: number;
  fullscreen: boolean;
  textSpeed: number;
}

const defaultSettings: Settings = {
  fx: 0.5,
  music: 0.5,
  fullscreen: util.inFullscreen(),
  textSpeed: 0.5,
};

const creditsOptions: Partial<booyah.CreditsEntityOptions> = {
  credits: {
    Programming: [
      "Florian Boyer",
      "André Quentin",
      "Maréchal Eliot",
      "Camille Abella",
    ],
    "Game Design": "Jesse Himmelstein",
    "Narrative Design": ["Grégoire Francisco", "Ronan Le Breton"],
    "Sound Design": "Jean-Baptiste Mar",
    "Graphic Design": [
      "Xuan Le",
      "Sana Coftier",
      "Nawel Benrhannou",
      "Juliette Amélie",
    ],
    Animation: ["Xuan Le", "Sana Coftier"],
    Translation: "William Barreau",
    QA: ["Cédrik Saint-Germain", "Ilyes Khamassi"],
  },
  fontFamily: "Optimus",
  textSize: 30,
};

export class Menu extends extension.ExtendedCompositeEntity {
  private settings: Settings;

  private opened: boolean;
  private container: PIXI.Container;

  private _controlsContainer: PIXI.Container;
  private blackBackground: PIXI.Graphics;
  private popupBackground: PIXI.NineSlicePlane;
  private menuButton: PIXI.Sprite;
  //private backButton: PIXI.Sprite;
  private playCuriousLogo: PIXI.Sprite;
  private creditButton: PIXI.Text;
  private creditsEntity: booyah.CreditsEntity;
  private title: PIXI.Sprite;
  private historyButton: PIXI.Text;
  private journal: PIXI.Text;
  private journalUpdated: boolean;

  private fullscreenSwitcher: SpriteSwitcher;
  private musicVolumeSwitcher: SpriteRangeSwitcher;
  private soundVolumeSwitcher: SpriteRangeSwitcher;
  private textSpeedSwitcher: SpriteRangeSwitcher;

  private debugPressCount: number;
  private debugText: PIXI.Text;
  private _tocButton: PIXI.Text;
  private _gameLogo: PIXI.Sprite;

  private saveSettings() {
    localStorage.setItem("settings", JSON.stringify(this.settings));
  }

  _setup() {
    const raw =
      localStorage.getItem("settings") || JSON.stringify(defaultSettings);

    this.settings = JSON.parse(raw);
    this.settings.fullscreen = util.inFullscreen();

    this.container = new PIXI.Container();
    this.container.visible = false;

    {
      this.blackBackground = new PIXI.Graphics()
        .beginFill(0)
        .drawRect(0, 0, variable.width, variable.height)
        .endFill();
      this.blackBackground.alpha = 0.5;
      this.blackBackground.interactive = true;
      this._on(this.blackBackground, "pointerup", this.close);
      this.container.addChild(this.blackBackground);
    }

    {
      this.menuButton = this.makeSprite("images/menu/menu.png", (it) => {
        it.anchor.set(0.6);
        it.position.set(100);
        it.scale.set(0.5);
        it.buttonMode = true;
        it.interactive = true;
      });
      this._on(this.menuButton, "pointerup", this.open);
    }

    {
      // Cadre du menu
      this.popupBackground = new PIXI.NineSlicePlane(
        this._entityConfig.app.loader.resources[
          "images/ui/resizable_container.png"
        ].texture,
        116,
        125,
        116,
        125
      );
      this.popupBackground.width = 571;
      this.popupBackground.height = 1028;
      this.popupBackground.position.set(
        0,
        (this._entityConfig.app.view.height - 1028) / 2
      ); // Vertically center
      this.popupBackground.interactive = true;
      this.container.addChild(this.popupBackground);
    }

    {
      this._controlsContainer = new PIXI.Container();
      this._controlsContainer.position.set(
        0,
        (this._entityConfig.app.view.height - 1028) / 2
      );
      this.container.addChild(this._controlsContainer);
    }

    {
      // TOC link
      this._tocButton = this.makeText(
        "Chapitres",
        {
          fontFamily: "Ubuntu",
          fill: "white",
          fontSize: 50,
        },
        (it) => {
          it.anchor.set(0.5, 0);
          it.position.set(this.popupBackground.width / 2, 110);
          it.interactive = true;
          it.buttonMode = true;
        }
      );
      this._on(this._tocButton, "pointerup", this._onTapTocButton);
      this._controlsContainer.addChild(this._tocButton);

      // Blason de l'école
      this._gameLogo = this.makeSprite("images/logo.png", (it) => {
        it.anchor.set(0.5);
        it.scale.set(0.3);
        it.position.set(this.popupBackground.width / 2, 340);
      });
      this._gameLogo.interactive = true;
      this._gameLogo.buttonMode = true;
      this._on(this._gameLogo, "pointerup", this._onTapTocButton);
      this._controlsContainer.addChild(this._gameLogo);
    }

    // Temporarily deactivating the history button

    // {
    //   // Bouton historique
    //   const x = this.popupBackground.width / 2 - 142;
    //   const y = 584;
    //   let image = this.makeSprite("images/menu/historique.png", (it) => {
    //     it.anchor.set(0.5);
    //     it.scale.set(0.2);
    //     it.position.set(x, y);
    //   });
    //   this.popupBackground.addChild(image);

    //   this.historyButton = this.makeText(
    //     "Historique",
    //     {
    //       fontFamily: "Ubuntu",
    //       fill: "white",
    //       fontSize: 50,
    //     },
    //     (it) => {
    //       it.anchor.set(0, 0.5);
    //       it.position.set(x + 45, y);
    //       it.interactive = true;
    //       it.buttonMode = true;
    //     }
    //   );
    //   this._on(this.historyButton, "pointertap", this._showHistory);
    //   this.popupBackground.addChild(this.historyButton);
    // }

    {
      // Bouton journal
      const x = this.popupBackground.width / 2 - 115;
      const y = 545;
      let image = this.makeSprite("images/menu/journal.png", (it) => {
        it.anchor.set(0.5);
        it.scale.set(0.4);
        it.position.set(x, y);
      });
      this._controlsContainer.addChild(image);

      this.journal = this.makeText(
        "Journal",
        {
          fontFamily: "Ubuntu",
          fill: "white",
          fontSize: 50,
        },
        (it) => {
          it.anchor.set(0, 0.5);
          it.position.set(x + 45, y);
          it.interactive = true;
          it.buttonMode = true;

          this._on(it, "pointerup", this._downloadJournal);
        }
      );
      this._controlsContainer.addChild(this.journal);
      // this.journalUpdated = false;
    }

    {
      // Crédit
      const x = this.popupBackground.width / 2 + 200;
      const y = this.popupBackground.height - 70;
      const image = this.makeSprite("images/menu/playcurious.png", (it) => {
        it.anchor.set(0.5);
        it.scale.set(0.4);
        it.position.set(x, y);
      });
      image.interactive = true;
      image.buttonMode = true;
      this._on(image, "pointerup", this._onTapPCLogo);
      this._controlsContainer.addChild(image);

      this.creditButton = this.makeText(
        "Credits",
        {
          fontFamily: "Ubuntu",
          fill: "white",
          fontSize: 40,
        },
        (it) => {
          it.anchor.set(0.5);
          it.position.set(x - 150, y);
          it.interactive = true;
          it.buttonMode = true;
        }
      );
      this._on(this.creditButton, "pointertap", this._showCredits);
      this._controlsContainer.addChild(this.creditButton);

      // Credits entity starts null, and is created only when the button is pressed
      this.creditsEntity = null;
    }

    if (util.supportsFullscreen()) {
      // Création texte
      const textFullscreen = this.makeText(
        "Plein-écran",
        {
          fontFamily: "Ubuntu",
          fill: "white",
          fontSize: 30,
        },
        (it) => {
          it.anchor.set(0);
          it.position.set(+90, 20);
        }
      );
      this._controlsContainer.addChild(textFullscreen);
      // Création image
      this.fullscreenSwitcher = new SpriteSwitcher(
        {
          on: "images/menu/fullscreen_off.png",
          off: "images/menu/fullscreen_on.png",
        },
        this.settings.fullscreen ? "on" : "off"
      );
      this.fullscreenSwitcher.container.scale.set(0.7);
      this.fullscreenSwitcher.container.position.set(50, 50);
      this.fullscreenSwitcher.onStateChange((state) => {
        if (state === "on") {
          util.requestFullscreen(document.getElementById("game-parent"));
          textFullscreen.text = "Fenêtré";
        } else if (util.inFullscreen()) {
          util.exitFullscreen();
          textFullscreen.text = "Plein-écran";
        }
        this.settings.fullscreen = state === "on";
        this.saveSettings();
      });
    }

    {
      const x = this.popupBackground.width - 250;
      const y = 650;
      const logo = this.makeSprite("images/menu/musique.png", (it) => {
        it.anchor.set(0.5);
        it.scale.set(0.3);
        it.position.set(x - 165, y);
      });
      this._controlsContainer.addChild(logo);

      this.musicVolumeSwitcher = new SpriteRangeSwitcher(
        {
          0: "images/menu/fx_000.png",
          0.25: "images/menu/fx_025.png",
          0.5: "images/menu/fx_050.png",
          0.75: "images/menu/fx_075.png",
          1: "images/menu/fx_100.png",
        },
        this.settings.music ?? defaultSettings.music
      );
      this.musicVolumeSwitcher.container.scale.set(0.8);
      this.musicVolumeSwitcher.container.position.set(x, y);
      this.musicVolumeSwitcher.onStateChange((state: number) => {
        this.config.playOptions.setOption("musicOn", state !== 0);
        this.settings.music = state;

        // The actual music volume is cut in half
        this.config.jukebox.changeVolume(state * 0.5);
        this.saveSettings();
      });
    }

    {
      const x = this.popupBackground.width - 250;
      const y = 740;
      const logo = this.makeSprite("images/menu/bruitage.png", (it) => {
        it.anchor.set(0.5);
        it.scale.set(0.3);
        it.position.set(x - 165, y);
      });
      this._controlsContainer.addChild(logo);

      this.soundVolumeSwitcher = new SpriteRangeSwitcher(
        {
          0: "images/menu/fx_000.png",
          0.25: "images/menu/fx_025.png",
          0.5: "images/menu/fx_050.png",
          0.75: "images/menu/fx_075.png",
          1: "images/menu/fx_100.png",
        },
        this.settings.fx ?? defaultSettings.fx
      );
      this.soundVolumeSwitcher.container.scale.set(0.8);
      this.soundVolumeSwitcher.container.position.set(x, y);
      this.soundVolumeSwitcher.onStateChange((state: number) => {
        this.config.playOptions.setOption("fxOn", state !== 0);
        this.settings.fx = state;
        this.config.fxMachine.changeVolume(state);
        this.config.fxMachine.play("Click");
        this.saveSettings();
      });
    }

    {
      const x = this.popupBackground.width - 280;
      const y = 870;
      const logo = this.makeText(
        "Vitesse du texte",
        {
          fontFamily: "Ubuntu",
          fontSize: 32,
          fontStyle: "bolder",
          fill: "white",
        },
        (it) => {
          it.anchor.set(0.5);
          it.position.set(x, y - 60);
        }
      );
      this._controlsContainer.addChild(logo);

      this.textSpeedSwitcher = new SpriteRangeSwitcher(
        {
          0: "images/menu/fx_000.png",
          0.25: "images/menu/fx_025.png",
          0.5: "images/menu/fx_050.png",
          0.75: "images/menu/fx_075.png",
          1: "images/menu/fx_100.png",
        },
        this.settings.textSpeed ?? defaultSettings.fx
      );
      this.textSpeedSwitcher.container.scale.set(0.8);
      this.textSpeedSwitcher.container.position.set(x, y);
      this.textSpeedSwitcher.onStateChange((state: number) => {
        this.config.playOptions.setOption("textSpeed", state);
        this.saveSettings();
      });
    }

    /*
     * Affichage du titre dans la version originel du menu, sert à activer le mode DEBUG
    {
      this.title = this.makeSprite("images/menu/title.png", (it) => {
        it.anchor.set(0.5);
        it.position.set(
          this.popupBackground.width / 2,
          -this.popupBackground.height / 3
        );
        it.interactive = true;

        this.debugText = this.makeText(
          "DEBUG",
          {
            fontFamily: "Ubuntu",
            fontSize: 70,
            fill: "white",
            fontWeight: "bolder",
          },
          (itt) => {
            itt.anchor.set(0.5);
            itt.position = it.position;
            itt.rotation -= PIXI.PI_2 / 8;
            itt.visible = false;
          }
        );

        this.debugPressCount = 0;
        this._on(it, "pointerup", () => {
          if (++this.debugPressCount == 7) {
            this.debugPressCount = 0;
            const newState = !this.config.variableStorage.get("isDebugMode");
            this.config.variableStorage.set("isDebugMode", newState);
            this.debugText.visible = newState;
            this.config.fxMachine.play("Notification");
            console.log("Debug: ", newState);
          }
        });
      });
      this.popupBackground.addChild(this.title);
      this.popupBackground.addChild(this.debugText);
    }*/

    this._activateChildEntity(
      this.fullscreenSwitcher,
      entity.extendConfig({
        container: this._controlsContainer,
      })
    );
    this._activateChildEntity(
      this.musicVolumeSwitcher,
      entity.extendConfig({
        container: this._controlsContainer,
      })
    );
    this._activateChildEntity(
      this.soundVolumeSwitcher,
      entity.extendConfig({
        container: this._controlsContainer,
      })
    );
    this._activateChildEntity(
      this.textSpeedSwitcher,
      entity.extendConfig({
        container: this._controlsContainer,
      })
    );

    this._entityConfig.container.addChild(this.container);
    this._entityConfig.container.addChild(this.menuButton);
  }

  _teardown() {
    this.container.removeChildren();
    this._entityConfig.container.removeChild(this.container);
    this._entityConfig.container.removeChild(this.menuButton);
  }

  private _onTapTocButton() {
    const message =
      "Etes-vous sûr de vouloir retourner au choix des chapitres ?";
    this._activateChildEntity(
      new popup.Confirm(message, (result: boolean) => {
        if (!result) return;

        // Return to the TOC and close the menu
        this._entityConfig.gameStateMachine.changeState("toc");
        this.close();
      })
    );
  }

  open() {
    if (this.opened) return;

    this.config.fxMachine.play("Spawn");

    booyah.changeGameState("paused");
    this.debugPressCount = 0;

    // Displaying the menu will be done in _onSignal()
  }

  close() {
    if (!this.opened) return;

    booyah.changeGameState("playing");
    // Hiding the menu will be done in _onSignal()
  }

  _onSignal(frameInfo: entity.FrameInfo, signal: string, data?: any): void {
    const html = document.getElementById("html-layer");

    if (signal === "pause" && !this.opened) {
      this.opened = true;
      this.menuButton.visible = false;
      this.container.visible = true;

      if (html) html.style.display = "none";

      this._onOpen();
    } else if (signal === "play" && this.opened) {
      this.opened = false;
      this.menuButton.visible = true;
      this.container.visible = false;

      if (html) html.style.display = "block";
    }
  }

  _update(frameInfo: entity.FrameInfo) {
    if (this.creditsEntity) {
      if (this.creditsEntity.transition) {
        this._deactivateChildEntity(this.creditsEntity);
        this.creditsEntity = null;
      }
    }
  }

  private _onOpen() {
    this.blackBackground.visible = true;

    // Check if the journal button should be activated or deactivated
    const shouldEnableJournal =
      Object.keys(this.config.variableStorage.get("journalAnswers")).length > 0;
    this._enableButton(this.journal, shouldEnableJournal);

    // Check if the TOC button should be activated
    const shouldEnableTocButton =
      this._entityConfig.gameStateMachine.isSetup &&
      this._entityConfig.gameStateMachine.lastTransition.name !== "toc";
    this._enableButton(this._tocButton, shouldEnableTocButton);
    this._enableButton(this._gameLogo, shouldEnableTocButton);
  }

  private _enableButton(obj: PIXI.DisplayObject, active = true): void {
    obj.alpha = active ? 1 : 0.5;
    obj.buttonMode = active;
    obj.interactive = active;
  }

  private _showCredits() {
    this.creditsEntity = new booyah.CreditsEntity(creditsOptions);
    this._activateChildEntity(this.creditsEntity);
  }

  private _showHistory() {
    const background = new PIXI.Graphics()
      .beginFill(0x000000, 0.8)
      .drawRect(0, 0, 1920, 1080)
      .endFill();

    this.container.addChild(background);

    const scrollBox = new scroll.Scrollbox({
      overflowX: "none",
      overflowY: "scroll",
      boxWidth: 1720,
      boxHeight: 880,
    });

    this._activateChildEntity(
      scrollBox,
      entity.extendConfig({
        container: this.container,
      })
    );

    scrollBox.container.position.set(100);
    let currentY = 0;
    let empty = true;
    // @ts-ignore
    if (window.dialogScene) {
      // @ts-ignore
      window.dialogScene?.getHistoryText().forEach((text) => {
        text.position.set(0, currentY);
        scrollBox.content.addChild(text);
        currentY += text.height + 30;
        empty = false;
      });
    }

    if (empty) {
      scrollBox.content.addChild(
        this.makeText("Empty history - Historique vide", {
          fontFamily: "Ubuntu",
          fontSize: "50px",
          fill: "#ffffff",
        })
      );
    }

    scrollBox.refresh();
    scrollBox.scrollBy(new PIXI.Point(0, -(currentY + 200)));
  }

  private _onTapPCLogo() {
    window.open("https://playcurious.games", "_blank");
  }

  private _downloadJournal() {
    // If no journal entries exist, should do nothing
    if (
      Object.keys(this.config.variableStorage.get("journalAnswers")).length ===
      0
    )
      return;

    this._activateChildEntity(
      new popup.Confirm(
        "Télécharger votre journal de la métacognition ?",
        (validated: boolean) => {
          if (!validated) return;
          const journalDownload = new journal.JournalPDF();
          this._activateChildEntity(journalDownload);
          journalDownload.journalToPDF(
            this.config.variableStorage.get("journalAnswers"),
            this.makeSprite("images/journalPDF/background.png")
          );
          this._deactivateChildEntity(journalDownload);
        }
      )
    );
  }
}

export function makeInstallMenu(
  rootConfig: entity.EntityConfig,
  rootEntity: entity.ParallelEntity
) {
  rootConfig.menu = new Menu();
  rootEntity.addChildEntity(rootConfig.menu);
}

/**
 * Emit:
 * - newState: keyof States
 */
export class SpriteSwitcher<
  States extends Record<string | number, string> = Record<"on" | "off", string>
> extends entity.EntityBase {
  public currentSprite?: PIXI.Sprite;
  public currentState?: keyof States;
  public container = new PIXI.Container();

  constructor(
    private states: States,
    private initialState?: keyof States,
    private stateController?: (
      this: SpriteSwitcher<States>,
      event: PIXI.InteractionEvent
    ) => unknown
  ) {
    super();
  }

  _setup() {
    this._entityConfig.container.addChild(this.container);
    this.switch(this.initialState ?? Object.keys(this.states)[0]);
  }

  _teardown() {
    this.currentSprite = null;
    this.container.removeChildren();
    this._entityConfig.container.removeChild(this.container);
  }

  onStateChange(cb: (newState: keyof States) => unknown) {
    this._on(this, "newState", cb);
  }

  switch(stateName: keyof States) {
    this.currentState = stateName;
    this.container.removeChildren();
    this.currentSprite = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[this.states[stateName]].texture
    );
    this.currentSprite.buttonMode = true;
    this.currentSprite.interactive = true;
    this.currentSprite.anchor.set(0.5);
    this._once(
      this.currentSprite,
      "pointerup",
      this.stateController?.bind(this) ?? this.next.bind(this)
    );
    this.container.addChild(this.currentSprite);
    this.emit("newState", stateName);
  }

  next() {
    const stateNames = Object.keys(this.states);
    const newState =
      stateNames[stateNames.indexOf(this.currentState as string) + 1];
    this.switch(newState ?? stateNames[0]);
  }
}

export interface SpriteRangeSwitcherStates
  extends Record<string | number, string> {
  0: string;
  0.25: string;
  0.5: string;
  0.75: string;
  1: string;
}

export class SpriteRangeSwitcher extends SpriteSwitcher<SpriteRangeSwitcherStates> {
  constructor(
    states: SpriteRangeSwitcherStates,
    initialState?: keyof SpriteRangeSwitcherStates
  ) {
    super(states, initialState, function (event) {
      const cursor = event.data.getLocalPosition(this.currentSprite);
      const factor =
        (cursor.x + this.currentSprite.width / 2) / this.currentSprite.width;

      if (factor < 0.2) {
        this.switch(0);
      } else if (factor < 0.4) {
        this.switch(0.25);
      } else if (factor < 0.6) {
        this.switch(0.5);
      } else if (factor < 0.8) {
        this.switch(0.75);
      } else {
        this.switch(1);
      }
    });
  }
}
