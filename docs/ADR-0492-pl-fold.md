# ADR-0492: `_pL` — pts の末尾点アクセサ

## 状態

実装済 (v1.7.525)

## 背景

`pts[_ln(pts)-1]` (末尾点) が 16 サイトに複写 — pen stroke 描画・bbox スキャン・
conn waypoints・drawio emit/import など。

## 決定

`_pL(pts)=>pts[_ln(pts)-1]` に集約 — 単純 shorthand、既存 `_mid` と同じ宣言ブロック。

## 影響

- index.html −32B (523,274 → 523,242)
- 動作変更なし
