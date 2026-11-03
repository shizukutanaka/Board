# ADR-1207 — svgToShapes: `<image>`/`<text>` の寸法も変換行列に従わせる

## 背景

`svgToShapes` は viewBox の 800px キャップ (`sc`) と要素 `transform` を親子で積んだ
行列 `m2` を各 shape に適用する。しかし適用の仕方が shape ごとに非対称だった:

- rect / ellipse / line / polyline / polygon / path — **両コーナーまたは全頂点**を
  `_svgMPt(m2,…)` に通すため、位置も寸法も正しくスケールされる。
- `<image>` — 左上コーナー **だけ**を `m2` に通し、`w`/`h` は生の属性値を採用。
- `<text>` — アンカー点だけを `m2` に通し、`fontSize` は生の属性値を採用。

そのため `viewBox="0 0 1600 800"` のような縮小インポートや `transform="scale(k)"`
を持つ SVG で、**矩形は半分になるのに画像と文字だけが元の大きさで貼られる** —
位置だけ正しく、寸法が1〜2倍に張り出す不一致が発生していた。

## 決定

- `<image>` — rect と同じく両コーナー `(x,y)` / `(x+w,y+ht)` を `_svgMPt(m2,…)` に通し、
  `min`/`abs` で軸平行 bbox を取る。回転を含む transform でも rect と同じ AABB 膨張
  セマンティクスに一致。
- `<text>` — `fontSize` に `m2` の y 基底ベクトル長 `_hp(m2[2],m2[3])` を掛ける
  (uniform scale では x/y 同一、ゼロスケールは `||1` で生値フォールバック)。
  高さ見積 `h=fs*1.4`・ベースライン `p.y-fs`・幅見積 `_ln*fs*0.55` は fs から派生する
  ため自動追従する。

## 罠

`_oa(s,st)` は text 型に限り `st.fontSize` を残して再適用する (`delete` しない)。
`_smk` に焼き込んだスケール済み fontSize が共有スタイルパスで生値に巻き戻るため、
`st.fontSize` の削除を全型へ一般化 — text は `_smk` 引数、非 text は従来どおり
fontSize を持たない (以前の `delete` と同じ着地点)。

## 検証

test.mjs に mini-DOMParser を差し込んだ挙動ピン (7 asserts): viewBox 1600 → sc=0.5 で
image が 200x100 → 100x50、font-size 40 → 20、element `transform="scale(2)"` も
image の extent へ届く、external href は従来どおり拒否。
