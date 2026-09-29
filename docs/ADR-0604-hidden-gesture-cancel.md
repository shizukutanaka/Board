# ADR-0604: visibilitychange→hidden / pagehide でのジェスチャ取消

## 状態
実装済 (v1.7.631)

## 背景
window `blur` では `_cancelPointerGesture()` を呼び、Alt-Tab 等で
pointerup を喪失した場合に `ptr.down` が残存しないよう守っている
(ドラッグ前スナップショットへ復元)。

しかし `visibilitychange→hidden` と `pagehide` は `Persist.flushIfHidden`
(+ bye 配信) のみで、ジェスチャ取消を行っていなかった。モバイルでは
アプリのバックグラウンド化 / スワイプキルが blur を伴わず発火するため:

- ドラッグ中にバックグラウンド → `ptr.down` が残存したまま復帰
- bfcache (iOS pagehide→pageshow) からの復元でも同様にジェスチャ状態が残存
- `before`-スナップショットを抱えた半端な状態が次のジェスチャ開始まで
  ぶら下がる

さらに `flushIfHidden` が取消前に走ると、**ジェスチャ途中の中途半端な状態が
永続化される** — 復元された「クリーンな」状態ではなく変形途中の図形が
ストレージへ書かれる。

## 決定
両ハンドラで `ptr.down` なら flush **より先に** `_cancelPointerGesture()`:

```js
visibilitychange: ()=>{if(hidden&&ptr.down)_cancelPointerGesture();Persist.flushIfHidden(...)}
pagehide:         ()=>{if(ptr.down)_cancelPointerGesture();Persist.flushIfHidden('hidden');Net._bcast(bye)}
```

順序が要点 — 取消でドラッグ前スナップへ復元した後に flush するので、
永続化されるのはクリーンな盤面。

## 影響
- モバイル/bfcache での stuck gesture 状態を解消 (window blur と同系の穴)
- ジェスチャ途中状態の永続化を防止
- デスクトップでは既存の blur 経路と挙動一致
