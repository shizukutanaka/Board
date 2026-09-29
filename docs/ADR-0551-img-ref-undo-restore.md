# ADR-0551: del/clear/replace undo での img 参照再解決

## 状態
実装済 (v1.7.579)

## 背景
画像は wire 上で `img:<hash>` 参照として流れ、blob 本体は別チャンクで後追いされる
(ADR-0069)。受信時 `_attachShape` が `_imgIn` から解決するか、未到達なら `_imgPending` に
駐留する。

バグ: 受信側で `img` 参照を持つ図形を削除し、blob 到達後に undo した場合。blob 到達時の
drain (`_onRecv` k:'img') は `byId` 失敗で pending エントリを削除するため、undo で復元された
図形の `img` 参照は二度と解決されない → **永久に placeholder のまま残る**。また blob が
未到達のまま削除→undo した場合も、pending エントリ自体が drain 時に消えているため同様に
dangling となる (滞留型は epoch 外なので仕様内だが、前者は純粋なバグ)。

ローカル発生経路は narrow: peer が受け取った `img` 参照付き図形を、blob 完了前後に
del/clear/replace → undo した場合のみ。ローカル add 由来の図形は `dataUrl` を保持するため
非該当。

## 決定
undo/復元経路の3箇所 (`del` backward、`clear` backward、`replace` forward/backward) で
`_sh().push(clone(s))` を `_sh().push(Net._attachShape(clone(s)))` に変更。

`Net._attachShape` は既存の intake 解決ロジックそのまま:

- `_imgIn` に blob 済み → `dataUrl` 展開して `img` キー除去
- 未到達 → `_imgPending` に再駐留 (blob 到達時に drain で解決)
- それ以外 → そのまま返す

新規コードゼロ、既存ロジックの再利用のみ。

## 影響
- del undo / clear undo / replace の undo|redo で、in-flight だった画像が正しく復元される
- `_attachShape` は引数を clone せず返す/書き換えるだけ — 呼び出し側の `clone(s)` は従来通り
- コスト: 復元1回につき1回の Map 参照、無視できる
- 回帰テスト: del undo で `_imgIn` 済み blob が dataUrl へ展開されることを pin

## 代替案
- drain 時に `byId` 失敗でも pending を残す — 削除済み id への stale 駐留が溜まる、かつ
  blob は二度送られないので解決不能。却下。
- `_attachOp` 側で解決 (wire intake で `del` op も走査) — `del` op の shapes は
  undo 用スナップショットであって intake 解決対象ではない。却下。
