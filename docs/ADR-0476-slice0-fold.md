# ADR-0476: `x.slice(0,n)` を `_s0` shorthand へ

## 状態

実装済 (v1.7.509)

## 背景

512KB raw 上限まで ~119B まで逼迫。`x.slice(0,n)` 形は 48 箇所 (文字列 clamp・先頭切り出し)
にあり、`_s0(x,n)=>x.slice(0,n)` で 1 サイト −4〜5B。受け手が呼出式の `uid().slice(0,6)` や
`(_im[1]).slice` など複雑な receiver は対象外 (正規表現は `[A-Za-z_$][\w$.]*` のみ)。

## 決定

`_ln` 群と同じ shorthand 表の `_s0=(x,n)=>x.slice(0,n)` を追加し、シンプル識別子/メンバー
receiver の 46 サイトを fold。**def 行自体が fold 対象になる self-fold trap を回避**するため
(往例 ADR-0447/0450 と同じ注意)、正規表現置換後に `_s0=(x,n)=>_s0(x,n)` の自己参照を点検した。

## 影響

- index.html −146B (524,169 → 524,023、余白 ~265B)
- 動作変更なし (読み取りサイトのみ、`.slice` 呼出し引数はそのまま)
- test.mjs の literal-sync assert を畳み後の表現に追従 (`_s0(u,48)` 等 7 件)
