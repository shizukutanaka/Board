# ADR-0528: DOM メソッド shorthand + dead isPan 節除去

## 状態

実装済み

## 背景

ADR-0527 の画像キャップ変更 (~+70B コメント込み) の収容枠を作るため、
DOM メソッド系の shorthand fold と死んでいたコードの除去を実施。

## 決定

```js
const _fc=e=>e.focus(),_clk=e=>e.click();
const _aE=()=>document.activeElement,_csr=v=>canvas.style.cursor=v;
```

- `X.focus()` ×6 → `_fc(X)`、`X.click()` ×7 → `_clk(X)`
- `document.activeElement` ×4 → `_aE()`
- `canvas.style.cursor=v` ×7 → `_csr(v)`
- `isPan` の `||_sK(e)&&_tl()==='select'&&false` (恒偽 dead 節) と
  古い「space or」コメントを除去 — 実際のパン条件は middle-click と
  hand ツールのみ

## 影響

- net ~−145B → 524,275B (残 ~13B)
- ピン同期: `search Escape returns focus` を post-fold リテラルへ
- test.mjs 2080 全緑
