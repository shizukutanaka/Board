# ADR-0632: ミニマップスクラブ状態を hidden/pagehide でもクリア

- 状態: 実装済
- 日付: 2026-09-28

## 背景

`_mmNav` (ミニマップ押下中のナビゲートフラグ) は pointerup /
pointercancel / blur (ADR-0534) でリセットされるが、
`visibilitychange→hidden` と `pagehide` ではクリアされなかった。
iOS の bfcache 復帰等でフラグが残存すると、次の pointermove が
ポインタ不在にも `_mmGo` を走らせビューポートをジャンプさせ得た。

## 決定

`Minimap` IIFE の公開面に `cancelNav(){_mmNav=false}` を追加し、
既存の `_clearTouchState()` (blur/hidden/pagehide の共通掃除口) から
呼ぶ — ADR-0608 で集約されたジェスチャ掃除経路に乗せる。

## 影響

- タブ切替・bfcache 追い出し中のスクラブ中断が、ポインタ系掃除と
  同一経路で完結。単体増分 ~60B。
