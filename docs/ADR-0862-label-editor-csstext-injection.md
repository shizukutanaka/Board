# ADR-0862 — label エディタ cssText へのリモート色値注入を閉塞

## 背景

Board は 1 op = 1 shape の LWW モデルで、`s.stroke` は remote peer が自由に書き込める文字列
（validPatch は文字列型+長さのみ要求、色値の語彙制約なし）。remote は
`stroke:'red;position:fixed;inset:0;background:url(https://evil/x)'` のような
`';'` を含む値を任意の図形に書き込める。

## 問題

`openLabelEditor` が `inp.style.cssText` をテンプレート文字列で組み立てており、
remote `hit.stroke` が `color:${col};border:1px solid ${col};` にそのまま補間
されていた。`cssText` は宣言列を丸ごとパースするため、`;` で区切られた任意
CSS 宣言 (`position:fixed;inset:0;background:url(evil)`) がラベル入力要素に
注入可能だった。`<style>` 属性文字列への注入なので JS 実行はないが:

- `background:url(...)` で外部リソース参照が可能 — offline-first / 外部
  リソースゼロ不変条件の侵害 + 潜在的トラッキング経路
- `position:fixed;inset:0` 系で編集オーバレイを全画面化し UI を偽装可能

発火条件は被害者がその図形のラベル編集を開くこと — 攻撃者の shape は
通常利用で自然に到達するため意味のある経路。

## 決定

`col` を `cssText` から排除し、`inp.style.color=col` / `inp.style.borderColor=col`
の**値型プロパティ代入**へ移す。DOM の style プロパティ代入は値として解釈
され宣言列を新たに注入できず、非合法値はブラウザが黙殺する。`border:1px solid;`
は色なし宣言 (currentColor) にし borderColor で上書き — 表示は従来通り。

## 監査完走

同型の経路を全件走査:

- `style.cssText=` の全サイト (label editor/無害な数値のみの静的 site/モーダル)
  — remote 文字列を補間するのはこの1件のみ
- `.style.<prop>=` 代入 — 値型で宣言注入不能、全て安全
- SVG/drawio 属性 emit — `_esc`/`_dioEsc`/`nl`/`_fontFam` whitelist で監査済み
  (ADR-0861)。innerHTML 動的生成はゼロ (ADR-0859)

## 検証

- behavioural ピン 5 件 (test.mjs): 敵性 stroke (`;`+url() 含有) の図形で
  `editSelectedShapeKbd()` 経由ラベル入力を開き、`style.cssText` に注入宣言が
  ないこと・悪性文字列が `style.color`/`borderColor` の value-typed property に
  のみ到達することを固定
- ソースピン `frame label honors s.font family` を新フォーマットへ同期
  (`;color` 直結をやめ per-property 代入を要求)
- `node test.mjs` 2850 pass 全緑

## 却下した案

- `col` を正規表現で色値 whitelist 化 — 色値語彙 (name/hex/rgb()/hsl()/var()
  なし) の列挙は壊れやすく、正当色を黙殺する回帰を生む。代入方式の変更が
  原因除去として確実
- validPatch で stroke/fill の色値を検証 — wire 側の規約強化は本来妥当だが
  ローカル import 経路 (.board/drawio/SVG) にも同値が来るため、着地側の
  防御が最後の砦として必須。両方やるなら別 ADR で

## 影響

- index.html +27B (557,049B raw — ceiling 内 ~7B)
- ADR-0186 (label-editor 位置) と ADR-0206 (letterSpacing emit) と並んで
  editor 構築のセキュリティ境界を規定
