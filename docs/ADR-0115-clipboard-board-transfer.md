# ADR-0115: クリップボード経由の .board 転送

## 状態

実装済み (v1.7.172)。

## 背景

`.board` JSON をテキストとしてペーストすると、従来はそのまま
テキスト形状になってしまった (ADR-0044 のテキストフォールバック)。
クリップボード経由でボード間コピーできれば、ファイル保存の往復が
不要になる。

## 決定

- **送信側**: `copyBoardJSON()` — `{v,docName,shapes}` を
  `roundShapesForExport` で整形してクリップボードへ (exportBoard
  と同一形式)。export メニューに `ctxCopyBoard`。
- **受信側**: ペーストハンドラで `/"shapes"\s*:\s*\[/` を検出し
  `importBoardText(s)` へ。JSON.parse + `validShape` フィルタ後、
  `_placeCopies` (id/groupId/binding 再割当) でビューポート中央に
  追加 — 同一 JSON の連続ペーストでも id 衝突しない。
- パース失敗・有効形状0なら `false` を返し従来の excalidraw/
  テキスト経路へフォールスルー (importExcText と同じ契約)。

## 断念した代替案

- **`importBoardText` で全面置換**: ペーストの期待動作は「追加」—
  置換は share-link 側の役割。`_placeCopies` で既存 doPaste と
  同じ追加+選択+undo 経路に揃えた。

## 影響

- コピー (⌘⇧C ではなくメニュー) → 別タブ/別ボードで ⌘V の
  ラウンドトリップが成立。
- excalidraw 判定 (`"type":"excalidraw"`) とは `"shapes":[` 有無で
  区別 — 両者は共存。
