import * as PIXI from "pixi.js";

import { GlitchFilter } from "@pixi/filter-glitch";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";

import * as variable from "./variable";
import * as extension from "./extension";

const options = [
  "Rappel libre",
  "Lecture de notes",
  "Lecture à voix haute",
  "Révision en groupe",
  "Faire des exercices",
];

export class JournalScene extends extension.ExtendedCompositeEntity {
  private _glitch: PIXI.Filter & GlitchFilter;
  private _container: PIXI.Container;
  private _htmlContainer: HTMLElement;

  constructor(private _variableStorage: variable.VariableStorage) {
    super();
  }

  _setup(): void {
    this._glitch = new GlitchFilter({
      red: [0, 0],
      blue: [0, 0],
      green: [0, 0],
      offset: 0,
      slices: 10,
    }) as any;

    this._container = new PIXI.Container();
    this._container.filters = [this._glitch];
    this.config.container.addChild(this._container);

    //this._graphics.setBackground("bedroom", "night")
    this._container.addChild(this.makeSprite("images/ui/journal_bg.png"));

    const shifting = 10;
    const frequency = 500;

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
              this._glitch.offset = Math.floor(5 + Math.random() * 5);
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
        this.makeSprite("images/ui/journal_button.png", (it) => {
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
    this.config.container.removeChild(this._container);
    this._htmlContainer.remove();
    this._container = null;
  }
}
