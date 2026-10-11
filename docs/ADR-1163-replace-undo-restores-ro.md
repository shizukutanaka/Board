# ADR-1163 — replace undo/redo restores the document's ro flag

## 状態
採用済み (v1.8.187)

## 文脈

ADR-1057/1069/1162 で `state.ro` は doc のモードフラグとして確立した:
読み取り専用 payload (`ro:1`) を開くと true、書き込み可 payload で解除され、
`storeDocs`/`Persist.save`/`saveBackup`/`.board` エクスポート全てが `ro` を永続化する。
storeDocs 上の `replace` op は swap の before/after、wclock、pages、origSel を記録するが、
**`state.ro` だけが op に記録されない唯一の doc 状態**だった。

## ソクラテス式確認

- Q: 「⌘Z は swap を『完全に』戻す」は本当か?
  A: 否。ro doc → editable payload import (ADR-1069 の unlock-adopt) → undo で
     盤面・ページ・wclock・選択は戻るが `state.ro=false` が残る。undo が変えた
     doc-mode を戻さない — pre-swap の ro=true が unlock で上書きされたまま。
- Q: backward のどこに入れるべきか?
  A: `_selR(op)` と同じ `if(!forward)` 枝。`bro` はローカル記録専用フィールドで、
     wire slim (`_slimOp` の 'replace' ホワイトリスト再構築) が剥がすため
     リモート op は `bro`/`aro` を決して持たない — `in` 判定だけでローカル
     記録 op と区別できる。
- Q: forward にも要るか?
  A: 要る — redo は forward apply なので `aro` で再採用しないと戻り過ぎる。
     ただしリモート 'replace' との区別が必要 (ピアが自分の ro を押し付けては
     いけない) — `op.clock.peer===_pi()` でローカル redo のみに限定する。
- Q: wire に出しては? — 出さない。ro はローカルの doc-mode であり、ピアの
     writable 状態とは無関係。`_slimOp` の 'replace' 再構築が自動で落とす。

## 決定

1. `_repC` が op に `bro` (swap 前 `state.ro`) と `aro` (payload の ro) を記録する。
   3 caller は `state.ro=false` フリップ前に `r0` を捕捉する (ADR-1162 の
   commit-while-writable 順序は不変)。
2. `_apply` 'replace' — backward で `state.ro=!!op.bro; _roBadge()`、
   forward で `aro` を `op.clock.peer===_pi()` 限定で再採用。
3. undo が ro=true を戻した後の redo は ADR-1057 の ro ゲートで自然に拒否される
   (閲覧のみ doc は redo も書き込み op も不可) — 整合。

## 検証

- ro→editable import → undo → `state.ro===true` 復帰 + redo は ro-gate で false
- writable→ro:1 import → unlock → undo → `state.ro===false` (pre-swap bro=false)
- 同上 → redo → `aro=1` 再採用で `state.ro===true`
- `Store.undo()`/`Store.redo()` の ro ゲート自体は不変。
