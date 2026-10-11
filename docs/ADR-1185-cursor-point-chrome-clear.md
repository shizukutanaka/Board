# ADR-1185 — オーバーレイ chrome 上で `_curSp` が陳腐化 → 幽霊カーソル送出を閉塞

## Status
Accepted (fix ラウンド)

## Context

round935 はカーソル presence の送出/解除対称性を深掘り監査 (ADR-1177..1180 で
throttle/trailing/hide/room-switch を閉塞済みの残面)。

`Net._curSp` は **canvas の `pointermove` のみ** がスタンプする (:4342)。だが minimap・
toolbar・topbar・style panel・ctx メニュー・ページバー・編集 overlay は全て canvas ボックス内に
重なる兄弟要素 — ポインタがそれらへ移っても canvas の `pointerleave` は発火しない
(ジオメトリ的にまだ canvas 内) 一方、pointermove のターゲットは chrome 要素になるため
`_curSp` は最後の canvas 点で凍結される。

その状態で `frame()` の `sendCursorMoved` (:8354) は `s2w(_curSp)` を再導出して emit するため、
viewport が動くたびに**陳腐な画面点を新 viewport で世界座標化した幽霊位置**がピアへ送出される:

- **minimap スクラブ**: `_mmGo` が `_vp().x/y` を書き `_iv()` → 毎フレーム幽霊ジャンプ
- **chrome hover 中の ⌘±/⇧1/PgDn**: viewport 変化で1発の幽霊 emit
- **テキスト編集 overlay 内**: 同上

ピア視点では自分のカーソルが実際には chrome 上にあるのに盤面上で跳び回る — ADR-0611/0612/
0689/0690/1179 が閉じてきた stale-presence の最後の残面。

## Decision

document レベルの `pointermove` でヒットターゲットが canvas 以外なら `_curSp` を null 化
(~80B、リスナ1本):

```js
_on(document,_PM,e=>{if(e.target!==canvas)Net._curSp=null});   // ADR-1185
```

設計上の要点:

- **broadcast しない** — ピア側の可視カーソルは最後の着地位置に残る (pointerleave 時の `h:1`
  とは別経路)。閉塞対象は「幽霊 emit」であり、見せ方の契約は変えない。
- **pointer capture は canvas へ向く** — キャンバスドラッグ中にポインタが chrome 上を横切っても
  `e.target===canvas` のまま → `_curSp` が追従し続け、ジェスチャを殺さない。
- **`_curT` (trailing resend) は自己清浄** — 発火時 `_curSp` null → `sendCursorMoved` が no-op。
- minimap の `setPointerCapture` (mc へ向く) もスクラブ全期間 `_curSp` を null に保つ。
- 代替案 (minimap `_PD` で `sendCursorHide`): hover 経路を覆わず、broadcast を1回余計に撃つ。
  document レベルの方が全 chrome 面を1行で覆う。

## Audit 結果 (このラウンドで検証した他サイト — clean)

- `_curSp` の読み手は `sendCursorMoved` のみ、書き手は canvas `_PM`/`sendCursorHide`/`Net.init` のみ
- `_nP()>=2` (pinch) ゲートは emit 経路では効くが `_curSp` の陳腐化を防がない — 今回の清掃で補完
- pres モードは `_curSp` = laser 位置として送出されており (カーソル=レーザー点)、不整合なし
- `sendCursorHide` の clear は本リスナより強い (timer/dedup も消す) — 両者は干渉しない

## Pins

実リスナ経路で4挙動ピン (test.mjs ADR-1185 ブロック):
1. document レベルの pointermove リスナが存在する
2. chrome ターゲット (BUTTON stub) の pointermove で `_curSp` が null 化
3. `_curSp` 無しで `sendCursorMoved()` は emit しない (幽霊カーソル不可)
4. canvas ターゲットの pointermove は `_curSp` を保持 (capture ドラッグ生存)
