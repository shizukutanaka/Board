# ADR-0294: 'bar' (T字) 矢印ヘッド

## 状態
承認 — round46

## 背景
矢印ヘッド語彙は arrow|dot|open|none だったが、excalidraw `bar`
(draw.io `dash`) の T字ヘッド — ER 図のカーディナリティ記法で多用 —
が未対応だった。

## 決定
- 描画: canvas/SVG の 'bar' を open の翼端結線 tick として実装
  (drawio 'dash' と同じ見た目)。
- 往復: excalidraw `bar`↔'bar' (値そのまま)、drawio `dash`↔'bar'。
- UI: HEAD_STYLES と開始ヘッド巡回に 'bar' を挿入 (i18n 更新)。

## 断念した代替案
- 'bar'→'open' 近似のみ — T字は別記法として保持する価値あり。

## 影響
ER 図・UML の T字ヘッドが正しく表示・編集・往復。2001 全緑。
