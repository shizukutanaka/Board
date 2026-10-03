# ADR-0974: 全置換スワップの収束対称性 × バックアップスロット監査 — 完走記録

## 状態
採用 (監査完走 + ピン, v1.8.000)

## 文脈
ADR-0973 (dirty 追跡) で永続化フラッシュの網羅性を固めた後、残る軸は **全置換スワップ (`'replace'`) の両側対称性とバックアップスロット (ADR-0004) の入口網羅性**: ローカル commit (`_repC` → `_recordCommitted`) とリモート適用 (`applyRemote` → `_apply`) で wclock の再刻印集合が一致するか、破壊的スワップの全入口が `:prev` バックアップで保護されているか。

## 監査結果 (全経路 clean)

### 1. ローカル swap — 4入口が同一形
`_repC` を呼ぶ全サイト (`importBoard` / `importFromHash` / `restoreBackup` / および `applyRemote` 'replace' の `saveBackup` ガード) が「`_rs` → `_scl();state.wclock=_wM()` → `_repC(before,beforeWc,origSel,_bpg,_bcp)`」の同一順序を取る。`afterWc` は wipe 後の `{}` — 時計は op ではなく両側の再刻印で再導出する設計 (0613–0617/0926–0928)。

### 2. 時計再刻印は両側対称
- **ローカル** `_recordCommitted` の replace 分岐: `op.before` で消えた id を `_wD(swap)` 墓標化、`op.wc` (wipe 前マップ) 由来の新しい墓標を `_wTb` で保全、`op.after` 全員に `_bT(swap)` で `_born` を刻印。
- **リモート** `_apply` 前方: `keep` スキャン (`_bN` — swap 時計より新しい `_born` の図形を残す) → `wc0` 時計を `_wR` で復元 → `old0` 墓標ループ → `_wTb` → 生存者全員へ `_bT`。`state.wclock=_wM(clone(op.afterWc))` は `{}` から始まり同一集合へ収束。
- `_stampWrites` は `replace` を `_lwwOp` 外とし prop 時計を両側で刻まない — 送信側だけ prop 時計を持つ非対称は存在しない (0914/0916 の構造キー除去と整合)。
- `_lwwOp` 内 op (upd/align/beautify 等) は `applyRemote` と `_recordCommitted` の双方が `_stampWrites(op)` を呼ぶため prop 刻印も対称。

### 3. バックアップスロット — 破壊的入口 5 系統全てカバー
`Persist.saveBackup` の呼出は `doClearAll` (paged 'del' と plain 'clear' の両分岐)、`importBoard`、`importFromHash`、`applyRemote` 'replace' (`_ln(_sh())` ゲート付き) の全てに存在。`restoreBackup` は消費側のため不要。空ボードは `_ln` ゲートで書き込まない (無失うものなし)。

### 4. ブート順序は pre-Net で安全
`main()` は `Persist.open → load → checkBackup/restore → importFromHash → Net.init`。restore の 'replace' commit は `Net.broadcast` 前に走るため wire には出ないが、broadcast は `this.bc`/`this.dc` null ガードで no-op。ローカル wclock には commit 時点で墓標が刻まれており、後続の snapshot union-heal が墓標を尊重して復活させないため到達順に依らず収束する。

### 5. undo 経路
`'replace'` の逆適用は `before`/`beforeWc`/`beforePages`/`beforeCurPg` を復元し、undo-wire が同形 'replace' を生産するため peer は forward apply で同一結果 (0615/0928)。`_bT` を両方向へ刻印する規則は 0928 で対称化済み。

## 検証
- behavioural: `Store.applyRemote` 実経路で ① 非空ボードへの remote 'replace' が `Persist.saveBackup` を pre-swap 内容 (shapes/viewport/docName) で1度だけ呼ぶ・空ボードでは呼ばない、② `_born` が swap 時計より新しい図形が `keep` として残り時計を保全・`after` 図形は swap 時計で `_born` 刻印・消えた id は `_del` 墓標化 — 2ブロック9 assert。
- 既存ピン群: 0613 (wholesale 収束)、0614 (並行 swap の clockNewer 一意化)、0615/0616 (undo-wire/lastRep)、0790 (dup id)、52a/52b (slot round-trip/empty no-op)、0795 (viewport ゲート) が同規則を別面で固定済み。
