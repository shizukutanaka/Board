# ADR-0627: canvas contextlost/contextrestored 耐性

- 状態: 実装済
- 日付: 2026-09-28

## 背景

GPU リセット (ドライバ更新、メモリ逼迫、サスペンド復帰) でキャンバスの 2D コンテキストが
失われると、Board は `contextlost` を処理しておらず表示がブランクのまま残り得た。

キャッシュされた GPU リソースは content が消えても参照は生きているため、単純な再描画
だけでは復旧しない:

- `_penCache`: 図形単位の rasterize ビットマップ — 空のビットマップを blit し続ける
- `_inkD`: 下書きペンの増分インクスタンプ — デッド ctx への描画継続
- minimap `_scene`: `_sceneVer` が最新のままブランクビットマップを転用
- `_pinchSnap`: ジェスチャスコープのスナップショット (被害は限定的)

## 決定

1. `contextlost` で `preventDefault` — 仕様上これが `contextrestored` 発火の前提条件。
2. `contextrestored` (main + overlay 両 canvas) で `_ctxUp` を実行:
   `ctx`/`octx` を再取得し、`_penCache`/`_penCachePx`/`_inkD` をパージ、
   `Minimap.invalidateCache()` で `_sceneVer=-1` + schedule、`_iv()`/`_ivO()` で全面再描画。
   両 canvas に同一ハンドラを付ける — 先に復旧した側が全パージを実行し、
   二回目は冪等に no-op となる。
3. `_penBboxCache`・`_imgCache` (`<img>` は CPU 側)・`_imgPending` は残す —
   GPU に属さない値は存続する。

## 影響

- GPU リセット後も全面再描画で完全復旧。draft 中なら `_inkD=null` で次フレームに
  スタンプ canvas を全再構築する (ジオメトリは pts に保持、ロスなし)。
- `_pinchSnap` はジェスチャ終了で解放されるため対象外 (プレビューのみ劣化)。
