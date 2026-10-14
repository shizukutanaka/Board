# ADR-1206 — autosave の stale-dirty 上限 (debounce maxWait)

## Status

Accepted (round956, v1.8.230)

## Context — 監査軸

「各プロセスのさらなる細分化」: save パイプラインの時間粒度。`Persist.schedule()`
は純粋 debounce — 呼出ごとに `_saveT` を破棄して 500ms 後へ再武装するため、
`SAVE_DEBOUNCE` 未満の間隔で dirty 化が続く限り `save()` は**永遠に発火しない**。

## 実害シナリオ

- 連続ジェスチャ (ペン描画・held arrow nudge・live drag commit) が 500ms 未満間隔で
  `schedule()` を打ち続ける → デバウンスが決して settle しない。
- **リモート op 到着も同じ `_ps()` 漏斗を通る** — ピアが連続描画中、受信側の
  autosave も同様に飢餓する。共同編集セッションでは双方が同時に非保存状態化し得る。
- この間にタブが kill された場合 (iOS jetsam / OOM / クラッシュ)、直近の quiet
  window 以降の全作業を喪失。`visibilitychange`/`pagehide`/`beforeunload` の
  flush は**イベントが配達された場合のみ**有効で、クラッシュ経路を救えない。

## Decision

lodash `debounce(fn, wait, {maxWait})` 相当の2タイマー構造へ細分化:

```js
schedule(){
  _md(!0);
  _cT(this._saveT);
  this._saveT=_stO(()=>this.save(),SAVE_DEBOUNCE);
  if(!this._saveMax)this._saveMax=_stO(
    ()=>{this._saveMax=0;_cT(this._saveT);this._saveT=0;this.save()},
    SAVE_MAX_WAIT);
}
```

- `_saveMax` は burst 先頭の dirty で**一度だけ**武装 (`if(!this._saveMax)`) —
  イベント毎の再武装はしない (再武装すると starvation が再発する)。
- 発火時は自身を disarm し `_saveT` も畳んでから `save()` — 書込み済みの trailing
  save の冗長発火を防止 (全文 serialize+tx は 200K 図形で無視不能なコスト)。
- `save()` の write-start (`_md(!1)` 直後) でも `_saveMax` を disarm — 直接呼出
  (flushIfHidden / beforeunload / explicit) が走った場合に armed タイマーが
  dirty なしの冗長書込みを発火しない。
- `save()` 失敗時は `_md(!0)` で dirty が戻り、`_saveMax` は 0 — 次の
  `schedule()` で新しい窓が始まる (失敗後の retry thrash を避ける設計)。

## 定数

`SAVE_MAX_WAIT=5e3` — クラッシュ時の最大作業喪失を ~5s に限定。
debounce (500ms) とは別経路のため、連続編集中は最大 ~5s 間隔の書込みに収まる
(save() は async で rAF を塞がない)。

## Consequences

- 書込み嵐なし: burst 中の強制書込みは窓ごとに最大1回 (イベント毎ではない)。
- 既存経路の意味論は不変: flushIfHidden の `_cT(_saveT)` + direct save()、
  beforeunload の `_dt()` ゲート、失敗時 `_md(!0)` 復帰はそのまま。
- 近傍コメント尾を回収してサイズ差分を相殺 (raw 増分なし)。

## 不変条件 (test.mjs ピン)

- `schedule()` は burst 中 `_saveMax` を一度だけ武装 (`armed` 同一性)。
- 80ms 間隔の連続 `schedule()` 下で 1.2s 時点 `svs===0` (飢餓が実在) かつ
  ~5s 境界で `svs>=1` (強制書込み) — 実タイマー挙動テスト。
- 強制発火後 `_saveMax===0` (自己 disarm)。
- `save()` が write-start で `_saveMax` を disarm (ソースピン)。
