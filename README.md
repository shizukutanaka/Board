# Board

**Offline-first infinite whiteboard. Zero install. Zero sign-up. Zero ads.**
単一HTMLファイル。ダブルクリックで動く。アカウント不要。広告なし。

[![License: MIT](https://img.shields.io/badge/License-MIT-00C4CC.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.7.27-00C4CC.svg)](CHANGELOG.md)
[![Size](https://img.shields.io/badge/size-~61KB%20gzip-00C4CC.svg)](index.html)
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
| サイズ | 数MB | ~1MB | ~2MB | **単一HTML ~61KB gzip** |
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
- ストローク色 7 + カスタムカラー / 塗り 7 + カスタムカラー / 太さ 1–32 / 不透明度 10–100% / 線種 (実線・破線・点線)
- ネイティブカラーピッカー (任意の 24bit 色をストローク・塗りに指定可)
- グリッド表示 + グリッドスナップ (⇧G)、サブピクセル描画
- 軸拘束 (Shift で直角・45°スナップ、正方形・正円)
- 画像インポート (ドラッグ&ドロップ / クリップボード貼付、4MB まで)

### 編集
- マーキー選択、Shift+クリックで加算選択
- ドラッグ移動、キーボード移動、8 ハンドルでリサイズ (line/arrow は端点、回転シェイプも対応)。
  リサイズ中は近傍シェイプの辺/中心へオブジェクトスナップ、角ハンドル + Shift で縦横比を保持、
  Alt で中心固定リサイズ
- グループ化 / 解除 (Ctrl+G / Ctrl+Shift+G)
- 整列 (左右上下・中央・均等配置)、z 順序操作 (前面 / 背面 / 一段前後)
- 左右反転 / 上下反転 (⇧H / ⇧V、選択 bbox 中心でミラー、可逆)
- rect / ellipse の中央ラベル (ダブルクリックで編集、フローチャート向け)
- 付箋・テキストの日本語折り返しに禁則処理 (JIS X 4051: 行頭の句読点・閉じ括弧をぶら下げ、
  行末の開き括弧を追い出し)。描画・自動高さ・SVG 出力すべてに適用
- シェイプロック (右クリック → ロック、誤操作防止。移動・リサイズ・削除・消去すべて不可、可逆)
- バインドコネクタ (矢印/直線の端点をシェイプに束縛、移動に追従 — フロー図向け)
- コネクタ(エッジ)ラベル (矢印/直線をダブルクリック → 中点にラベル、判断分岐の "yes"/"no" 等。
  canvas/SVG パリティ、`upd` op で可逆・同期対応 — ADR-0003)
- 回転 (`,`/`.` で 15° 単位 CCW/CW、または上辺の回転ノブをドラッグ [Shift で 15° スナップ]、
  矩形・楕円・付箋・テキスト・画像・フレーム、複数選択は群中心で公転、SVG/ミニマップ/コネクタ
  追従も対応、undo/redo 可逆)
- シェイプ検索 (Ctrl+F でラベル・テキスト・型名を検索、マッチをオレンジ枠ハイライト)
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
- レーザーポインタ (発表中、ポインタ位置に赤い発光ドットを追従表示)
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
- iOS ノッチ / ホームインジケータのセーフエリア対応 (`viewport-fit=cover` + `env(safe-area-inset-*)`)

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
| `N` | 付箋 | `⌘E` | PNG出力 |
| `F` | フレーム | `⌘⇧E` | SVG出力 |
| `E` | 消しゴム | `⌘S` | 即時保存 |
| `G` | グリッド切替 | `⌘F` | 検索 |
| `Tab` | 図形を巡回 | `⇧Tab` | 逆順に巡回 |
| `⇧H` | 左右反転 | `⇧V` | 上下反転 |
| `,` / `.` | 回転 ±15° | `⌘G` / `⌘⇧G` | グループ / グループ解除 |
| `Enter` | 中央に作成 | `⌥C` / `⌥V` | スタイル複製 / 適用 |
| `↑↓←→` | 移動 (⇧:10px) | `⌥↑↓←→` | リサイズ (⇧:×10) |
| `Esc` | 選択解除 | `?` | ヘルプ |

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
- サイズはハード上限なし (2026-06-13 に gzip 44KB 予算を撤去)。指針として小さく保つが、
  整合性・正しさを優先してよい。暴走防止に raw 512KB の緩い上限のみ残す (現状 ~61KB gzip)
- `node test.mjs` を通すこと (CI が presence + behavioural テストを実行)

## ライセンス / License

MIT. 商用利用可、改変可、再配布可。

## クレジット / Credits

設計方針: John Carmack (performance-first) · Robert C. Martin (clean architecture) · Rob Pike (simplicity)。

競合の優れた点から学んだ: Excalidraw (E2E, no sign-up), tldraw (infinite canvas SDK), Miro (collaboration UX)。

Board はそれらを複雑さなしで実現することを目指す。
