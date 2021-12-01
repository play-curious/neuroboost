import * as _ from "underscore";
import * as PIXI from "pixi.js";

import * as booyah from "booyah/src/booyah";
import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";

const options = [
  "Rappel libre",
  "Lecture de notes",
  "Lectre à voix haute",
  "Révision en groupe",
  "Faire des exercices",
];

export class JournalScene extends entity.CompositeEntity {
  private _container: PIXI.Container;
  private _htmlContainer: HTMLElement;

  _setup(): void {
    this._container = new PIXI.Container();
    this._entityConfig.container.addChild(this._container);

    const bg = new PIXI.Sprite(
      this.entityConfig.app.loader.resources[
        "images/bg/bedroom_night.png"
      ].texture
    );
    this._container.addChild(bg);

    const journalBg = new PIXI.Sprite(
      this.entityConfig.app.loader.resources["images/ui/journal_bg.png"].texture
    );
    this._container.addChild(journalBg);

    const htmlLayer = document.getElementById("html-layer");
    this._htmlContainer = document.createElement("div");
    htmlLayer.appendChild(this._htmlContainer);

    {
      const leftElements = document.createElement("div");
      leftElements.style.position = "absolute";
      leftElements.style.left = "230px";
      leftElements.style.top = "180px";
      leftElements.style.width = "600px";
      leftElements.style.textAlign = "justify";
      this._htmlContainer.appendChild(leftElements);

      leftElements.insertAdjacentHTML(
        "beforeend",
        "<p>Lorsque tu as besoin de reviser, quelles techniques utilises-tu ?</h1>"
      );
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        leftElements.insertAdjacentHTML(
          "beforeend",
          `<br>
        <input type="radio" name="closed-question" id="closed-question-${i}" value="${i}">
        <label for="closed-question-${i}">${option}</label>`
        );
      }
    }

    {
      const rightElements = document.createElement("div");
      this._htmlContainer.appendChild(rightElements);

      const rightQuestion = document.createElement("p");
      rightQuestion.textContent =
        "Si tu pouvais apprendre plus facilement ou retenir des informations plus longtemps, qu'est-ceque cela pourrait changer à ta vie ?";
      rightQuestion.style.position = "absolute";
      rightQuestion.style.left = "940px";
      rightQuestion.style.top = "150px";
      rightQuestion.style.width = "760px";
      rightQuestion.style.textAlign = "justify";
      rightElements.appendChild(rightQuestion);

      const textArea = document.createElement("textArea");
      textArea.style.position = "absolute";
      textArea.style.left = "940px";
      textArea.style.top = "410px";
      textArea.style.width = "760px";
      textArea.style.height = "300px";
      textArea.style.fontSize = "inherit";
      rightElements.appendChild(textArea);

      const button = new PIXI.Sprite(
        this.entityConfig.app.loader.resources[
          "images/ui/journal_button.png"
        ].texture
      );
      button.anchor.set(1, 0);
      button.position.set(1750, 720);
      button.interactive = true;
      button.buttonMode = true;
      this._on(
        button,
        "pointerup",
        () => (this._transition = entity.makeTransition())
      );
      this._container.addChild(button);
    }
  }

  _teardown() {
    this._entityConfig.container.removeChild(this._container);
    this._htmlContainer.remove();
  }
}
