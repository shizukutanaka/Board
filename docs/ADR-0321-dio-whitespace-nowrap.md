# ADR-0321: drawio `whiteSpace=nowrap` ↔ `s.wrap` 往復

## 状態
承認 — round54

## 背景
drawio の `whiteSpace=nowrap` はテキストの折返し抑止。
Board の `s.wrap=0` (ADR-0208) と同義だが未マップで、
折返し無しテキストが輸入で折返し有りに化けていた。

## 決定
- 輸入: `whiteSpace=nowrap` かつ `s.type==='text'` → `s.wrap=0`
- 書出: `t==='text'&&s.wrap===0` → `whiteSpace=nowrap;` を style emit

## 断念した代替案
- 全形状に `s.wrap` を効かせる — ボックスラベルは常時 wrap が
  Board の既定 (ADR-0074) で、変更は視覚差分を生む。

## 影響
nowrap テキストが往復。2029 全緑。
