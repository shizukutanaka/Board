# ADR-0963: ライフサイクル×有界性監査

## Status

Accepted (v1.7.989) — 監査完走、実害なし。結論を5ピンで固定。

## Context

ADR-0962 (スライダー `_sbf` のジェスチャ境界) に続く同型監査として、
「セッション内に保持する一時状態は境界があるか・境界を越えた残留が不正値を産まないか」
を残りの主要バッファ群へ適用した。

## Audit

| 軸 | 経路 | 結果 |
|----|------|------|
| undo スタック有界 | `state.history` (MAX_HISTORY=500) | clean — `_recordCommitted` (1428-1437) と `_recordRemote` (1572-1574) の両経路で `length>MAX → shift()`。shift 時は `histIdx` 不変が正しい: push→shift で要素 index が -1 するので、tip にあった histIdx がそのまま新 op (末尾) を指す。redo 尾切りも先に `length=_hx()+1` で済 |
| pending op の origSel | `_nug={k,op,sel:_selIds()}` | clean — `sel` は `[..._sl()]` の**配列スナップショット**。後続の選択変更 (Set 差替え・要素追加削除) が pending op の `origSel` を書き換えない。`_nugEnd()` → `_keepSel(n.sel)` で undo-restore 選択が正確 |
| docName commit 粒度 | `input` → `_commitDocName` (IME ゲート) | 意図的 clean — keystroke 毎 `_setDocName`+`_ps`+`_bName` は (ts,peer) LWW で収束する。trailing-edge 化すると pending-write の消失窓が産まれるだけ (0957 系とは対称が違う: こちらは値系で msg も微小) |
| `dupDelta` チェーン | `doDuplicate`/`_placeCopies` | clean — smart 分岐は `state.dupIds.size && sel.every(dupIds.has)` で、dead-id は `.map(byId).filter` で先に落ちる、`!_ln(sel)` で空選択も遮断。`_placeCopies` 毎に reseed するので陳腐化しない |
| テキストエディタ commit | `openTextEditor`/`blur` | clean — live は DOM のみ、commit は blur で1 op (per-gesture)。remote del 中編集は `byId` 再検証で fold (0556)。IME composition は auto-resize のみ抑制 |
| presence 有界 | `state.peers` | clean — `MAX_PEERS` flood cap + `NET_PRESENCE_TIMEOUT=15s` reap (BC 系)。`rtc:` 行は `onclose`/`bye` のライフサイクル管理で reap 対象外 — 設計対称 |

## Decision

監査完走のみ。対象6系統は全て「有界または境界で収束」の不変条件を満たす。
契約を実動作ピン化:

1. `history.length>MAX_HISTORY` → shift、`histIdx` は引き続き tip を指す。
2. `_nugPush` 後の選択変更は commit される op の `origSel` に影響しない。
3. `Net._reapPeers` は stale BC 行を削除し `rtc:` 行は残す。

## Consequences

- 本クラスタ (`_sbf`/`_nug`/history/presence/dupDelta/docName/テキスト overlay) の
  ライフサイクル×有界性は全網羅で clean。今後の新バッファは「ジェスチャ境界
  (blur/cancel/teardown) で必ず消費または破棄」規則に従うこと。
- ピン5件: test.mjs ADR-0963 ブロック。
