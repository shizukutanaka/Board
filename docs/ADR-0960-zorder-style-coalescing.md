# ADR-0960: `[ ]` / `⌘⇧,/.` 長押しを1 op へ共合 + `Store.commit` 先頭 flush

- Status: accepted
- Date: 2026-10-01
- Version: 1.7.986

## Context

ADR-0957 は矢印キー長押しのナッジを `_nug` コアレッサ (id-set 単位のセッション + 400ms trailing-edge commit) で 1 op へ集約したが、同じ「ホールドで反復入力」構造を持つ2系統が未対応だった:

- `[` / `]` z-order (doBringForward/doSendBackward/doBringFront/doSendBack) — `_zCommit` が押下毎に即時 commit → 長押しで history が数十 op に汚染、undo が1歩ずつしか戻らない、wire 増幅。
- `⌘⇧,/.` フォントサイズステップ (fontSizeStep) — 同様に押下毎 commit。

さらに共合中に `_zCommit` の即時 commit を `_nugPush` へ切替えると、**`Store.commit` が flush 未経路のまま残る**ことが fuzz で判明 (seed-7): `_recordCommitted` は 0958 で flush 内蔵済みだが、`Store.commit` (= `_cmt` 経路の del/clear/page 系・直接 commit) は並列チョークポイントで未カバーだった。pending zorder が `del` commit を跨いで後着すると、del が「ナッジ後の live 状態」を snapshot し zorder がその後に着地 → undo 時に図形が wrong frac のまま残る時系列反転。

## Decision

1. `_nugPush` を zorder/style のマージに拡張 (セッションキーは既存 id-set 規則 + style は prop-set サフィックス):
   - `move`: 従来どおり dx/dy 累積。
   - `zorder`: `_mg` で changes を per-id マージ — `before` は初出キーを保持、`after` は最新へ更新。merge 後 `before===after` のエントリは落とし、全消去ならセッション破棄。
   - `style`: `before` は初出値を保持 (新規 prop のみ追加)、`after` は `_oa` で最新へマージ。
   - キーが異なれば従来どおり flush→新セッション。
2. `_zCommit` と `fontSizeStep` の即時 commit を `_nugPush` へ切替え (live mutation は従来どおり即時 — 見た目は変わらない)。
3. `Store.commit` 先頭にも `_nugEnd()` を追加 — 「pending nudge/zorder は常に後続 commit より先に着地」の不変条件を `_recordCommitted` (0958) と `commit` の両チョークポイントで担保。`commit` が `_recordCommitted` を呼ぶ構造上、どちら経由でも先に flush が走る (二重 flush は `_nug=null` 先行で no-op)。

## Consequences

- 長押し `[` / `⌘⇧.` が 1 op/セッション: undo は一発でラン全体を戻し、wire も1 op。
- `before` が初出キー/初出値を保持するため、マージ後の undo はラン前の状態へ正確に戻る (zorder は compaction を含めても per-id before が保たれる)。
- 時系列反転の解消: `_nugEnd()` が全 commit 入口 (timer・`_nugPush` 次セッション・`commit`・`_recordCommitted`・undo/redo・switchPage・終了系) をカバー完了。
- セッションキーに style の prop 集合を含めたのは、fontSizeStep と他 style op (例: textFlag) の id-set 一致時に誤マージしないため。

## Test pins

- 押下系 coalescing: `[ ]` 2連打 → 1 zorder op (before=初出キー)、別選択 → 別セッション、`⌘⇧.` 3連打 → 1 style op (before 14 / after 20)。
- `Store.commit` 先頭 flush: pending zorder + 直接 `Store.commit(upd)` で history 末尾が `['zorder','upd']`。
- 即時 commit 前提の既存テスト (doBringForward/doBringFront の history 断言、0471 compaction op、v1.7.43 source ピン) に `_nugEnd()` flush または新針を適用。
