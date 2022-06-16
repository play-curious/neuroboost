import * as PIXI from "pixi.js";
import * as pixiExtract from "@pixi/extract";
import * as jsPdf from "jspdf";

import * as entity from "booyah/src/entity";

import * as filter from "./graphics_filter";
import * as variable from "./variable";
import * as extension from "./extension";
import dayjs from "dayjs";

const options: { [key: string]: any } = {
  // Journal jour 1
  method: {
    title: "Méthode de révision",
    closeQuestion: {
      question:
        "Lorsque tu as besoin de réviser, quelle technique utilises-tu ?",
      answers: [
        "Rappel libre",
        "Lecture de notes",
        "Lecture à voix haute",
        "Révision en groupe",
        "Faire des exercices",
      ],
    },
    openQuestion: {
      question:
        "Si tu pouvais apprendre plus facilement ou retenir des informations plus longtemps, qu'est-ce que cela pourrait changer à ta vie ?",
    },
  },
  // Journal jour 2
  food: {
    title: "Alimentation",
    closeQuestion: {
      question: "Penses-tu que ton alimentation est saine ?",
      answers: ["Oui", "Souvent oui", "Rarement oui", "Non"],
    },
    openQuestion: {
      question:
        "Comment pourrais-tu améliorer ton alimentation pour mieux apprendre ?",
    },
  },
  // Journal jour 2
  sleep: {
    title: "Sommeil",
    closeQuestion: {
      question: "De combien de temps de sommeil as tu besoin ?",
      answers: ["10h ou plus", "9h", "8h", "7h", "6h ou moins"],
    },
    openQuestion: {
      question: "Quels facteurs te permettent de bien dormir le soir ?",
    },
  },
  // Journal jour 3
  mentalWorkload: {
    title: "Charge mentale",
    closeQuestion: {
      question: "Combien de balles sais-tu jongler ?",
      answers: ["1", "2", "3", "4", "5 ou plus"],
    },
    openQuestion: {
      question:
        "Comment pourrais-tu faire pour réduire les distracteurs dans ton travail ?",
    },
  },
  // Journal jour 4
  profiles: {
    title: "Profils d'apprentissage",
    closeQuestion: {
      question:
        "De quel sage est-tu le plus proche en tant que profil d'apprentissage ?",
      answers: ["Tembde", "Azul", "Sapiens", "LedAI"],
    },
    openQuestion: {
      question:
        "As-tu déjà recontré des problèmes en travaillant avec des personnes de profil différents ?",
    },
  },
  // Journal jour 5
  stress: {
    title: "Stress",
    closeQuestion: {
      question: "A quelle fréquence te trouves-tu en situation de stresse ?",
      answers: [
        "Tout les jours",
        "Toutes les semaines",
        "Tout les mois",
        "Rarement",
      ],
    },
    openQuestion: {
      question:
        "Lorsqu'il tu es stressé, que fais-tu comme activité pour lâcher prise ? ",
    },
  },
  // Journal jour 6
  organisation: {
    title: "Organisation",
    closeQuestion: {
      question: "Est-ce que tu étudies le weekend ?",
      answers: [
        "Non, le weekend est sacré",
        "Seulement si je ne peux pas faire autrement",
        "Le weekend, le soir, la journée... ils sont tout pareil",
      ],
    },
    openQuestion: {
      question:
        "Comment fais-tu pour organiser tes priorités, lorsque tu as beaucoup de tâches à jongler ?",
    },
  },
  // Journal jour 7
  success: {
    title: "Success",
    closeQuestion: {
      question: "Quel est ton rapport à la réussite ?",
      answers: [
        "Stratégique - Je fais tout pour obtenir les meilleurs résultats",
        "Compréhensive - C'est l'apprentissage qui compte, pas le diplôme",
        "Instrumentale - Je dois juste valider mon année",
        "Relative - Mon but est de faire aussi bien que mes amis",
      ],
    },
    openQuestion: {
      question:
        "En dehors du travail et des études, quels objectifs fixes-tu pour la vie ?",
    },
  },
};

export class JournalScene extends extension.ExtendedCompositeEntity {
  private _glitch: filter.Glitch;
  private _holo: filter.Holograph;
  private _container: PIXI.Container;
  private _htmlContainer: HTMLElement;

  constructor(private name: string) {
    super();
  }

  _setup(): void {
    this._container = new PIXI.Container();
    this.config.container.addChild(this._container);

    //this._graphics.setBackground("bedroom", "night")
    this._container.addChild(this.makeSprite("images/ui/journal_bg.png"));

    // Handle filters
    this._holo = filter.newHolograph();
    this._glitch = filter.newGlitch();
    this._container.filters = [this._glitch, this._holo];
    this._activateChildEntity(filter.wrapHolograph(this._holo as any));
    this._activateChildEntity(filter.wrapGlitch(this._glitch as any));

    // Handle html
    const htmlLayer = document.getElementById("html-layer");
    this._htmlContainer = document.createElement("div");
    htmlLayer.appendChild(this._htmlContainer);

    const leftElements = document.createElement("div");
    const answers = options[this.name].closeQuestion.answers;
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
        `<p>${options[this.name].closeQuestion.question}</h1>`
      );

      const answers = options[this.name].closeQuestion.answers;

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

        leftElements.append(document.createElement("br"), answer, label);
      }
    }

    const rightElements = document.createElement("div");
    const textArea = document.createElement("textArea");
    {
      this._htmlContainer.appendChild(rightElements);

      const rightQuestion = document.createElement("p");
      rightQuestion.textContent = options[this.name].openQuestion.question;
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

          this._on(it, "pointerup", () => {
            this.config.fxMachine.play("Click");

            const journalStorage =
              this.config.variableStorage.get("journalAnswers");
            journalStorage[this.name] = {};
            for (const answer of answersInputs) {
              if (answer.checked) {
                journalStorage[this.name].closeQuestion =
                  answer.id.split("-")[2];
              }
            }
            journalStorage[this.name].openQuestion = (
              textArea as HTMLInputElement
            ).value;

            this.config.variableStorage.set("journalAnswers", journalStorage);

            this._transition = entity.makeTransition();
          });
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

const _options: any = {
  margin: {
    top: 15,
    bottom: 15,
    left: 15,
    right: 15,
  },
};

export class JournalPDF extends extension.ExtendedCompositeEntity {
  journalToPDF(journalStorage: any, bgImage: PIXI.Sprite) {
    const doc = new jsPdf.jsPDF();

    const textOptions: jsPdf.TextOptionsLight = {
      maxWidth: 210 - (_options.margin.left + _options.margin.right),
      baseline: "top",
    };

    const bgBase64 =
      this.config.app.renderer.plugins.extract.image(bgImage).src;

    let page = 1;
    for (const journal in journalStorage) {
      doc.setPage(page);
      doc.addImage(bgBase64, "PNG", 0, 0, 210, 297);

      // Title
      doc.setFontSize(22);
      doc.text(
        `${options[journal].title}`,
        _options.margin.left,
        15,
        textOptions
      );

      // CloseQuestion
      const closeQuestion = options[journal].closeQuestion;
      doc.setFontSize(20);
      doc.text(
        `${closeQuestion.question}`,
        _options.margin.left,
        35,
        textOptions
      );
      doc.setFontSize(17);
      let i = 0;
      for (const answer of closeQuestion.answers) {
        doc.setFont(
          undefined,
          i == journalStorage[journal].closeQuestion ? "bold" : "normal"
        );
        doc.text(
          `    - ${answer}\n`,
          _options.margin.left,
          61 + 10 * i++,
          textOptions
        );
      }

      // OpenQuestion
      doc.setFontSize(19).setFont(undefined, "normal");
      doc.text(
        `${options[journal].openQuestion.question}`,
        _options.margin.left,
        148,
        textOptions
      );
      doc.setFontSize(17);
      doc.text(
        `    ${journalStorage[journal].openQuestion}`,
        _options.margin.left,
        174,
        textOptions
      );

      doc.addPage();
      page++;
    }

    doc.deletePage(doc.getNumberOfPages());

    doc.save(`JournalMetacognition (${dayjs().format("DD-MM-YYYY HH-mm-ss")})`);
  }
}
