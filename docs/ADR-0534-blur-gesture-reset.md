# ADR-0534: ウィンドウ blur でジェスチャ/ポインタ状態を再ベースライン化

## 状態

実装済み (v1.7.562)

## 背景

ジェスチャ中にウィンドウが blur する経路 (⌘Tab での別アプリ切替、OS オーバーレイ、
画面ロック等) では、pointerup/pointercancel が届かないケースが残る
(setPointerCapture はほぼ全経路で pointerup を配信するが、OS がイベントを
奪う例外があり得る)。このとき `ptr.down` と `_pointers` (pointerId→座標 Map)
が armed のまま滞留し、次の pointerdown が `_nP()>=2` に誤判定されて
`abortGesture()` で潰される —— つまり**一度 blur で取りこぼすと以降の
ドラッグが常に失敗**する固着状態になる。`visibilitychange` は Persist flush と
wakeLock 再取得のみでジェスチャ状態を掃除していなかった。

## 決定

`_on(window,'blur',...)` で `ptr.down||ptr.panning` なら `_cancelPointerGesture()`
(部分ジェスチャを復元して中断) し、`_pointers.clear()` + `_pinchPrev=0` +
`_pinchSnap/_pinchVp` の解放まで一括で再ベースライン化する。

## 影響

- blur で取りこぼされた pointerup が後続ジェスチャを壊さなくなる
- 「見えない状態でのドラッグ継続→不可視座標へのドロップ」も未然に防ぐ
  (見えなかった drag は中断される方が安全)
- iOS のアプリ切替は OS が pointercancel を投げるため従来通り正常
- test.mjs にピン (0534) を追加
