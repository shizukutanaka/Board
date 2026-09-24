# ADR-0382: state.seenOps/lasso/marquee/dupDelta + G.w2s/s2w + connEnds shorthand

## 状態
採用 (v1.7.426)

## 背景
512KB raw 天井まで ~700B。hot fields の残り (seenOps, lasso, marquee,
dupDelta) と頻出関数 (G.w2s/G.s2w/connEnds) が未 shorthand だった。

## 決定
`_sO/_la/_mq/_dd` (`()=>state.X` live-read 形) + `_w2/_s2` (G.w2s/s2w ラッパ)
+ `_cE` (connEnds 直接参照)。write サイトは rebind-guard 正規表現でそのまま残置。
合計 ~340B 回収。

## 影響
挙動不変。test.mjs の html.includes リテラルを同期済み。
