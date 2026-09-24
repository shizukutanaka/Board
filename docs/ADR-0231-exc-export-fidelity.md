# ADR-0231: excalidraw エクスポートfidelity + image インポート

## 状態

実装済み (v1.7.288)。

## 背景

ADR-0230 でインポート側の装飾マップを揃えたが、
エクスポート側は逆マップを出力していなかった:

- `fillStyle` が常に `'solid'` (hatch/cross 喪失)
- `endArrowhead` が常に `'arrow'`、`startArrowhead` 常
  に null (head/start 喪失)
- `scale` が常に `[1,1]` (flip 喪失)
- image 要素は files 参照のためインポートで skip —
  往復で画像が消滅

## 決定

- **export**: `s.fstyle`→`'hachure'|'cross-hatch'`、
  `s.head`→`endArrowhead` ('none' 含む)、`s.start`→
  `startArrowhead:'arrow'`、`s.flip`→`scale:[±1,±1]`
- **import**: `type:'image'` を `d.files[e.fileId]` から
  `dataURL` で復元、`scale` の負値 → `flip` ビット。
  `data:image/` プレフィックスは既存 `_cleanVal` と
  同じゲートで検査

## 影響

- excalidraw 往復が画像・ハッチ・ヘッド・反転まで
  完結。25MB の dataURL 上限で巨大ファイルを制限。
