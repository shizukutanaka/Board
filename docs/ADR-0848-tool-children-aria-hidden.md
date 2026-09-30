# ADR-0848 — ツールボタンの装飾子要素を a11y ツリーから除外

## Context

FT-11 (実機スクリーンリーダー確認) を macOS VoiceOver + Chrome で実施したところ、
ツールバーの各 `.tool` ボタンが **1 つにつき 3 つの VO 項目**を生成していた
(Item Chooser で全 139 項目を実測、ツール 14 個 × 3):

1. ボタン本体 (`Select (V)` — aria-label + title で正しく読み上げ)
2. 内側の `<svg class="ic">` アイコン ("clickable image" として露出)
3. `<kbd>` ショートカット表示 ("V" clickable)

svg も kbd も純粋装飾であり、親ボタンの aria-label/title が名前とヒントの両方を
提供済みのため、独立した VO 項目はナビゲーション・ノイズ以外の何物でもない。

## Change

`wire()` のツールボタン初期化ループで、各ボタンの装飾子要素へ
`aria-hidden="true"` を一括付与:

```js
for(const b of _qsa(document,'.tool')){
  _on(b,_CK,()=>pickTool(b.dataset.tool));
  for(const c of _qsa(b,'svg,kbd'))_sa(c,'aria-hidden','true');
}
```

マークアップで 28 箇所に属性を書く代わりに JS 側で一括適用 (~90B 対 ~450B)。
`_qsa`/`_sa` の既存 shorthand を再利用。

## Consequences

- VoiceOver でツール 1 個 = 1 項目。ショートカットは `title` ("Select (V)" 等)
  がヒントとして引き続き読み上げられるため情報損失なし。
- Item Chooser の項目数が ~42 減少し、DOM ミラー・canvas・パネル群への到達が
  容易になる。
- 他のボタン (.btn icon 系) は svg のみで kbd を持たず、クリッカブル子要素として
  個別露出していなかったため対象外 (実機 Item Chooser で確認)。
- FT-11 の VoiceOver 実機検証結果全体は docs/a11y-audit-2026-07.md の
  「VoiceOver 実機 spot-check (2026-09-30)」節を参照。
