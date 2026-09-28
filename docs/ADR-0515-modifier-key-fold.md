# ADR-0515: 修飾キー読み取りの shorthand 化

## 状態

実装済み

## 背景

ADR-0365/0366 以来、ホットなプロパティ読み取り・関数呼出を `const _x=…` shorthand に畳み込み、512KB raw 上限内の収容枠を確保してきた (直近では ADR-0510–0514 で canvas/Store/UI/Persist/Shape 系を一括化、計 ~3.7KB 回収)。

残存する最大の未集約パターンはイベント修飾キーの読み取りだった:

- `e.shiftKey` 52 サイト + `ev.shiftKey` 5 サイト
- `e.altKey` 23 サイト
- `e.metaKey||e.ctrlKey` / `ev.metaKey||ev.ctrlKey` / 順序逆転形 6 サイト — ⌘/Ctrl を OS 横断で同一視する「mod」判定が各所に散在し、`ctrlKey||metaKey` と順序が揺れている箇所もあった

## 決定

```js
const _sK=e=>e.shiftKey,_aK=e=>e.altKey,_mod=e=>e.metaKey||e.ctrlKey;
```

を shorthand チェーン末尾 (ADR-0514 直後) に追加し、全 86 サイトを `_sK(e)`/`_sK(ev)`/`_aK(e)`/`_mod(e)`/`_mod(ev)` に畳み込んだ。

- `e`/`ev` いずれのレシーバにも使えるよう、メソッド束縛ではなく **関数として引数取り** にした (`x.shiftKey` → `_sK(x)`)
- `metaKey||ctrlKey` の両順序 (`metaKey||ctrlKey` と `ctrlKey||metaKey`) を `_mod` に統一し、修飾キー判定の書き揺れも解消
- **除外**: ADR-0314 の `(/Mac|iPhone|iPad/.test(navigator.platform)?e.metaKey:e.ctrlKey)` はプラットフォーム分岐の選択子であり `||` 結合ではないため畳み込まない
- fold はサイト先行・定義後置の既定手順に従い、def 自体の self-fold による再帰を回避

## 影響

- index.html 521,011B → 520,759B (**net −252B**、サイト fold −356B + def ~76B)
- 動作不変 (test.mjs 2073 全緑)。ピン 21 件を post-fold リテラルへ更新
- `_mod` への統一で今後の mod 判定追加は表記揺れなしに書ける
