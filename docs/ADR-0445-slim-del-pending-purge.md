# ADR-0445: del/clear の画像スリム化 + `_pcC` の `_imgPending` パージ

## 状態
実装済 (v1.7.480)

## 背景
2件の小さなワイヤー/キャッシュ整合性の欠落:

1. `_slimOp` は `add`/`addMany` のみ画像 dataUrl を `img:` 参照へスリム化
   していた。`del`/`clear` の shapes 配列は生ペイロードのまま送られ、
   画像を含む削除 (および ADR-0443 の undo が発行する `del`) は
   メガバイト級の wire 負荷になっていた。remote の `del`/`clear` 適用は
   `id`/`locked` しか使わないので payload 削減は機能的に無損失
   (`validShape` は dataUrl を要求しない)。
2. `_pcC` (全図形除去時のキャッシュパージ) は `_penCache`/`_penBboxCache`
   のみで `Net._imgPending` を残していた。着信 img blob 待ちの駐車参照が
   `clear`/`replace` 後も最大256件滞留し得た (解決時 `byId` ガードで
   機能害はないがリーク)。

## 決定
- `_slimOp` を `(addMany|del|clear)&&_iA(op.shapes)` に拡張。
- `_pcC` に `Net._imgPending.clear()` を追加。

## 影響
- 画像を含む削除の wire バイト数が ~1/100 に縮小。
- 併走 dedupe: `_docN` (docName clamp×3)、`_fs2`/`_sh2` prop fold、
  `Object.assign`→`_oa`、`_usI` alias (~350B 回収)。
