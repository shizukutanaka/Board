# ADR-0969: mid-gesture remote writes — orig-restore must not resurrect stale geometry

**Status:** Accepted (defect fix) — v1.7.995

## 背景

ジェスチャ cancel の原状復元行列 (`_gRst` → `_gR1`/`_gR2`/`_gRL` + way/lblpos 分岐)
は「ジェスチャ開始時の orig スナップショット」へ図形を丸ごと戻す。ここに2つの
欠陥があった:

1. **ジェスチャ中にリモート書込が着地したキーが orig より新しい** —
   ドラッグ中に remote `style`/`upd`/`move` が図形へ適用されても、cancel
   (Esc・blur・abort・remote-lock の `_gRst`) は pre-gesture 値へ戻す。ローカルは
   古い値、ピアは新しい値を保持する**一方向発散**。0964 は「remote lock → 復元」
   だったが、復元自体が remote 書込を巻き戻す経路は未扱いだった。

2. **remote del→同一 id の再生成 (kill+resurrect / wholesale swap) が
   ジェスチャ中に着地** — cancel がその新図形を pre-gesture orig へ強制復元。
   新しい誕生 (born) は remote 時計が所有する別存在なのに、ローカルだけ旧
   座標・旧 prop へ書き換える。

## 修正

### (a) `_gTouch(id,ks)` — ジェスチャ orig への遅延マージ

`_oa` (prop patch 適用フック)・`'move'` forward の `['x','y']`・snapshot
merge の per-key 適用から呼ぶ。`ptr.down` 中に着地した remote 書込を、
**そのキーの live 値で全 live ジェスチャ orig** (`dragStartShapes`/`gOrig`/
`gAnc` 3 Map + `resizeOrig`/`rotOrig`/`ebendOrig`/`cbendOrig`/`wayOrig`/
`lblOrig` 6 オブジェクト) へ反映させる。orig が remote 値を保持するので
`_gRst` の復元が remote 値を上書きしない — remote が触っていないキー
(ローカルのドラッグ差分) は従来通り巻き戻る。

### (b) `_rb(id)` — リモート誕生ガード

PD で `ptr.armC={ts:nowTs(),peer:'',seq:0}` を刻印 (未武装のセンチネルは
`ts:1/0` — born がそれを上回れないので無害)。`_rb` は
`w._born.peer!==_pi() && clockNewer(_born, armC)` — **remote 時計による
arm 後の (再)誕生だけ** を検出し、`_gR1`/`_gR2`/`_gRL` と way/lblpos 分岐が
復元自体をスキップする。local 誕生 (alt-drag コピー・自分の commit add)
は peer が自分なので従来通り復元対象 — これが load-bearing な識別子で、
単一の gesture 時計では remote-reborn と local-born を区別できない。

## ハーネス教訓 (test.mjs)

- `state._lastTs` は section 間で漏出する — 先行テストの未来日付 clock が
  `nowTs()` を wall より先へ持ち上げ、後続テストの「local born < remote
  del +10ms」を born 勝ちへ反転させた (E9 ブロックのフレイキー化)。両
  `reset()` が `state._lastTs=0` を落とすよう修正。remote clock は `nowTs()`
  (HLC) で刻印し `Date.now()+N` を避ける既存規約を再確認。
- 0964 の `_gRL`/`_gR1` ソースピンは新ガード形 `_rb(id)` 込みへ文言追随
  (意味不変: locked メンバー復元 + remote-reborn スキップ)。

## 残存課題

remote 側の時計スキュー (peer ts < こちらの armC) で resurrected born が
`clockNewer` に敗れると復元が残る — 稀・bounded で意図的に残す。
