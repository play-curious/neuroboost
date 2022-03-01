import * as PIXI from "pixi.js";

import { GlitchFilter } from "@pixi/filter-glitch";
import { CRTFilter } from "pixi-filters";

import * as jsPdf from "jspdf";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";

import * as variable from "./variable";
import * as extension from "./extension";
import { couldStartTrivia } from "typescript";

const options: {[key: string]: any} = {
  method: {
    closeQuestion: {
      question: "Lorsque tu as besoin de réviser, quelle technique utilises-tu ?",
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
        "Oui",
        "Souvent oui",
        "Rarement oui",
        "Non",
      ],
    },
    openQuestion: {
      question: "Comment pourrais-tu améliorer ton alimentation pour mieux apprendre ?",
    }
  },
  sleep: {
    closeQuestion: {
      question: "De combien de temps de sommeil as tu besoin ?",
      answers: [
        "10h ou plus",
        "9h",
        "8h",
        "7h",
        "6h ou moins",
      ],
    },
    openQuestion: {
      question: "Quels facteurs te permettent de bien dormir le soir ?",
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

    const leftElements = document.createElement("div");
    const answers = options[this.option].closeQuestion.answers;
    const answersInputs: HTMLInputElement[] = []; 
    {
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

      for (let i = 0; i < answers.length; i++) {
        const answer: HTMLInputElement = document.createElement("input");
        answer.type = "radio";
        answer.name = "closed-question";
        answer.id = `closed-question-${i}`;
        answer.value = `${i}`;
        answersInputs[i] = answer;

        const label: HTMLLabelElement = document.createElement("label");
        label.innerText = `${answers[i]}`;
        label.setAttribute("for", `closed-question-${i}`);

        leftElements.append(
          document.createElement("br"),
          answer,
          label
        )
      }
    }

    const rightElements = document.createElement("div");
    const textArea = document.createElement("textArea");
    {
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
            () => {
              const journalStorage = this.config.variableStorage.get("journalAnswers");
              journalStorage[this.option] = {};
              for(const answer of answersInputs){
                if(answer.checked) {
                  journalStorage[this.option].closeQuestion = answer.id.split("-")[2];
                }
              }
              journalStorage[this.option].openQuestion = (textArea as HTMLInputElement).value;
console.log("A")
              journalToPDF(journalStorage);
console.log("B");
              this.config.variableStorage.set("journalAnswers", journalStorage);

              this._transition = entity.makeTransition();
            }
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

export function journalToPDF(journalStorage: any) {
  const doc = new jsPdf.jsPDF();
    const offset = 7;
    let page = 1;
    for(const journal in journalStorage){
      doc.setPage(page);
      let currentY = 15;
      const textOptions: jsPdf.TextOptionsLight = {
        maxWidth: 180,
      };
      
      // CloseQuestion
      const closeQuestion = options[journal].closeQuestion;
      doc.setFontSize(16);
      doc.text(`${closeQuestion.question}`, 15, currentY, textOptions)
      doc.setFontSize(14);
      let i = 0;
      for(const answer of closeQuestion.answers){
        doc.setFont(undefined, i == journalStorage[journal].closeQuestion ? "bold" : "normal");
        doc.text(`    - ${answer}\n`, 15, currentY + offset * (i++ + 1), textOptions);
      }

      const openQuestionOffset = (2 * currentY) + (offset * (i + 1));
      doc.setFontSize(16).setFont(undefined, "normal");
      doc.text(`${options[journal].openQuestion.question}`, 15, openQuestionOffset, textOptions)
      doc.setFontSize(14);
      doc.text(`${journalStorage[journal].openQuestion}`, 15, openQuestionOffset + (offset*2), textOptions);


      doc.addPage();
      page++;
    }

    doc.deletePage(doc.getNumberOfPages());

    doc.output("dataurlnewwindow");
}