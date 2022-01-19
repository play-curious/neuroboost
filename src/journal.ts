import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";

import * as variable from "./variable";

import $ from "./$";

const options = [
  "Rappel libre",
  "Lecture de notes",
  "Lecture à voix haute",
  "Révision en groupe",
  "Faire des exercices",
];

export class JournalScene extends entity.CompositeEntity {
  private $ = $(this);
  private _container: PIXI.Container;
  private _htmlContainer: HTMLElement;

  constructor(private _variableStorage: variable.VariableStorage) {
    super();
  }

  _setup(): void {
    this._container = new PIXI.Container();
    this._entityConfig.container.addChild(this._container);

    this._container.addChild(
      this.$.sprite("images/bg/bedroom_night/base.png"),
      this.$.sprite("images/ui/journal_bg.png")
    );

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
      leftElements.style.fontSize = "32px";
      this._htmlContainer.appendChild(leftElements);

      leftElements.insertAdjacentHTML(
        "beforeend",
        "<p>Lorsque tu as besoin de réviser, quelles techniques utilises-tu ?</h1>"
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
        "Si tu pouvais apprendre plus facilement ou retenir des informations plus longtemps, qu'est-ce que cela pourrait changer à ta vie ?";
      rightQuestion.style.position = "absolute";
      rightQuestion.style.left = "940px";
      rightQuestion.style.top = "140px";
      rightQuestion.style.width = "760px";
      rightQuestion.style.textAlign = "justify";
      rightQuestion.style.fontSize = "28px";
      rightElements.appendChild(rightQuestion);

      const textArea = document.createElement("textArea");
      textArea.style.position = "absolute";
      textArea.style.left = "947px";
      textArea.style.top = "280px";
      textArea.style.width = "755px";
      textArea.style.height = "435px";
      textArea.style.fontSize = "28px";
      textArea.style.fontFamily = "Ubuntu";
      textArea.style.color = "white";
      textArea.style.border = "none";
      textArea.style.borderRadius = "2%";
      textArea.style.background = "transparent";
      rightElements.appendChild(textArea);

      this._container.addChild(
        this.$.sprite("images/ui/journal_button.png", (it) => {
          it.anchor.set(1, 0);
          it.position.set(1750, 720);
          it.interactive = true;
          it.buttonMode = true;

          this._on(
            it,
            "pointerup",
            () => (this._transition = entity.makeTransition())
          );
        })
      );
    }
  }

  _teardown() {
    this._entityConfig.container.removeChild(this._container);
    this._htmlContainer.remove();
  }
}
