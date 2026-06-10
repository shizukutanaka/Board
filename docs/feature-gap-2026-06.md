# Feature-Gap Audit — 2026-06

Board v1.6.56 の長所・短所・欠落機能を洗い出し、優先度を付けた監査。
コードを直接走査して確認した事実ベース（推測ではない）。

## 長所 (Strengths)

- **ゼロ摩擦**: 単一 HTML、登録不要、完全無料、`file://` で動作。勝利条件を満たす。
- **小ささ**: gzip 45,032B（44KB 予算内）。競合は数百 KB〜数 MB。
- **完全可逆な op-log**: `add/del/upd/move/clear/group/ungroup/zorder/style/align` の
  全 op が `_apply(op,false)` で逆操作可能。property-based テストで往復を検証済み。
- **オフライン**: インライン Service Worker + IndexedDB 自動保存。
- **同期**: BroadcastChannel（タブ間）+ WebRTC DataChannel（端末間）、CRDT clock、
  受信 op は型 allow-list + payload 検証で防御。
- **アクセシビリティ**: 全機能キーボード操作可、WCAG AAA コントラスト、
  `prefers-reduced-motion` / `prefers-color-scheme` 対応、ja/en 自動検出。
- **出力**: PNG（2x）/ SVG（属性エスケープ済み）/ PDF。
- **11 ツール / 9 シェイプ型**: pen, rect, ellipse, line, arrow, text, sticky, frame, image。
- **テスト網**: presence + behavioural + property-based、446 アサーション。

## 短所 (Weaknesses)

- **gzip 予算が常に逼迫**: 機能追加のたびに数十バイト単位の綱渡り。
  教訓: 反復文字列は gzip でほぼ無料、ユニークなトークン（コメント・新規文字列）が高コスト。
- **単一ボード**: ページ / ボードの切替が無く、大きな作業を分割できない。
- **コネクタが静的**: arrow はシェイプに束縛されず、移動に追従しない（図解作成で不便）。
- **rect/ellipse にラベル不可**: テキストは text/sticky/frame のみ。
  矩形に文字を入れる定番操作（ダブルクリックで中央テキスト）ができない。
- **回転・反転なし**: `rotate` / `flip` op が無い。
- **ロックなし**: 誤操作防止のシェイプロックが無い。

## 欠落機能 (Missing) と優先度

| 機能 | 状態 | 価値 | 実装コスト | 優先 |
|---|---|---|---|---|
| カスタムカラーピッカー | **実装済み v1.6.56** | 高 | 小 | ✅ |
| シェイプ反転 (flip H/V) | **実装済み v1.6.57** | 中 | 小 | ✅ |
| rect/ellipse の中央ラベル | 欠落 | 高 | 中 | P1 |
| シェイプロック (locked) | 欠落 | 中 | 中 | P2 |
| コネクタ束縛 (移動追従) | 欠落 | 高 | 大 | P2 |
| マルチページ / 複数ボード | 欠落 | 高 | 大 | P3 |
| レーザーポインタ (プレゼン) | 欠落 | 中 | 小 | P2 |
| シェイプ検索 | 欠落 | 低 | 中 | P3 |
| レイヤーパネル | 欠落 | 低 | 大 | P3 |
| 回転 (rotate) | 欠落 | 中 | 大 | P3 |

## 実装メモ — gzip 予算の知見

55+ バージョンを経て本体は高度に最適化済み。バイト削減で確認した事実:

- **反復文字列の再ファクタは逆効果**: 同一の `querySelectorAll(...).setAttribute('aria-pressed',...)`
  ループや同一インライン style の `<div>` は gzip がほぼ完全に圧縮する。ヘルパー関数や
  クラスへの抽出は「ユニークな定義」を増やし、かえって増量した（実測で +5〜+33B）。
- **冗長コメントが最安の削減源**: 設計根拠が `docs/` に重複している長文コメントの簡潔化が
  最も確実にバイトを取り戻せる（zorder コメント簡潔化で gzip -77B）。
- **back-reference は無料**: aria-label と同値の title、既出の hex 値（`#2563EB` 等）は
  gzip が後方参照に畳むため、削っても gzip サイズはほぼ変わらない。

次の機能追加（P1: 中央ラベル / flip）も、ユニーク文字列を最小化し、
必要なら重複コメントを 1 ブロック簡潔化して予算内に収める方針。
