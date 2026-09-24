# ADR-0105: 付箋エディタ ⌘Enter で次の付箋を連鎖

## 状態

実装済み (v1.7.163)。

## 背景

ブレスト/ふりかえりでは付箋を連続で書く。現在は
「作成→編集→blur→再作成」の往復が必要 — FigJam/Post-it® の
連続入力フローに欠ける。

## 決定

- テキストエディタの ⌘Enter は既存の blur-commit に加えて、
  `s.type==='sticky'` なら `_stickyChain(s)` を発火:
  `Shape.make('sticky',{x:s.x+s.w+16,...})` で同スタイル
  (color/fontSize/align/サイズ) の隣接付箋を `add` op で生成し、
  選択→`openTextEditor(n,true)` で即編集継続。
- blur が先に走るので現付箋のテキストは先に確定する。

## 断念した代替案

- **下方向 (y+h+16) への連鎖**: 右方向が一般的 (sticky は横に
  並ぶ運用)。将来上下キー連鎖は別途検討。

## 影響

- ⌘Enter の既存セマンティクス (commit) は保持 — 付箋のみ連鎖が
  追加、text 形状は従来通り commit のみ。
