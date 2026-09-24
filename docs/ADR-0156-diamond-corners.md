# ADR-0156: ダイヤの角丸 (`s.r`)

## 状態

実装済み (v1.7.214)。

## 背景

ADR-0136 で rect に `s.r` の角丸巡回 (ctx「角丸を切替」8→16
→24→0) を入れたが、diamond は常に尖ったままだった。フロー
チャートで角丸矩形と菱形の判断ノードが混在すると質感が揃わ
ない。Mermaid/draw.io は両者の角丸を許容する。

## 決定

- `_diamondPath(c,s)`: 各頂点を両エッジに沿って r だけ切り落
  とし、頂点を制御点とする二次ベジエで橋ぐ (rect の
  `roundRect` と同じ手法の多角形版)。`s.r==null` は従来の
  尖ったポリゴン (後方互換)。
- canvas (drawShape)・SVG (path d を要素+クリップで共有)・
  ctx ゲート・`cycleCorner` の4経路を同時更新。diamond は
  既定 r=0 → 巡回の終点 `0` が「尖ったまま」を表現。
- `s.r` の上限は `min(|w|/6,|h|/6)` — 菱形の短い対角線上で
  過剰な丸みを防ぐ (rect は /4)。

## 断念した代替案

- **s.dia など別 prop**: 同じ「角丸」概念を型別に増やすと
  styleClipboard/変換の追従点が増える — `s.r` 共有で済む。

## 影響

- 描画+ctx。`s.r` は既に styleClipboard・wire・import で
  流れる prop のため配線追加なし。
