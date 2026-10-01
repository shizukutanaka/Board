# ADR-0908 — イベントジェスチャ (passive / preventDefault / touch-action) 監査完走

## Context

round657 の監査軸: **入力イベントのデフォルト動作ゲート網羅性** —
preventDefault が必要な全リスナが (a) non-passive 登録、(b) `touch-action:none`
CSS、(c) `_pd` 呼出しの3条件を満たすかを全走査。passive-by-default は
window/document/body 登録の wheel/touchstart/touchmove/mousemove に限るが、
本アプリの wheel は canvas 登録 — それでも明示 `{passive:false}` が要件。

## Audit findings — clean

| 面 | サイト | 結論 |
|---|---|---|
| `wheel` (pan / ctrl+wheel zoom / ⇧wheel h-pan) | 4831 canvas | `{passive:false}` + `_pd(e)` 冒頭 — browser default pinch-zoom 抑止済 |
| Safari `gesturestart`/`gesturechange` | 4886-4888 canvas | `{passive:false}` + `_pd(e)` (ADR-0517 macOS trackpad pinch) |
| `contextmenu` | 4506 canvas | `_pd(e)` 冒頭 — OS contextmenu 抑止 (ctx メニュー本体は 9469) |
| `dragover` | 4730 canvas | `_pd(e)` — drop 発火の前提条件 (デフォルト拒否を解除) |
| `drop` | 4731 canvas | `_pd(e)` 冒頭 — ブラウザのデフォルトファイル開きを抑止 |
| `copy`/`cut` | 4781-4782 window | `_osCopy` 内 `_pd(e)` — `clipboardData.setData` 書込みの前提 |
| `paste` | 4785 window | 内部 cascade 分岐毎に `_pd` (image/text/svg/board/exc/drawio) — input/textarea ターゲットは素通しで OS 編集維持 |
| `touch-action` | 192 `#canvas` CSS | `touch-action:none` — pointer イベント系のブラウザ自前 pan/zoom 抑止 |
| `keydown` | ~5800 window | passive 非対象イベント + `_pd` は分岐毎に選択適用 (通常キーは素通し) |
| `mousedown` outside | 9488 document | ctx メニュー外クリック判定 — 副作用なし |

## Pinch / pointer bookkeeping

- `_pointers` Map (pointerId→{x,y}): `{capture:true}` で gesture listener より
  先に bookkeeping が走る正しさ。`_PU`/`_PC` で delete、`lostpointercapture`
  経路 (ADR-0604/0608) で残滓掃除、`_resetPinch` で <2 pointers に降格時
  `_pinchPrev=0` へ戻す。
- `_pinchPrev` 初期化: 2ポインタ目到達時に curDist を seed → 次 move から
  ratio を適用。`_abs(ratio-1)>0.005` のデッドバンドで微振動を棄却。
- `passive:true` の pinch PM listener (4876): preventDefault を呼ばない
  純粋読み取り — passive 宣言は意味的に正しい (ブラウザはスクロール
  ブロックを待たない)。

## Non-issues verified

- `window.devicePixelRatio` (`_dpr()` at 847): 関数ラッパーで逐次読み —
  monitor 移動やブラウザズームでの stale DPR なし。
- `dblclick` / `mousedown` / `keydown`: passive 適用外イベント種 —
  preventDefault は全て有効。`⌘C/X` keydown 経路は意図的に `_pd` なし
  (0516: copy/cut イベントが OS clipboard を書く仕組みのため)。
- `selectstart`/`dragstart`: canvas 上テキスト選択ドラッグは pointer 系で
  既に抑止 (マーキー選択が先行)。

## Conclusion

入力イベント面は全経路で「preventDefault 必要な経路が non-passive +
`touch-action:none` + `_pd` 先行」の3条件を満たす。実害なし、監査完走。
