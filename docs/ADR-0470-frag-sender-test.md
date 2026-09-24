# ADR-0470 — `_fragIn` 送信者タグの実動作テスト

## 状態

実装済 (v1.7.503)

## 背景

ADR-0469 の literal-sync assert は構造の存在のみを検証し、「2送信者のストリームが本当に継ぎ接ぎしない」動作は未保証だった。

## 決定

behavioural test を追加: `peerA`/`peerB` が交互に断片を送った場合、スロットは送信者ごとに再起動され join された JSON は常に同一送信者の断片のみで構成されることを実動作で検証。fresh-stream-wins セマンティクス (他送信者の seq0 で再起動) も確認。

## 影響

- テストのみ。将来 `_fragIn` を per-sender Map 化する際の回帰ネットになる。
