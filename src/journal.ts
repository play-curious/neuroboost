import * as PIXI from "pixi.js";

import { GlitchFilter } from "@pixi/filter-glitch";
import { CRTFilter } from "pixi-filters";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";

import * as variable from "./variable";
import * as extension from "./extension";

const options: {[key: string]: any} = {
  method: {
    closeQuestion: {
      question: "Lorsque tu as besoin de réviser, quelles techniques utilises-tu ?",
      answers: [
        "Rappel libre",
        "Lecture de notes",
        "Lecture à voix haute",
        "Révision en groupe",
        "Faire des exercices",
      ],
    },
    openQuestion: {
      question: "Si tu pouvais apprendre plus facilement ou retenir des informations plus longtemps, qu'est-ce que cela pourrait changer à ta vie ?"
    },
  },
  food: {
    closeQuestion: {
      question: "Penses-tu que ton alimentation est saine ?",
      answers: [
        "oui",
        "plus ou moins",
        "ça dépend",
        "non",
      ],
    },
    openQuestion: {
      question: "<Insérer une question sur l'alimentation ici>",
    }
  },
  sleep: {
    closeQuestion: {
      question: "Penses-tu que ton rythme de sommeil est sein ?",
      answers: [
        "oui",
        "plus ou moins",
        "ça dépend",
        "non",
      ],
    },
    openQuestion: {
      question: "<Insérer une question sur le sommeil ici>",
    }
  }
};

export class JournalScene extends extension.ExtendedCompositeEntity {
  private _glitch: PIXI.Filter & GlitchFilter;
  private _holo: PIXI.Filter & CRTFilter;
  private _container: PIXI.Container;
  private _htmlContainer: HTMLElement;

  constructor(
    private variableStorage: variable.VariableStorage,
    private option: string) {
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
    this._holo = new CRTFilter({
      curvature: 0,
      lineWidth: 0.5,
      lineContrast: 0.3,
      noise: 0.15
    }) as any;

    this._container = new PIXI.Container();
    this._container.filters = [this._glitch, this._holo];
    this.config.container.addChild(this._container);

    //this._graphics.setBackground("bedroom", "night")
    this._container.addChild(this.makeSprite("images/ui/journal_bg.png"));

    const shifting = 5;
    const frequency = 2000;

    this._activateChildEntity(
      new entity.FunctionalEntity({
        update: () => {
          this._holo.seed = Math.random();
          this._holo.time = (this._holo.time + 0.1) % 20;
        }
      })
    )

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
        `<p>${options[this.option].closeQuestion.question}</h1>`
      );
      const answers = options[this.option].closeQuestion.answers;
      console.log(answers);
      for (let i = 0; i < answers.length; i++) {
        leftElements.insertAdjacentHTML(
          "beforeend",
          `<br>
        <input type="radio" name="closed-question" id="closed-question-${i}" value="${i}">
        <label for="closed-question-${i}">${answers[i]}</label>`
        );
      }
    }

    {
      const rightElements = document.createElement("div");
      this._htmlContainer.appendChild(rightElements);

      const rightQuestion = document.createElement("p");
      rightQuestion.textContent = options[this.option].openQuestion.question;
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
      textArea.style.width = "735px";
      textArea.style.height = "425px";
      textArea.style.fontSize = "28px";
      textArea.style.fontFamily = "Ubuntu";
      textArea.style.color = "white";
      textArea.style.border = "none";
      textArea.style.borderRadius = "2%";
      textArea.style.background = "transparent";
      textArea.style.resize = "none";
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
