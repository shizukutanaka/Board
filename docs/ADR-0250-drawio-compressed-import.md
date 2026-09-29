# ADR-0250: 圧縮 .drawio ファイルのインポート (DecompressionStream)

## 状態
承認 — round37

## 背景
実際の .drawio ファイルは `<diagram>` 要素の中身に
`base64(rawDeflate(encodeURIComponent(xml)))` を格納する (draw.io 既定)。
ADR-0203 のインポートは非圧縮 XML のみ対応で、圧縮ペイロードは
「draw.io で圧縮オフにして再保存」警告のみだった — 実ファイルの大半が
取り込めなかった。

## 決定
`DecompressionStream('deflate-raw')` で依存ゼロの inflate を実装
(`_dioInflate`)。`importDrawioText` は `<diagram>` 中身を検出したら
非同期 inflate → 再帰的に `importDrawioText` へ。非対応エンジンは
従来警告を維持。

## 断念した代替案
- pako/自前 inflate — 外部依存追加は不可、自前実装は数百行。
- 同期 inflate — API が async のみ。呼び出し側は fire-and-forget で
  問題ない (完了時に toast + addMany)。

## 影響
実 .drawio ファイルがそのまま開ける。i18n 警告は据置き。1960 全緑。
