# ADR-0428: `_trimSeen` 統一と `_ck` op-clock キー helper

## 状態
実装済 (v1.7.463)

## 背景
`_recordCommitted` は `seenOps` の上限トリムを `_trimSeen()` helper ではなく
inline で重複実装していた (commit/applyRemote は helper 使用)。また op の
dedup キー `op.clock.peer+':'+op.clock.seq` が 3 箇所に inline 重複。

## 決定
- `_recordCommitted` の inline トリムを `_trimSeen()` に置換
- `_ck=op=>op.clock.peer+':'+op.clock.seq` で dedup キー構築を集約 (3 サイト)

## 影響
- ~85B 回収、MAX_SEEN_OPS ポリシーの単一実装化 — 将来の閾値変更がずれ修正
  不要に。挙動不変。
