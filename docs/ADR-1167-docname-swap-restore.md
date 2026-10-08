# ADR-1167 — docName を swap の復元領域へ (bnm/anm)

## 状態
採用済み (v1.8.191) — 実害 1 件を修正 + 契約ピン

## 文脈

'replace' op の復元領域 (undo-domain) はこれまで `before`/`wc`/`origSel`/`beforePages`/
`beforeCurPg` に加え、ローカル副作用として ro (ADR-1163 の `bro`/`aro`) と viewport
(ADR-1164 の `bvp`/`avp`) を復元していた。しかし doc 切替が採用する第3のスカラー —
docName — が復元領域に欠落していた。3箇所の swap サイト (.board ファイル、共有リンク、
backup 復元) は全て `bvp=clone(_vp())` でカメラを pre-swap 捕捉しつつ、`_docN(d)` /
`_setDocName` で採用前の名前を記録していなかった。

## ソクラテス式確認

- Q: インポートを ⌘Z すると名前も戻るか? — 戻らなかった (実害)。undo は図形・
  ページ・ro・カメラを復元するが、名前は採用後のまま — ボードは旧 doc に戻るのに
  タブ/タイトルは imported 名を残す局所不整合。さらにピアは wire 'name' LWW で
  採用名を保持しており、undoer 側だけ旧名を復元しても静黙復元では再発散する。
- Q: docName は ro/vp と同じローカル復元で足りるか? — 足りない。docName は共有
  LWW チャネル (`_nameTs`/`_namePeer`/`_nameWin`) で、undoer が復元した値を
  再ブロードキャストしないと全員が採用名で残る。backward 復元は `_setDocName(op.bnm)`
  に続き `_bName()` で復元名を送出 (ro/vp と違い「復元値を wire で再告知」が契約)。
- Q: `anm` の redo 復元は誰が走るか? — own-redo のみ。`op.clock.peer===_pi()` ゲート
  (bro/bvp と同型) で、wire-slimmed remote (bnm/anm を持たない) はどちらの枝も不発。
  ピアは undoer の 'name' メッセージで収束 — 両メッセージは同一チャネルで送られる。

## 決定

- `_repC` に `bnm` パラメータを追加。3箇所の swap サイトは採用前に `bnm=_dn()` を
  `bvp` と同じ捕捉行で取得し、`anm` は `_repC` 内部で post-adopt の `_dn()` を記録
  (avp の `clone(_vp())` と同型)。wire 上は `_slimOp` の 'replace' ホワイトリスト
  (`{op,after,afterWc,clock,pages,curPg}`) が自動で strip — undo-domain データは
  輸送されない契約を維持。
- `_apply` 'replace' に2行追加: `!forward&&'bnm' in op` で `_setDocName(op.bnm)`+
  `_bName()`、`forward&&'anm' in op&&op.clock.peer===_pi()` で `_setDocName(op.anm)`
  +`_bName()`。`_setDocName` は input 値・タブタイトルも更新する正規経路。
- 付随: hash 取込の重複3行コメントを1行圧縮 (サイズ天井の帳尻、557,054B)。

## 検証

- 5 behavioural asserts (fn 世界): named share-link 取込で docName 採用、undo で
  pre-swap 名復元 + 'name' 再ブロードキャスト、redo で採用名再適用。
- 2 source pins (bnm/anm 捕捉・復元の存在)、1 件の stale ピンを新シグネチャへ再校正。
