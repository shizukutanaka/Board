# ADR-0504: `.map(x=>X(x))` を point-free `.map(X)` 化

## 状態

実装済 (v1.7.537)

## 背景

`_ln`/`byId` の map 変換が arrow 包みで書かれていた。

## 決定

point-free 形に短縮 (`.map(_ln)` 4 サイト、`.map(byId)` 2 サイト)。

## 影響

- index.html ~-50B
- 動作変更なし
