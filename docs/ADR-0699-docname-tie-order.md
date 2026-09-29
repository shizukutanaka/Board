# ADR-0699 — ドキュメント名 LWW の同時刻タイを (ts, writer) 総順序で収束

## 状態
採用 (v1.7.725)

## 文脈
docName の LWW は `msg.ts>_nameTs` / `msg.nameTs>_nameTs` の厳格 `>` —
同時刻に2ピアが改名すると両者とも相手の改名を「stale」として棄却し、
名前が**永続的に発散**した (ADR-0581 で検出した stale 問題の残穴、
pageName の ADR-0698 と同型)。

## 変更
- モジュール変数 `_namePeer` (最終書込 peer) を追加。`_nameTs` と対で管理
- 比較を `_nameWin(ts,peer)` = `clockNewer({ts,peer,seq:0},{ts:_nameTs,peer:_namePeer})` へ統一
- `name` メッセージ: `msg.peer` が書込者 (sender=writer)。受理時に `_namePeer=msg.peer`
- `snapshot`: `namePeer` フィールドを新設 — 送信者と書込者が**別ピア**になり得る
  (スナップショット送信者は直前のリネームの作者ではない) ため msg.peer ではなく
  同梱した writer で比較
- 永続化: doc record に `ntp` を追加 (`nts`/`rep` と同じ ADR-0695 経路)
- ルーム切替リセット (ADR-0619) で `_namePeer=''` もリセット

## 検証
- name msg の同時刻タイ (高/低 peer) + snapshot namePeer タイの5アサート
- 後方互換: `nameTs`/`peer` 不在の旧形式メッセージは従来通り受理
