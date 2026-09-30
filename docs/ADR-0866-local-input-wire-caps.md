# ADR-0866: ローカル入力も wire 上限を共有する (pen pts 50000 / waypoint 200)

## Context

`validPatch` は wire 取込で `pts ≤ 50000 tuple`・`way ≤ 200 object` を要求する
(ADR-0792/0368)。しかしローカル側の生成経路は上限を持たなかった:

- `contPen` — 1px decimate なしに pointermove 毎 `pts.push` → 長時間の一筆で
  50000 tuple を超え得る
- ウェイポイント挿入 (`ptr.wayNew` の初回 move) — `wa.splice(i,0,…)` で
  `s.way` が無制限に増え得る

上限超過の図形はローカルでは commit されるが、送出した 'upd'/'add' op は全ピアの
`validPatch` で棄却される → ローカルだけが図形を持つ盤面発散。
テキストエディタの `maxLength` (ADR-0797) や importer の `validShape` 共有
(ADR-0796) と同じ「ローカル受理・ピア棄却」クラス。

## Decision

ローカル側も同じ数値上限で停止する:

- `contPen`: `_ln(pts)<50000` のときのみ append
- ウェイポイント insert: `_ln(wa)<200` のときのみ splice (上限到達時は
  `wayNew` を消費して通常の vertex move へ継続 — ジェスチャ自体は殺さない)

## Consequences

- ローカルに存在する全図形は wire 検証を通る → 発散経路を閉塞
- 50000 tuple ≈ 1px decimate で 50,000px 超の一筆、200 waypoint = 実用で
  まず到達しないが、到達時は静かに伸びが止まる (DoS ではなく UX 劣化のみ)
- 既存の wire-side 検証は変更なし (receive 側の安全網はそのまま)

## Tests

- `contPen` が 50000 境界で append を止めること (実 pointermove 経路)
- waypoint insert が 200 境界で挿入を止め `wayNew` を消費すること (同)
- wire 側の既存ピン (validPatch pts/way 上限) は据え置き
