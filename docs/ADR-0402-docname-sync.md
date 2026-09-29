# ADR-0402: ドキュメント名のピア同期 (k:'name' + snapshot.name)

## 状態
実装済 (v1.7.438)

## 背景
`docName` はローカルの state/IDB にだけ書かれ、コラボ接続中にリネームしてもピアには届かない
唯一のユーザー編集可能メタだった。`.board` / `.drawio` / share-link には同梱されるのに、
ライブ同期の経路が欠落していた。

## 決定
- `_commitDocName` (input/change 両ハンドラ) が `Net._bcast({k:'name',peer,name})` を発射。
  `_bcast` (ADR-0401) で BroadcastChannel + RTC DataChannel 両経路に載る。
- 受信側 `case 'name'`: `typeof msg.name==='string'&&msg.name.length<=80` で
  `_setDocName(msg.name)` + `_ps()`。80 は既存の入力/maxlength クランプと同一。
  自エコーは `msg.peer===_pi()` で既に除外。
- `_snapshotMsg` に `name:_dn()` を追加。`_applySnapshot` は空ボード参加時のみ採用する
  (既存ボードへのマージではローカル名を維持 — 名前の上書き競合を避ける意図的な設計)。

## 断念した代替案
- per-property LWW (`wclock`) での名前管理 — wclock は shape スコープで、ボード級メタの
  時計がない。到達順の last-write-wins で実害は殆どない (scratchpad 用途)。
- op 化 (undo 可能にする) — undo で他者のリネームが巻き戻る奇妙さを避けて採用せず。

## 影響
リネームがピア間で即時伝播し、遅れて参加したピアも snapshot 経由で名前を引き継ぐ。
