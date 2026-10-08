# ADR-1183 — exportPDF の blob URL ライフサイクル (popup-blocked 漏洩閉塞)

## Status
Accepted (fix ラウンド)

## Context

round933 は blob URL のライフサイクル軸を監査。全6箇所の `_oURL` (download-export)
は `_rO` (10s で revoke) 済み、画像描画は `img.src=dataUrl` で blob URL を使わず、
唯一の残穴が `exportPDF` の `fin` コールバックにあった。

`fin` は `_oURL(bl)` で blob URL を生成してから `window.open('')` を試行し、
popup がブロックされると `{_wT('popupBlocked');return}` で早期 return — 生成済みの
URL が revoke されずリークしていた (成功経路は子ウィンドウの読込みを考慮して
30s で revoke、ADR-0813 同型の早期-return リーク)。

## Decision

`const url=_oURL(bl)` を `if(!w2)` ガードの**後**へ移動 (純粋な並べ替え、raw 増加ゼロ):

```js
const w2=_wO('');
if(!w2){_wT('popupBlocked');return}
const url=_oURL(bl);
```

代替案 (早期 return 枝で `URL.revokeObjectURL(url)` する) も等価だが、並べ替えの方が
バイト単位で小さい。

## Audit 結果 (このラウンドで検証した他サイト — clean)

- 全 `downloadBlob`/`download` 系エクスポートの `_oURL` は `_rO` 経由で revoke 済み
- 画像レンダリングは `img.src=s.dataUrl` で blob URL 非依存 (dataUrl モデル)
- 起動シーケンス `main()`、history funnel (`_rcOp`/`Store.commit`/`_recordCommitted`)、
  `_oa` の全19 callsite、`Persist.load` の per-field ゲートも clean

## Pins

`fakeWin.open` trampoline をハーネスに追加し、6挙動ピンで固定:
1. blocked popup は `_oURL` を呼ばない (漏洩ゼロ)
2. blocked popup は `popupBlocked` toast を出す
3. blocked popup は throw しない
4. open popup は `_oURL` をちょうど1回呼ぶ
5. open popup で `w2.document.write` が走る
6. 成功経路は throw しない
