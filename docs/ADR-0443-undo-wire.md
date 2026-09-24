# ADR-0443: undo/redo のピア伝搬 (逆 op wire 変換)

## 状態
実装済 (v1.7.478)

## 背景
`undo()`/`redo()` は `Store._apply` をローカルにのみ呼び、`Net.broadcast` を
一切行わなかった。そのためローカルの取り消しは永遠にピアへ届かず、両者の
盤面が発散したままだった (research-improvements.md 既知課題 F「undo×sync」)。

## 決定
**逆 op を新しい書き込みとして broadcast する** — LWW の枠組みで「古い値を
復元する新しい write」は自然に収束する。

- `_undoWire(op)` が各可逆 op を wire 安全な逆 op 配列へ写像:
  - `add` → `del[shape]`、`addMany` → `del`、`del`/`clear` → `addMany`
    (+ `connClears` は各コネクタへ `upd` で結合を復元)
  - `upd`/`style`/`resize`/`align` → before/after スワップ
  - `move` → dx/dy 反転
- `undo()` は写像結果に **新しい peer 時計** (`{peer,seq++,ts:now}`) を刻印し
  `Net.broadcast`。`redo()` は op 自体に新時計を刻印して broadcast。
  既存の `_slimOp`(画像 ref 化)・`opc` チャンク分割・`_sendDC` 漏斗をそのまま通る。

## 断念した代替案
- **`group`/`ungroup`/`zorder`/`replace`/`beautify` の伝搬**: `group` の逆は
  「各図形の元 groupId 復元」が必要で wire の `ungroup` は一括クリアのため
  局所とピアで発散しうる。`replace`/`beautify` は validRemotePayload 非対応。
  これらは `_undoWire` が `null` を返しローカルのみに留める (documented gap)。

## 影響
- undo/redo が `commit` と同じ収束経路に乗る。ロック図形スキップ等の既存
  フォワード適用規則もそのまま継承される。
- 余白確保のため `_forConn`/`_forTxt`/`_noSh`/`_rO`/`_midV` を集約 (~830B)。
