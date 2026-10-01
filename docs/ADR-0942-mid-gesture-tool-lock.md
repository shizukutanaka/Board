# ADR-0942: ジェスチャ中のツール切替を無効化

## Status
Accepted (2026-10-01)

## Context
`pointermove`/`pointerup` は `switch(state.tool)` で tool handler へ dispatch するが、ツール切替入口 (`pickTool`) に「ジェスチャ実行中は切替えない」ガードがなかった。ドラッグ中の KEYMAP キー (`p`/`r`/…)・space (temp-hand)・ツールボタン (第2ポインタ経由) が `state.tool` を差し替え、以降の move/up が **アームしたツールと異なるブランチ**へ飛ぶ:

- rect ドラッグ中 `p` → `contPen` が `draft.pts` (rect draft には無い) を読み per-move TypeError + `state.draft=null` のまま `endPen` も throw → ドラフト消失 + `ptr.down` 残留 (後続 pointermove が死んだジェスチャを引きずる)。
- select-move 中 `r` → `endRectLike` が `!_df()` で早期 return → `endSelect` の `move` commit が走らず、ドラッグ位置への in-place 変異が**未 commit で残留 = broadcast されない一方向発散**。
- pen ドラッグ中 `r` → `contRectLike` が pen draft に x/y/w/h を刻印 → `endRectLike` が hybrid shape を commit。

## Decision — the gesture owns the tool until pointerup
`pickTool` 本体は変えない (commit 後に `endRectLike`/`endLineLike` が `_PU` 内で `pickTool('select')` を呼ぶ正規経路を守るため)。外部 dispatch 3サイトに `!ptr.down` ゲートを置く:

- keydown `KEYMAP[k]` サイト (ツールホットキー全般、`i` eyedropper 含む)
- keydown `space` (temp-hand) — `_pd(e)` は維持 (ページスクロール抑止は継続)
- ツールバーボタン click (第2ポインタ到達の corner case)

無効キーは no-op: 中途ジェスチャを破棄せずそのまま commit させる (cancel-then-switch は ADR-0574/0634/0637 の先例だが、誤打 1 キーで半分描いた図形を失う破壊的サプライズになるため不採用)。`lineClick` click-click モードは `ptr.down` 非アームのまま動くため影響なし (`pickTool` 自体が非 line/arrow で `lineClick` をクリアする既存経路が維持される)。

## Consequences
- `pass += 6` behavioural ピン: 実イベントハーネス (`fire`/`fireKey`) で rect-drag 中 `p` → tool 不変 + rect 正常 commit、move-drag 中 `r` → tool 不変 + move commit 到達、pen-drag 中 space → tool 不変 + `_prevTool` 非アームを固定。
- 全4シナリオ (TypeError ループ、発散残留、hybrid commit、stuck down) が構造的に閉塞。
