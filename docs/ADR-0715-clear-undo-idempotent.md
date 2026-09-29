# ADR-0715 — clear backward の idempotent 化

## 状態
採用 (v1.7.741)

## 文脈
`clear` の backward は記録済み `op.shapes` を無条件で push していた。
clear↔undo の間に同 id の図形が再登場する経路 (ピアの add / snapshot
取込 / ローカルの再 add) があると同一 id が二重登録され、byId の曖昧性
と図形数の発散を起こす。

## 変更
- backward push を `if(!byId(s.id))` で冪等化 (`add` forward と同じ規則)
