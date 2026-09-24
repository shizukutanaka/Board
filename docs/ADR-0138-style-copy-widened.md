# ADR-0138: スタイルコピーの対象プロパティ拡大

## 状態

実装済み (v1.7.195)。

## 背景

⌥C/⌥V のスタイルコピーが stroke/fill/size/opacity/dash/fstyle/
bold/italic のみで、テキスト揃え・下線/取消線・フォントサイズ・
角丸・矢印ヘッド・ルート (elbow/curve/cbend) が取りこぼされていた。
Office Format Painter / Figma ⌘⌥C/V は「見た目」全般を運ぶ。

## 決定

- `state.styleClipboard` に `align,fontSize,under,strike,r,head,
  start,elbow,curve,cbend` を追加。
- sticky の `color` は `fill` として読み出す — 付箋の黄色を矩形へ
  貼れる (貼付側は既存の `fill→color` マッピングで逆方向も成立)。
- ジオメトリ (x/y/w/h/pts/way/bend/rotate/flip/z) は引き続き
  対象外 — 「形」ではなく「見た目」を運ぶのが format painter の
  役割。

## 断念した代替案

- **型ごとに適用可能なキーだけコピー**: ターゲット依存のため
  コピー時に決められない — 全キーを運び、意味を持たないキーは
  貼付側で無害にスルーされる設計のまま。

## 影響

- `applyStyleToSelection` の既存経路に乗るため undo・ワイヤー
  同期・LWW は変更不要。
