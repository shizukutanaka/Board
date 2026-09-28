# ADR-0535: _tC / _fc 畳み込みの完結 + ミニマップの blur リセット

## 状態

実装済み (v1.7.564)

## 背景

ADR-0523/0528 で導入した `_tC` (`textContent` setter) / `_fc` (`focus()`) が
残存サイトに適用漏れ — `.textContent=` 直書き 5 件と `.focus()` 直書き 8 件が
残っていた。また ADR-0534 の blur リセットでミニマップの `_mmNav` (IIFE 内
スクラブ状態) が残っていた — ミニマップドラッグ中に blur で pointerup を
取りこぼすと、次の hover が無押下で viewport をスクラブし続ける。

## 決定

- `X.textContent=Y` → `_tC(X,Y)` を残 5 サイトへ適用 (~35B)
- `X.focus()` / `X?.focus()` → `_fc(X)` を残 8 サイトへ適用 (~26B)
- Minimap IIFE 内に `_on(window,'blur',()=>{_mmNav=false})` — 0534 と同じ防壁を
  クロージャ内のスクラブ状態にも適用

## 影響

- ~61B 回収 (524,280→524,219B) → ミニマップ修正を差し引き最終 524,274B
- ミニマップの「blur 後にホバーだけでビューが跳ぶ」固着を解消
- test.mjs の4ピンを post-fold 形に追従
