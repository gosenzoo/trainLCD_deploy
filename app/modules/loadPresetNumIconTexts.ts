// src/lib/loadPresetNumIconTexts.ts
"use client";

import { presetNumIconTexts } from "@/src/generated/presetNumIconTexts";

/**
 * ビルド時に生成された presetNumIconTexts をそのまま返す。
 * use client のコンポーネントから直接呼んでOK。
 */
export function loadPresetNumIconTexts(): Record<string, string> {
  return presetNumIconTexts;
}
