# ADR-0859: per-shape canvas-ctx state restore + render/DOM injection audit

## Status

Accepted (監査完走 + behavioural ピン追加)

## Context

round608 監査 — 描画系の「図形間ステートリーク」軸。canvas 2d context は共有の
mutable リソースであり、ある図形の描画で設定した状態 (alpha / letterSpacing /
shadow / dash / fillStyle / transform) が次の図形へ漏れれば**順序依存の描画破壊**
になる。加えてリモート図形の文字列が DOM へ着地点を持つか (XSS 面) も同時監査した。

監査結果:

- **ctx 状態リーク — clean**: `drawShape` は冒頭で `globalAlpha`/`letterSpacing`/
  `lineCap`/`lineJoin`/`strokeStyle`/`lineWidth`/`setLineDash` を無条件に再設定し、
  終端で `_gaS(c,1)` + `letterSpacing='0px'` + `_noSh(c)` + `_sD(c,[])` を実行する。
  回転は `save`/`restore` で閉じる。`fillStyle` は無設定のまま残るが、全 `fill()`
  呼び出しが事前に自前で設定するため観測不能。dash は `_D6` (rect/ellipse/
  diamond/frame/image) + conn にのみ適用 — pen は `_D6` 非所属で `s.dash` を
  持ち得ず、`_penCache` 署名に dash が不要なことを確認。
- **DOM 注入 / XSS — clean**: `innerHTML=` への動的代入はゼロ (静的クリアのみ)。
  DOM ミラー (`_mirrorSync`) ・aria-live ・toast は全て `textContent` 経由 —
  リモート図形の text/label は DOM テキストノードとしてのみ着地。
- **検索クエリ — clean**: `_sq` は `toLowerCase` + リテラル `includes` マッチ。
  `new RegExp` 経路なし。
- **`_imgIn` ルーム跨ぎ — by design**: 受信 blob ストアは `Net.init` でクリア
  しないが、キーは `_imgKey` コンテンツ指紋 (content-addressed) のため古い
  ルーム由来の blob が新ルームで解決しても**同じバイト列**であり有害でない。
  64MB バイト上限はグローバルに保持される (ADR-0784)。`_imgInB` と `_imgIn` の
  会計は全経路で対。
- **未対象化されたリスク (in-trust-model)**: `_imgKey` は mime+length+3点48文字
  の平文スライスで、wire の `img:` 参照から攻撃者が衝突画像を構築し得る
  (first-wins 解決で別画像に差替)。ただしルームピアは既に盤面への完全書込権を
  持つホワイトボード共有モデルであり、暗黙の信頼内 — 暗号ハッシュ化は O(n)/frame
  を毎フレームの画像探索に課し `_imgKey` の O(1) 設計を破壊するため採用しない。
- **盤面総量 — in-model**: op ごとの件数・バイト上限 (MAX_OP_SHAPES / 24MB) は
  存在するが、累積図形数の受信側キャップは収束を壊す (適用が受信者状態依存に
  なるためピア間で集合が分岐) ため設けない。増加は帯域律速の sync 固有挙動。

## Decision

動作変更なし — 監査完走を記録し、ctx ステート復元を behavioural ピンで固定:

```js
// rect{shadow:1,dash:1,spacing:8,opacity:.4} を注入 ctx で draw() した後:
t0.globalAlpha === 1      // _gaS(c,1)
t0.letterSpacing === '0px'
t0.shadowBlur === 0       // _noSh(c)
last setLineDash arg === [] // _sD(c,[])
```

## Consequences

- 描画パイプラインの不変条件「drawShape は ctx を見つけた状態で返す」をピン化。
- コストは test.mjs のみ (+4 asserts)。index.html 増分は V コメントのみ。
