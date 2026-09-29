# ADR-0760: connClears が locked 生存図形の結合を剥がす

## 状態

採択 — v1.7.786 実装済。

## 背景

`del` op は `op.shapes` 内の locked 図形を forward apply で**削除しない** (`byId(sh.id)?.locked` skip — ADR-0547/0713 parity: 「ローカルだけ生き残る」は locked の定義上正しい)。ところがコネクタ結合のクリアは3箇所とも「op に含まれる = 消える」を前提にしていた:

1. **`computeConnClears(delIds)`** (コミット時) — `delIds.has(sh.a)` で結合を記録。locked 図形が `delIds` に居ても同じ
2. **`_remoteDelConnFix(op)`** (受信側) — `goneIds` = `op.shapes` 全件。splice で skip された locked 生存者への結合も消去
3. **`del` forward の `op.connClears` 適用** — wire 記録の `p.after` を端点単位でなく一括 `_oa` — sender 側で unlocked、receiver 側で locked だった図形への結合も消去

つまり: A が図形 X を削除する (A では unlocked)。B では X が locked → X は生存するのに、X に結合していたコネクタ C が `C.a=null` へ書き換えられる。**生存図形から binding が剥がれるデータ損失** — 全ピアで対称に起きるが、locked の意味論 (「触れない」) には反する。

## 決定

「本当に消えるか」を端点毎に判定する:

- `_remoteDelConnFix`: `goneIds` を `filter(id=>!(byId(id)||{}).locked)` で構築 — locked 生存 id は gone に含めない
- `computeConnClears`: `delIds.has(sh.a)&&!(byId(sh.a)||{}).locked` — コミット時も同じ判定
- `del` forward の connClears 適用: `p.after` 一括適用をやめ、`p.before` で記録された端点 (`a`/`b`) 毎に `!(byId(pb[e])||{}).locked` を確認してから `{a/aF/x1/y1 or b/bF/x2/y2: null}` を適用

undo の `p.before` 復元は無条件のまま — forward でクリアされなかった端点に `before` を書き戻しても値は同じ (or ギャップ中の再結合を peers の wire `upd` と同じ結果へ収束)。

## 結果

- `index.html` 3 箇所修正 + コメント尾 ~7 箇所刈り込み (556,824B)
- `test.mjs` ピン 1 件 + v1.7.46c の behavioural を実プロパティ (`a`/`aF`/`x1`/`y1`) へ追従 (`a1` は実コネクタに存在しないモック名だった)
- 2758 pass / 0 fail
