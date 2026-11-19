import type { StyleId } from "../core/settings";
import { analogView } from "./analog";
import { bareView } from "./bare";
import { flipView } from "./flip";
import { glassView } from "./glass";
import { skyView } from "./sky";
import type { ClockView } from "./view";

export function createView(style: StyleId): ClockView {
  switch (style) {
    case "analog":
      return analogView();
    case "flip":
      return flipView();
    case "sky":
      return skyView();
    case "bare":
      return bareView();
    default:
      return glassView();
  }
}

/** Styles drawn on a glass card that should get the system blur on macOS. */
export const usesNativeGlass = (style: StyleId) => style === "glass";
