# ADR-0645 — イベント系列検証の完走状態

## Status
Accepted (docs-only)

## Context
ADR-0641 は「合成イベントを `_L` 記録済みの実リスナへ dispatch する」系列検証ハーネスを導入し、
round350–386 でポインタ/キー/ライフサイクル/タイマ系/drop を逐次カバーした。
ADR-0644 はその運用規約 (fire1 原則・reset() 境界・stale リスナ混入モデル等) を文書化した。

## Coverage (2026-09-28 時点、全リスナ型を網羅)

| リスナ | 実経路検証 |
|---|---|
| canvas PD/PM/PU/PC (bubble + capture) | 全ツール系 (pen/select/rect/line/eraser/marquee/hand/rotate/waypoint/ebend/lasso/quick-connect/frame/dblclick/eyedropper/⌥measure/bindPreview) |
| contextmenu / pointerleave / dblclick / wheel (plain/ctrl/⇧) | ✓ |
| webkit gesture* / pinch recorder | ✓ |
| window keydown/keyup (全キー網羅) | ✓ |
| window copy/cut/paste/blur | ✓ |
| window resize (trailing-edge debounce) / online / offline | ✓ |
| document visibilitychange (gesture cancel + flush) / mousedown (ctx 外クリック + _ctxEat) | ✓ |
| window pagehide (cancel + bye) / beforeunload | ✓ |
| canvas contextlost/restored | ✓ |
| lostpointercapture | ✓ |
| dragover/drop (text cascade: .board JSON/TSV/平文) | ✓ |
| 長押しタイマ (500ms 実タイマ) | ✓ |
| presence wire (sendCursor/throttle/hide、_send 境界) | ✓ |

## 残課題 (spec §14.3.1 P3 行に同期)
- **レンダリング実体の composite-draw 検証** — draw() の出力内容の画素/呼出し粒度検証は系列ハーネスの範囲外
- **FileReader 経由の drop/paste ファイル系** (`.board`/`.excalidraw`/`.drawio`/`.svg`/画像) — fake 環境に FileReader がなく設計上 deferred

## Consequences
- spec §14.3.1 の P3 行を「ほぼ解消」へ更新
- 新規リスナを追加する実装は ADR-0644 の規約に従い系列ピンを併記すること
