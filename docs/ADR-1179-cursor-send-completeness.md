# ADR-1179 — カーソル送出の完全性 (trailing resend / viewport drift / latecomer)

## 決定

`sendCursor` の3つの残存 staleness 穴を閉塞:

1. **Trailing resend**: スロットル窓内のドロップで `_curT` タイマーをアームし、
   発火時に `sendCursorMoved()` が最新画面点から世界座標を再導出して送出
   (`_selT` / ADR-1177 と同型)。
2. **Viewport drift**: canvas pointermove が最後の画面点 `_curSp` を記録し、
   `frame()` が `Net.sendCursorMoved()` を毎フレーム呼ぶ。viewport を動かす
   全経路 (wheel pan / pinch / minimap scrub / _fitViewport / undo-avp 等) は
   既に `_iv()` でフレームを起こすため、個別フック不要 — 導出点が最終送出点
   と異なるときのみ送出する `_lastCurKey` dedup (`x|y|pg`) で no-op 化。
3. **Lifecycle parity**: `_lastCurKey` を `sendCursorHide`
   (`_curSp`/`_curT` と共にクリア — 隠したカーソルが stray timer で復活しない)、
   `Net.init` (ADR-1178 self-latecomer のカーソル版)、`_touchPeer` 新規ピア
   (joiner が静止カーソルを一度聴取) でリセット。

## 経緯

ADR-1177/1178 で selection presence の送出完全性を閉塞した際、カーソル側に
同型の残穴が残っていた:

- **Trailing-edge 落ち**: スロットル窓内の pointermove は送出されず、窓内で
  静止した最終位置は次の物理ムーブまで永遠にピアへ届かない (届かない可能性あり)。
  選択には `_selT` があるがカーソルには無かった。
- **Viewport drift**: パン/ズームは静止カーソル下の世界座標を動かすが、presence
  は物理ムーブまで送出しない — ピアは見えている位置と異なる点にカーソルを表示。
- **遅参未再送**: 新規ピア参加で選択は再送されるが (ADR-0011/1177)、静止中の
  カーソルは再送されず joiner には表示されない。

## 設計詳細

```js
_lastCursorSend:0,_curSp:null,_curT:null,_lastCurKey:null,

sendCursor(wp){
  if(_pr().size===0)return;
  const key=wp.x+'|'+wp.y+'|'+(state.curPg||'');
  if(key===this._lastCurKey)return;                      // dedup
  const now=_now();
  if(now-this._lastCursorSend<CURSOR_THROTTLE_MS)
    return this._curT||(this._curT=_stO(()=>{this._curT=null;this.sendCursorMoved()},CURSOR_THROTTLE_MS));
  this._lastCursorSend=now;this._lastCurKey=key;
  this._bcast(_mk('cursor',{x:wp.x,y:wp.y,pg:state.curPg,..._nm()}));
},
sendCursorMoved(){if(this._curSp&&_nP()<2)this.sendCursor(_s2(this._curSp))},
```

- `sendCursor` シグネチャは世界座標のまま (テスト・呼出し側互換)。
- `_curSp` は pointermove ハンドラで無条件に記録 (pinch 中の early-return
  より前) — pinch 中は `_nP()>=2` で emit がゲートされるが点は追従し、
  pinch 終了後に正しい位置が導出される。
- `_curSp` は room switch でクリアしない (画面点はルーム/viewport を跨いで有効、
  self-latecomer として新ルームへ再アナウンス)。
- `sendCursorMoved` は `_nP()<2` ゲート — 物理 pinch ジェスチャはハンドラ
  自身のルールのまま。

## 検証

- 挙動: 初回 emit / dedup / drift emit / 窓内 coalesce + `_curT` アーム /
  窓後に静止位置着地 / latecomer 再送 / hide で `_curSp` クリア + h:1 emit /
  hide 後は実ムーブまで再送出なし。
- ソース: `sendCursorMoved` 本体、`_curT` アーム式、`Net._curSp=sp` 記録、
  hide の4フィールド一括クリア。

## 関連

ADR-0010 (cursor throttle), ADR-0011 (latecomer sel resend), ADR-0611 (cursorHide),
ADR-0647 (presence pg), ADR-1053 (peer names), ADR-1177 (selection `_selT`),
ADR-1178 (init send-state reset — 本 ADR の `_lastCurKey` も同ラインへ追加)。
