# ADR-0068: 曲線コネクタ (quadratic bezier)

## 状態

採用 (v1.7.126)

## 背景

ルーティングは直線 (既定) と elbow (ADR-0062) の2種。draw.io/Excalidraw
の第3スタイル **curve** が欠けており、有機的な図 (マインドマップ、
概念図) で直線が硬すぎる。

## 決定

- 新フラグ `s.curve` (0/absent = off)。`elbow` とは排他 — `toggleCurve`/
  `toggleElbow` が片方を立てるとき他方を落とす (style op の1エントリに
  elbow+curve 両 prop を乗せるので undo・wclock は既存経路)。
- 経路は**二次ベジエ**: `p1→p2`、制御点 `c = mid + n*bend`、
  `n` は p1→p2 方向の左法線、`bend = min(0.25*len, 80)`。
  結合端は `connEnds` 済みの端点 — 図形輪郭 (ADR-0067) にそのまま接続。
- 矢印ヘッドは t=1 の接線 `atan2(p2-c)`、始端ヘッド (ADR-0063) は
  t=0 接線の逆。`_arrowHeadShape` を再利用。
- ヒットは曲線を16分割して線分距離 (elbow と同じ近似方針)。
- ラベルアンカーは `t=0.5` のベジエ中点 (`_curveLabelXY`)。
- SVG は `<path d="M x1 y1 Q cx cy x2 y2">`、minimap も `quadraticCurveTo`。
- ctx メニュー `ctxCurve` — elbow と同じゲート (unlocked line/arrow)。

## 断念した代替案

- **三次ベジエ / 手動 bend 点**: draw.io の waypoint 編集は別機能として
  大きい — 自動曲率の二次ベジエで MVP 相当の効果。
- **elbow を enum 化** (`route:'straight'|'elbow'|'curve'`): 既存
  `s.elbow` フラグ・style op・旧データ互換を壊す — bool 対で排他制御。
- **両端の入射方向を制御**: 結合先の辺法線に沿った stub は elbow の
  役割 — 曲線は滑らかさ優先。

## 影響

- ctx メニュー「曲線」で直線コネクタを曲線化 (elbow と排他トグル)。
- `s.curve` は新 prop — 旧版 Board は無視 (直線として描画)。
- style op 経由で undo・LWW 同期は既存動作。
