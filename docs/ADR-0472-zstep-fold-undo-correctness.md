# ADR-0472: z-order step 統合 + compaction undo の `before` 正確性

## 状態

実装済 (v1.7.505)

## 背景

ADR-0471 は `after` キーが 48 文字を超えたとき `_zCommit` が `reindexFrac()` で canonical 再採番する
compaction を導入した。実装後の自己レビューで 2 つの問題が判明した。

1. **undo の `before` が新キーになる**: `o=_sh().map(s=>s.frac)` のスナップショットは、各呼び出し側
   (doBringFront 等) が mover に `s.frac=nk` を代入した**後**に取られるため、compaction で再構築した
   `changes` の `before` に mover の*新しい*キーが入る。`Store.undo` は `sh.frac=c.before` を書き戻して
   `_sz()` するため、mover の before が新キーだと復元しても順序が変わらず **undo が no-op** になる。
2. **検出トリガーが mover の `after` 限定**: 未移動図形に残った古い成長キーは mover の新キーが短い限り
   永遠に compaction されず、validPatch の 600 文字キャップで棄却される経路が残る。

あわせて `doBringForward`/`doSendBackward` が ~600B の対称的二重実装を持っており、512KB 上限に近い
現状では統合の価値が大きい。

## 決定

1. **compaction の `before` を mover の元キーで上書き**: `m=_mP(changes.map(c=>[c.id,c.before]))` で
   移行前キーの overlay map を作り、未移動図形のみ `o[i]` (現在キー) を使う。undo は mover の真の
   移行前キーを復元する。
2. **トリガーを盤面走査に拡大**: `if(_sh().some(s=>_ln(s.frac)>48))` — 任意の z-order 操作が残存する
   成長キーをすべて self-heal する。
3. **`_zStep(dir)` に統合**: 1 歩移動のループ (移動方向・境界・交換) は `dir=±1` で符号が反転するだけ
   なので `doBringForward(){_zStep(1)}` / `doSendBackward(){_zStep(-1)}` に畳み込み −442B。

`before` を取るタイミングは commit 時点ではなく op 構築時点 (mover の keyBetween 計算前に既に
`before=s.frac` として捕捉済み) である点が要。overlay はその捕捉値を compaction 後の再構築に
運ぶだけなので追加の時点依存はない。

## 影響

- undo が compaction を跨ぐ z-order 操作で正確に pre-move 順序へ戻る (回帰テスト追加済)
- 任意の図形の成長キーが次の z-order 操作で常に掃除される (self-healing)
- index.html −442B (523,840B → 余白 ~448B)
