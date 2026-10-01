# ADR-0909 — 非 Element イベントターゲットの `matches()` ガード + Image ライフサイクル監査

## Context

round658 の監査軸: **Image 要素のライフサイクル・エラーパス** +
window-level ハンドラの `e.target.matches()` 網羅性。

## Image lifecycle — clean

- `getImg` (2091): dataUrl 先頭 `data:` ゲート、`_imgKey` 3点指紋、
  `IMG_CACHE_MAX` bounded LRU、`onload` で `_iv()`+`Minimap.invalidateCache()`。
  `onerror` 不設定は**意図的に安全** — 壊れた dataUrl は `naturalWidth===0`
  で各 drawImage サイト (3087 main / 10246 minimap) が
  `img.complete&&img.naturalWidth` で placeholder 描画へ分岐済み。
  drawImage 経路は壊れた画像で throw しない契約として確立。
- `_imgImportFile` (4656): reader.onerror + img.onerror → toast、
  dimension guard (0877/0878) gated。
- 他 FileReader サイト (7122/7429/7611/7619): onerror → toast 全網羅。
- `img.onload` で `Minimap.invalidateCache()` — bitmap キャッシュが
  非同期ロードに追従 (minimap は `_gridVer` キーのため画像ロードは
  無効化しないと旧 placeholder が残り得る経路を閉塞済み)。

## The defect — unguarded `e.target.matches()`

`_osCopy` (copy/cut, 4776) は `e.target.matches&&e.target.matches(...)`
で防御済みだったが、paste (4786) と keydown (5859) は bare
`e.target.matches('input,textarea')` で非対称。

window-level ハンドラの `e.target` は Element とは限らない:
プログラム発行のイベントや、フォーカス先なしで document に届いた
synthetic dispatch では `e.target === document` (`matches` 未定義) と
なり得る。`matches()` を直接呼べば TypeError が listener を貫通 →
当該イベント以降の処理全体が停止する:

- paste 4786: 1回の例外で OS paste が全滅 (そのページでペースト不可)
- keydown 5859: 1回の例外で全キーボードショートカットが死ぬ

`_osCopy` が自ら採用している防御イディオムを同じ window-level
ゲートへも適用する (非対称こそがこの学習済みである証拠)。

```js
// before                       // after
e.target.matches('input,textarea')
e.target.matches?.('input,textarea')   // undefined → falsy → cascade continues
```

`?.` (optional call) は `matches` 未定義なら `undefined` を返す —
「input/textarea でない」と等価なので通常 cascade にそのまま流れる
(_osCopy の `matches&&matches(...)` より短く同じ結果)。

## Pins

- `html.match(/e\.target\.matches\?\.\(/g).length>=2` — 両サイトの
  optional-call 形式を固定 (4776 は `matches&&` の別イディオムのため
  マッチしない — 3サイト全て防御済みが不変条件)

## Byte note

+2B × 2 サイト = +4B。raw 557,048B / 上限内 8B。
