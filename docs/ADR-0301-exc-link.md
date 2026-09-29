# ADR-0301: excalidraw `link` の往復

## 状態
承認 — round48

## 背景
excalidraw 要素の `link` (URL) は emit 時 `null` 固定・輸入も
未対応で、ハイパーリンクが往復で落ちていた。

## 決定
export `link:s.link||null`、import `https?://` 検証済みの
`e.link` → `s.link` (500 字上限)。

## 断念した代替案
- ctx「リンクを開く/設定」UI — raw 上限のためプロパティ往復のみ
  今回実装し、UI は別 ADR。

## 影響
excalidraw 由来のリンクが保持され再輸出される。
