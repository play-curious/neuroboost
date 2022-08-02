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

export interface DeadlineState {
  name: string;
  time: string;
  missed: boolean;
}

export interface GraphicsState {
  lastBg?: string;
  lastBgMood?: string;
  lastCharacter?: string;
  lastMood?: string;
  lastMusic?: string;
  lastGauges?: string[];
  lastDeadline?: DeadlineState;
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
