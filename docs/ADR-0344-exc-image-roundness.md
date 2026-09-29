# ADR-0344: .excalidraw 画像 emit の `roundness`/`strokeSharpness`

## 状態
承認 — round73

## 背景
`case'image'` の excalidraw emit が `roundness`/`strokeSharpness` を
持たず、Board `s.r` 付き画像が exc 側で角丸を失っていた
(box系は ADR-0267 で実装済み、image のみ抜け)。

## 決定
emit に box 系と同式 `roundness:s.r?{type:3}:null,
strokeSharpness:s.r?'round':'sharp'` を追加。import 側は既存
`st()` が `o.r=8` を `Object.assign` で既にマージするため追加
変更不要 — 往復完結。

## 影響
+~100B (522,155B)。
