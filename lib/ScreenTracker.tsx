// lib/ScreenTracker.ts
import { RefObject, createRef } from "react";

export const currentScreenRef: RefObject<string | null> = createRef();
currentScreenRef.current = null;
