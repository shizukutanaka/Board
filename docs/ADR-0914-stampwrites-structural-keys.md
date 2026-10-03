# ADR-0914 — 構造キーには wclock も刻まない

## Defect

ADR-0912/0913 で `pg`/`frac` を `upd`/`style` patch の適用から除去したが、
`_apply` 直後に走る `_stampWrites` は**未 strip の生 `after`** を走査して
変更キー毎に `w[key]=C` を記録する。鍛造 `upd{frac:'x'}` は適用されなくても
`w.frac=C` が刻まれ、正規 `zorder` op が到着時に `clockNewer(C', w.frac)` /
`_lwwSkip` で棄却される — 鍛造 ts は wall+5min 上限のため、同一形状の
z-order が ~5分窓でピア間に恒久発散する残留だった (strip しても clock が
刻まれる非対称)。`pg`/`type`/`_`-prefixed も同型の phantom-clock 経路。

## Fix

`stamp()` のキーループに構造キースキップ追加:
`key==='id'||key==='type'||key==='pg'||key==='frac'||key[0]==='_'`

- `zorder` の専用分岐は無変更 — 正規 `frac` 刻印は存続 (収束に必須)
- `move`/`group`/`ungroup` 分岐 (x/y/groupId 刻印) も無変更
- 正規プロデューサは prop patch に構造キーを載せないため損失なし

## Gate

`node test.mjs`: 2926 pass, 0 fail (+1 source pin)。
raw 556,921B (コメント圧縮で -133B、上限 557,056B 内)。
