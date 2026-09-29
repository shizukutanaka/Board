# ADR-0599: 単一リサイズ/回転ドラッグにも束縛コネクタの掃引領域を含める

## 状態

実装済 (round308)。ADR-0597 (移動/群リサイズ/群回転) と ADR-0598 (リモート `_apply`) の
残り 2 サイト。

## 背景

ADR-0597 は `doMove`/`_gresizeDrag`/`_grotDrag` を修正したが、単一形状の
`resize` ドラッグと `rotate` ドラッグは `_dmgPair(_b0,_bb(rsh))` のみで同型の
残像穴が残っていた: `rsh` に `aF`/`bF` で束縛されたコネクタが extent 変形に
追従して path を変えるのにダメージ矩形外だった。

## 決定

2 サイトとも ADR-0597 と同一イディオム: 変形前に束縛コネクタを
`{s,b:_bb(s)}` で収集 (`s.a===rsh.id || s.b===rsh.id`)、変形後の `_bb` と
`_dmgPair` でダメージに合流。

## 影響

- 局所再描画を使う全ジェスチャ (move/gresize/grot/resize/rotate) で束縛コネクタ
  残像が解消 — 掃引漏れのダメージ矩形クラスは完結。
- ebend/cbend/way はコネクタ自身を編集 (自身の bbox が掃引を含む or `_iv()`) ので
  対象外。`_connFix` は対象コネクタ自身の前後 bbox で対応済。
