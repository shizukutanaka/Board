# ADR-0975: JS 予約名キーによる素オブジェクト汚染 — null-proto ストア化

## 状態
採用 (v1.8.001)

## 文脈
図形 `id` と `groupId` は wire (`_idOK` ≤64文字) / import (`validShape`) で長さのみ検証され、文字集合は無制限 — `'__proto__'`・`'toString'`・`'constructor'` 等の JS 予約名が正当に通過する。id/groupId をキーに持つストアが素の `{}` だと、2系統の実害がある: (a) `m[k]=m[k]||[]` が継承プロパティを真値と誤認し `.push` で TypeError、(b) `m['__proto__']=obj` が `__proto__` setter を叩いてマップのプロトタイプを差替え、`Object.prototype` 自体への書込へ発展する。

## 実害と修正

### 1. `excScene` の `gids` (グループ配属マップ) — TypeError でエクスポートクラッシュ
`gids[s.id]` が `id='__proto__'` で `Object.prototype` (truthy) を返し `.push` が存在しない → `.excalidraw` エクスポート / クリップボード emit が例外で死ぬ。`'toString'`・`'constructor'` 等他予約名は関数値を返して同様に TypeError。

### 2. `_dioCells` の `_gbx` (drawio グループセル包絡) — `Object.prototype` 汚染
`_gbx[_gi(s)]` が `groupId='__proto__'` で `Object.prototype` を返し、`g.x=_min(...)` が **`Object.prototype.x` に書込** → セッション中全てのプロトタイプ不在 `.x`/`y`/`x2`/`y2` が NaN 化。`for..in` emit は setter 経由のため自身のキーを生成せず、出力にも現れない — 完全に静かな腐敗。

### 3. `_undoWire` の `reg` (ungroup 逆 op 再帰属) — TypeError で undo クラッシュ
リモート 'group' op の `gid='__proto__'` が図形へ着地後、その図形を含む group/ungroup の undo で `reg['__proto__']` が `Object.prototype` を返し `.push` が TypeError → undo 自体が例外で死ぬ。

### 4. `_stampWrites` の zorder バケット — 整合性
`(_wc()[c.id]={})` のみが素 `{}` (他4サイトは `_wM()`) — `w[key]` 読みが継承ビルトイン (`constructor` 等) を擬似時計として拾う窓を残す。`_wM()` へ統一。

## 修正
4サイト全てを `_wM()` (null-proto、`Object.create(null)` ベース — ADR-0788 と同一慣行) 化。null-proto では `m['__proto__']=v` が通常の own データキーとなり、setter を経由しないため `Object.prototype` も touched されない。各サイトの for..in/`||[]` ロジックは変更不要 (own enumerable key として動作)。

## 検証
- behavioural: `excScene([__proto__-id shape])` が不投げ、`boardToDrawio` 後 `Object.prototype.x` が untouched、`_undoWire` ungroup が `'__proto__'` groupId で不投げ、zorder 刻印後 `state.wclock.z1` のプロトタイプが null — 4ピン。
- 他の id-keyed 素 `{}` (`bmap`/`bb` 各サイト) は `.groupId` 単一フィールド読みのため proto 値を読んでも実害なしと確認。`_sbf` は `id+prop` 連結で `'__proto__'` と一致しない、`files`/`_excTid`/`idOf` は Map/prefix で安全、`state.peers`/全 `_img*` 系は Map、`state.wclock` 自体は 0788 で null-proto 済み — 網羅監査完走。
