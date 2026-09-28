# ADR-0566: selectFrameContents は可視メンバーのみ選択する

## 状態
実装済み (v1.7.594)

## 背景
`selectFrameContents` (ctx メニュー「フレームの内容を選択」) は `withFrameChildren`
でフレーム内の全 id を集め、そのまま `_ss(inner)` に流していた。
`withFrameChildren` は可視性を見ないため、**visible=0 の非表示メンバーが選択に入り**、
⌘A (`_shV`) やマーキー (`_sq` 系の `_ulv`/`_sv` フィルタ) と一貫しない挙動だった。
見えない図形が選択されると、続く move/delete/style 操作が不可視のまま作用する — 
ユーザーに結果が見えない破壊的操作になり得る (ADR-0146 の hidden-path 一貫性違反)。

## 決定
`selectFrameContents` で `inner` を構築した直後に
`for(const id of inner){const s=byId(id);if(!s||!_sv(s))inner.delete(id)}`
で非表示メンバーを除去する。他の全セレクタと同じく可視のみを選択対象にする。
フィルタ後に `inner.size===0` になれば既存の `_wT(_ST)` (nothing-selected toast) 経路。

## 影響
- hidden メンバーが選択・誤操作されない
- test.mjs の selectFrameContents シナリオに `visible:0` メンバーの除外アサートを追加
