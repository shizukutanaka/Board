# ADR-0120: 同じ種類を選択 (ctx「Select same type」)

## 状態

実装済み (v1.7.177)。

## 背景

ADR-0104 の「同色を選択」で同色一括選択が入ったが、形状タイプでの
一括選択 (全コネクタ・全付箋など) は無い — コネクタだけに共通
操作 (ルートリセット・削除) したい場面で手作業になる。

## 決定

- `selectSameType()` — 単一選択時、同一 `s.type` の全形状を選択に
  置換。`selectSamePaint` と同一骨格 (toast + `_announceSel` +
  `invalidate`)。1件しか無ければ no-op。
- ctx `ctxSelectSameType` — `selection.size===1` ゲート、`ctxSelectSame`
  の直下に配置。

## 断念した代替案

- **選択を追加 (union) する動作**: 「その型だけに絞る」のが主用途 —
  Excalidraw の select-same 系も全置換で統一。

## 影響

- `selAllMatches` i18n を共有 (件数 toast は同じ文言)。
