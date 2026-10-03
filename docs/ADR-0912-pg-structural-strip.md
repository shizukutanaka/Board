# ADR-0912 — `pg` を構造キーとして patch 適用から除去

## Defect

`validPatch` の string-prop whitelist に `pg` が含まれ、`_apply` の
`upd`/`style` 適用で `_oa(sh,p)` へそのまま流入していた。`pg`
(ページ帰属) は構造キーであり、変化は専用 op (pageAdd/pageDel/
_pgAdopt) 経由でのみ起きる設計 — しかし鍛造リモート `upd`/`style`
patch で `sh.pg` を任意値へ書き換え可能だった:

- 図形が表示ページから「追放」され `_pgOk` で不可視化 (draw/hit-test/
  export から除外) — `_pgHealS` が次回走るまで '?' スタブも作られない
  orphan 状態
- pageDel parity の不変条件 (locked survivor 再配置・connClears・
  member pg 強制) を迂回

ADR-0373 のコメントは `pg` exile を当初から防衛対象として挙げていた
が、`_stripStruct` 自体が `pg` を削除していなかった — 意図と実装の
乖離。

## Fix

- `_stripStruct`: `delete p.pg;` 追加 (upd 適用経路)
- style/resize/align/beautify 適用の inline strip にも `delete p.pg;`

`type`/`id` と同じく patch では黙殺する (op 全体棄却ではなく prop 除去
のみ) — 将来の正規プロデューサが `pg` を載せても他 prop は失われない。
実害は鍛造 op 面のみ — 正当なローカル経路では prop patch に `pg` が
決して乗らないため後方互換の損失なし。

## Gate

`node test.mjs`: 2922 pass, 0 fail (+1 source pin)。
raw 557,021B (上限 557,056B 内)。
