import * as slide from "./slide_text_entity";
import * as entity from "booyah/src/entity";

export class BubbleIconEntity extends slide.SlideTextEntity {
  public constructor() {
    super(1780, 6, "images/ui/bg_bubble_icon.png", {
      enterStyle: slide.EnterType.DOWN,
      icon: "images/ui/bubble_icon.png",
      icon_size: 0.25,
      icon_x: 25,
      icon_y: 50,
    });
  }

  public _setup(
    frameInfo: entity.FrameInfo,
    entityConfig: entity.EntityConfig
  ) {
    super._setup(frameInfo, entityConfig);
    this._icon.tint = 0;
  }
}
