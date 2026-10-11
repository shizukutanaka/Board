# ADR-1164 — replace undo/redo restores the document's viewport

## 状態
採用済み (v1.8.188)

## 文脈

ADR-1163 で swap が採用する doc スカラーの undo 復元範囲を監査した:
`replace` op が記録・復元するのは shapes・wclock・pages/curPg・origSel・ro。
3つの総入替パス (importBoard / importFromHash / restoreBackup) は
`d.viewport` が `_vpOK` を通れば `_vp()` に着地させるが、op はカメラを
記録していなかった — **viewport が op に記録されない最後の doc スカラー**
だった。

採用判定マップ (doc-switch で変わるが undo が戻さない状態):

- `state.ro` — ADR-1163 で `bro`/`aro` 記録済み
- `state.viewport` — 本 ADR で `bvp`/`avp` 記録 (ローカル専用、wire 非流出)
- `state.wclock`/`pages`/`curPg`/選択 — 既存フィールドで復元済み
- docName — 別チャネル収束 (ADR-0696 `_bName` broadcast + (ts,peer) LWW)。
  undo で旧名へ戻すには新 rename emit が必要で、発散ではなく semantic の
  分離として据置
- `state.roomSecret` — restoreBackup のみ `d.rs` をリシード (ADR-1056/1133)。
  ルーム認証鍵であり doc ではない — undo で戻すと正当なリシードを壊す
  ため据置 (wire 発散の恐れがあるため)
- `d.rep`/`d.nts` — import 経路は非採用 (Persist.load のみ) — リークなし

## ソクラテス式確認

- Q: 「⌘Z は swap を『完全に』戻す」は本当か? — 否。import doc の保存
  ビューポートにカメラが移り、undo で盤面は戻ってもカメラは留まる。
  旧図形が画面外に置かれうる UX 欠陥 — undo は「直前に見ていた状態」
  への復帰であるべき。
- Q: viewport は wire に出すか? — 出さない。リモート 'replace' は受信側の
  カメラを動かすべきではない (各自の view は各自のもの)。`_slimOp` の
  'replace' ホワイトリスト再構築が `bvp`/`avp` を自動で落とす — `'bvp' in
  op` はローカル記録 op の識別子 (ADR-1163 と同じ idiom)。
- Q: 採用前の捕捉点は? — `_vp()` は `_bpg`/`_bcp` と同じ pre-swap 捕捉
  シームに置く (`const r0=state.ro` 行は採用後のため遅い)。`avp` は
  `_repC` 内の `clone(_vp())` で採用後ビューを記録。
- Q: forward の gate は? — own-redo のみ (`op.clock.peer===_pi()`)。
  リモート swap の forward が受信側カメラを押し付けないよう `aro` と同じ
  ゲートに揃える。

## 決定

1. `_repC` のシグネチャに `bvp` を追加、op に `bvp` (pre-swap clone) と
   `avp` (`clone(_vp())`、record 時点 = 採用後ビュー) を記録。
2. 3 caller の `_bpg`/`_bcp` 捕捉行に `bvp=clone(_vp())` を同置。
3. `_apply` 'replace' — backward で `bvp` を復元、own-redo で `avp` を再
   着地 (`_vp().x/y/zoom` 上書き、`bvp`/`avp` は live 境界値のため再検証
   不要)。old op にフィールドがなければ `'bvp' in op` ゲートで skip。

## 検証

- editable share link `{viewport:{100,200,2}}` → swap で採用 → undo で
  `{5,6,1.5}` 復帰 → unlock-redo で `{100,200,2}` 再着地 (behavioural)
- `_slimOp` 'replace' ホワイトリストが `bvp`/`avp` を剥がすため wire 非流出
- ro-gated redo (ro=true 復元後) は ADR-1057 ゲートで拒否 — avp/bvp も不変
