# ADR-0565: frame() の draw throw で rAF ループを殺さない

## 状態
実装済 (v1.7.593)

## 背景
`frame()` は `_rafId=0` を先に立ててから `draw()`/`drawOverlay()` を呼ぶ。
draw 系が throw すると `needsRender`/`needOverlay` が true のまま残り、
末尾の `if(needsRender||needOverlay)_rafId=_rAF(frame)` 再スケジュール判定に
到達しない。`needsRender` が true のまま `_rafId=0` で抜けるため、**外部の
`_iv()` (ポインタ移動・キー入力等) が来るまで描画が止まる**。draw 内で
`_iv()` が呼ばれたケースは `_iv` 自身が `_rafId` を立てるため回復するが、
draw 冒頭での throw や永続的な破損データ (forward-incompat な IDB 復元等)
では draw 例外 1 発相当以上に凍結が長引き得た。

## 決定
`draw()`/`drawOverlay()` 呼出と post-draw フック群
(`sendSelectionIfChanged`/`_mirrorSync`/`_teFollow`/`_lblFollow`/
`_syncStylePanelIfChanged`/`_statusSel`) をそれぞれ `try{…}catch(_){}` で囲む。
例外を飲み込み、`needsRender=false;needOverlay=false` 以降のクリーンアップと
再スケジュール判定が常に到達するようにする。catch は握り潰し — 破損が永続的
なら次フレームで同じ例外が繰り返し投げられるため console.error を重ねる必要は
なく、一過性の throw なら次の `_iv()` で回復する。

## 影響
draw 例外が発生してもアプリは凍結せず、次の `_iv()` で再スケジュールされて
回復を試みる (永続的な破損データの場合は毎フレーム例外を吐き続けるが、
UI の他操作は応答し続ける)。
