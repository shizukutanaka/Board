# ADR-0411: `s.wrap` を `0` に正規化 + validPatch の `wrap`/フラグ prop 網羅

## 状態
実装済 (v1.7.446)

## 背景
2件の prop 不整合:

1. **`wrap` トグルと drawio emit の値不整合**: `toggleWrap` は OFF 側に `null`
   を書いていたが、drawio emit (`whiteSpace=nowrap`) と import は `s.wrap===0`
   を検査する — トグルで折返し OFF にしたテキストが .drawio 書き出しで
   折返し ON に戻る実害バグ。
2. **validPatch の未網羅**: `wrap` は数値 whitelist に無く、
   `bold/italic/under/strike/locked` は string/numeric どちらのリストにも無い —
   remote の `upd` パッチで `wrap:"x"` や `bold:"x"` のような非正規値が
   注入し得た。

## 決定
- `toggleWrap` の OFF 書き込みを `null` → `0` に正規化 (emit/import/render が
  全て `0` を OFF と解釈する形に統一)。`wrap:1` 旧盤・`wrap:null` 旧 .board は
  falsy→nowrap で後方互換。
- 数値 whitelist に `'wrap'` を追加。
- フラグ prop は `true|1|null` の混在が既存 (toggle は `true`、drawio/exc
  import は `1`) のため `typeof==='boolean'||'number'` の専用チェックを追加
  — `boolean` 単独だと import 由来の `1` を誤棄却する。

## 影響
- .drawio 書き出しがトグルで OFF にした text を正しく `whiteSpace=nowrap` 化。
- remote `upd`/`style` パッチの malformed flag 値を棄却 (round91-93 の
  whitelist 網羅方針に整合)。

## 断念した代替案
- import 側で `s.bold=true` に正規化して numeric を完全排除: 既存データ・
  旧パッチとの互換が崩れるため二型併記に留めた。
