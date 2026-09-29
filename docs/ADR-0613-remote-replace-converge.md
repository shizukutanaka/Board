# ADR-0613: 'replace' op を wire 収束 (全置換のピア同期)

## 状態
実装済 (v1.7.640)

## 背景
共有リンク/.board/.excalidraw 取込は盤面全体を `replace` op で原子置換する
(1 undo で元に戻る)。しかし 'clear' と同様に `REMOTE_OPS` から v1.7.48 で
意図的に除外されており、接続中のピアには届かなかった — 送信側は新盤面、
受信側は旧盤面を保持したまま発散し、スナップショットマージでも復旧しない
(LWW merge は削除を伝播しない)。実害として「インポートした側だけ画面が
変わり、相手は旧盤面のまま」が発生する。

## 決定
'replace' を `REMOTE_OPS` へ追加し、以下の4点で安全性を確保:

1. **payload 検証**: `validRemotePayload` に `case 'replace'` — `after` は
   `validShape` 全件 + `MAX_OP_SHAPES` 上限、`afterWc` は全プロパティの
   `validClock` を要求
2. **wire 帯域**: `_slimOp` が `before`/`wc`/`origSel` を剥がし
   `{op,after,afterWc,clock}` のみ送出 (受信側は undo 履歴を汚さない)
3. **img 参照復元**: `_attachOp` で `after` 内の parked img 参照を再解決
4. **wipe 安全**: `applyRemote` で適用直前に `Persist.saveBackup` を実行し
   (旧盤面は `:prev` スロットへ保存、再起動時に復元プロンプト)、
   `peerReplaced` トーストで可視化 — 'clear' は引き続き wire 拒否のまま

併せて副次バグを修正: `_apply` 内の pre-mutation `_u(byId)` が構築する
id index は `size!==_nS()` ガードのため、**before/after の図形数が一致する
置換では旧 index が生存し続け**、post-mutation の bbox 収穫と以後の `byId`
が stale 参照を返していた。'replace' 適用後に `_iG()` で再無効化。

## 影響
- ピア間の全置換が収束する (行為: import → 全員同じ新盤面)
- 混在バージョン部屋では旧側が 'replace' を棄却 → 発散は混在期間のみ
- 'clear' の wire 拒否 (wipe-safety) は不変 — 空白 wipe は依然拒否
