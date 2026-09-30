# ADR-0901 — UI 配線監査完走 (ボタン・メニュー・入力・i18n キー)

## 状態

DOM 要素の「宣言→参照→リスナ」3 段階と、メニュー項目の「表示→ハンドラ→文言」
3 段階を機械的に網羅し、dead control / unwired handler / 未翻訳キーなしを確認した。
**実害なし — 記録のみ。**

## 検証マトリクス

| 面 | 件数 | 結果 |
|---|---|---|
| `id="…"` 宣言要素 | 94 | 全て `_g('…')` 等で参照済み (孤児 id 0) |
| ツールバーボタン | 11 | 全て `_oC` ハンドラ付き (undo/redo/zoom/theme/lang/share/present/help/export/install) |
| ページバー | 6 | pgAdd/pgDel/pgDup/pgName/pgPrev/pgNext 全て配線 |
| Share/RTC モーダル | 8 | copy/create/connect 全ボタン配線 |
| ライブ入力 | 4 | docName (input/compositionend/change/blur)・rngSize/rngOpacity (focus/pointerdown/input/change) — IME 安全コミット完備 |
| ctx メニュー項目 | 92 | 全項目 `[key,shortcut,fn]` — fn 未定義なし、`t(k)` 全キー T 存在 |
| Export メニュー項目 | 13 | 全項目実関数 (PNG 3系/View/Copy/SVG/PDF/board/copy/exc/drawio/import) |
| ツールボタン | 13 | data-tool 全件 KEYMAP 対応 (v/h/p/k/r/o/a/l/t/n/f/e/d + i:eyedropper) |
| `data-t*` i18n 属性 | 92 | 全キー `T.k`/`T` に解決先あり (data-t-aria/data-t-title/data-t-ph 含む) |
| helpGrid 行 | 全 | `t()`/`k.*` 参照全て解決可 |

## 規則

新規 UI コントロールは (1) `id` 宣言、(2) `wire()` 内リスナ、(3) `data-t*` または
`_tC` による i18n 文言、の3点を同時に満たす。ctx メニュー追加時は項目キーの
`T.k` エントリが必須 (i18n coverage テスト ADR-0335 が検査)。
