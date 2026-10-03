# ADR-1006: Timer / deferred-callback lifecycle audit

## 状況 (round755)

遅延コールバックが対象を無効化するライフサイクルイベント (pointer end / ジェスチャ
キャンセル / ルーム切替 / hide / 要素除去 / dc close) の**後**に発火すると、stale
state への書込・stale チャネルへの送信・消えた DOM の再操作という欠陥クラスになる。
ADR-0817 (timer/interval) は登録面の棚卸しだったが、fire 時の安全性を個別に検証して
いなかった。本ラウンドは全 `_stO`/`_stI`/Promise 継続サイトを「発火時に何を触るか」で
監査した。

## 監査結果 — 全サイト clean

### `_stO` (setTimeout, 11 サイト)

| ハンドル | fire 対象 | 安全性 |
|---|---|---|
| `_longPressTimer` | `_longPressFire(cx,cy)` | fire 時に `!ptr.down`/`_dk`/`TOL` を再検証 (ADR-0006) — pointerup/cancel 後の stale fire は no-op。cancel 系は `_cancelPointerGesture`→`_clearLongPress` の漏斗で全経路網羅 (pointercancel, lostpointercapture, contextmenu, visibilitychange, pagehide, ⌘Z, プレゼン, page switch, overlay 全 ADR-0948 経路) |
| `_wheelZoomEnd` | `_pinchSnap`/`_pinchVp` クリア+`_iv()` | 自己完結 (クリア系のみ) |
| 6686 / `_rO` | `revokeObjectURL` | 自己完結 |
| `this._snapT` | `_sendSnapshot` | 遅延 resend (ADR-0452)。close 後 fire は `_sendDC` の `d.readyState!=='open'` ゲートで drop。bc 差替後に発火した場合は**現状態**のスナップショットを現ルームへ送る — 盤面は doc スコープで room 共有ではないため意味的に正当 |
| `_stO(res,3000)` | promise resolver | 自己完結 |
| `this._saveT` | `save()` | db self-check (ADR-1005) + `flushIfHidden` の `_cT` 連携 |
| toast fade/remove (8933) | `div.style`/`_rm(div)` | detached div への書込/`_rm` は no-op |
| `_rszT` | `resize()` | `_cT`+再アームの trailing-edge 対、resize 自体が viewport self-check |
| `_nug.t` | `_nugEnd` | `arm()` が再アーム毎に `_cT`、`_nugEnd` 冒頭で `_nug=null` 二重発火 no-op、全コミット経路は flush (ADR-0957–0961) |

### `_stI` (setInterval)

- `Net._presenceTimer` — `Net.init` 冒頭で `clearInterval` (re-init 心拍リークなし)
- `setInterval(UI.refreshSaved,5000)` — app 寿命・匿名・自己完結 (保存時刻の表示更新のみ)

### Promise 継続 / observer 系

- `onbufferedamountlow` (8118) — 捕獲キューを `this._sendDC` 経由で再送: `this.dc` が
  新チャネルなら新 dc へ正当ルート (op は doc スコープで room スコープではない)
- `onversionchange` (ADR-0884) / `matchMedia` リスナ / `f.text()`,
  `convertToBlob`, `_dioInflate`, `nav.storage.estimate`, `Share.exportToUrl`,
  SW `register` — 全て自己完結か fire 時再検証 (`importSvgText`/drawio 取込は
  通常の `_apply` 経路で現状態へ適用 = 正当)

## 決定

実害なし — 契約をソースピン7件で固定。新規 `_stO` サイトは「fire 時 self-guard」
または「cancel 漏斗経由の `_cT`」のいずれかを必須とする。

## Pins
- `_cancelPointerGesture(){\n  _clearLongPress()` — cancel 漏斗
- `if(!ptr.down||_dk('resize')` — long-press self-guard
- `this._snapT=_stO(()=>{this._snapT=0` — 遅延 resend 存在
- `if(!d||d.readyState!=='open')return` — post-close drop
- `clearInterval(this._presenceTimer)` — re-init 心拍クリア
- `_nug.t=_stO(_nugEnd` — nudge flush アーム
- `_cT(_rszT);_rszT=_stO(resize` — debounce clear+rearm 対
