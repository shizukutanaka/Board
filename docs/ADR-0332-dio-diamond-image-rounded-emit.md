# ADR-0332: diamond/image の `rounded=1` emit 補完

## 状態
承認 — round62

## 背景
drawio emit の `rounded=` は `else` 終端 (rect のみ) で、diamond /
image の `s.r` が出力時に落ちていた (import 側 `rounded=1→s.r=8`
は全 vertex で済み)。

## 決定
if-else 連鎖の**後**に standalone `if` で `rounded=1` を emit
(`else if` を else 後に置くと構文エラーのため)。

## 影響
角丸 diamond / 画像が drawio で角丸維持して往復。2040 全緑。
