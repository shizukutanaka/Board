# ADR-0542: `data-t-ph` — placeholder の i18n 機構 + RTC ペースト欄

- 状態: 実装済み (v1.7.570)
- 系: i18n / UX

## 背景

`applyI18n` は `data-t` (textContent) / `data-t-aria` / `data-t-title` を
翻訳するが、placeholder 属性を翻訳する経路がなかった。RTC のペースト欄
(`rtcOfferIn`/`rtcAnswerIn`) は `placeholder=""` が空で、フィールドの用途が
入力欄を空眺めしただけでは分かりにくかった。

## 決定

- `applyI18n` に `data-t-ph` の走査を追加:
  `for(const el of _qsa(document,'[data-t-ph]'))el.placeholder=tk(...)`
  (`k.xxx` ネスト解決の `tk` を流用)。
- `rtcOfferPh` / `rtcAnswerPh` キーを ja/en に追加し、2 つのペースト欄に
  `data-t-ph` を付与。

## 影響

- 言語切替 (UI.toggleLang → applyI18n) で placeholder も追従。
- 検索ボックス (sqinput) は動的生成のため従来通り個別設定のまま。
- ~420B 使用 — コメント刈りで相殺し raw 残量 ~51B に回復。
