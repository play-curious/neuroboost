import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";

import * as extension from "./extension";
import * as variable from "./variable";
import * as dialog from "./dialog";
import * as popup from "./popup";

const localStorageKey = "neuroboost-save";

export class CompletedChapter {
  score: number = 0;
  completedJournal: boolean = false;
  completedSages: boolean = false;
}

export interface GraphicsState {
  lastBg?: string;
  lastBgMood?: string;
  lastCharacter?: string;
  lastMood?: string;
  lastMusic?: string;
  lastGauges?: string[];
}

export interface CurrentChapter {
  levelName: string;
  nodeName: string;
  /** Set<string> */
  visited: string[];
  visitedPermanent: string[];
  graphicsState: GraphicsState;
}

export interface History {
  texts: [type: string, text: string][];
  lastTime: number;
}

class SaveData {
  currentChapter: CurrentChapter;
  completedChapters: Record<string, CompletedChapter> = {};
  // history: History;
  variableStorage: variable.Variables;
}

// export interface SaveData {
//   levelName: string;
//   nodeName: string;
//   history: {
//     texts: [type: string, text: string][];
//     lastTime: number;
//   };
//   /** Set<string> */
//   visited: string[];
//   /** Set<string> */
//   visitedPermanent: string[];
//   lastGraphics: Partial<{
//     lastBg: string;
//     lastBgMood: string;
//     lastCharacter: string;
//     lastMood: string;
//     lastMusic: string;
//     lastGauges: string[];
//   }>;
//   variableStorage: variable.Variables;
// }

export function hasSave(): boolean {
  return !!localStorage.getItem(localStorageKey);
}

export function deleteSave() {
  localStorage.removeItem(localStorageKey);
}

export function updateCurrentChapter(data: CurrentChapter): void {
  const saveData = getSave();
  saveData.currentChapter = data;
  updateSave(saveData);
}

export function clearCurrentChapter(): void {
  const saveData = getSave();
  delete saveData.currentChapter;
  updateSave(saveData);
}

export function getCurrentChapter(): CurrentChapter | undefined {
  const saveData = getSave();
  return saveData.currentChapter;
}

export function updateCompletedLevel(name: string, score: number) {
  const completedChapter = getCompletedChapter(name);
  completedChapter.score = Math.max(score, completedChapter.score);
  updateCompletedChapter(name, completedChapter);
}

export function updateCompletedJournal(name: string) {
  const completedChapter = getCompletedChapter(name);
  completedChapter.completedJournal = true;
  updateCompletedChapter(name, completedChapter);
}

export function updateCompletedSages(name: string) {
  const completedChapter = getCompletedChapter(name);
  completedChapter.completedSages = true;
  updateCompletedChapter(name, completedChapter);
}

function updateCompletedChapter(name: string, data: CompletedChapter): void {
  const saveData = getSave();
  saveData.completedChapters[name] = data;
  updateSave(saveData);
}

export function getCompletedChapter(name: string): CompletedChapter {
  const saveData = getSave();
  let completedChapter = saveData.completedChapters[name];
  if (!completedChapter) completedChapter = new CompletedChapter();
  return completedChapter;
}

export function getCompletedChapters(): Record<string, CompletedChapter> {
  const saveData = getSave();
  return saveData.completedChapters;
}

export function updateVariableStorage(data: variable.Variables): void {
  const saveData = getSave();
  saveData.variableStorage = data;
  updateSave(saveData);
}

export function getVariableStorage(): variable.Variables | undefined {
  const saveData = getSave();
  return saveData.variableStorage;
}

// export function saveHistory(data: History): void {
//   const saveData = getSave();
//   saveData.history = data;
//   updateSave(saveData);
// }

// export function getHistory(): History | undefined {
//   const saveData = getSave();
//   return saveData.history;
// }

/** Retrieves an existing save date, if available, or returns an empty one */
function getSave(): SaveData {
  const json = localStorage.getItem(localStorageKey);
  if (!json) {
    // Create empty save
    return new SaveData();
  }

  return JSON.parse(json);
}

function updateSave(data: SaveData): void {
  localStorage.setItem(localStorageKey, JSON.stringify(data));
}

// export function save(ctx: dialog.DialogScene) {
//   const data: SaveData = {
//     levelName: ctx.levelName,
//     nodeName: ctx.lastNodeData?.title ?? "Start",
//     lastGraphics: ctx.graphics.last,
//     variableStorage: ctx.config.variableStorage.data,
//     visited: [...ctx.visited],
//     visitedPermanent: [...ctx.visitedPermanent],
//     history: ctx.config.history,
//   };

//   localStorage.setItem("save", JSON.stringify(data));
// }

// export function getSave(): SaveData {
//   return JSON.parse(localStorage.getItem("save"));
// }

// export class StartMenu extends extension.ExtendedCompositeEntity {
//   container: PIXI.Container;
//   background: entity.AnimatedSpriteEntity;
//   continueButton?: PIXI.Sprite;
//   newGameButton: PIXI.Sprite;

//   _setup() {
//     this.container = new PIXI.Container();
//     this.background = this.makeAnimatedSprite(
//       "images/bg/outside/background.json"
//     );

//     this._activateChildEntity(
//       this.background,
//       entity.extendConfig({
//         container: this.container,
//       })
//     );

//     if (hasSave()) {
//       this.continueButton = this.makeSprite(
//         "images/ui/start_menu_button.png",
//         (it) => {
//           it.anchor.set(0.5);
//           it.buttonMode = true;
//           it.interactive = true;
//           it.position.set(1920 / 2, 1080 * 0.4);
//           it.addChild(
//             this.makeText(
//               "Continuer",
//               {
//                 fontFamily: "Ubuntu",
//                 fill: 0xffffff,
//               },
//               (txt) => {
//                 txt.anchor.set(0.5);
//                 txt.scale.set(2);
//               }
//             )
//           );

//           this.container.addChild(it);

//           this._on(it, "pointerup", () => {
//             this.config.fxMachine.play("Click");

//             StartMenu.loadSave = true;

//             // load saved node from saveData.node
//             this._transition = entity.makeTransition(getSave().levelName);
//           });
//         }
//       );
//     }

//     this.newGameButton = this.makeSprite(
//       "images/ui/start_menu_button.png",
//       (it) => {
//         it.anchor.set(0.5);
//         it.buttonMode = true;
//         it.interactive = true;
//         it.position.set(1920 / 2, hasSave() ? 1080 * 0.6 : 1080 / 2);
//         it.addChild(
//           this.makeText(
//             "Nouvelle partie",
//             {
//               fontFamily: "Ubuntu",
//               fill: 0xffffff,
//             },
//             (txt) => {
//               txt.anchor.set(0.5);
//               txt.scale.set(2);
//               //txt.position.set(it.width / 2, it.height / 2);
//             }
//           )
//         );

//         this.container.addChild(it);

//         this._on(it, "pointerup", () => {
//           this.config.fxMachine.play("Click");

//           if (hasSave()) {
//             this._activateChildEntity(
//               new popup.Confirm(
//                 "Vous avez une partie en cours. Êtes vous sûr de vouloir en commencer une nouvelle ?",
//                 (ok) => {
//                   if (ok) {
//                     deleteSave();
//                     this._transition = entity.makeTransition(firstLevel);
//                   }
//                 }
//               )
//             );
//           } else {
//             deleteSave();
//             this._transition = entity.makeTransition(firstLevel);
//           }
//         });
//       }
//     );

//     this.config.container.addChild(this.container);
//   }

//   _teardown() {
//     this.config.container.removeChild(this.container);
//   }
// }
