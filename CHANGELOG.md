# Changelog

All notable changes to Board follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.12] — 2026-06-08

仕様書 §13 の「キーボードでの図形作成」ギャップ(a11y)を実装。

### Added
- **キーボードで図形を作成(Enter)** — 作成ツール(R/O/A/L/T/N/F)を選んでから Enter で
  viewport 中央に既定サイズの図形を作成(`createShapeKbd`)。rect/ellipse=120×80、
  line/arrow=水平 160、sticky=160²(色ランダム + テキストエディタ起動)、frame=800×500(連番ラベル)、
  text=テキストエディタ起動。作成は通常の `add` op なので完全に undo/redo 可能。
  pen/select/hand/eraser では no-op。canvas `aria-label` とヘルプグリッドに Enter / Tab を明記。
  これで「作成→巡回(v1.6.10)→移動(矢印)→編集」がポインタ無しで完結する。

### Tests
- **187/187 全通過** (+5): 各ツールの既定生成・可逆性・選択状態、text パス、
  非作成ツールの no-op、presence(`createShapeKbd`/Enter ハンドラ/aria-label/help grid)。

---

## [1.6.11] — 2026-06-08

仕様書 §13 の「空間索引(`pickTop` O(n))」ギャップを実装。

### Added
- **均一グリッド空間索引** (`_buildGrid` / `_queryGrid`) — 200 wu セルのグリッドを
  遅延構築し `Store._apply` / `_recordCommitted` でキャッシュを無効化。`pickTop` は
  shapes > 40 枚時に 3×3 近傍セルで候補を絞ってから `G.hit` で確定する(frames 2パス順序を維持)。
  大型 shape(8 セル超)は `big` リストで線形スキャン。
  最大許容 tol = 60 wu(min zoom 0.1 時) < セルサイズ 200 wu なので 3×3 近傍で完全。

### Tests
- **182/182 全通過** (+4): グリッド presence × 3、60-shape ボードでの grid/brute-force 一致、
  `Store.commit` 後にグリッドが無効化されること。

---

## [1.6.10] — 2026-06-06

仕様書 §13 の「キーボードでの図形巡回」ギャップ(a11y)を実装。

### Added
- **キーボードで図形を巡回(Tab / Shift+Tab)** — canvas にフォーカス時、Tab で z 順に選択を巡回
  (端で循環)。対象が画面外なら viewport を中央寄せ、説明文(`describeShape`)を `aria-live` の
  トースト領域に出してスクリーンリーダーが読み上げる。純粋ヘルパ `cycleSel()` / `describeShape()` /
  `centerOn()` を追加。canvas の `aria-label` に Tab 操作を明記。
- 既存トースト(undo/redo/export 等)も `#toasts` の `aria-live="polite"` 経由で SR 読み上げ対象に
  (副次的な a11y 改善)。

### Tests
- **178/178 全通過** (+5): `cycleSel` の前後巡回・端循環・未選択/未知 ID・空ボード、`describeShape` の
  整形、Tab ハンドラ/aria-live/aria-label の presence。

### Note
- 図形の**作成**は依然マウス操作が必要(キーボード作成は将来課題、§13)。

## [1.6.9] — 2026-06-06

仕様書(`docs/spec.md`)§13 の「テキスト自動折返し」ギャップを付箋(sticky)に実装。

### Added
- **付箋テキストの自動折返し** — sticky note のテキストが箱幅を超えると空白で word-wrap し、
  単語が長すぎる場合は文字単位で hard-break。描画は箱でクリップして溢れを防止。新しい純粋ヘルパ
  `wrapText(text, maxWidth, measure)` を canvas 描画(`ctx.measureText`)と SVG 出力(推定 measure)で
  共有し、表示とエクスポートを一致させた。テキスト shape は内容に追従して自動サイズするため対象外。

### Tests
- **173/173 全通過** (+4): `wrapText` の折返し/改行/長語の文字分割/幅 0 no-op/全行が幅に収まる、
  および sticky 描画・SVG 出力が `wrapText` を使う presence。

## [1.6.8] — 2026-06-06

仕様書(`docs/spec.md`)§13 の未充足ギャップから 2 件を実装(描画スケーラビリティ + intake 一貫性)。

### Added
- **ビューポートカリング** — `draw()` が可視ワールド矩形(`visibleWorldRect()`)の外にある shape を
  `inView()` で判定して描画スキップ。大規模/散在ボードで描画コスト(パス構築・stroke)を削減し、
  画面内に収まる場合は no-op。エクスポート/ヒットテスト/ミニマップは `state.shapes` を直接走査するため不変。

### Fixed
- **`Persist.load` が shape を未検証で採用** — IDB から読む shape を他の intake パス
  (importFromHash / snapshot)と同じ条件(`id`・`type`・数値 `z`)で検証してから採用。
  破損データや前方非互換スキーマの混入を防止。

### Tests
- **169/169 全通過** (+4): `inView` の画面内/遠方/部分重なり/横断線、カリング・load 検証の presence、
  および**依存ゼロの property-based 可逆性テスト** — seeded 乱数で add/move/upd/del/zorder/align を混在生成し、
  30 シナリオで「全適用→全 undo = 初期状態」「redo = 適用後状態」を検証(zorder 級の可逆性退行を網羅的に捕捉)。

## [1.6.7] — 2026-06-06

仕様書(`docs/spec.md`)を新規作成し、仕様 vs 実装の差分(不足)を洗い出して、確定した
セキュリティギャップ 2 件を実装。

### Fixed
- **[P1] SVG エクスポートの数値属性インジェクション** — 文字列の色/ラベル/dataUrl はエスケープ済みだったが、
  `x`/`y`/`w`/`h`/`x1`…/`size`/`fontSize` 等の**数値属性が生挿入**で、共有URL/sync 由来の文字列座標
  (例 `x='0"/><script>…'`)が書き出した SVG で markup を実行し得た。`buildSVG` の全座標/サイズを
  新ヘルパ `_num()`(有限数強制)で正規化し、属性ブレイクアウトを封鎖。
- **[P1] 受信 op のペイロード検証が `add` のみ** — `move`/`upd`/`del`/`zorder`/`align`/`group` 等の
  payload が未検証で、悪意/不具合 peer の `{op:'move',dx:{}}` 等が NaN で shape を破壊し得た。
  新関数 `validRemotePayload(op)` で各 forward-apply が参照するフィールドの型と move/z の**有限数**を
  検証し、不正 op を `applyRemote` で破棄。

### Added
- **`docs/spec.md`** — 正式仕様書(不変条件/データモデル/op 型/同期プロトコル/エクスポート安全性/
  セキュリティモデル + §13「適合ギャップ(不足)」)。

### Tests
- **165/165 全通過** (+4): SVG 数値属性のブレイクアウト不可、受信 `move`/`upd` の payload 拒否と
  正当 move の適用を behavioural で検証。

## [1.6.6] — 2026-06-04

リリース整備 + 可逆性・セキュリティ修正。

### Fixed
- **[P0] z 順序の undo が壊れていた問題を修正** — `doBringFront` / `doSendBack` は方向だけを記録した `zorder` op を積んでおり、undo すると元の位置に戻らず最背面へ送られていた。op を before/after の `{id,z}` + 配列順スナップショットに変更し、`_apply` が配列順と z を厳密に復元する (z が同値でも正しく復元)。これで完全な逆操作になった
- **[P0] `]` / `[` (一段前/後ろ) が undo 不可・非同期だった問題を修正** — `doBringForward` / `doSendBackward` は Store を介さず state を直接書き換えていたため、undo 履歴にも peer にも反映されなかった。共通の `_commitZ()` 経由で `zorder` op を記録するよう統一
- **[P1] SVG エクスポートの属性インジェクションを修正** — stroke / fill / color / label / dataUrl 等の属性値が未エスケープで、悪意ある色やラベル (共有 URL / sync 経由) が書き出した SVG を開いた際に markup を実行し得た。全属性値を `_esc` でエスケープし、画像は `data:image/` で始まるもののみ許可
- **[P1] PDF エクスポートのドキュメント名インジェクションを修正** — `document.write` に `state.docName` を直接埋め込んでいたため `_esc` を追加
- **[P1] 受信 op の型 allow-list を追加** — `Store.applyRemote` が任意の `op.op` を受理していた。許可された op 型のみ適用し、`add` は shape (id/type/z) を検証してから適用

### Changed
- **サイズ予算を gzip ベースに統一** — CI は raw 100KB、test は 125KB、README は 64KB とバラバラで、実ファイルは 100KB を超えており CI が常時 RED だった。ユーザーが実際にダウンロードする gzip サイズ (現状 ~37KB) を唯一の基準にし、CI・test・README を **gzip 44KB** に揃えた。raw は暴走検知用に 160KB の緩い上限のみ残置
- CI が `node test.mjs` を実行するように (従来はサイズ + syntax + grep のみでテストを走らせていなかった)
- バージョン表記を統一 (`<style>` / ヘッダコメントの "v1.0" → v1.6、`V='1.6.6'`)

### Performance
- `getCSS()` をメモ化 — 毎フレーム・shape 毎に走っていた `getComputedStyle` 呼び出しを排除。テーマ / forced-colors / contrast 切替時のみキャッシュを破棄

### Accessibility
- リサイズ / 選択ハンドルの枠線を `--brand-ink` (#003B40) に変更し、ライトモードで AAA の非テキストコントラスト (3:1+) を確保

### Tests
- **161/161 全通過** (150→161): zorder undo の往復、`doBringForward`/`doSendBackward` の undo 可能性、受信 op の型拒否、SVG 属性エスケープの behavioural テストを追加。`exportSVG` の文字列生成をテスト可能な純関数 `buildSVG()` に分離

### Docs
- README を実機能 (v1.6: フレーム / プレゼンモード / グループ / リサイズ / ミニマップ / フォーマットペインター / PDF・SVG 出力 / 画像インポート / 付箋 / 整列 / z 順序 / sync) に更新、サイズバッジを修正
- CHANGELOG の順序を semver 降順に修正し、重複エントリを統合 (1.5.0 ×3 と誤った位置の 1.1.1)

## [1.6.5] — 2026-05-30

### Tests
- **フォーマットペインターの behavioural テスト追加** (139→150): copyStyle→pasteStyle で stroke/fill/size/opacity の全プロパティ転写を検証、undo 復元、空選択 no-op を確認。従来は presence チェックのみだった
- copyStyle のスタイル捕捉、pasteStyle の undefined キー除去、applyStyleToSelection の undo 記録を presence テストで保証

## [1.6.4] — 2026-05-29

### Fixed
- **プレゼンテーション中のキャンバス編集を防止**: pointerdown に `Presentation.isActive()` ガードを追加。プレゼン中の誤クリックで shape を移動・選択できた問題を解消
- **トーストの i18n 完全対応**: copyStyle/pasteStyle/group/ungroup/frame の全トーストを I18N キー化 (従来は日本語ハードコード)

### Added
- **フレーム移動時の内部 shape 追従**: フレームをドラッグすると、完全に内包される shape も一緒に移動 (Miro/FigJam と同等の挙動)

### Tests
- **139/139 全通過** (frame containment + pickTop priority behavioural tests)

## [1.6.3] — 2026-05-29

### Added
- **アクセシビリティ強化 (WCAG 2.2)**: canvas に `role="application"` + 詳細な `aria-label` (キーボード操作の説明) + `tabindex=0`
- **forced-colors モード対応**: Windows ハイコントラストモードで枠線・選択状態を明示
- **prefers-contrast: more 対応**: 高コントラスト設定時に line/ink を純黒/純白に
- **opacity スライダー**: style panel に不透明度コントロール (10-100%、選択 shape に即時適用)

### Fixed
- **undo/redo の致命的バグ修正**: `_apply` が `group`/`ungroup`/`zorder`/`align` op を処理していなかった問題を解消

### Tests
- **131/131 全通過**

## [1.6.0] — 2026-05-23

Phase 1.6 — Frames + Presentation Mode (100点機能)。

### Added
- **フレームツール (F キー)** — 矩形フレームをドラッグして作成。`frame` shape type。ラベル付き (自動番号付け: "Frame 1", "Frame 2"…)。ブランドカラーの細線枠 + 半透明背景で内部 shape を隠さない。Frames は常に最下層に描画 (他の shapes の背景として機能)
- **プレゼンテーションモード (P キー / Present ボタン)** — フレームを左→右順に全画面で表示。`←/→/Space` でナビゲーション。`Esc` で終了。フレーム番号カウンター表示 (X / N)。UI クロム (ツールバー・ステータスバー) を自動非表示
- **ボード名のインライン編集** — topbar の input に直接入力、IDB に即時永続化
- **Ctrl+Enter** → プレゼンモード
- SVG エクスポートに frame case 追加 (ラベル付き SVG rect)
- Minimap に frame 描画

### Architecture
- `Presentation` IIFE — `enter()` / `leave()` / `next()` / `prev()` / `isActive()`
- フレーム順序: `x` 座標昇順 → `y` 座標昇順 (左→右、次に上→下)
- overlay div (pointer-events:none) でキャンバス操作を維持しつつ UI chrome を隠す

### Tests
- **114/114 全通過** (+6 新規 presence checks)

## [1.5.0] — 2026-05-16

Phase 1.5 — resize handles + shape groups. これで基本 whiteboard 操作が完結。

### Added
- **Shape resize handles** — 単一選択時に 8 ハンドル (nw/n/ne/w/e/sw/s/se) 表示。ドラッグでリサイズ。line/arrow は端点 (p1/p2) をドラッグ。pointerup で `upd` op として undo 可能。ホバー時にカーソル変化 (nwse-resize 等)
- **Shape groups** (`Ctrl+G` / `Ctrl+Shift+G`) — 複数 shape をグループ化。クリックでグループ全体を選択。グループ境界を薄い点線で可視化。Undo 可能
- **`getHandles(s)`** — shape 種別に応じてハンドル座標を返すヘルパー
- **`applyResize(sh, handle, orig, wp)`** — handle ID と world 座標からリサイズ適用
- **`handleCursor(id)`** — handle に対応する CSS cursor 名を返す
- **`doGroup()` / `doUngroup()`** — groupId の付与/除去 + undo
- コンテキストメニュー: Group / Ungroup 追加

### Tests
- **108/108 全通過** (resize/group presence checks + behavioural tests +18)

## [1.4.0] — 2026-05-23

Phase 1.4 — minimap, format painter, PDF export.

### Added
- **ミニマップ** — 右下固定パネル、全 shape を縮小レンダリング、viewport 矩形 (点線) 表示、クリックでその位置にジャンプ。`Minimap.schedule()` で `invalidate()` と同期
- **フォーマットペインター** (`Alt+C` / `Alt+V`) — 選択 shape の stroke/fill/size/opacity をコピーし、他の shape に適用。コンテキストメニューにも表示
- **PDF エクスポート** (`Ctrl+P`) — OffscreenCanvas で全 shape を高解像度レンダリング → blob → 新規ウィンドウで `window.print()` → ブラウザの「PDF として保存」で完結

### Tests
- **90/90 全通過** (minimap / format painter / PDF presence checks + seenOps bounded)
- サイズ予算を 115KB に更新 (機能追加に伴う)

## [1.3.0] — 2026-05-13

Phase 1.3 — grid snap, z-order, alignment.

### Added
- **グリッドスナップ** (`Shift+G` でトグル) — shape 作成・移動全操作に適用。20px グリッドにスナップ。`snapV()` / `snapPt()` ヘルパー
- **Z-order 操作** — `]` 前面へ / `[` 背面へ / `Shift+]` 最前面 / `Shift+[` 最背面。コンテキストメニューにも表示
- **整列 (Align)** — 複数選択時にコンテキストメニューから: 左/右/上/下揃え、左右中央/上下中央、水平/垂直均等配置 (`doAlign()`)
- `doBringForward()` / `doSendBackward()` — 1段階移動を追加 (既存の最前面/最背面に加え)
- ヘルプグリッドに `]/[` `Snap` ショートカット追記

### Tests
- **79/79 全通過** (z-order / align / snap behavioural tests +8)

## [1.2.0] — 2026-05-11

Phase 1.2 — image import, SVG export, sticky notes.

### Added
- **画像インポート** — ドラッグ&ドロップ + クリップボードペースト (`Ctrl+V`)。data URI 保存、400px 自動リサイズ、複数ファイル同時 drop 対応、Image オブジェクトキャッシュ (`_imgCache`)
- **SVG エクスポート** (`Ctrl+Shift+E`) — 全 shape 型 (pen→path, rect, ellipse, line, arrow+polygon, text+tspan, image+href, sticky) をベクター形式で出力。HTML-entity escape で XSS 安全
- **付箋 (Sticky notes, `N` キー)** — 6色ランダム、ドラッグで任意サイズ、ワンクリックでデフォルト 160×160px、作成直後テキスト編集開始、ダブルクリック再編集可、SVG/PNG エクスポート対応

### Architecture
- Image cache: `_imgCache` Map で data URL → Image object キャッシュ、decode 1回のみ
- SVG: `_esc()` で & < > " を HTML entity に変換
- Sticky notes: `STICKY_COLORS` 配列 6色、`beginRectLike` 分岐で `color` / `text` / `fontSize` 付加

## [1.1.1] — 2026-05-06

### Fixed
- **[CRITICAL] PNG export was blank** — `const ctx` and `window.ctx` are separate bindings; draw functions used the module-scope `ctx` while exportPNG swapped `window.ctx`. Changed to `let ctx` and swap directly. Export now renders correctly.
- **Remote op validation** — `_onRecv` now rejects messages without valid `op.op` (string) and `op.clock` (peer+seq). Prevents state corruption from malformed BroadcastChannel/WebRTC messages.
- **Share import shape validation** — `importFromHash` filters shapes requiring `id`, `type`, `z`. Rejects URL payloads with missing fields that would crash the renderer.
- **Snapshot validation** — `_applySnapshot` validates shape structure before adopting.
- **`toBlob` null guard** — handles tainted canvas / export failure gracefully.

### Tests
- **45/45** (unchanged — existing tests already covered the fixed code paths at the API level)

## [1.1.0] — 2026-05-05

Real-time sync, sharing, and mobile improvements.

### Added
- **BroadcastChannel sync** — same-browser tabs auto-sync via op broadcast
- **URL hash share** — deflate + base64 encoded board snapshot in URL fragment
- **WebRTC manual signaling** — cross-machine P2P (invite/answer code copy-paste, no server)
- **CRDT clock** — `{peer, seq, ts}` stamp on every op, dedup by `peer:seq`
- **Store.applyRemote** — idempotent remote op application (does not enter local undo)
- **Peer presence** — avatar badges in topbar, heartbeat ping/pong, stale peer reaping
- **Share modal** — URL copy + WebRTC handshake UI
- **Arrow key nudge** — move selection 1px (Shift: 10px)
- **Pinch zoom** — multi-touch 2-finger zoom on mobile/trackpad
- **`Ctrl+Shift+S`** shortcut for Share

### Fixed
- Version display now dynamic (`v` + V constant, not hardcoded "v1.0")

### Architecture
- Net layer (~200 lines): BroadcastChannel + WebRTC DataChannel
- Share layer (~80 lines): CompressionStream + base64
- PEER_ID persisted in localStorage
- 83KB total (100KB budget)

## [1.0.0] — 2026-04-24

Initial public release. Single-file infinite whiteboard.

### Added
- 7 tools: select, pan (hand), pen, rectangle, ellipse, arrow, line, text, eraser
- Infinite world canvas with pan/zoom (0.1x–16x), DPR-aware rendering
- Undo/Redo stack up to 500 ops (Command pattern, op-log)
- Marquee selection + shift-click additive selection
- Clipboard-like ops: copy / paste / cut / duplicate
- Z-order: bring-to-front / send-to-back
- Grid toggle (G) with zoom-aware density fade
- Axis-constrain with Shift (square / circle / 45° snap)
- Style panel: 7 stroke colors, 7 fills (with `null`), size 1–32
- Applying style to selection records undo-able op
- Context menu (right-click)
- IndexedDB auto-save (500ms debounce) + manual Ctrl/Cmd+S
- PNG export with 2x scale, auto-crop to content + 32px padding
- PWA: inline manifest + inline service worker (offline-first)
- i18n: Japanese / English auto-detect
- WCAG AAA color contrast, full keyboard navigation, ARIA labels
- `prefers-color-scheme` light/dark support
- `prefers-reduced-motion` respected

### Architecture
- Single-file, zero external dependencies
- Clean layered architecture (Input → Tools → Store → State → Render → Persist)
- ~64KB total, ~41KB JS

[1.0.0]: https://github.com/shizukutanaka/Board/releases/tag/v1.0.0
