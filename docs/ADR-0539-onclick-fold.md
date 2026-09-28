# ADR-0539: `.onclick=` の `_oC` fold + `leave()` の null トリガーガード

- 状態: 実装済み (v1.7.567)
- 系: サイズ / 堅牢化

## 背景

`.onclick=` 代入サイトが 27 箇所 (ボタン wire + 動的生成要素) あり、機械的
fold の残数としては最大級だった。また、プレゼン `leave()` の
`_fc(_focusTrigger)` は `document.activeElement` が null を返し得る経路
(フォーカス未確立のドキュメント状態) で TypeError を投げ得た。

## 決定

- `_oC=(e,f)=>e.onclick=f` を追加し、`X.onclick=f` → `_oC(X,f)` に 27
  サイト畳み込み (~55B 回収)。RHS の関数式を含むサイトは深さ走査で式の終端
  (`;`/`}`) を特定して `)` を補う機械変換。
- `_fc(_focusTrigger)` → `_focusTrigger?.focus()` に変更 (+4B)。`_aE()` は
  通常 `body` を返すが、タブ未フォーカス/ロード途中では null もあり得る。

## 影響

- 挙動不変 (onclick 代入と handler 呼出しは同じスロット)。
- test.mjs にピン2件: `_oC` def の存在 + `.onclick=` 残件が def のみ
  (出現数==1)、及び `leave()` の `?.focus()` 形。

## 失敗した経路 (教訓)

def 自体が fold パターンに自己マッチする事故が 2 度発生
(`_oC=(e,f)=>e.onclick=f` 内の `e.onclick=`)。以後の fold 手順は
「def 追記は fold の後」「def の RHS が自身のパターンにマッチしないこと」を
確認してから実施する。
