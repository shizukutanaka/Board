# ADR-0853: 圧縮 `<diagram>` 展開を 64 頁上限へ

- Status: Accepted
- Date: 2026-09-30
- Version: 1.7.879

## Context

`importDrawioText` は2系のページ列挙経路を持つ:

| 経路 | 対象 | 件数上限 |
|---|---|---|
| `_dms` (圧縮) | `<diagram>` に base64+deflate ペイロード | **なし** |
| `_dgs` (非圧縮) | `<diagram>` に `<mxGraphModel>` 本文 | `.slice(0,64)` |

import 残分岐監査 (svgToShapes / excToShapes / drawioToShapes / TSV・平文カスケード)
の中で件数・長さの上限対称性を確認した際に、この非対称を検出。

## Problem

圧縮経路は

```js
const _dms=[...matchAll(/<diagram[^>]*>([^<]+)<\/diagram>/g)];
Promise.all(_dms.map(m=>_dioInflate(m[1])))
```

と、**全 `<diagram>` タグ分の `DecompressionStream` を並行起動**していた。
`_dioInflate` 自体は出力 8MB で中断する (ADR-0325) が、**個数**は無制限 —

- 32MB 上限の細工ファイルに数万個の `<diagram>x</diagram>` を置くだけで
  数万個の inflate ストリーム・Blob・Reader が同時生成される
- 各ストリームのワーカ/バッファがピークメモリを押し上げ、タブを落とし得る
- 非圧縮パスが既に「64 頁」を実効上限としているので、それを超える頁数は
  どのみち捨てられる (ピア側の `pageAdd` バリデーションも64頁)

## Decision

`Promise.all(_dms.slice(0,64).map(...))` — 非圧縮 `_dgs` パスと同じ 64 頁上限。

- 正当な drawio ファイルの頁数は現実的に 64 を大きく下回る
- 超過分は非圧縮パスと同じく無通知で捨てる (parity)
- `_dms` 全体の `matchAll` は正規表現が O(ファイルサイズ) で、32MB の
  ファイル上限の内側では線形のまま — 件数を数えるだけの用途は残す

## Audit 結果 (import 残分岐、完走)

| 面 | 判定 |
|---|---|
| `svgToShapes` | ✓ SVG_MAX_ELEMS/PTS + viewBox 上限 + validShape フィルタ |
| `excToShapes` | ✓ EXC_MAX_ELEMS/PTS + files マップ走査 + validShape |
| `drawioToShapes` | ✓ DIO_MAX セル + UserObject/groupIds 処理 + validShape |
| 圧縮 `<diagram>` 展開 | ✗ → 本 ADR で 64 頁上限へ閉塞 |
| 非圧縮 `<diagram>` 複頁 | ✓ `.slice(0,64)` + `pageAdd` ops + validShape |
| TSV/平文カスケード | ✓ PASTE_MAX_CHARS 由来で付箋数も有界 |
| `<image href>` / `files.map` dataUrl | ✓ `validPatch` の 16MB + `data:` スキームゲート |
| インポータの viewport 採用 | ✓ `_xyOK`/`clampZoom`/`_vpOK` 経路 (ADR-0795/0796) |

## Side finding

監査中に drawioToShapes 内の切断コメント残片 2 箇所 (ADR-0224 fidelity 行、
ADR-0324 inflate 行) を文法を回復する最小補完で修復。帳尻は
connClears/draft-ink/img-ingest の長コメント3ブロック圧縮で相殺。

## Verification

- `node test.mjs`: 2832 pass, 0 fail (raw 557,007B < 557,056B)
- ソースピン: `_dms.slice(0,64)` を要求 (ADR-0324 ピンも同形へ更新)
