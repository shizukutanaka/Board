# ADR-0355: Math 系 shorthand による raw 回収 (~900B)

## 状態
承認 — round82

## 背景
512KB 上限対策の継続 (ADR-0348/0350 に続く第三批)。

## 決定
`_hp`/`_PI`/`_fl`/`_at2`/`_ceil`/`_sgn`/`_sqr` = Math.hypot/PI/floor/
atan2/ceil/sign/sqrt (計180箇所)。`_sq` は検索クエリ変数と衝突
するため `_sqr` を採用。SW blob 内に該当呼出無しを確認。

## 影響
raw 523,005B。挙動不変 (純alias)。2044 全緑。
