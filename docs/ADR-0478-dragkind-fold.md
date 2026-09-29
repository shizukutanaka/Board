# ADR-0478: `ptr.dragKind==='X'` を `_dk` shorthand へ

## 状態

実装済 (v1.7.511)

## 背景

ポインタドラッグの振り分けは `ptr.dragKind==='X'` 判定が 44 箇所に散在していた
(move/resize/gresize/grot/rotate/way/cbend/ebend/qline/lblpos/marquee/lasso)。
`ptr` はモジュールレベル `let` のため、グローバル参照の shorthand が全サイトで有効。

## 決定

`_dk=k=>ptr.dragKind===k` を shorthand 表に追加し 44 サイトを fold。`ptr.dragKind` への
代入 (`ptr.dragKind='x'`) と単独読み取りは対象外 (fold 規約: 読み取り比較式のみ)。
def は const 宣言の**内部**に配置 — 前ラウンドで宣言外に書き出して未宣言変数
代入になった事故の教訓 (strict sandbox で ReferenceError)。

## 影響

- index.html −445B (524,023 → 523,578、余白 ~710B)
- 動作変更なし
- test.mjs literal-sync 6 件を畳み後表現に追従
