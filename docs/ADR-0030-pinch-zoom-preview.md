# ADR-0030: ピンチズームのスケールプレビュー (snapshot blit)

## 状態
実装済み (v1.7.88)

## 背景
ピンチズームは `pointermove` 毎に `zoomAt` → `invalidate()` → シーン全再走査・
全再描画を発行していた。パンは ADR-0028 のピクセル blit で解決済みだが、
ズームは全ピクセルの座標が変わるため「保持ピクセルの平行移動」では表せず、
連続ジェスチャ中最後に残った全面再描画の発生源だった (低スペック端末ほど
連続 60Hz 全描画は重い — scratchpad の主戦場はタッチデバイス)。

地図アプリ・写真アプリで確立された定石: **連続ジェスチャ中は変換済み
ビットマップのプレビューを即座に表示し、ジェスチャ終了時に高精細へ置き換える**
(blurry-but-instant preview → crisp settle)。

## 決定
- ピンチ (2 本指) で最初の `zoomAt` が走る時、現在の canvas を
  `_pinchSnap` (オフスクリーンコピー) + `_pinchVp` (開始 viewport) として
  **一度だけ**スナップショット。
- 以降のピンチフレームは `draw()` 先頭のプレビュー分岐が、シーン走査を
  一切せず `_pinchSnap` を**ジェスチャ蓄積変換**で blit するだけ:
  旧 device px `p` が保持する世界 `w = p/z0 + vp0` は新 viewport で
  `p·z1/z0 + (vp0 − v)·z1` に写る →
  `drawImage(_pinchSnap, 0,0,W,H, (vp0.x−v.x)·z1, (vp0.y−v.y)·z1, W·z1/z0, H·z1/z0)`。
- 常にピンチ開始時のプリスティンなバッファから blit するため、
  連続移動でブラーが**累積しない** (自己 drawImage 連鎖の劣化を回避)。
- プレビューフレームは `_lastVp=null` — canvas 内容は通常フレームの
  表す viewport と無関係になるため、次の通常フレームは必ず全面再描画される。
- `_resetPinch` (指が 2 本未満に減った時点) で `_pinchSnap/_pinchVp` を破棄
  + `invalidate()` → 終了フレームで高精細へ置き換わる。
- `resize()` でも両方クリア (バッキングストア再割当でスナップ寸法が陳腐化)。

## 計測・検証
- 300 rect 盤面のピンチフレーム: **~0ms** (スケール blit のみ) vs 全再走査
  ~1–7ms。盤面が重いほど差は拡大。
- ピンチ終了後の再描画は同 viewport の直接描画と**ピクセル完全一致**
  (headless 実測 diff=0)。

## トレードオフ
- ジェスチャ中の描画は変換済みビットマップ = 拡大時に一時的にぼやける。
  終了と同時に高精細へ置き換わるため体感品質は標準的 (iOS 写真・地図と同等)。
- ジェスチャ中に届いた remote op / commit は終了フレームまで描画に現れない
  (ピンチは数百 ms の過渡状態なので許容)。

## 参照
- ADR-0024 (layered overlay), ADR-0028 (pan pixel blit), ADR-0029 (draft ink stamp)
- Google Maps / iOS Photos の continuous-gesture preview パターン
