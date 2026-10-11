# ADR-1180 — `sendCursorHide` のクリアを peers ゲート手前へ

## 決定

`sendCursorHide` の状態クリア (`_lastCursorSend`/`_curSp`/`_lastCurKey`/`_curT`) を
`_pr().size===0` 早期 return の**手前**へ移動。`h:1` 送出は引き続き
受信者が居るときのみ行う (emit はゲート維持、状態リセットは無条件)。

## 経緯

ADR-1179 でカーソル送出の完全性を閉塞した際、`sendCursorHide` が
クリアを早期 return の**後**に置く残穴を残した (round929 PR body の "Not in
scope" として記録した residual):

- ピア不在時に hide (pointerleave / blur / switchPage) すると `_curSp` は最終
  画面点、`_curT` はアーム済み resend、`_lastCurKey` は既視キーのまま残る。
- `_curT` は発火しても `sendCursor` が `_pr().size===0` で no-op — 単体では無害。
- だがピアがその後 join → `_touchPeer` → `sendCursorMoved` → `_curSp` が
  生存しているため `s2w` 再導出が走り、**ポインタが既に画面外なのに**
  stale な世界座標カーソルが joiner へ1発送出される。
- `h:1` を送らないのは正しい (受信者ゼロ) が、*状態*のリセットまで
  スキップするのは不整合 — クリアは「伝える相手がいるか」に依存しない。

## 設計詳細

```js
sendCursorHide(){   // ADR-0611/1180
    this._lastCursorSend=0;this._curSp=null;this._lastCurKey=null;_cT(this._curT);this._curT=null;
    if(_pr().size===0)return;
    this._bcast(_mk('cursor',{x:0,y:0,h:1,pg:state.curPg,..._nm()}));
}
```

- 契約: **状態クリアは無条件、emit は受信者ゲート**。`_selT` 系の
  selection 側は hide 経路を持たない (空 selection `{sel:[]}` が hide 相当)
  ので parity のずれはない。
- `sendCursorMoved` の `_curSp` null ゲートが joiner-emit を正しく止める。

## 検証

- 挙動: ピア0 で `sendCursorHide` → `_curSp`/`_curT`/`_lastCurKey` が null。
- ソース: sendCursorHide 本体内でクリア式が `_pr().size===0` より前に出現。

## 関連

ADR-0611 (cursorHide 導入), ADR-1179 (cursor send completeness — 本 ADR の
residual を明示), ADR-1177 (`_selT` — sel 側は hide 経路なし)。
