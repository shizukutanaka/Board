# ADR-0652: undo/redo が別ページの変更を戻す時 view を追従

## 状況
多ページ化 (ADR-0646) で、undo/redo の「効果が見えない」経路が生まれた:
ページ1に居るとき、ページ2で行った `del` を undo すると復元は起きるが
画面上は何も変わらない (エディタのクロスファイル undo と同じ問題)。

また `pageAdd` の backward (undo / 外部 op 由来) で、閲覧中ページが畳まれた
ときの着地が `state.curPg=fid` の直接代入 — ADR-0649 で `_pgDel2` に入れた
`switchPage` 経由 (SR アナウンス・カーソル隠蔽・overlay 畳み・fit リセット)
が抜けていた。

## 決定
- `_opIds(op)` に `_apply` の touched-id 収穫を集約 (damage 推定と同一集合
  を再利用できるので単一化)。
- `_pgFollow(op)` を undo/redo の `_apply` 直後に呼ぶ:
  - `pageAdd`/`pageName` → 復元・改名されたページへ `switchPage`
    (存在すれば)。
  - `pageDel` → `_pgDel2` の heal に委ねるので no-op。
  - その他: touched 図形が1つも現ページに無く、別ページに存在する場合のみ
    そのページへ `switchPage`。削除系 undo (再出現)・他ページへの upd/
    move/style の取り消しが「見える」ようになる。
  - touched 図形が1つも残っていない場合 (add の undo = 除去) は着地先が
    無いので no-op。
- `pageAdd` backward の heal を `switchPage(fid)` へ (ADR-0649 と同型)。

## 非目標
redo/undo の wire 側で「ピアの view を動かす」こと — view はローカル概念なので
プレゼンスの pg 情報が自然に追従する (peer 側は自ページに居続ける)。
ページ履歴 (前のページへ戻る) や undo の深さ優先追従はしない。
