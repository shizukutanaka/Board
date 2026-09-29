# ADR-0736: clear/'replace' の墓標保持 (swap 削除 id の tomb 化)

## 背景

ADR-0734/0735 で存在仲裁は「`wclock[id]._del` が add 系 push をゲートする」モデルに統一したが、**'clear' と 'replace' の forward は `state.wclock={}` で wclock ごと全消去**していた。2つの発散経路:

1. **swap 削除 id の無墓標化** — clear/import で消えた図形は tomb を持たない。送信中の遅延 'add' (swap 以前発行) が到着すると受信側だけ復活 → 送信側は削除済みのまま → 発散 (del-vs-add と同型、経路違い)。
2. **受信側墓標の喪失** — ローカルが観測した del tomb は `{_del:clock}` で存在証拠。swap が全消去すると、swap clock より新しい tomb (受信側の「最後の存在判定=削除」) も消え、'after' に同じ id を運ぶ swap が図形を復活させる — del は後で送信側へ届き削除されるが、受信側は tomb を失い再復活し続け得る。

## 決定

- 'clear' forward: 除去した全 id に `{_del:op.clock}` を tomb 化 + 既存 tomb を `clockNewer` で max 保持。
- 'replace' forward: (a) `next` の push を「受信 tomb が swap clock を上回る」id で除外、(b) swap で除去された id に `{_del:op.clock}`、(c) `wc0` の `_del` を `clockNewer(_del,op.clock)` で生存側へ維持 — per-id「最後の存在判定」が常に勝つ。
- undo (backward) は従来どおり `op.wc` の復元 — tomb は swap 前状態へ戻る。

収束: 受信 tomb が swap より新しい図形は受信側で採用されず、送信側へ del が届いた時点で両者「削除」に一致。stale add は swap clock 以下なので tomb に敗れ、swap より新しい add は正規の再作成として tomb を上書き。

## 検証

test.mjs に 5 件: replace が盤面を空にする (regression)、swap 除去 id が swap clock で tomb 化、swap より新しい tomb が生存、stale in-flight add が復活しない (mutant 検証)、tomb が after 運搬メンバーも落とす。clear undo の既存ピンを tomb 形へ追従。
