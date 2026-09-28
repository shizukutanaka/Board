# ADR-0549: locked parity の undo 監査 — 残経路は自己整合

- 状態: 実装済み (v1.7.577)
- 系: Store / undo (テスト + 監査結論)

## 背景

ADR-0547/0548 で「forward の locked スキップ集合が backward に未反映」の
実害2件 (del 二重登録・move 逆移動) を修正した。残る locked ガード経路
(style/resize/align/beautify/group/ungroup/zorder) も同型の疑いがあったため監査。

## 監査結論

- **style/resize/align/beautify**: backward は per-shape `before` パッチを
  書き戻す。forward でスキップされた図形の `before` は現値と同じ → 冪等 no-op。
- **group/ungroup**: 同様に per-shape `before.groupId` を復元 — 冪等。
- **zorder** (minimal-delta + legacy): `before` 値の書き戻し — 冪等。
- **del**: 修復済み (ADR-0547) — `before` ではなく存在そのものを復元するため
  冪等ガードが必要だった同型。
- **move**: 修復済み (ADR-0548) — デルタ適用のため `op.moved` 記録が必要だった。

## 決定

style/group の locked 混在 undo が no-op であることを behavioural テストでピン
(再発防止)。追加のコード変更は不要と判断。

## 影響

- index.html 変更なし (version のみ)。test.mjs に 4 asserts 追加。
