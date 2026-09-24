# ADR-0439: `_oP`/`_cv` フォールド

## 状態
実装済 (v1.7.474)

## 背景
512KB 上限目前 (~64B) のため、残った読みサイトの shorthand fold:

- `s.opacity` → `_oP(s)` — 13 読みサイト (書きサイト `s.opacity=` 2 件と
  `sty.opacity` パース行は除外)
- `_ce('canvas')` → `_cv()` — 9 サイト

## 決定
mega-const 行に `_oP=s=>s.opacity,_cv=()=>_ce('canvas')` を追加。
Net 効果 ~150B 回収 (def コスト差し引き後)。

## 影響
- 上限を越さずに残りラウンドの余白を確保。
- `s.opacity==null` 等価比較も read-site として fold。
