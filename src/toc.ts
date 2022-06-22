import * as _ from "underscore";
import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";

import * as extension from "./extension";

const yellow = 0xf9c560;
const subtitleFontSize = 34;

export class TableOfContents extends extension.ExtendedCompositeEntity {
  private _container: PIXI.Container;

  _setup() {
    this._container = new PIXI.Container();
    this._entityConfig.container.addChild(this._container);

    {
      // Make background
      const background = this.makeAnimatedSprite(
        "images/bg/outside/background.json"
      );
      this._activateChildEntity(
        background,
        entity.extendConfig({
          container: this._container,
        })
      );
    }

    {
      // Make menu background
      const menuBackground = new PIXI.NineSlicePlane(
        this._entityConfig.app.loader.resources[
          "images/ui/resizable_container.png"
        ].texture,
        116,
        125,
        116,
        125
      );
      menuBackground.width = 1230;
      menuBackground.height = 1028;
      menuBackground.position.set(354, 28);
      this._container.addChild(menuBackground);
    }

    {
      // Title
      const text = new PIXI.Text("Choix du chapitre", {
        fontFamily: "Jura",
        fontSize: 52,
        fill: "white",
      });
      text.position.set(432, 82);
      this._container.addChild(text);
    }

    const gridStart = new PIXI.Point(432, 156);
    const columnWidth = 476;
    const columnPadding = 75;
    const rowHeight = 197;
    const indent = new PIXI.Point(38, 32);

    let chapter = 1;
    for (let column = 0; column < 2; column++) {
      for (let row = 0; row < 4; row++) {
        const gridCell = new PIXI.Point(
          gridStart.x + column * (columnWidth + columnPadding),
          gridStart.y + row * rowHeight
        );

        {
          const line = new PIXI.Sprite(
            this._entityConfig.app.loader.resources[
              "images/ui/line.png"
            ].texture
          );
          line.position.copyFrom(gridCell);
          this._container.addChild(line);
        }

        {
          const titleText = `Chapitre ${chapter}`;
          const title = new PIXI.Text(titleText, {
            fontFamily: "Jura",
            fontSize: subtitleFontSize,
            fill: "white",
          });
          title.position.set(gridCell.x + indent.x, gridCell.y + indent.y);
          this._container.addChild(title);
        }

        {
          const sagesText = "Accéder aux Sages";
          const sages = new PIXI.Text(sagesText, {
            fontFamily: "Ubuntu",
            fontStyle: "italic",
            fontSize: subtitleFontSize,
            fill: yellow,
          });
          sages.position.set(gridCell.x + indent.x, gridCell.y + indent.y + 53);
          this._container.addChild(sages);
        }

        {
          const textContent = "Ecrire au journal";
          const text = new PIXI.Text(textContent, {
            fontFamily: "Ubuntu",
            fontStyle: "italic",
            fontSize: subtitleFontSize,
            fill: yellow,
          });
          text.position.set(gridCell.x + indent.x, gridCell.y + indent.y + 106);
          this._container.addChild(text);
        }

        chapter++;
      }
    }
  }

  protected _teardown(frameInfo: entity.FrameInfo): void {
    this._entityConfig.container.removeChild(this._container);
    this._container = null;
  }
}
