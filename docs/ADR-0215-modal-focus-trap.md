# ADR-0215: モーダルのフォーカス復帰 + summary 到達

## 状態

実装済み (v1.7.273)。

## 背景

audit-2026-06 の残課題「focus trap」は既に `_trapStep`/
`_focusables` + dialog isolation で解決済みだったが、2件の
残件があった:
1. **フォーカス復帰**が閉じ側のハードコード (closeShare→
   btnShare) のみ — ctx メニュー等、別経路で開いた場合に
   間違った要素へ戻る
2. `_focusables` のセレクタに `summary` が無く、share 内の
   peer `<details>` が Tab 到達不能

## 決定

- `UI._captureFocus`/`_restoreFocus`: 開いた時点の
  `document.activeElement` を保存し、閉鎖時に復帰
  (toggleHelp/openShare/closeShare に配線)
- `_focusables` セレクタに `summary` を追加
- 既存の `_trapStep` ラップはそのまま利用 (重複実装は避けた)

## 断念した代替案

- 独自の document-capture trap (初版で書いたが既存と重複の
  ため撤去)

## 影響

- モーダル閉鎖時に呼び出し元へフォーカス復帰。
  share の「相手と直接つなぐ」details が Tab で開ける。
