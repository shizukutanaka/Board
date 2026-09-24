# ADR-0290: drawio `strokeColor=none` → transparent + fillColor=none emit

## 状態
承認 — round44

## 背景
`strokeColor=none` (罫線なし) は import で無視されデフォルト枠が
誤って描かれた。逆に `s.fill='none'` (ADR-0288) は export 時に省略
され、再 import でデフォルト塗りに戻っていた。

## 決定
- import: `strokeColor=none` → `s.stroke='transparent'` — CSS 有効色
  なので canvas/SVG/矢印ヘッド全経路がガード不要で不可視化。
- export: `s.stroke==='transparent'` → `strokeColor=none` に戻し、
  `s.fill==='none'` → `fillColor=none` を明示 emit。

## 断念した代替案
- `s.stroke='none'` + 全描画サイトにガード — fill と同じ手法だが
  stroke 参照点が多すぎるため透明色マップに。

## 影響
罫線なしシェイプが正しく表示・往復。1996 全緑。
