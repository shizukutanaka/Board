# ADR-0800: Sync architecture.md to the ADR-0795–0799 bounds cluster

- Status: Accepted (2026-09-28, v1.7.826) — docs-only

## Decision

architecture.md の wire-bounds 節に 0795–0799 の結論規則を追記:

- **viewport 中心は常に座標ドメイン内** — 採用値は `_vpOK`/`_xyOK` で
  ゲート、全ライブ書き込み (パン3経路・zoomAt・centerOn・fitViewport)
  は `_xC` を通る。中心が外に出ると描く図形が全てピア棄却 → 発散。
- **ローカル取込も wire 上限に揃える** — パーサ出力は `validShape`、
  テキストエディタは `maxLength=5000` (生産側で上限を守る parity)。
