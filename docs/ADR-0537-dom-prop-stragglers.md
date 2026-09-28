# ADR-0537: DOM プロパティ残サイト畳み込み — `_sw`/`_ew`/`_dsp`/`_hdn`

- 状態: 実装済み (v1.7.565)
- 系: サイズ最適化 (512KB raw 上限の枠確保)

## 背景

512KB 上限の残量が ~14B まで逼迫し、機能追加の余地が消えていた。
既存 helper の未適用サイト + 新規 helper 化可能な反復パターンを再走査した。

## 決定

5 パターンを helper 化 / 既存 helper に追畳み:

| helper | 意味 | サイト数 | 概算純益 |
|---|---|---|---|
| `_sw(x,y)=>x.startsWith(y)` | startsWith 全 9 サイト | 9 | ~30B |
| `_ew(x,y)=>x.endsWith(y)` | endsWith 5 サイト | 5 | ~5B |
| `_dsp(e,v)=>e.style.display=v` | display 代入 | 9 | ~50B |
| `_hdn(e,v)=>e.hidden=v` | hidden 代入 | 9 | ~20B |
| `_ix` 既存 | `X.indexOf(y)` 残 3 サイト | 3 | ~12B |

合計 ~115B 回収 (524,274 → 524,189B、残量 ~99B)。

検討して棄却したもの: `.has(`×64 (短レシーバで ±0)、`.filter(`×68
(同)、`.dataset`×29 (prop 異種)、`.className=`×10 (~5B 微々)、
`.charCodeAt` (引数非一様で −10B)、`.reduce` (コールバック異種)。
これをもって機械的 fold 空間はほぼ枯渇と判断。

## 影響

- サイズ: −85B net (def 含む)、raw 残量 14B→99B。
- ピン: `.startsWith`/`.endsWith`/`.hidden`/`display` 系の 9 ピンを
  post-fold リテラルへ追従。
- 挙動: 不変 (read-site fold のみ)。`_hdn`/`_dsp` は代入ラッパで
  副作用を保持。
