# ADR-0617: スナップショットに swap marker 同梱

## 状態
実装済 (v1.7.644)

## 背景
'replace' (ADR-0613..0616) とスナップショット適用には因果順序の穴があった:
送信側が swap 適用**前**に組み立てたスナップショットが、受信側の 'replace'
適用**後**に届くと、マージ経路 (`_mergeSnapshotOp` は add-only) が pre-swap
図形を再追加し、両者が恒久的に発散する。実際の発生窓は狭いが、joiner への
応答が複数ピア・複数チャンネル (BC/RTC) を跨ぐと到達順は保証されない。

## 決定
`_snapshotMsg()` が `rep:state._lastRep` を同梱 — 「この盤面は swap 世代 R を
反映している」という因果マーカー。

受信側 `case 'snapshot'`:

- `clockNewer(state._lastRep, msg.rep)` (受信側 marker が**厳密に**新しい)
  → スナップショット全体を棄却 (中身は勝者 swap で除去済みの pre-swap 盤面)
- 等しい marker は同世代 → 通常通り適用/マージ
- `clockNewer(msg.rep, state._lastRep)` → 適用後に `state._lastRep=msg.rep` を
  採用 (スナップショットが自分の知らない新しい swap を反映するため、marker を
  揃えて以後の古い swap を棄却できる)
- `rep` なし (旧バージョン) → 従来通り (混在バージョン制約は 0614 と同じ)

## 影響
- swap 世代を跨ぐスナップショット取込が因果順序で棄却され、発散経路を閉塞
- joiner (空盤面・marker null) は従来通り全受理で bootstrap 不変
- 同世代判定は厳密比較 — marker のエコーバック (自 marker が往復して来る) で
  相互棄却する二次バグを防止
