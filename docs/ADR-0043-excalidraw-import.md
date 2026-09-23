# ADR-0043: .excalidraw インポート

## 状態
実装済み (v1.7.101)

## 背景
spec.md §14.2 P2「入出力の幅」: ADR-0042 で SVG 取込を足した後、残る主要な
外部フォーマットが `.excalidraw`。Excalidraw はオフライン系スケッチツールの
実質標準で、同カテゴリ (軽量・プライバシー重視・単一ファイル) のユーザが
最も持ち込みたい既存資産の形式。JSON なので `DOMParser` 不要・
`JSON.parse` で処理でき、要素マッピングも SVG より素直
(要素 = 既にディスクリートな描画プリミティブ)。

## 決定
対応要素と写像 (未知要素はスキップ — 全体を拒否しない):

| Excalidraw | Board |
|---|---|
| `rectangle` | `rect` |
| `ellipse` | `ellipse` |
| `diamond` | `pen` (4頂点+閉路の polygon — 厳密 shape) |
| `line` / `arrow` (2点) | `line` / `arrow` |
| `line` / `arrow` (3点以上) | `pen` |
| `freedraw` | `pen` (points は x,y 相対 — 絶対化) |
| `text` | `text` (fontSize 引き継ぎ) |
| `frame` | `frame` |
| `image` | スキップ (files 参照が必要、今回対象外) |

- **style 写像**: `strokeColor`→`stroke`、`backgroundColor`→`fill`
  (`'transparent'`→`null`)、`strokeWidth`→`size`、`opacity` (0-100)→
  `opacity` (0-1)、`strokeStyle` `'dashed'`→`dash:1`、`'dotted'`→`dash:2`、
  `angle` (radians)→`rotate` (degrees、rect/ellipse/text/diamond 系に適用)。
- **座標**: `x,y` は左上原点、`points`/`boundElements` 配列の要素は
  `x,y` 相対オフセット — 絶対座標に展開する。`isDeleted:true` の要素は
  読まない (Excalidraw は削除を tombstone で残す)。
- **検出**: `.excalidraw` 拡張子のドロップ/ピッカー + JSON 内容の
  `"type":"excalidraw"` マーカー (中身優先 — `.board` のように拡張子が
  違っていても構造が Excalidraw なら取り込む)。`elements` が配列でない
  /0件にしかならない場合は `invalidBoard` で拒否。
- **セキュリティ/上限**: `JSON.parse` のみ — コード実行経路なし。
  `EXC_MAX_ELEMS=50000` / `EXC_MAX_PTS=10000` で要素数・1 stroke の点数に
  天井 (ADR-0039/0042 と同じ発想)。
- **取り込み**: `addMany` 単一 op (ADR-0042 と同じ — undo 一発)、
  viewport 中央に配置、取り込んだ形状を全選択。

## 断念した代替案
- **`boundElements` (コネクタ結線) の復元** → Excalidraw の binding は
  内部 ID 参照で、`focus`/`gap` の解釈が複雑。Board のコネクタは
  `a`/`b` プロパティで別設計 — 今回は未結線の line/arrow として取り込む
  (視覚忠実度は保たれる)。
- **`groupIds` → Board グループ** → Board のグループは `gid` で似た構造
  だが、ネストグループと z-order の解釈がずれる。平坦化して個別 shape に
  (SVG インポートと同じ判断)。
- **roughness/sketch 描画の再現** → Board の pen は Excalidraw の
  rough.js 風とは別系統。stroke/dash/色は写すが質感差は残る (許容)。
- **`image` 要素** → `files` オブジェクト参照が必要で、単体 JSON に
  埋め込まれた base64 を引く設計が要る。別の大きい機能として切り分け。
- **`angle` → 頂点座標への焼き込み** (SVG 方式) → Board は `rotate`
  プロパティを持つので直接写像の方が忠実 (SVG は transform 入れ子が
  あったため焼き込みを選んだ — 構造が違う)。

## 影響
- `.excalidraw` ファイルをドロップ/ピッカーで取り込める (拡張子 +
  `"type":"excalidraw"` 構造検出)。
- P2「入出力の幅」の主要2形式 (SVG + Excalidraw) が揃い、残りは
  Markdown 貼付 (既存のテキスト貼付で代替可能・優先度低) のみ。
- 未対応要素は視覚的な代替なしにスキップ — 取り込めるものが取り込める
  部分的成功のまま (ADR-0042 と同じ思想)。
