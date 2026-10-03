# ADR-0972: seenOps dedup × 収束監査 — 完走記録

## 状態
採用 (監査完走 + ピン, v1.7.998)

## 文脈
ADR-0931/0932 (clock↔envelope binding)、0933 (binding 網羅監査)、0926/0927 (born parity)、0969–0971 (mid-run remote 書込の復元ドメイン merge) で op 時計の拘束と birth/death の仲裁規則を固めた後、残る軸は **dedup そのもの**: `seenOps` の `_ck(peer:seq)` キーが全到達経路で一貫して作用するか、eviction 後の再適用が安全か、ローカル生産側 (`commit`/`_recordCommitted`) も同じ規則に従うか。

## 監査結果 (全経路 clean)

### 1. dedup チョークポイント — 3サイト同一規則
`commit` / `applyRemote` / `_recordCommitted` の3箇所が全て `k=_ck(op)` → `_sO().has(k) return` → `_sO().add(k)` + `_trimSeen()` の同一順序で先頭実行。ルーム切替 (`Net.init`) は `_sO().clear()` で新ルームの seq 空間と混線しない (0459/0619)。

- `commit` は「clock 持参 op の再投入」で early return — apply/history/broadcast 全てスキップ (レース時の二重適用を構造的に防ぐ)。
- `applyRemote` は wire 到達 (`_onRecv` 'op'、'opc' 再組立後の再投入、snapshot 内蔵 op の `_mergeSnapshotOp` 経由) の唯一の入口 — dedup はこの一点で成立。
- `applyRemote` の seen-key 早期 return は `_apply`/`_stampWrites`/`_rdb`/`history` 全てを免れる — **二重配送は完全な no-op** (副作用ゼロ)。

### 2. dedup キーは clock のみ — payload 非依存
`_ck` は `peer+':'+seq` のみで同キー異 payload も棄却する。これは正しい: op は生産者直送 (0931 binding) で、同じ clock キーに2種類の payload が来るのは重複配送か鍛造のみ — どちらも棄却が収束的に正しい。

### 3. eviction 後の再適用 — 冪等性が担保済み
`_trimSeen` は MAX_SEEN_OPS 超過で最古 20% を落とす。evict された op の再配送は dedup を抜けて再適用されるが、全16 op が冪等/ゲート済み:
- add → `_tmb` 墓標ゲート + push-if-missing (byId)
- prop 系 → `_lwwDrop` 時計ゲート (`clockNewer` で既刻印 wclock に負ける)
- del/pageDel → 再 tombstone は no-op
- zorder → 自書込み時計で収束
- page 系 → `_pgById`/`findIndex` ガード (0657 ピン済み)

### 4. downstream 収束機械 (再検証済み)
- `clockNewer` 全順序 (ts → seq → peer tiebreak) で `_lwwSkip`⇔`_lwwDrop` が同一規則の両面 (0930 ピン)。
- `_tmb`/`_tAlive`/`_bN`/`_bT` の existence-clock ゲートが全 kill/restore サイトに揃う (0926/0927/0928)。
- `_mergeSnapshotOp` は 'add' のみ + `clock.peer===msg.peer` (0932) + per-key `clockNewer` merge + 構造キー/値ゲート (0919)。
- `_slimOp` は収束必須フィールド (wc/connClears/afterWc/pages/curPg/nts/bts) を保持 (0930 ピン)。
- `_undoWire` 14 op 表が逆 op を全時計ドメインで生成し、remote は forward apply で同一結果 (0929/0930)。
- `validRemotePayload`/`wcOk`/`patches`/`_ccOk`/`validClock` が全16 op の wire 形を bounded 化 — 収束機械に届く op は全て形状済み。

### 5. 設計前提 (文書化)
- op は中継されず生産者直送 → `clock.peer===msg.peer` が wire 全到達経路で拘束 (0931/0933)。
- seq-squat の残面 (第三者 peer id 詐称) は `clock.peer` binding + `peer===_pi()` 早期 return で自ピア偽装は不可、他人 id 詐称は封筒スプーフィングの脅威モデル内 (BC 同一オリジン / RTC ペアリング済み相手のみ到達)。

## 検証
- behavioural: 同一 `{k:'op'}` envelope の二重配送 (同 clock キー・異 payload でも棄却)、'opc' フラグメント経由の再組立→再投入が同一 dedup キーで1回のみ適用、`commit` が seen clock 持参 op で apply/history 双方をスキップ — 3ピン。
- 既存ピン群 (0655/0657 eviction 再適用、0930 対称契約、0932/0941 binding、0846 merge gate) が同規則を別面で固定済み。
