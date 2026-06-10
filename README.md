# Board

**Offline-first infinite whiteboard. Zero install. Zero sign-up. Zero ads.**
単一HTMLファイル。ダブルクリックで動く。アカウント不要。広告なし。

[![License: MIT](https://img.shields.io/badge/License-MIT-00C4CC.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.6.40-00C4CC.svg)](CHANGELOG.md)
[![Size](https://img.shields.io/badge/size-~44KB%20gzip-00C4CC.svg)](index.html)
[![Offline](https://img.shields.io/badge/offline-first-00C4CC.svg)](#offline)
[![A11y](https://img.shields.io/badge/WCAG-AAA-00C4CC.svg)](#accessibility)

---

## なぜ Board か / Why Board

既存のホワイトボードはどれも何かを諦めている。

| | Miro | Excalidraw | tldraw | **Board** |
|---|---|---|---|---|
| 登録不要 | ✗ | ✓ | ✓ | **✓** |
| 単一ファイル配布 | ✗ | ✗ | ✗ | **✓** |
| E2E 暗号化 (予定) | ✗ | 部分 | ✗ | **URL fragment key** |
| 完全オフライン | 部分 | ✓ | ✓ | **✓ PWA** |
| サイズ | 数MB | ~1MB | ~2MB | **単一HTML ~44KB gzip** |
| 広告・トラッキング | あり | なし | なし | **ゼロ** |
| 料金 | $10-16/月 | 無料 + Plus | SDK商用有料 | **完全無料** |

Board は `index.html` 一枚。自分のドメイン、USB、社内ネット、オフライン PC — どこでも動く。

## 使い方 / Quick Start

```bash
# 1. ダウンロード
curl -O https://raw.githubusercontent.com/shizukutanaka/Board/main/index.html

# 2. 開く (サーバー不要)
open index.html       # macOS
xdg-open index.html   # Linux
start index.html      # Windows
```

ブラウザに `file://` でも、任意の静的ホスティング (GitHub Pages / Cloudflare Pages / S3 / Netlify) でも動作。

## 機能 / Features (v1.6)

### 描画
- ペン (手描き、筆圧・速度連動の可変線幅) / 矩形 / 楕円 / 直線 / 矢印 / テキスト / 消しゴム / 付箋 (Sticky) / フレーム (Frame)
- 無限キャンバス、パン & ズーム (0.1x–16x)、ピンチズーム
- ストローク色 7 / 塗り 7 / 太さ 1–32 / 不透明度 10–100% / 線種 (実線・破線・点線)
- グリッド表示 + グリッドスナップ (⇧G)、サブピクセル描画
- 軸拘束 (Shift で直角・45°スナップ、正方形・正円)
- 画像インポート (ドラッグ&ドロップ / クリップボード貼付、4MB まで)

### 編集
- マーキー選択、Shift+クリックで加算選択
- ドラッグ移動、キーボード移動、8 ハンドルでリサイズ (line/arrow は端点)
- グループ化 / 解除 (Ctrl+G / Ctrl+Shift+G)
- 整列 (左右上下・中央・均等配置)、z 順序操作 (前面 / 背面 / 一段前後)
- スマート整列ガイド (移動時に他図形の辺・中心へスナップ、ガイド線表示 — Excalidraw 風)
- フォーマットペインター (Alt+C / Alt+V でスタイル転写)
- Undo/Redo 最大 500 段 — **全 op が完全可逆** (z 順序・グループ・整列も含む)
- コピー / ペースト / 切り取り / 複製 (Ctrl+C/V/X/D)
- 削除 (Del/Backspace)、全選択 (Ctrl+A)、右クリックコンテキストメニュー

### コラボレーション / Sync
- 同一ブラウザのタブ間: BroadcastChannel で即時同期
- 端末間: WebRTC DataChannel (手動シグナリング、サーバー不要)
- URL ハッシュにスナップショットを載せて共有 (`#...`)
- CRDT clock 付き op-log、受信 op は型 allow-list で検証

### プレゼンテーション
- フレームを左→右順に全画面表示 (⇧P / Ctrl+Enter)、←/→/Space でナビゲート
- ミニマップ (右下、クリックでジャンプ)

### 永続化
- IndexedDB 自動保存 (500ms デバウンス)、リロード後も状態復元
- ドキュメント名編集可

### 出力
- PNG エクスポート (2x 解像度、可視領域自動クロップ、32px パディング)
- SVG エクスポート (ベクター、属性は全てエスケープ済みで安全)
- PDF エクスポート (ブラウザ印刷経由)

### PWA / オフライン
- インラインマニフェスト + Service Worker
- 初回ロード後、完全オフライン動作
- ホーム画面追加可 (モバイル)

### アクセシビリティ
- 全機能キーボード操作可能
- ARIA ラベル完備
- WCAG AAA カラーコントラスト (テキスト 18:1+)
- `prefers-reduced-motion` / `prefers-color-scheme` 対応
- 日本語・英語自動検出 (`navigator.language`)

## キーボード / Shortcuts

| キー | 動作 | キー | 動作 |
|---|---|---|---|
| `V` | 選択 | `⌘Z` | 戻す |
| `H` / `Space` | パン | `⌘⇧Z` | 進む |
| `P` | ペン | `⌘A` | 全選択 |
| `R` | 矩形 | `⌘C/V/X` | コピー/貼付/切取 |
| `O` | 楕円 | `⌘D` | 複製 |
| `A` | 矢印 | `⌫` | 削除 |
| `L` | 直線 | `⌘+/−/0` | ズーム |
| `T` | テキスト | `⇧1` | フィット |
| `E` | 消しゴム | `⌘E` | PNG出力 |
| `G` | グリッド切替 | `⌘S` | 即時保存 |
| `Tab` | 図形を巡回 | `⇧Tab` | 逆順に巡回 |
| `Enter` | 中央に作成 | `?` | ヘルプ |
| `Esc` | 選択解除 | | |

## アーキテクチャ / Architecture

単一HTML、外部依存ゼロ、Clean Architecture:

```
  Input (pointer/keyboard/wheel)
    ↓
  Tools (pen/shape/select/eraser/text/hand)
    ↓
  Store (op-log, undo/redo = Command pattern)
    ↓
  State (single source of truth)
    ↓
  Render (RAF loop, Canvas2D, world↔screen transform)
    ↓
  Persist (IndexedDB, debounced 500ms)
```

### 設計哲学

- **Carmack**: RAF 単一ループ、DPR 対応、spatial tolerance による hit test、必要最小限の invalidate
- **Martin**: 層分離。Render は State を読むのみ、State 変更は Store 経由のみ
- **Pike**: 単一HTML、小さな API、op-log が唯一の真実 (sync 拡張容易)

### op-log 型

```js
{op:'add', shape}                      // 追加
{op:'del', shapes:[...]}               // 削除
{op:'upd', id, before, after}          // 汎用変更
{op:'move', ids:[...], dx, dy}         // 平行移動
{op:'z', id, from, to}                 // 配列順の移動
{op:'zorder', before:[...], after:[...]} // z順序 (前面/背面/一段前後) — {id,z} スナップショット
{op:'group', ids, gid} / {op:'ungroup', ids, gids}  // グループ
{op:'align', before:[...], after:[...]}  // 整列
{op:'clear', shapes:[...]}             // 全消去
```

各 op が **可逆**。`_apply(op, forward)` で `forward=false` を渡せば完全に逆操作できる
(z 順序やグループ・整列も含め、テストで往復を検証)。これが Phase 2 の CRDT ベースになる。

## ロードマップ / Roadmap

| Version | 内容 | 到達度 |
|---|---|---|
| v1.0 | MVP: 7tools / undo / IDB / PNG / PWA / i18n ja-en / WCAG AAA | ✅ 70点 |
| v1.1 | P2P sync (WebRTC DataChannel + BroadcastChannel + CRDT clock) | ✅ 80 |
| v1.2 | SVG/PDF export, 画像インポート (drag-drop / paste), 付箋 | ✅ 87 |
| v1.3 | グリッドスナップ, z 順序, 整列 | ✅ |
| v1.4 | ミニマップ, フォーマットペインター, PDF | ✅ |
| v1.5 | リサイズハンドル, グループ | ✅ |
| **v1.6** (now) | フレーム + プレゼンモード, 不透明度, a11y 強化 (WCAG 2.2) | ✅ **92点** |
| v1.7+ | 量子化なし: マルチページ, レーザーポインタ, スレッドコメント | 96 |
| v2.0 | Plugin API, Figma import, A11y 外部監査通過, 1000言語 (MT infra) | **100点** |

## セキュリティ / Security

- CSP 相当 (外部リソースロードなし)、`innerHTML =` を一切使用しない (CI が grep で強制)
- XSS 耐性: SVG / PDF エクスポートの属性値も全て `_esc` でエスケープ、画像は `data:image/` のみ許可
- 受信 op は型 allow-list + shape 検証で防御 (不正な peer からの破損を防ぐ)
- ローカル保存のみ。同期は手動シグナリングの WebRTC / 同一オリジンの BroadcastChannel

将来 (P2P sync 強化時):
- URL fragment (`#roomId:key`) = サーバー非通過
- WebRTC DataChannel + AES-GCM E2E 暗号化 (DTLS トランスポート)
- 署名付き op-log (各 peer の公開鍵で検証)

## 開発 / Development

```bash
git clone https://github.com/shizukutanaka/Board
cd Board
# 開発サーバー不要。ブラウザで index.html を開くだけ。
# Live Server 等を使う場合:
npx serve .
```

### 貢献

- Issue / PR 歓迎
- 外部依存の追加は慎重に (単一ファイル原則 — 外部 `<script src>` / `<link href>` は不可)
- サイズ予算は **gzip 44KB 未満** (CI が `gzip -9` で計測。現状 ~44KB)
- `node test.mjs` を通すこと (CI が presence + behavioural テストを実行)

## ライセンス / License

MIT. 商用利用可、改変可、再配布可。

## クレジット / Credits

設計方針: John Carmack (performance-first) · Robert C. Martin (clean architecture) · Rob Pike (simplicity)。

競合の優れた点から学んだ: Excalidraw (E2E, no sign-up), tldraw (infinite canvas SDK), Miro (collaboration UX)。

Board はそれらを複雑さなしで実現することを目指す。
