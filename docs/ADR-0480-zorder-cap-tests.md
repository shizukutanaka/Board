# ADR-0480: zorder legacy キャップの境界テスト

## 状態

実装済 (v1.7.513)

## 背景

ADR-0479 は legacy `after` ブランチに `_ln(c.frac)<=600`/`_ln(c.id)<=64` を追加したが、
同ラウンドでは literal-sync のみで実動作の拒否は未検証だった。wire キャップ系は
境界値 (=600 vs 601、=64 vs 65) での regress が起きやすいため非空虚テストを追加。

## 決定

既存の zorder-validity behavioural ブロック (Step3 ハーネス) に 4 assert を追加:
`frac:'a'.repeat(601)` 拒否、`frac:'a'.repeat(600)` 受理、`id:'a'.repeat(65)` 拒否、
`id:'a'.repeat(64)` 受理。`validRemotePayload` は sandbox 公開済みのため追加配管不要。

## 影響

- コード変更なし (test.mjs + 版数のみ)
- 将来の validRemotePayload 書換えが legacy ブランチのキャップを落とすと検出される
