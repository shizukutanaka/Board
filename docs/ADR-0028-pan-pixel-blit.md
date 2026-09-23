# ADR-0028: パンのピクセル blit (露出帯のみ再描画)

Status: Implemented (v1.7.86)

## Context

ADR-0026/0027 でジェスチャと op の局所再描画を入れたが、**パン (viewport 移動)**
は依然として各 pointermove / wheel に全面再描画を要求していた — 世界座標系が
一様にシフトするため、局所 damage では表現できない唯一の大きな操作。

## Decision

`_lastVp` (前フレームで canvas が表現していた effective viewport) を draw() 終端で
記録し、次フレームで「zoom 不変かつ x/y 変化」を検出したら:

1. `ctx.drawImage(canvas,0,0,W,H,sx,sy,W,H)` で保持ピクセルをパン量分シフト
   (canvas 自己 drawImage — 端末的にスナップショット後に合成される)
2. **shift は device px に丸める** — 小数 blit はリサンプルで毎フレーム滲む。
   丸め残差 (≤0.5px) は effective viewport `ev` に織り込み、`_lastVp=ev` とする
   → 誤差は蓄積せず、次の全面再描画で自然に精緻化される
3. 新可視域 N と旧可視域 O の差分 (右/左/上/下の帯、最大2矩形) + 保留中の
   `_damage` を clip 経路に入れ、その内部だけ背景 fill + シーン再描画
4. 丸め後の shift が 0 かつ damage 無し (サブピクセルパン) → シーンパス丸ごと skip

zoom 変化・初描画・リサイズ後は `panned` 条件を満たさず既存経路 (damage clip /
全面) にフォールバック。`resize()` は `_lastVp=null` にする (バッキングストア
再割当で保持ピクセルが全て消えるため)。

`_view` (候補クエリ・inView 用) は `ev` 基準の可視域 — 帯を含む広めの領域で
候補を取り、clip が帯内に絞る (over-cover は常に安全)。

## Why sound

- blit 後の全ピクセルは「world @ ev」として一様に正しい — 帯の描画も ev で
  変換するため継ぎ目は ≤0.5px 以内のサブピクセル AA 差のみ
- damage/リモート op との同時発生: `_damage` は世界座標なので新 view にそのまま
  写り、clip 経路に追加するだけで正しい
- draft/予測インク/ペンキャッシュも世界座標 — blit がそのまま運ぶ

## Alternatives considered

- 小数 blit (丸めなし): サブピクセル誤差は消えるが、リサンプルのぼかしが
  ジェスチャ中毎フレーム累積する — 却下
- zoom も blit (拡大縮小コピー): 縮小は劣化が目立つ、拡大は拡大元情報が無い
  — zoom 変化は常に全面再描画 (現行通り)
- 帯ではなく新旧可視域 union を damage 化: union ≈ 全画面になるので clip の
  意味がない。帯のみが真に新規に必要な領域。

## Verification

headless Chrome (400 rect + 10 pen, 15px/回 × 8 回の連続パン, `frame()` 同期駆動):
- blit+帯描画 ~0.1–0.2ms/フレーム (同盤面の全面再走査 ~2–6ms)
- 全面再描画との差分 1597px/508935 (0.31%) — 全て ≤0.5px サブピクセル AA 縁の
  差で、欠落・ゴースト・シームではない (ev が設計上 ≤0.5px ずれるため)
- `node test.mjs` 全緑
