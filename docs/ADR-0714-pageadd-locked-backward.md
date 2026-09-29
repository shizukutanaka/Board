# ADR-0714 — pageAdd backward も locked member を残す

## 状態
採用 (v1.7.740)

## 文脈
`pageAdd` の backward (undo = 追加ページの除去) は member を無条件で除去
していたが、undo-wire の `pageDel` はピア側で `_pgDel2` 経由 — locked
member は残して firstId へ再帰属させる。forward↔undo 間に member が
lock されるとローカルだけ消す = membership 発散。

## 変更
- backward の member 除去ループで `byId(id).locked` を skip。
  残存 member の `pg` は直後の既存 heal (`s.pg===op.id→fid`) が
  firstId へ refile するため可視性も保持される
