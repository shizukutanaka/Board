# ADR-0836 — imgq 応答の per-key スロットル

## Context

ADR-0835 で `{k:'imgq',key}` 再要求を導入したが、応答側は要求のたびに blob
(最大 12MB、64KB チャンク化して broadcast) を再送していた。敵対的または
バグったピアが同一キーで imgq を連打すると、小さな要求メッセージが部屋全体への
大きな再送へ増幅される — 伝統的な amplification DoS 構図。

## Decision

応答側に `_imgqT` (key → 最終応答時刻) Map を持たせ、同一キーの応答を
10 秒に 1 回へスロットルする:

```js
const d0=_imgIn.get(key)||(_idOK(key)?_imgSent.get(key):null);
if(d0 && (now - _imgqT.get(key) > 10000)){
  _imgqT.set(key, now); _pu(_imgOuts,[key,d0]); _flushImgOuts();
}
```

## Why this is enough

- `_imgqT` に記録されるのは実際に応答したキーのみ。応答可能なキー集合は
  `_imgIn`(≤256 件・64MB) と `_imgSent`(自前の盤面の画像) の和で自然に小さく、
  未知キーの imgq は `d0` が null で地図を増やさない — 追加の件数/バイト境界は不要。
- 10s は通常の img 再組立 (64KB × ≤192 チャンク) が終わる窓より十分大きく、
  正常な再要求フローを阻害しない。要求側の park 寿命は 60s で、1 回の応答
  抑制が収束を損なうこともない (次の sweep で再度要求される)。

## Consequences

- imgq flood のコストは O(1) の Map 参照 + 10s あたり 1 回の既存 send に留まる。
- 正常経路 (送信途中切断による parked 参照) は変わらず修復される。

## Test

Behavioural pin — `Net._onRecv({k:'imgq'})` を同一キーで 2 連続実行し、
`Net._send` stub が捕捉する img チャンクが 1 回分のままであることを固定する。
