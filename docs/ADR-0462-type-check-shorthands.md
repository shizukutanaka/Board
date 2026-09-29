# ADR-0462 — 図形型判定 shorthand

## 状態

実装済 (v1.7.495)

## 背景

`s.type==='sticky'`/`'frame'`/`'pen'`/`'text'`/`'image'`/`'arrow'` の型判定が計 73 箇所に散在 (~1.2KB)。_iS/_iN/_iO (ADR-0456) と同じ族の predicate として畳み込む余地があった。

## 決定

`_stk`/`_frm`/`_pn`/`_txt`/`_im`/`_arw` (例: `_stk=v=>v.type==='sticky'`) を導入し、`X.type==='T'` 形を全面 fold (73 sites)。`type!==` / 未列挙型 (rect/ellipse/diamond/line/freedraw) は対象外。

ブロックスコープで `_pn` を shadow していたローカル (predicted-ink の `const _pn=_ln(_pp)`) を `_pl` に改名 — `_pn` がグローバル def を指すための安全性確保 (宣言前行での参照は TDZ エラーになる)。

## 影響

- ~520B 回収 (index.html 524,270 → 523,751)。
- 型判定が一意の名前空間 (`_i*` typeof 系 + `_{stk,frm,...}` 図形型系) に集約され、新しい型追加時の探索容易性も向上。
