# ADR-1184 — 全置換パージが武装済みズームプレビューも破棄 (stale bitmap blit 閉塞)

## Status
Accepted (fix ラウンド)

## Context

round934 は `_pinchSnap`/`_pinchVp` (ズームプレビュー対、ADR-0030/0033) のライフサイクル軸を
監査。ペアを破棄するサイトは揃っていた — `_resetPinch`/`_wheelZoomEnd` (ジェスチャ終端)、
`_clearTouchState` (hidden/pagehide・`_cancelPointerGesture` 経由)、`_pgAdopt`/`switchPage`
(頁遷移) — 残る穴は「`ptr.down=false` のプレビュー中に全置換が着地する」ケースだった。

- `_pcC` (ADR-0424) は全置換の共有パージシーム: `_rs` (import/swap 全経由)、`clear` apply、
  `replace` apply 双方向、pageDel の member kill が全て通る。
- だが `_pcC` は `_pinchSnap`/`_pinchVp` を消さなかった。
- `_rs` のジェスチャ cancel は `if(ptr.down)` ゲート — apply 経路は `_pcC` を直接呼び
  cancel を走らせない。ctrl+wheel プレビュー (180ms の再アーミングタイマ) と iOS pinch の
  `_pinchSnapNow()` は `ptr.down=false` のまま mint する。
- 結果: プレビュー武装中に同頁の全置換 (import・clear・replace・pageDel member kill) が
  着地すると、`draw()` は early-return (:2744-2755) で交換前ビットマップを blit し続ける
  — タッチ pinch では数秒の stale 表示 + 旧ドキュメントの全解像度 canvas の保持。

## Decision

`_pinchSnap=null;_pinchVp=null` を `_pcC` 内へ追加 (~31B、コメント尾 `// ADR-0445/0985/1184`):

```js
const _pcC=()=>{_penCache.clear();_penCachePx=0;_penBboxCache.clear();Net._imgPending.clear();_pinchSnap=null;_pinchVp=null},...
```

全置換の全5サイトが同シームを通るため一括閉塞。パージ後の `draw()` は通常パスへ戻り、
`_lastVp=null` (武装ドローが設定) により完全シーンパスが走る — 自己修復。
wheel-end タイマ/`_resetPinch` は冪等に pair を null するので二重破棄も無害。

## Audit 結果 (このラウンドで検証した他サイト — clean)

- ジェスチャ終端 (`_resetPinch`/`_wheelZoomEnd`)、hidden/pagehide (`_clearTouchState`)、
  頁遷移 (`_pgAdopt`/`switchPage`→`_cancelPointerGesture`)、`ptr.down` cancel は全て pair を破棄
- 描画側: early-return は `_pinchSnap&&_pinchVp` の双方 truthy でのみ → 片方だけ null でも残留なし
- 穴は正確に「`ptr.down=false` プレビュー × `_pcC` 到達の同頁全置換」のみだった

## Pins

実リスナ経路で4挙動ピン (test.mjs ADR-1184 ブロック):
1. commit 前提条件 — rect が確定する (武装対象シーンの構成)
2. ctrl+wheel で武装したプレビューは draw() で drawImage 1回 (シーンパス早期 return)
3. `_pcC()` 後は stale スナップショットが blit されない (drawImage 0回)
4. `_pcC()` 後の draw() は実シーンパスを走る (ctx call 数が prelude を超える)
