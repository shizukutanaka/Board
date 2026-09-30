# ADR-0623: 選択由来 id リストの dead-id 衛生

状態: 実装済 (v1.7.650)

## 背景

ADR-0621 は `endSelect` の move コミットがジェスチャ中にリモート削除/`replace` で消えた図形の id を op に乗せる穴を塞いだ。同クラスの残経路が選択由来リストに存在した:

- `_sb()` (`_selIds().map(byId)`) は dead id を `undefined` のまま残す — `_selUL()` (= `_sb().filter(_ul)`) で `_ul(undefined)` → `_lk` が `.locked` 参照で **TypeError** (doDelete/doLock/doGroup 等 6+ 呼出しサイト)。呼出し側の散在する `s&&` 防御 (9364/9740/9808/9823 行) は dead id が実際に到達しうることを示していた
- `unlockedSelectionIds()` (doGroup の `_usI`) — `!byId(id)?.locked` は dead id を通過 (`!undefined` → true)。group op の `before` に `{id, groupId:undefined}` のファントムが乗る
- `nudgeSelection` — `withFrameChildren(_sl())` の展開後フィルタが同パターンで dead id を `move` op ids に残す

選択セットは `_ss`/`_sad`/`_sdl`/`_scl` のチョークポイントで live+visible に保たれるが、リモート op と選択書込みの間には dead id が残存しうる窓がある。

## 決定

3 サイトを `id=>{const s=byId(id);return s&&_ul(s)}` 形 (live + unlocked の明示フィルタ) へ統一:

- `_sb` を `map(byId).filter(Boolean)` 化 — 供給源で `undefined` を除去。全下流 (`_selUL`/`_selL`/直接呼出し) が不変条件を自動継承
- `unlockedSelectionIds` / `nudgeSelection` を 0621 と同じフィルタ形へ

不変条件: **選択から派生する id/shape リストは dead id を決して含まない** — 付随する `before` スナップショットや wire op がファントムを運ばない。

## 影響

- 脆弱な `_ul(undefined)` TypeError 経路を供給源で閉塞
- nudge/group の op からファントム id を排除 (ピアでは no-op だが履歴/放送を汚染していた)
- テスト: `nudgeSelection` が stale 選択 id を落とす挙動アサート + `_sb`/unlockedSelectionIds のソースピン
