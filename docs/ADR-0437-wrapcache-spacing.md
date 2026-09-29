# ADR-0437: `_wrapCache` キーに `s.spacing` を追加

## 状態
実装済 (v1.7.472)

## 背景
`wrapTextCached` は (text, maxWidth, fontSize, bold, italic, font) をキーに
行分割結果を WeakMap メモ化するが、`c.measureText` は ctx に設定された
`letterSpacing` (ADR-0205, `s.spacing`) の影響を受ける。spacing だけを
変更する style op (spacing サイクル) では key が変わらず、旧 spacing の
計測で得た `lines` が返り続け、折返しが追従しない。

## 決定
キャッシュキー末尾に `s.spacing` を連結。約 +19B。

## 影響
- letter-spacing 変更時に折返しが即時 reflow — text/font/size 変更まで
  待たなくて済む。
- `s.lineH` は行高 (分割位置と無関係) のためキー不変のまま。
