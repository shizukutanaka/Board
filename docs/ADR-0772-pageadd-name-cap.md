# ADR-0772 — pageAdd 生成側も 80 字へ clamp (wire 契約との一致性)

## Status
Accepted (v1.7.798)

## Context
`pageAdd` の wire 検証は `name ≤ 80` を要求する (ADR-0755)。一方生成側は:
- `_pgDup`: `src.name+' '+t('ctxDuplicate')` — 元名が 80 字だと最大 83 字
- `.drawio` 複数ページ import: `p.nm` — XML の図名は無制限

超過した pageAdd op はローカルでは無検証で適用されるが、受信側の wire
ゲートで**丸ごと棄却**される。送信者だけに新ページが存在し、後続の
shapes/addMany は別ページへ着地 — **ページ集合が恒久的に発散**する実害。
`_pgRename`/`_vPages`/docName は既に 80 字へ揃っている (0698/0700) — この
2 サイトだけが穴だった。

## Decision
生成側 2 サイトを `_s80` (= `_s0(x,80)`) で clamp:

```js
// _pgDup
name:_s80(src.name+' '+t('ctxDuplicate'))
// drawio multi-page
name:_s80(p.nm||t('pgPage'))
```

`_s80` を shorthand 化し、既存の docName clamp 5 サイト (`pgNm`/`_dioNm`/
`msg.name`/`data.name`/`d.docName`) も同 helper へ畳み込み — 「名前系は
必ず `_s80` を通る」という一貫した不変条件にする。

## Consequences
- 生成される pageAdd は常に wire-valid → 発散経路を閉塞。
- 80 字を超える元名の複製は末尾が切れる (表示上の破綻のみ、収束は保つ)。
- ピン: 80 字名のページを `_pgDup` して `name.length<=80`。
