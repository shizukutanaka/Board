# ADR-0662: Tab 連鎖を現ページに限定

## Status
Accepted — round410

## Context
`_sh()` 全走査の `_pgOk` 欠落、第三弾。Tab 系の3経路:

1. **Tab/⇧Tab 選択サイクル** (keydown `_TB`): 候補集合 `_sh().filter(_ulv)` — `_ulv` は unlocked+visible で pg を見ない。`_ss([id])` が off-page id を弾いても `byId(id)` で `centerOn(sh)` まで進むため、**別ページの図形へビューポートが飛ぶ**。
2. **ラベルエディタの Tab 連鎖** (ADR-0196): `!nx.locked&&nx.visible!==0&&_lblAnchor(nx)` — off-page 図形へラベルエディタが開き得る。
3. **テキストエディタの Tab 連鎖** (ADR-0375): 同述語 — 不可視図形へ `openTextEditor`。

## Decision
3 述語に `_pgOk(nx)` / `s=>_ulv(s)&&_pgOk(s)` を追加。不可視・別ページ図形は全経路で非到達 (ADR-0163 の hidden 規則をページ帰属へ拡張)。

## Consequences
- Tab 巡回は現ページ内で完結
- 単一ページでは従来と同一

## Tests
- 候補集合が off-page 図形を含まない behavioural + 両述語ピン (3 asserts)
