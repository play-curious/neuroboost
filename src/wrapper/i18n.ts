import i18n from "../generated/i18n";

import * as _ from "underscore";

import * as entity from "booyah/src/entity";

export type levelType = "c1";

export function translateDialog<
  ColIndex extends keyof i18n[keyof i18n][levelType] & number,
  ColName extends i18n[keyof i18n][levelType][ColIndex]["id"]
>(
  ctx: entity.EntityBase,
  level: levelType,
  lineId: ColName,
  originalText: string
): string {
  console.log(ctx.entityConfig.language);
  if (ctx.entityConfig.language === "fr") {
    return originalText;
  }
  return translate(ctx, level, lineId, "text");
}

export function translateInterface<
  ColIndex extends keyof i18n[keyof i18n]["interface"] & number,
  ColName extends i18n[keyof i18n]["interface"][ColIndex]["id"]
>(ctx: entity.EntityBase, rowId: ColName, data: any = {}): string {
  return translate(ctx, "interface", rowId, "text", data);
}

export function translateJournal<
  ColIndex extends keyof i18n[keyof i18n]["journal"] & number,
  ColName extends i18n[keyof i18n]["journal"][ColIndex]["id"]
>(
  ctx: entity.EntityBase,
  rowId: ColName,
  columnId: keyof i18n[keyof i18n]["journal"][ColIndex]
): string {
  return translate(ctx, "journal", rowId, columnId);
}

export function translate<
  TabName extends keyof i18n[keyof i18n],
  ColIndex extends keyof i18n[keyof i18n][TabName] & number,
  ColName extends i18n[keyof i18n][TabName][ColIndex]["id"]
>(
  ctx: entity.EntityBase,
  bottomTabName: TabName,
  rowId: ColName,
  columnId: keyof i18n[keyof i18n][TabName][ColIndex],
  data: any = {}
): string {
  try {
    if (!ctx.entityConfig.jsonAssets.hasOwnProperty(bottomTabName))
      throw new Error(`The drive not contains a "${bottomTabName}" tab!`);
    if (!ctx.entityConfig.jsonAssets[bottomTabName].hasOwnProperty(rowId))
      throw new Error(
        `The drive "${bottomTabName}" tab not contains a "${rowId}" row id!`
      );

    if (
      !ctx.entityConfig.jsonAssets[bottomTabName][rowId].hasOwnProperty(
        columnId
      )
    )
      throw new Error(
        `The drive "${bottomTabName}" (row id: ${rowId}) not contains a "${columnId}" column name!`
      );

    return _.template(
      ctx.entityConfig.jsonAssets[bottomTabName][rowId][columnId]
    )({ ...ctx.entityConfig.level?.ejsContext, ...data });
  } catch (e) {
    console.warn(
      `No translation found for ${bottomTabName}/${columnId}/${rowId} => `,
      e.message
    );
    return "%== placeholder ==%";
  }
}
