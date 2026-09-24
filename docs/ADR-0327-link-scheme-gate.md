# ADR-0327: `s.link` を `validPatch` で http(s) 限定に

## 状態
承認 — round58

## 背景
`s.link` は `window.open(s.link)` に流れる。リンク設定 UI では
http(s) を強制していたが、`.board` インポートと RTC `upd` パッチ
は `s.link` を未検証で受け入れていた — 悪意あるファイル/ピアが
`javascript:` / `data:` URL を仕込めば⌘クリックや ctx Open で
XSS に至り得た。

## 決定
`validPatch` に `'link' in p` ガードを追加 — dataUrl ガードと同じ
層で、validShape 経由 (.board/add ops) と upd パッチ経路の両方を
一本で塞ぐ。非 http(s) リンクを持つ op/形状は拒否。

## 断念した代替案
- `window.open` 呼び出し点で検証 — 経路が増えるたび漏れのリスク。
  入り口検証の方が恒久的。
- 拒否ではなく削除 — 形状本体を救う利点はあるが、敵対フィールドを
  含む形状をそもそも信用しない dataUrl の前例に倣い拒否。

## 影響
`javascript:` リンクはどの入力経路でも形状に乗らない。2035 全緑。
