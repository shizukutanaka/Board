# ADR-0541: コンテキストメニューの未処理キーでメニューを閉じる

- 状態: 実装済み (v1.7.569)
- 系: 修正 (UI 状態整合 / ARIA APG)

## 背景

`_ctxMenuKeyNav` は Esc/Tab/矢印/Home/End のみ処理し、それ以外のキーは
素通りで window `_KD` へバブルする。メニュー表示中に `v` (ツール切替)・
`Delete` (選択削除)・`⌘Z` (undo) を押すと、**メニューが開いたまま背後で
キャンバスコマンドが発火**し、宙に浮いた古いメニューが残った。ネイティブ
メニューは未処理キーで閉じるのが正規挙動。

## 決定

`_ctxMenuKeyNav` 末尾に `else if(e.key!==' '&&e.key!=='Enter')UI.closeCtxMenu()`
を追加 — 未処理キーはメニューを閉じてイベントはそのままバブルさせ、
コマンド自体は実行される (メニューは閉じるが入力は無視しない)。
Space/Enter は APG の item activation を残すため除外。

## 影響

- Esc/Tab/矢印/Home/End の挙動は不変。
- test.mjs の `_ctxMenuKeyNav` ハーネスに 4 assert 追加
  (letter/Delete → close、Space/Enter → open 維持)。
