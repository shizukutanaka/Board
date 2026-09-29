# ADR-0110: 付箋 ↔ テキストの型変換 (ctx メニュー)

## 状態

実装済み (v1.7.168)。

## 背景

付箋として書いたメモを「ラベル的なテキスト」にしたい/逆に
地のテキストを付箋化したい — 再作成しか手段が無かった。
ADR-0109 と同じ type-patch の系。

## 決定

- `toggleStickyText()` — `s.type` を `sticky↔text` で style op
  パッチ。text/align/fontSize/w/h はそのまま引き継ぐ。
- paint の扱い: sticky の `color` は text では未使用 (テキスト
  インクは `stroke`)、text の `stroke` は sticky では未使用
  (枠は固定色)。変換で色属性は失われず残るので、往復変換で
  元に戻る。
- ctx ラベルは最初の対象で動的 (`ctxToText`/`ctxToSticky`)。

## 断念した代替案

- **`color→stroke` コピーで paint を引き継ぐ**: 往復で不可逆に
  なる (往路で stroke 上書き→復路で元 color 喪失)。属性を
  残す方が情報ロスレス。

## 影響

- `under/strike/bold/italic` も両 type で共有されるため装飾は
  そのまま。
