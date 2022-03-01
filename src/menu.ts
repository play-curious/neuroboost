import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";

import * as extension from "./extension";
import * as variable from "./variable";

interface Settings {
  fx: 0 | 0.5 | 0.25 | 0.75 | 1;
  music: 0 | 0.5 | 0.25 | 0.75 | 1;
  fullscreen: boolean;
}

const defaultSettings: Settings = {
  fx: 0.5,
  music: 0.5,
  fullscreen: util.inFullscreen(),
};

const creditsOptions: Partial<booyah.CreditsEntityOptions> = {
  credits: {
    Programming: ["Camille Abella", "André Quentin", "Maréchal Eliot"],
    "Game Design": "Jesse Himmelstein",
    "Narrative Design": "Ronan Le Breton",
    "Sound Design": "Jean-Baptiste Mar",
    "Graphic Design": ["Xuan Le", "Sana Coftier", "Nawel Benrhannou"],
    Animation: ["Xuan Le", "Sana Coftier"],
    QA: "Ilyes Khamassi",
  },
  fontFamily: "Optimus",
  textSize: 40,
};

export class Menu extends extension.ExtendedCompositeEntity {
  private settings: Settings;

  private opened: boolean;
  private container: PIXI.Container;

  private blackBackground: PIXI.Graphics;
  private popupBackground: PIXI.Sprite;
  private menuButton: PIXI.Sprite;
  //private backButton: PIXI.Sprite;
  private playCuriousLogo: PIXI.Sprite;
  private creditButton: PIXI.Text;
  private creditsEntity: booyah.CreditsEntity;
  private title: PIXI.Sprite;

  private fullscreenSwitcher: SpriteSwitcher;
  private musicVolumeSwitcher: SpriteRangeSwitcher;
  private soundVolumeSwitcher: SpriteRangeSwitcher;

  private debugPressCount: number;

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
        .beginFill(0x333333, 0.8)
        .drawRect(0, 0, variable.width, variable.height)
        .endFill();
      this.blackBackground.interactive = true;
      this.blackBackground.alpha = 0;
      this._on(this.blackBackground, "pointerup", this.close);
      this.container.addChild(this.blackBackground);
    }

    {
      this.menuButton = this.makeSprite("images/menu/menu_button.png", (it) => {
        it.anchor.set(0, 0.5);
        it.alpha = 0.8;
        it.position.set(0, variable.height / 2);
        it.scale.set(60 / it.width);
        it.buttonMode = true;
        it.interactive = true;
      });
      this._on(this.menuButton, "pointerup", this.open);
    }

    {
      this.popupBackground = this.makeSprite(
        "images/menu/background.png",
        (it) => {
          it.anchor.set(0, 0.5);
          it.position.set(0, variable.height / 2);
        }
      );
      this.popupBackground.interactive = true;
      this.container.addChild(this.popupBackground);
    }

    {
      this.playCuriousLogo = this.makeSprite(
        "images/menu/playcurious_logo.png",
        (it) => {
          it.anchor.set(0.5);
          it.scale.set(0.8);
          it.position.set(
            this.popupBackground.width / 2,
            this.popupBackground.height * 0.66
          );

          it.interactive = true;
          it.buttonMode = true;
        }
      );
      this._on(this.playCuriousLogo, "pointertap", this._onTapPCLogo);
      this.popupBackground.addChild(this.playCuriousLogo);
    }

    {
      this.creditButton = this.makeText("credits", {
        fontFamily: "Ubuntu",
        fill: "white",
        fontSize: 50,
      });
      this.creditButton.anchor.set(0.5);
      this.creditButton.position.set(
        this.popupBackground.width / 2,
        this.popupBackground.height * 0.37
      );
      this.creditButton.interactive = true;
      this.creditButton.buttonMode = true;
      this._on(this.creditButton, "pointertap", this._showCredits);
      this.popupBackground.addChild(this.creditButton);

      // Credits entity starts null, and is created only when the button is pressed
      this.creditsEntity = null;
    }

    {
      this.title = this.makeSprite("images/menu/title.png", (it) => {
        it.anchor.set(0.5);
        it.position.set(
          this.popupBackground.width / 2,
          -this.popupBackground.height / 3
        );
      });
      this.popupBackground.addChild(this.title);
    }

    if (util.supportsFullscreen()) {
      // if (false) {
      this.fullscreenSwitcher = new SpriteSwitcher(
        {
          on: "images/menu/fullscreen_button_disable.png",
          off: "images/menu/fullscreen_button_enable.png",
        },
        this.settings.fullscreen ? "on" : "off"
      );
      this.fullscreenSwitcher.container.position.set(
        this.popupBackground.width / 2,
        +200
      );
      this.fullscreenSwitcher.onStateChange((state) => {
        if (state === "on") {
          util.requestFullscreen(document.getElementById("game-parent"));
        } else if (util.inFullscreen()) {
          util.exitFullscreen();
        }
        this.settings.fullscreen = state === "on";
        this.saveSettings();
      });
    }

    {
      this.musicVolumeSwitcher = new SpriteRangeSwitcher(
        {
          0: "images/menu/music_range_0.png",
          0.25: "images/menu/music_range_0.25.png",
          0.5: "images/menu/music_range_0.5.png",
          0.75: "images/menu/music_range_0.75.png",
          1: "images/menu/music_range_1.png",
        },
        this.settings.music ?? defaultSettings.music
      );
      this.musicVolumeSwitcher.container.position.x =
        this.popupBackground.width - 310;
      this.musicVolumeSwitcher.container.position.y += 40;
      this.musicVolumeSwitcher.onStateChange((state) => {
        this.config.playOptions.setOption("musicOn", state !== 0);
        this.settings.music = state as 0;
        this.config.jukebox.changeVolume(state as 0);
        const initialFxVolume = this.config.fxMachine.volume;
        this.config.fxMachine.changeVolume(state as 0);
        this.config.fxMachine.play("Click");
        setTimeout(() => {
          this.config.fxMachine.changeVolume(initialFxVolume);
        }, 500);
        this.saveSettings();
      });
    }

    {
      this.soundVolumeSwitcher = new SpriteRangeSwitcher(
        {
          0: "images/menu/fx_range_0.png",
          0.25: "images/menu/fx_range_0.25.png",
          0.5: "images/menu/fx_range_0.5.png",
          0.75: "images/menu/fx_range_0.75.png",
          1: "images/menu/fx_range_1.png",
        },
        this.settings.fx ?? defaultSettings.fx
      );
      this.soundVolumeSwitcher.container.position.x =
        this.popupBackground.width - 290;
      this.soundVolumeSwitcher.container.position.y -= 120;
      this.soundVolumeSwitcher.onStateChange((state) => {
        this._entityConfig.playOptions.setOption("fxOn", state !== 0);
        this.settings.fx = state as 0;
        this._entityConfig.fxMachine.changeVolume(state);
        this._entityConfig.fxMachine.play("Click");
        this.saveSettings();
      });
    }

    this._activateChildEntity(
      this.fullscreenSwitcher,
      entity.extendConfig({
        container: this.popupBackground,
      })
    );
    this._activateChildEntity(
      this.musicVolumeSwitcher,
      entity.extendConfig({
        container: this.popupBackground,
      })
    );
    this._activateChildEntity(
      this.soundVolumeSwitcher,
      entity.extendConfig({
        container: this.popupBackground,
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

  open() {
    if (this.opened) return;

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
    if (signal === "pause" && !this.opened) {
      this.opened = true;
      this.menuButton.visible = false;
      this.container.visible = true;

      this._onOpen();
    } else if (signal === "play" && this.opened) {
      this.opened = false;
      this.menuButton.visible = true;
      this.container.visible = false;
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
    this.config.fxMachine.play("Spawn");
  }

  private _showCredits() {
    this.creditsEntity = new booyah.CreditsEntity(creditsOptions);
    this._activateChildEntity(this.creditsEntity);
  }

  private _onTapPCLogo() {
    window.open("https://playcurious.games", "_blank");
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
