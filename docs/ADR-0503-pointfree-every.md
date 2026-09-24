# ADR-0503: `.every(id=>X(id))` を point-free `.every(X)` 化

## 状態

実装済 (v1.7.536)

## 背景

`_idOK`/`_hasS` の全件判定が arrow 包みで書かれていた。

## 決定

point-free 形に短縮 (`.every(_idOK)` 3 サイト、`.every(_hasS)` 2 サイト)。
`state.dupIds` は `_dd()` とは別オブジェクトのため対象外。

## 影響

- index.html ~-40B
- 動作変更なし
