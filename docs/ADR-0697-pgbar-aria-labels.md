# ADR-0697 — ページバーボタンの aria-label

## 状態
採用 (v1.7.723)

## 文脈
`#pgBar` の6ボタン (`‹`/`✎`/`›`/`+`/`⧉`/`✕`) は `data-t-title` だけで
アクセシブル名が `title` 属性フォールバック頼みだった。ツールバー等の他の
コントロールは全て `data-t-aria` → `aria-label` を持つため、SR では裸の
グリフとして読まれる不整合が残っていた。

## 変更
6 ボタン全てに `data-t-aria` を付与。キーは既存 i18n (`pgPrev`/`pgRename`/
`pgNext`/`pgAdd`/`pgDup`/`pgDel`) をそのまま再利用 — 文言は title と一致。

## 検証
`[data-t-aria]` 走査が document 全体に効くため `#pgBar` が `hidden` でも
初期化時に適用されることを確認。test.mjs に6キーのソースピンを追加。
