# ADR-0042: SVG のインポート

## 状態
実装済み (v1.7.100)

## 背景
spec.md §14.2 の P2 ギャップ「入出力の幅」: インポートは画像 + 自盤面 JSON
(`.board`) のみで、`.excalidraw` / SVG / Markdown 取込が無かった。中でも SVG は

- **双方向の自然な相手** — Board は既に SVG export できる (`buildSVG`) ので、
  インポートでラウンドトリップが閉じる
- 外部ツール (Figma/Illustrator/draw.io/アイコン集) からの取り込み導線として
  最も汎用的なベクター形式
- `DOMParser` 標準搭載で依存ゼロ — 単一ファイル・オフライン不変条件を破らない

の3点で最初に取るべきフォーマットだった。

## 決定
対応要素と写像 (対応しない要素はスキップ — 全体を拒否しない):

| SVG | Board shape |
|---|---|
| `rect` (rx→角丸) | `rect` |
| `circle`/`ellipse` | `ellipse` |
| `line` | `line` |
| `polyline`/`polygon` | `pen` (pts をそのまま) |
| `path` (M/L/H/V/Z のみ直線近似、C/Q/S/T/A は制御点分割で polyline 化) | `pen` |
| `text` | `text` |

- **viewBox/サイズ正規化**: `viewBox` の min-x/min-y を原点に、幅を最大
  800px にスケール (巨大アートボードでも貼り付けサイズが現実的になる)。
  viewBox 無しは width/height 属性→実測 bbox の順でフォールバック。
- **transform**: `translate`/`scale`/`rotate`/`matrix` を入れ子グループ
  まで含めて累積行列で処理し、座標に焼き込む。shape の `rotate` プロパティ
  には載せず、全て頂点座標へ展開する (重ね合わせ transform を Board の
  単一 rotate 値に写像するのは近似誤差が大きいため)。
- **スタイル**: `stroke`/`fill`/`stroke-width`/`opacity`/`fill-opacity`/
  `stroke-opacity` → Board の `stroke`/`fill`/`size`/`alpha`。属性と CSS
  `style=""` の両方を読む (CSS クラス・外部スタイルシートは非対応)。
- **セキュリティ/上限**: `DOMParser` で `image/svg+xml` として parse し、
  `parsererror` 要素があれば拒否。スクリプト/外部参照は SVG 要素写像時に
  自然に落ちる (対応要素以外は読まない)。要素数上限 `SVG_MAX_ELEMS=5000`、
  1 path あたりのサンプル点上限 `SVG_MAX_PTS=2000` — 巨大な工作物 SVG で
  タブが止まらないよう ADR-0039 と同じ発想の天井。
- **入口**: (a) `.svg` 拡張子/`image/svg+xml` のファイルドロップ・ピッカー、
  (b) ペーストテキストが `<svg` で始まる場合 (markup を直接貼り付ける
  ワークフロー)。(c) `.board`/画像としては従来どおり。検出順序は
  「ファイル拡張子→MIME→内容先頭の `<svg`」で、誤検知を避けるため
  テキスト先頭一致に限定。
- **取り込み**: `addMany` op 一発で挿入 (undo 一発で戻せる) — 中央に配置。
  0 形状にしかならない SVG は `invalidBoard` で拒否。

## 断念した代替案
- **path を厳密に曲線で保持** (Board の shape 型にベジェ型を追加) → shape 型を
  増やすと hit-test/描画/エクスポート/RTC 全てに波及する L 級変更。直線近似
  の pen で視覚忠実度は十分 (制御点 8-12 分割)。
- **`<use>`/`<symbol>`/`<defs>` 解決** → 複雑で頻度も低い。スキップ対象として
  切る (断念節に明記)。
- **`<g>` ごとに Board グループ化** → 写像対象が 1 shape なら有効だが、入れ子
  グループと transform 累積の関係で複雑化。今回は平坦化して個別 shape に。
- **Markdown 貼付 → styled 図形** → 「テキストをそのまま貼る」既存動作で代替
  可能・優先度低 (spec の項目内では SVG が本命)。
- **`.excalidraw` 取込** → 別の大きい機能 (要素型・scene 正規化)。別 ADR。

## 影響
- Figma/draw.io/アイコン集からのコピー取り込み、Board 自身の SVG export の
  再取り込み (ラウンドトリップ)、`.svg` ファイルの直接ドロップが動く。
- path 曲線は直線近似になる — フォント outline 等の精密曲線はわずかに
  角ばる (実用上のトレードオフとして ADR に明記)。
- 非対応要素 (use/symbol/filter/gradient/mask/clipPath/animation/CSS クラス)
  は静かにスキップ — それでも見えた形状が取り込めるのが利点。
