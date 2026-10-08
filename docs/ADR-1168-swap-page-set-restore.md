# ADR-1168 — 'replace' のページ集合復元: tomb 拒否を op 時計 parity へ

## 状態

採用 (round918 / v1.8.192)。

## 背景 (実害)

`Store.undo` は記録された `replace` op の `op.clock` を新しい undo 時計 T2 で上書きしてから
backward `_apply` を実行する (ADR-0717)。backward 'replace' は

1. 旧ページ集合 `pg0` (スワップ後のページ) に `_wD(p.id, T2)` の tomb を打ち、
2. `_pgAdopt(op.beforePages, op.beforeCurPg, op.clock)` で記録済み pre-swap ページ集合を復元する。

ところが `_pgAdopt` の keep フィルタは **carried birth (`p.bts`) と tomb の比較のみ** で仲裁していた:

```
keep iff !w || !w._del || (b && clockNewer(b, w._del))
```

`bts==null` のページ (ADR-1110 以前の永続化 doc、clk なし採用経路、hash インポート由来) は
`b=null` となり、**存在する tomb に常に敗北**する。スワップ時に打たれた tomb (T1) は必ず存在
するため、undo で `beforePages` の全 bts-less ページが drop → `state.pages=null`,
`curPg=null`, `_pgHealS` が `s.pg` を scrub — **記録された doc 状態が復元されない**。
`undoWire` で同じ backward が全ピアに届くため一貫した「損失の収束」となるが、undo の意味論
(記録ドキュメントの復元) には明確に反する欠陥だった。

同型の実害が redo 側にも存在した: `op.pages` に記録される採用済みページも (インポート経路が
bts を補填しないため) bts-less になり得て、undo が打った tomb T2 が redo の再採用を拒否した。

## 形状との非対称

形状の復元ゲート `_tmE(w, op)` は **「tomb が op 時計より新しい場合のみ dead」**:

```
_tmE = w._del && clockNewer(w._del, op.clock) && !(w._born && clockNewer(w._born, w._del))
```

スワップ自身の tomb (T1 < undo T2) では復元を阻害しない。ページ側だけが異なる仲裁式
(carried-birth vs tomb) を使っていた — これが非対称の本体。

## 決定

`_pgAdopt` に第4引数 `und` (doc-swap apply) を追加:

- `und` 有効時の keep 条件: `!w || !_tmE(w,{clock:clk}) || (b && clockNewer(b,w._del))`
  — tomb が op 時計より新しい場合のみ拒否 (形状と同一規則)。carried birth が tomb に
  勝てば tomb が新しくても採用 (再誕の証拠)。
- `und` 無効時は従来どおり strict: `!w || !w._del || (b && clockNewer(b,w._del))`
  — merge 採用 (snapshot union-heal 経路) は「受信側の tomb が確固とした kill 証拠」として
  据え置き。

`und=1` を渡す呼び出し:

- `case 'replace'` の forward / backward 両方向 (L1789)。
- `restoreBackup` の `_pgAdopt(d.pages,d.curPg,_pgClk(d),1)` (doc スワップ領域)。

残る strict 呼び出しは snapshot union-heal (msg.pages 採用) のみ — merge 文脈のため不変。

## 結果

- undo: `beforePages` 内の bts-less ページが swap 自身の tomb (T1 < T2) を通過して復元、
  `_bT(p.id, clk)` で born T2 再スタンプ → 以後の stale del は `_bN` で正しく拒否。
- redo: undo が打った tomb T2 < redo 時計 T3 → 記録ページを再採用。
- ピア側の undo-wire 'replace' forward 適用も同じ `und` 経路 → undoer と一致 (発散しない)。
- remote 'replace' (フレッシュ swap) も `_tmE` parity: tomb > swap 時計のときのみ拒否
  — 形状の存在時計仲裁と一致。

## ピン

17 behavioural asserts + 4 source pins (`ADR-1168 swap restore-domain boundary`):
swap→undo→redo で pages/curPg/viewport/docName/ro の往復、ordering state の単調進行、
gesture 領域の非スワップ性、roomSecret の session-scope (`.board` 非波及・undo 非回帰)、
backup restore の rs 再シード。ソースピンは `und?!_tmE(...):!w._del` 分岐と
`op.beforeCurPg,op.clock,1` 呼び出し。
