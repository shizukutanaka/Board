# ADR-0757: architecture.md §6 Persist へ causal marker 永続化規則を同期 (docs)

## 状態

採択 — docs 同期のみ、コード変更なし。

## 背景

round507 で `Persist` 層を監査した:

- `_rdb` (dirty→schedule→save) は `_cmt`/`applyRemote`/`_recordCommitted`/undo/redo の全経路から到達 — 永続化漏れなし
- `_cOp`/`_cmt`/`_keepSel` の使い分けは一貫 (選択保持は `_keepSel(origSel)` 明示または `_cOp` ラッパ)
- `saveBackup`/`checkBackup`/`restoreBackup`/`discardBackup` の `:prev` スロットは全消去/import 直前に盤面を退避し、boot 時 confirm で復元 — 配線済み
- `flushIfHidden` は `visibilitychange`→hidden と `pagehide` の両方に配線済み (ADR-0453/0604)
- IDB `onupgradeneeded` は v1→v2 で `imgs` ストアを追加 — 双方向パス済み

不整合なし。ただし architecture.md §6 の記述は shapes/viewport/images の永続化のみで、ADR-0460/0695/0699/0701 で入った **causal marker の永続化** (doc レコードが `wc`/`rep`/`nts`/`ntp` を同梱する規則と、その欠落が招く復活バグの筋道) が未記述だった。

## 決定

§6 に causal marker 永続化の一段落を追記:

- 同梱対象: `wc` (per-prop 書込みクロック、ADR-0460)・`rep`/`nts`/`ntp` (replace マーカー + 改名クロック、ADR-0695/0699)
- 理由: リロードでリセットされるとピアの stale スナップショット/旧 rename が wipe 済み内容を復活させ得る
- 読み込み側は `validClock`/`_fin` で検証して採用 (0700/0701 の非有限値拒否と同一規則)
- `:prev` バックアップはスコープ外 — 復元自体が `replace` op として commit され新しい causal marker を立てる

## 結果

- `docs/architecture.md` §6 追記のみ — index.html 変化なし (version bump のみ)
- test.mjs ピン追加なし (ADR-0460/0695/0701 の挙動は既存ピンで固定済み)
