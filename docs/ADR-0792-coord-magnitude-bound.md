# ADR-0792: coordinate magnitude bound at intake

## 背景

`validPatch` (ADR-0367/0368/0369) は数値 prop の型と有限性を検証するが、**大きさ**は無制限だった。
悪意のある (あるいは壊れた) ピアが `{x:1e15}` の図形を1 op 送るだけで通過する:

- **`bboxAll` 系の全消費者が壊れる** — fit-view・zoom-to-selection・ミニマップ・
  PNG/SVG/.drawio エクスポートの bbox が 1e15-ワールドになり、zoom は下限にクランプ、
  全コンテンツがサブピクセル = **全ピアの盤面が事実上ブランク** (永続化もされる)。
- **ダメージ矩形が全面化** — union bbox が巨大なので局所再描画が常に全走査化、
  フレーム毎に全図形を描画。

1 op で全参加者のビューを永続的に DoS でき、他者の「巻き戻し」も困難
(ユーザーは手動で戻る手がかりを持たない)。

## 決定

`_xyOK=v=>_fin(v)&&_abs(v)<=1e7` を validPatch に適用:

- スカラー座標 `x,y,w,h,x1,y1,x2,y2` — 数値型ループを座標系とそれ以外に分割
  (z は frac 由来で巨大値が合法、非座標 prop は大きさ非問題)
- `pts` タプルの x,y メンバ (q[2]=pressure は既存 `_fin` のまま)
- `way` ウェイポイントの x,y

validPatch は add/upd/move(connClears)/del/clear/replace/snapshot/IDB/全インポータで
共有されるため、**全 intake が一括でカバー**される。

## なぜ 1e7 か

UI から到達不能な大きさ: パン1回で移動するのは数百〜数千 world 単位。1e7 到達には
異常な連続操作が必要で、実盤面は通常 1e4 台まで。同時に 1e6-ワールド級の
巨大盤面 (1000 ページ相当) までは合法として通す。

## 整合性

ローカル commit は validRemotePayload を通らない (信頼済み) が、UI 経由で |coord|>1e7
に到達できないため「ローカルが送りピアが棄却する」発散窓は実質ゼロ。
IDB 上の旧データに超過値があれば、restore 時に棄却 = ブランク化した自分の盤面も
自己修復する。
