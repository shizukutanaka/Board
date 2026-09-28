# ADR-0569: 非表示化された図形の編集 overlay を畳む

## 状態
実装済み (v1.7.596)

## 背景
テキスト/ラベル編集中にその図形が hide されると、overlay が不可視の図形に
残り続けた。経路は3つ: (a) local `hideSelection` (⌘⇧H)、(b) remote style op、
(c) hide の undo/redo。`_teFollow`/`_lblFollow` の `byId` ガードは存在を
見るだけで、非表示 (存在するが到達不能) を通さなかった。

## 決定
- `hideSelection` 冒頭で `_cxO()` を呼び、local hide の前に overlay を畳む
  (blur → 通常 commit → hide の順で、タイプ内容は保存される)
- `_teFollow`/`_lblFollow` のガードに `_hd` を追加 — remote hide や
  undo/redo 経由の非表示化でも次フレームで畳む。再入 commit を避けるため
  `_apply` 内ではなく frame 境界で畳む

## 影響
- 「非表示図形への編集」という到達不能状態が消える
- remote hide はテキストを保存せず閉じる (選択) — hide した側の編集意図を優先
