# ADR-0608: hidden/pagehide でタッチ状態 (_pointers/pinch) も掃除

## 状態
実装済 (v1.7.635)

## 背景
ADR-0534 は `window blur` で `_pointers.clear()` + `_pinchPrev=0` +
`_pinchSnap` 破棄まで掃除するが、ADR-0604 で追加した
`visibilitychange→hidden` / `pagehide` の取消経路は
`_cancelPointerGesture()` のみ — `_pointers` や pinch 状態は残る。

bfcache からの復帰 (iOS pagehide→pageshow) や単なる
バックグラウンド往復で `_pointers` の stale エントリが残存すると、
復帰後の初タッチで capture ハンドラが `set` した時点で
`_nP()>=2` となり、**通常タッチが pinch 開始と誤判定**されて
`abortGesture` 経路へ入る (3894/4065/4211 行の `>=2` ガード全部に
影響)。`_pinchSnap` も古いサイズのまま残り得る。

## 決定
blur 経路の3行を `_clearTouchState()` に集約
(`_pointers.clear()` + `_pinchPrev=0` + `_pinchSnap/_pinchVp` 破棄+`_iv`)
し、blur / visibilitychange→hidden / pagehide の3経路で共有:

- blur: 既存動作 (置き換えのみ)
- hidden: `ptr.down` 有無に関わらず掃除 (stale エントリは ptr.down
  なしでも残り得るため)
- pagehide: 取消の直後・flush 前

## 影響
- bfcache 復帰・モバイルバックグラウンド往復後の初タッチが pinch と
  誤判定されなくなる
- ライフサイクル3経路のタッチ状態不変条件が一本化 — 今後の経路追加は
  `_clearTouchState()` を呼ぶだけ
