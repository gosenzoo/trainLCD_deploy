// src/lib/loadIconPresetTexts.ts
"use client";

import { iconPresetTexts } from "@/src/generated/iconPresetTexts";

/**
 * ビルド時に生成された iconPresetTexts をそのまま返す。
 * use client のコンポーネントから直接呼んでOK。
 * I_* (アイコンプリセット) と N_* (数字アイコンプリセット) の両方を含む。
 */
export function loadIconPresetTexts(): Record<string, string> {
  return iconPresetTexts;
}
