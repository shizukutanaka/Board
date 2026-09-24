# ADR-0268: excalidraw pressures / zigzag 受容

## 状態
承認 — round39

## 背景
- export は freedraw の `pressures` を書き出すが import は points のみを
  読み、圧力情報を落としていた。
- excalidraw は `fillStyle:'zigzag'` / `'zigzag-line'` を新しい塗りとして
  追加したが、どの条件にも合わず無視されていた。

## 決定
- import freedraw: `e.pressures[i]` を `pts[i][2]` に復元 (pen 幅
  レンダリングで利用)。
- import st(): `zigzag` / `zigzag-line` → `o.fstyle='hatch'`
  (最も近い Board 表現に近似マップ)。

## 断念した代替案
- zigzag を独自パターンとして新規実装 — canvas ネイティブ描画の
  ハッチ増設コストに見合わず近似を採用。

## 影響
圧力情報が excalidraw 往復で保持、zigzag が hatch として読める。
1975 全緑。
