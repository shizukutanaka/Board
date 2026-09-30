# ADR-0771 — ページ複製を元ページの直後へ挿入

## Status
Accepted (v1.7.797)

## Context
`_pgDup` (ページタブの ⧉) は `pageAdd` op をコミットするが `op.i` を渡して
いなかった。`pageAdd` の forward 適用は `op.i` が無いと末尾へ splice する
ため、N ページのデッキで 2 ページ目を複製するとコピーが末尾 (N+1) に飛び、
ユーザーは手動で並べ替えるか煩雑な移動を強いられていた。

Figma / Keynote / Google Slides / PowerPoint はいずれもスライド複製を
**元の直後**へ挿入する — デッキツールの共通規約。

## Decision
`_pgDup` が `_pgIdx()+1` を `op.i` として `pageAdd` に同梱する:

```js
const si=_pgIdx(),src=state.pages[si];
_cmt({op:'pageAdd',id,i:si+1,name:...,shapes:sh});
```

`pageAdd` forward は既に `op.i` を honor する (ADR-0704: `splice(at,0,…)`) ので、
ローカル・全ピア・redo で**決定的に同じ位置**へ挿入される。余計な wire フィールド
追加なし、適用経路の変更なし — 契約済みフィールドを送信側が使うだけ。

## Consequences
- 複製は元ページの直下に並ぶ — デッキ規約に一致。
- 境界: 元が末尾なら `i=len` → 末尾 (従来と同じ)。`!_pgOn()` 起動時は
  bootstrap pageAdd が先に走り `si` は正しく解決される。
- `switchPage(id)` は index 非依存のため変更不要。
- ピン: `_pgDup` 後 `pages[srcIdx+1].id===curPg`。
