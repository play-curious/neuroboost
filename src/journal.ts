import * as PIXI from "pixi.js";
import * as pixiExtract from "@pixi/extract";
import * as jsPdf from "jspdf";

import * as entity from "booyah/src/entity";

import * as filter from "./graphics_filter";
import * as variable from "./variable";
import * as extension from "./extension";
import * as save from "./save";
import dayjs from "dayjs";
import { translateJournal } from "./wrapper/i18n";
import i18n from "./generated/i18n";

export class JournalScene extends extension.ExtendedCompositeEntity {
  private _glitch: filter.Glitch;
  private _holo: filter.Holograph;
  private _container: PIXI.Container;
  private _htmlContainer: HTMLFormElement;
  private _answerInputs: HTMLInputElement[];
  private _textArea: HTMLTextAreaElement;

  constructor(private name: i18n[keyof i18n]["journal"][number]["id"]) {
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
    this._htmlContainer = document.createElement("form");
    htmlLayer.appendChild(this._htmlContainer);

    // Create closed question on left
    {
      const leftElements = document.createElement("div");
      leftElements.className = "journal-left-container";
      this._htmlContainer.appendChild(leftElements);

      leftElements.insertAdjacentHTML(
        "beforeend",
        `<p>${translateJournal(this, this.name, "closedquestion")}</h1>`
      );
      this._answerInputs = [];

      for (let i = 0; i < 5; i++) {
        const answer: HTMLInputElement = document.createElement("input");
        answer.type = "radio";
        answer.required = true;
        answer.name = "closed-question";
        answer.id = `closed-question-${i}`;
        answer.value = `${i}`;
        this._answerInputs[i] = answer;

        const label: HTMLLabelElement = document.createElement("label");
        let answerTag = ("answer" +
          (i + 1)) as keyof i18n[keyof i18n]["journal"][number];
        label.innerText = `${translateJournal(this, this.name, answerTag)}`;
        label.setAttribute("for", `closed-question-${i}`);

        leftElements.append(document.createElement("br"), answer, label);
      }
    }

    // Create open question on right
    {
      const rightElements = document.createElement("div");
      this._htmlContainer.appendChild(rightElements);

      const rightQuestion = document.createElement("p");
      rightQuestion.className = "journal-right-question";
      rightQuestion.textContent = translateJournal(
        this,
        this.name,
        "openquestion"
      );
      rightElements.appendChild(rightQuestion);

      this._textArea = document.createElement(
        "textArea"
      ) as HTMLTextAreaElement;
      this._textArea.required = true;
      this._textArea.minLength = 30;
      this._textArea.placeholder = "Ecrire ici...";
      this._textArea.className = "journal-right-answer";
      rightElements.appendChild(this._textArea);

      // Validate button
      {
        const buttonContainer = new PIXI.Container();
        buttonContainer.position.set(1603, 803);
        this._container.addChild(buttonContainer);

        const button = this.makeSprite("images/ui/journal_button.png");
        button.anchor.set(0.5, 0.5);
        button.interactive = true;
        button.buttonMode = true;
        this._on(button, "pointerup", this._validate);
        buttonContainer.addChild(button);

        const buttonText = new PIXI.Text("VALIDER", {
          fontFamily: "Ubuntu",
          fontSize: 32,
          fill: "white",
        });
        buttonText.anchor.set(0.5, 0.5);
        buttonContainer.addChild(buttonText);
      }

      // Skip button
      {
        const buttonContainer = new PIXI.Container();
        buttonContainer.position.set(1300, 803);
        this._container.addChild(buttonContainer);

        const button = this.makeSprite("images/ui/journal_button.png");
        button.anchor.set(0.5, 0.5);
        button.interactive = true;
        button.buttonMode = true;
        button.tint = 0xdddddd;
        this._on(button, "pointerup", this._skip);
        buttonContainer.addChild(button);

        const buttonText = new PIXI.Text("Passer", {
          fontFamily: "Ubuntu",
          fontSize: 32,
          fill: 0xdddddd,
        });
        buttonText.anchor.set(0.5, 0.5);
        buttonContainer.addChild(buttonText);
      }
    }
  }

  _teardown() {
    this.config.container.removeChild(this._container);
    this._container = null;

    this._htmlContainer.remove();
    this._htmlContainer = null;
  }

  private _validate() {
    const isValid = this._htmlContainer.reportValidity();
    if (!isValid) {
      this.config.fxMachine.play("Failure");
      return;
    }

    this.config.fxMachine.play("Success");

    const journalStorage = this.config.variableStorage.get("journalAnswers");
    journalStorage[this.name] = {};
    for (const answer of this._answerInputs) {
      if (answer.checked) {
        journalStorage[this.name].closeQuestion = answer.id.split("-")[2];
      }
    }
    journalStorage[this.name].openQuestion = this._textArea.value;

    this.config.variableStorage.set("journalAnswers", journalStorage);
    save.updateVariableStorage(this.config.variableStorage.data);

    this._transition = entity.makeTransition();
  }

  private _skip() {
    this.config.fxMachine.play("Click");
    this._transition = entity.makeTransition("skip");
  }

  _onSignal(frameInfo: entity.FrameInfo, signal: string, data?: any): void {
    // When the game is paused, a menu is shown. Hide the html layer in that case
    if (!this._htmlContainer) return;

    if (signal === "pause") {
      this._htmlContainer.style.visibility = "hidden";
    } else if (signal === "play") {
      this._htmlContainer.style.visibility = "visible";
    }
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
        `${translateJournal(
          this,
          journal as i18n[keyof i18n]["journal"][number]["id"],
          "title"
        )}`,
        _options.margin.left,
        15,
        textOptions
      );

      // CloseQuestion
      const closeQuestion = translateJournal(
        this,
        journal as i18n[keyof i18n]["journal"][number]["id"],
        "closedquestion"
      );
      doc.setFontSize(20);
      doc.text(`${closeQuestion}`, _options.margin.left, 35, textOptions);
      doc.setFontSize(17);
      let i = 0;
      for (let answer = 0; answer < 5; answer++) {
        doc.setFont(
          undefined,
          i == journalStorage[journal].closeQuestion ? "bold" : "normal"
        );
        doc.text(
          `    - ${translateJournal(
            this,
            journal as i18n[keyof i18n]["journal"][number]["id"],
            ("answer" +
              (answer + 1)) as keyof i18n[keyof i18n]["journal"][number]
          )}\n`,
          _options.margin.left,
          61 + 10 * i++,
          textOptions
        );
      }

      // OpenQuestion
      doc.setFontSize(19).setFont(undefined, "normal");
      doc.text(
        `${translateJournal(
          this,
          journal as i18n[keyof i18n]["journal"][number]["id"],
          "openquestion"
        )}`,
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
