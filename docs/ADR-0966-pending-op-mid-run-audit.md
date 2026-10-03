# ADR-0966: pending op × mid-run 状態変化の収束監査 — 完走記録

## 状態
採用 (監査完走 + ピン, v1.7.992)

## 文脈
ADR-0957–0961 の `_nug` 共合体、0964 の mid-gesture lock、0965 の mid-run lock/missing 仕分けを置いた後の残問題: pending op が生きている間に盤面を総取替えする経路や、op 自身が `locked` を書く経路で時系列反転・誤仕分けが残らないか。

## 監査結果 (全経路 clean)

### 1. 盤面総取替え × pending op — 時系列反転なし
全 `_rs` サイト (5 件) を走査:

| サイト | 経路 | flush |
|---|---|---|
| ファイル import (`.board`) | `_rs` → `_repC` | commit-head `_nugEnd` (0958) ✓ |
| `_applySnapshot` (remote) | `_rs` | remote swap — pending op は flush 時に _nugLock が missing を drop、生存メンバーは wire rebuilt で収束 ✓ |
| share-hash 採用 | `_rs` → `_repC` | commit-head ✓ |
| `Persist.load` (boot) | `_rs` | boot 時点で `_nug` は存在し得ない ✓ |
| `restoreBackup` | `_rs` → `_repC` | commit-head ✓ |

`_repC` は `_recordCommitted` 経由 — 先頭の `_nugEnd()` (ADR-0958) が pending を先に着地させるため「pending は常に後続 commit より先」が保持される。

### 2. undo/redo × pending op — 0957 で担保済み
`undo()`/`redo()` 先頭の `_nugEnd()`、`Store.commit`/`_recordCommitted`/`_rcOp`/`_nugPush` (異種キー)/`switchPage`/`hidden`/`pagehide`/`beforeunload` の flush 点を再確認 — 全チョークポイントで pending が先に着地する。

### 3. own-lock exemption の方向 — live 値で判定して正しい
`_nugLock` の exemption `!s.locked||A.some(a=>a.id===id&&a.locked)` は **live `s.locked`** を読む:

- op が member を **unlock** (doLock は push 時に live `s.locked=null`)→ flush 時 `!s.locked` → partition 対象外 → 自身の unlock が commit される ✓
- op が member を **lock** (`after.locked=true`)→ `A.some` → exempt ✓
- remote が mid-run に **lock** → live `s.locked=true` かつ `after.locked` が op 自身の書込みでない → restore+drop ✓ (0965)
- op が unlock した後に remote が **re-lock** → live=true, after=false → remote-lock 扱い → drop → peers 側も gate-drop で収束 ✓

### 4. 派生不変条件
- `_keepSel` は commit があった時だけ走る (全メンバー消失時に直近 history への `origSel` 誤刻印を防ぐ — 0965)。
- `_nugLock` の restore は「op が触れた prop のみ」— 未触の remote 書込を巻き戻さない。
- `locked` prop 自体は決して restore しない (LWW 帰属はリモートのまま)。

## 検証
- behavioural: own-unlock が partition を免れて commit される (exemption 方向の退行ガード)、lock 後 mid-run 消滅で commit 省略。
- ピン: flush サイト 3 系 (0957/0958/0960) + `_nugLock` 内蔵 + exemption 行 + `s.locked=lk||null` の live-write を契約化。
