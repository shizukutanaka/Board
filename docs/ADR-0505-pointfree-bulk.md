# ADR-0505: `filter`/`some`/`find`/`every`/`map` arrow 包みの一括 point-free 化

## 状態

実装済 (v1.7.538)

## 背景

単一述語呼出し `x=>fn(x)` の arrow 包みが 18 サイトに散在
(`filter(s=>_sv(s))`、`some(s=>_rt(s))`、`find(id=>byId(id))` 等)。

## 決定

`.X(x=>f(x))` を `.X(f)` に一括化。否定形 `x=>!f(x)` や複合式は対象外。

## 影響

- index.html ~-130B (18 サイト)
- 動作変更なし
