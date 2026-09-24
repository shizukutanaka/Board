# ADR-0346: ⌘F 検索対象の拡大 (link / frameLabel / cap)

## 状態
承認 — round75

## 背景
`_sqMatches` は `label|text|type` のみを照合していた。
「URL を貼った図形」をリンク先で探せない、キャプション
(`s.cap`) やフレームラベル (`s.frameLabel`) が検索に出ない
という実ギャップがあった。

## 決定
照合文字列を `(label)+(text)+(type)+(link)+(frameLabel)+(cap)`
に拡張。visible=0 除外・`_gridVer` メモ化・大小無視は従来どおり。

## 影響
+~100B。検索ヒット率が実際の可視情報と一致。
