# ADR-0015 — undo/redo を「複製される op」にする (replicated undo)

- Status: **Accepted / 実装済み (v1.7.73)**
- Date: 2026-08-08
- Context: `docs/research-improvements.md` §F「協調 undo/redo の正しさ」
- 出典: [arxiv 2404.11308 — *Undo and Redo Support for Replicated Registers* (2024)](https://arxiv.org/abs/2404.11308) ·
  [Ink & Switch — *Local-first software*](https://www.inkandswitch.com/essay/local-first/)

## なぜ (問題)

`Store.undo()` は `_apply(op,false)` を呼ぶだけで、**何もネットワークに送っていなかった**。
`commit()` / `_recordCommitted()` / `_syncTextFinalize()` はいずれも `Net.broadcast` するのに、
undo だけが送らない。結果として **同期中のボードでは undo が必ず発散する**。

2ピア (fake-DOM ハーネス) で実測した v1.7.72 の挙動:

```
add   → A undo:  A=0 shapes, B=1 shape      ← B に図形が残り続ける
upd   → A undo:  A=#000,     B=red
move  → A undo:  A.x=0,      B.x=30
del   → A undo:  A=1 shape,  B=0 shapes
```

これは「稀な競合状態」ではない。**単独ユーザーが Ctrl+Z を1回押すだけで起きる**。
`docs/ADR-0002` の追記 (2026-07-13) が繰り返し断り書きしていた
「undo は broadcast しない」という前提そのものが、同期機能の穴だった。

`state.wclock` (per-property LWW) の側から見ると事態はもう少し悪い。undo は値を巻き戻すが
書き込みクロックは元 op のものを残す。つまり「値は古い、クロックは新しい」という不整合な
レプリカが出来上がり、以後その property への*正当な*リモート書き込みが LWW で落とされうる。

## 何が正しいか (研究の指針)

§F が引く replicated-register の undo/redo の設計指針は明快で、Board の構造にそのまま乗る:

> undo を「ローカル・スタックの巻き戻し」として実装してはならない。
> **逆効果を持つ新しい op を発行**し、他の書き込みと同じ順序規則の下に置く。

理由は Board の実装で見るとわかりやすい。ローカル巻き戻しは「この op は無かったことになる」
という*歴史の書き換え*を仮定するが、レプリカは既にその op を観測して自分の状態に織り込んで
いる。歴史は書き換えられない。書き換えられるのは**未来だけ**なので、undo は未来向きの新しい
書き込みとして表現するしかない。

## 決定

`Store` に2つを足す。

- **`_emit(op)`** — 新鮮なクロック (`peer / ++seq / nowTs()`) を刻み、`seenOps` に自分の op
  として登録し、`_stampWrites` で LWW クロックを記録し、`Net.broadcast` する。
  **`state.history` には積まない**。undo が自分自身の undo ステップになってはならないため。
  これは `_syncTextFinalize` が既に使っていた「broadcast 専用 op」と同じ形。
- **`_revOps(op)`** — `_apply(op,false)` がローカルで及ぼした効果を、ピア側で*前向きに*
  適用できる op 列に変換する。`undo()` は逆適用の**前**にこれを計算し (後述)、逆適用してから
  `_emit` する。`redo()` はクロックを外した元 op のコピーを `_emit` する。

### 逆 op の対応表

| history の op | undo が送る op |
|---|---|
| `add` / `addMany` | `del{shapes}` |
| `del` | `addMany{shapes}` + `style{connClears の before}` (コネクタ束縛の復元) |
| `upd` | `upd{before: 現在値, after: 実際に復元したキー}` |
| `move` | `move{dx:-dx, dy:-dy}` |
| `group` / `ungroup` | 復元先の groupId ごとに `group{ids,gid}`、無所属分は `ungroup{ids,gids,before}` |
| `zorder` | `zorder{changes: before/after を入れ替え}` (legacy 形式は `after: op.before`) |
| `style` / `resize` / `align` | 同型 op (`align` は `dir` を保持) |
| `clear` / `replace` / `beautify` | **なし** (下記) |

### 決定を支える3つの細部

1. **逆 op は「実際に適用した効果」だけを載せる。**
   v1.7.68 の `_lwwSkip` ガードにより、リモートがより新しく書いたキーは undo で復元されない。
   その抑止されたキーを**ワイヤにも載せない**。ローカルとワイヤが同じ判断を共有するよう、
   従来 `_apply` 内に2箇所インラインで書かれていた逆適用フィルタを `_revPatch(id,raw,op)` に
   括り出し、`_revOps` と `_apply` の両方が同じ1つの定義を読む。
   結果、v1.7.68 の「新しいリモート書き込みを undo で潰さない」という保証は、
   ローカルだけでなく**両ピアで**成り立つようになった。

2. **逆 op は逆適用の *前* に計算する。**
   `before` フィールドは「undo 前の値」でなければ受信側の `_lwwDrop`/`_stampWrites` の
   変更キー検出 (`_chg`) が働かない。`_lwwSkip` も逆適用が読むのと同じ `wclock` を読む必要が
   ある (`del` の逆適用は `op.wc` を書き戻すため、順序が意味を持つ)。

3. **元々複製されない op の undo は、やはり複製しない。**
   `clear` / `replace` / `beautify` は `REMOTE_OPS` に無い (前2つは「ピアが盤面を消せない」
   という意図的な防御)。前向きの op がピアに届いていない以上、その undo が `del`/`addMany` を
   送れば**ピアの状態を一方的に壊す**。`undo()` は `REMOTE_OPS.has(op.op)` で門を作る。

## 代替案

- **(a) 元 op をそのまま再送する (redo の素朴案)** — 却下。ピアは `peer:seq` で dedup 済みで、
  古い `ts` は以後の書き込みに LWW で負ける。redo は新鮮なクロックのコピーを送る。
- **(b) `undo` を専用のワイヤ op 型 (`{op:'undo', target:<clock>}`) にする** — 却下。
  受信側に op-log の保持と逆適用の実装を要求し、`REMOTE_OPS` の allow-list とペイロード検証
  (`validRemotePayload`) の設計 — 「ピアから来るのは*状態の変更*であって*制御命令*ではない」 —
  を壊す。既存の op 型で表現できるなら、攻撃面を増やさないほうがいい。
- **(c) 完全な因果 undo (op ごとの undo カウンタを CRDT として持つ)** — 見送り。
  論文の完全形はこちらに近いが、`wclock` を per-property のレジスタから
  per-property-per-op の構造に拡張する必要があり、永続化フォーマットの変更を伴う。
  今回の変更は**既存のワイヤ形式・永続化形式を一切変えない**ことを優先した。

## 既知の限界 (意図的に未解決)

- **undo は「新しい書き込み」なので、リモートの*古い*書き込みには勝つ。** これは LWW の
  定義そのもので、`_lwwSkip` が守るのは「元 op より新しいリモート書き込み」だけ。
  ピアが undo と同時刻に書いた場合の勝者はクロックの全順序が決める。
- **`del` の undo で復元する `wclock` は自ピアにしか戻らない** (`op.wc` はローカル履歴にしか
  無い)。復元後の shape に対する以後の書き込みは、自ピアだけが古いクロックを持つ状態から
  比較を始める。実害は「復元直後に、削除前より古いリモート書き込みが自分だけ落ちる」という
  狭い窓に限られるため、ワイヤ形式を変えてまで送ることはしなかった。
- **redo は前向き適用なので LWW ゲートを通さない** (ローカル `commit` と同じ)。新鮮な
  クロックで送るため両ピアは収束するが、「redo が新しいリモート編集を上書きする」ことは
  ありうる。これは undo/redo の意味論の選択であり、バグではない。

## 検証

`test.mjs` の 2ピアハーネスに 3 ブロック追加 (合計 1637 presence checks pass, 0 fail):

- 9 つの op ファミリ (`add`/`addMany`/`del`+コネクタ束縛/`upd`/`move`/`group`/`ungroup`/
  `zorder`/`style`/`resize`/`align`) すべてで、A の undo 後に A と B が一致すること。
  redo も同様 (redo 側は B を「正しく伝播した undo が残す状態」に置いてから検証し、
  undo の成否に相乗りして通ってしまわないようにした)。
- 部分抑止: A の op が `w` と `stroke` を触り、`w` だけリモートに取られている場合、
  undo は `stroke` だけを復元し、**その復元だけがワイヤに乗る**こと。
- local-only op (`clear`) の undo が何も送らないこと。undo が history エントリを作らず
  redo 分岐を切らないこと。発信ピアが自分の逆 op をエコーで再適用しないこと。

非空虚性は stash 法で確認済み — v1.7.72 の `index.html` に対して **26 assertion が失敗**する。
