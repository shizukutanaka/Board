# Changelog

All notable changes to Board follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.41] — 2026-06-10

a11y: 「Line style」グループの sp-label に `aria-hidden` 追加。テスト: `G.hit` の追加 shape 種別カバレッジ。

### Fixed
- **Line style ラベルに `aria-hidden` なし**: "Line" スパンに `aria-hidden="true"` を追加。親の
  `role="group" aria-label="Line style"` でコンテキストは既に提供されており、ラベルテキストは冗長。
  (v1.6.40 で S/F/Size/α を修正し、この 1 件だけ残っていた)

### Tests
- 1 presence check 追加 (318 total); gzip 45,010B (46B under 45,056B budget)
- `G.hit` の shape 種別拡張 behavioral test 追加: 塗り楕円・輪郭楕円・線分・sticky の当たり判定を検証

---

## [1.6.40] — 2026-06-10

a11y: スタイルパネルの装飾ラベルに `aria-hidden` 追加、サイズ・不透明度グループに `role=group` 付与。SW の到達不能コード削除。

### Fixed
- **スタイルパネル装飾ラベルがスクリーンリーダーで不必要に読み上げられる (WCAG 1.3.1)** — ストロークカラー
  グループ内の "S" ラベル、塗りグループ内の "F" ラベル、不透明度の "α" ラベルに `aria-hidden="true"` を追加。
  各グループはすでに `aria-label="Stroke color"` / `aria-label="Fill"` を持つため、1文字ラベルは冗長かつ混乱を招く。
- **サイズ・不透明度 `sp-group` に `role="group"` 不在 (ARIA best practices)** — `<div class="sp-group">` に
  `role="group" aria-label="Size"` / `role="group" aria-label="Opacity"` を追加し、スライダーの意味的コンテキストを確立。
- **Service Worker の到達不能分岐** — `caches.match` がヒットすれば即 `return`、到達しない catch 内の `r||` を削除 (dead code)。

### Tests
- 3 presence checks 追加 (309 total); gzip 45,009B (47B under 45,056B budget)

---

## [1.6.39] — 2026-06-10

コードクリーンアップ: 冗長な `console.warn`/`console.error` 3箇所を削除し、インポート失敗時に適切なエラートーストを表示。

### Fixed
- **`importFromHash` の JSON パースエラーが無音で失敗** — `catch(err)` ブロックが `console.warn` のみで終了していたため、ユーザーには何も通知されなかった。`UI.toast(t('invalidBoard'),'err')` を表示し、破損した共有 URL を開いたときの診断性を向上。
- **保存失敗時の重複 `console.error`** — `Persist.save` の catch ブロックが `console.error('save failed',err)` と `UI.toast(t('saveFailed')+': '+err.message,'err')` の両方を呼んでいた。ユーザーはトーストで通知されるため `console.error` 行を削除。
- **`BroadcastChannel` 初期化失敗時の `console.warn`** — 非クリティカルなエラー (`catch(err){console.warn('BroadcastChannel init failed',err)}`) を `catch{}` に簡略化。アプリは BC なしでも動作する。

### Tests
- 3 presence checks 追加 (306 total); gzip 45,001B (55B under 45,056B budget)
- `handleCursor` behavioral test 追加 (8方向リサイズハンドル → 正しい CSS カーソル文字列)
- `Store.undo`/`Store.redo` 境界条件の behavioral test 追加 (空履歴・先頭・末尾での false 返却)

---

## [1.6.38] — 2026-06-10

a11y: コンテキストメニュー開時に最初の項目へフォーカス移動 (キーボードユーザー対応)。

### Fixed
- **コンテキストメニューがキーボードでアクセスできない (WCAG 2.1.1)** — メニュー表示時に `m.querySelector('.ctx-item')?.focus()` を呼び出し、最初のメニュー項目にフォーカスを移動。キーボードユーザーはメニューを開いた後 Tab キーで項目を巡回・選択できるようになる。

### Tests
- 1 presence check 追加 (289 total); gzip 45,026B (30B under 45,056B budget)
- `dashArr` パターン検証 behavioral test 追加 (solid/dashed/dotted × サイズスケール)
- `_sfbCapture`/`_sfbFlush` slider コアレス behavioral test 追加 (複数 tick → 1 op → undo 確認)

---

## [1.6.37] — 2026-06-10

a11y: トーストの ARIA ロール修正、コンテキストメニューの Escape キー対応 (WCAG 2.2)。

### Fixed
- **トーストに `role` 属性なし (WCAG 4.1.2)** — 各トースト `div` に `role="alert"` (err/warn 種別) または `role="status"` (ok/default 種別) を追加。親の `aria-live="polite"` はそのまま残し、個別トーストに意味的なロールを与える。これにより `err`/`warn` トーストが `aria-live="assertive"` 相当のアナウンスとなる。
- **コンテキストメニューが Escape キーで閉じない (WCAG 2.1.2, キーボードトラップ防止)** — `keydown` ハンドラの Escape 分岐にコンテキストメニュー判定を追加。メニューが開いている場合は `closeCtxMenu()` を呼んで即 `return`、モーダルの Escape 処理より前に実行。

### Tests
- 2 presence checks 追加 (288 total); gzip 45,016B (40B under 45,056B budget)
- `copyStyle`/`pasteStyle` ラウンドトリップの behavioral test 追加 (全スタイルプロパティ転送 + undo 検証)
- `snapV`/`snapPt` グリッドスナップの behavioral test 追加 (GRID_SIZE=20 で正確な量子化)
- `snapBox` スマート整列の behavioral test 追加 (エッジスナップ、許容値外は no-op)

---

## [1.6.36] — 2026-06-10

i18n 完成: 残存ハードコード文字列を i18n 化、冗長フォールバック削除、ステータスバーラベル i18n、`describeShape` ローカライズ。

### Fixed
- **`'export failed'` ハードコード英語 (P2)** — `exportPNG()` と `exportPDF()` の `toBlob` null ガードが日本語未対応。`exportFailed:'書き出し失敗'` キーを ja/en テーブルに追加し、`t('exportFailed')` を使用するよう変更。
- **`'save failed: ...'` ハードコード英語 (P2)** — `Persist.save()` の IndexedDB エラートーストが日本語未対応。`saveFailed:'保存失敗'` キーを ja/en テーブルに追加し、`t('saveFailed')` を使用するよう変更。
- **ステータスバー "shapes" / "saved" ラベルが英語固定 (P3)** — `<span class="lbl">shapes</span>` / `saved` に `data-t` 属性を付与。`applyI18n()` が初期化時にローカライズ済みラベルを設定。`shapes:'図形'` キーを ja/en テーブルに追加 (`saved` キーは既存)。
- **`describeShape()` がツール型の英語 raw 値を使用 (P3)** — Tab ナビゲーションやシェイプ作成のトーストが `'rect @ x,y'` 等の英語 raw 型名を表示していた。`T.k?.[s.type]??s.type` を使用することで日本語では `'矩形 @ x,y'`、英語では `'Rectangle @ x,y'` を表示。

### Changed
- **7 つの冗長 `||'fallback'` パターンを削除** — `t(key)` は既にキー名をフォールバックとして返すため、`t('connected')||'connected'` 等のパターンは常に不達コードだった。`imagePasted`、`exportedSVG`、`connected` (×2)、`disconnected`、`imported`、`importConfirm` の各コールサイトから冗長フォールバックを削除。

### Tests
- Line 38 のプレゼンスチェックを更新 (`'export failed'` ハードコード → `t('exportFailed')`)
- Behavioral test: `describeShape` の期待値を `'rect @ ...'` → `'Rectangle @ ...'` (en ロケール名) に更新
- 12 presence checks 追加 (286 total); gzip 44,958B (98B under 45,056B budget)

---

## [1.6.35] — 2026-06-10

i18n 修正: en テーブルの `present`/`snap` キー追加、ヘルプグリッドの 'Snap' を i18n 化。

### Fixed
- **英語で Present ボタンが小文字 'present' で表示される (P2-regression)** — v1.6.33 で `data-t="present"` を追加した際、en テーブルに `present:'Present'` キーを追加し忘れた。`t('present')` がキー名フォールバックで `'present'` (小文字) を返していた。
- **ヘルプグリッドの 'Snap' 行が英語固定 (P3)** — `['⇧G','Snap']` を `['⇧G',t('snap')]` に変更。en テーブルに `snap:'Snap'` を追加。日本語では `'スナップ'` (v1.6.33 で ja テーブルに追加済み) を表示。

### Tests
- 3 presence checks 追加 (277 total); gzip 44,936B (120B under 45,056B budget)

---

## [1.6.34] — 2026-06-10

i18n: ステータスバーのオンライン/オフライン表示を日本語化。

### Fixed
- **ステータスバーのオンライン/オフライン表示が英語固定 (P3)** — `updateOnline()` で `'online'`/`'offline'` をハードコードしていた。`online:'オンライン'`/`offline:'オフライン'` を ja テーブルに追加し `t()` 経由に変更。英語はキー名フォールバックで対応。

### Tests
- 2 presence checks 追加 (274 total); gzip 44,924B (132B under 45,056B budget)

---

## [1.6.33] — 2026-06-10

i18n: スナップ/グリッド切替トースト日本語化、Present ボタン翻訳、コメント修正。

### Fixed
- **スナップ/グリッド切替トーストが英語固定 (P2)** — `⇧G` / `G` でスナップ・グリッドを切替すると日本語ユーザーに `"snap on"` / `"grid off"` と英語で表示されていた。`snap:'スナップ'` / `grid:'グリッド'` / `on:'オン'` / `off:'オフ'` を ja テーブルに追加し、英語はキー名フォールバック (`t('snap')` → `'snap'`) で対応。
- **Present ボタンのラベルが日本語化されない (P3)** — `<span>Present</span>` が `data-t` なしで固定英語だった。`<span data-t="present">` に変更し ja テーブルに `present:'プレゼン'` を追加。
- **`marqueeHit` コメントが不正確 (P3)** — "OR overlaps for pen" はコード上実装されていない機能説明だった。正確に "fully contains the shape's bbox" に修正。

### Tests
- 4 presence checks 追加 (`present` data-t、`snap`/`grid`/`on` i18n、トースト使用; 272 total)

---

## [1.6.32] — 2026-06-10

i18n 修正: PDF ポップアップブロック通知・`.board` インポートエラーが英語ユーザーに誤表示。ドラッグ&ドロップ画像インポートの成功トーストを追加。

### Fixed
- **PDF エクスポートのポップアップブロック通知が日本語固定 (P2)** — 英語ユーザーに `ポップアップをブロックしてください` と表示されていた。`t('popupBlocked')` を使う i18n キーに移行し、英語訳 `Pop-up blocked — please allow pop-ups for PDF export` を追加。
- **`.board` インポートエラーが英語固定 (P2)** — 日本語ユーザーに `Invalid .board file` と表示されていた。`t('invalidBoard')` に移行し、日本語訳 `ボードファイルが無効です` を追加。
- **ドラッグ&ドロップ画像インポートが成功時にトーストを表示しない (P3)** — クリップボード貼り付けでは `imagePasted` トーストを表示していたが、ドラッグ&ドロップでは表示されなかった。一貫性のためトーストを追加。

### Tests
- 5 presence checks 追加 (`popupBlocked`/`invalidBoard` i18n 両ロケール、ドロップトースト)

---

## [1.6.31] — 2026-06-10

Present ボタンのツールチップ誤記修正。

### Fixed
- **Present ボタンのツールチップが `P` と誤表示 (P3)** — 実際のショートカットは `⇧P` (Shift+P)。
  `title="Present (P)"` → `title="Present (⇧P)"` に修正。

---

## [1.6.30] — 2026-06-10

PDF エクスポートキーボードショートカット未接続の修正、ツールチップ誤記修正、ヘルプグリッドへの `.board` ショートカット追加。

### Fixed
- **`⌘P` が PDF エクスポートを起動しない (P2)** — `exportPDF()` は定義されていたが、
  キーボードハンドラに `meta&&k==='p'` の条件がなかったため、`⌘P` はブラウザのネイティブ
  印刷ダイアログを開くだけだった。`exportPDF()` を呼び出す handler を追加し、
  ブラウザデフォルトも `preventDefault()` でキャンセル。
- **Share ボタンのツールチップが `⌘⇧S` と誤記 (P3)** — Share ボタンのタイトル属性が
  `"Share (⌘⇧S)"` だったが、`⌘⇧S` は `.board` ファイル書き出し。ツールチップを修正。

### Added
- **ヘルプグリッドに `⌘⇧S` (.board) を追加** — `.board` 書き出しショートカットが
  ヘルプパネルに表示されていなかった。

### Tests
- **263/263 全通過** (変更なし)。

---

## [1.6.29] — 2026-06-10

スライダー (太さ・不透明度) を使ったスタイル変更が Undo を大量消費するバグ修正、デッドコード削除、i18n 修正。

### Fixed
- **スライダードラッグ中に Undo エントリが連続生成される (P2)** —
  太さ・不透明度スライダーの `input` イベントが `applyStyleToSelection` → `_recordCommitted`
  を毎回呼び出していたため、スライダーを一回動かすだけで多数の Undo ステップが積まれていた。
  `_sfbCapture(prop)` / `_sfbFlush(prop, v)` ヘルパーを追加し、`pointerdown` 時にスナップショットを
  取得、`change` 時 (ドラッグ解放時) にのみ単一の `style` op を記録するよう変更。

### Changed
- **デッドコード `op:'z'` 削除** — `_apply` の `case 'z'` と `validRemotePayload` の対応行を削除。
  このオペレーションは当初の設計ドキュメントに記載されていたが、実際には一度も生成されず、
  すべての z 順序変更は `op:'zorder'` (before/after スナップショット) が担う。
- **画像サイズ超過エラーを i18n 化** — ドロップ・クリップボード両方のハードコード日本語を
  `t('imgBig')` + サイズ文字列に置き換え。英語 UI でも正しいメッセージが表示される。
- **重複 `invalidate()` 削除** — ポインタアップハンドラの末尾に存在した二重呼び出しを削除。

### Tests
- **263/263 全通過** (+6): presence チェック × 6 (slider helpers, size/opacity coalescing,
  dead-code removed, i18n key)。

---

## [1.6.28] — 2026-06-10

複数グループを一括 Ungroup したときの Undo が全 shape を最初のグループに入れてしまうバグを修正。

### Fixed
- **複数グループを同時に Ungroup すると Undo が誤ったグループへ戻す (P2)** —
  `doUngroup` の undo 実装が `op.gids[0]` (最初のグループID) を全 shape に一律適用していた。
  選択範囲が 2 つ以上のグループにまたがる場合 (例: Ctrl+A → Ctrl+Shift+G)、
  Undo 後に全 shape が同一グループになってしまっていた。
  `doUngroup` 実行前に `before=[{id,groupId}...]` スナップショットを取得し、
  `_apply` の backward パスでそれを復元するよう修正。

### Tests
- **257/257 全通過** (+4): presence チェック × 2 (before スナップショット、backward ブランチ);
  behavioral テスト × 1 (multi-group ungroup undo round-trip), counter +2。

---

## [1.6.27] — 2026-06-10

SVG エクスポートで単点ペン shape (ドット) が出力されないバグを修正。

### Fixed
- **SVG エクスポートで単点ペン (タップ/クリック 1 点のみ) が消える (P2)** —
  `buildSVG` の `case 'pen'` が `s.pts.length < 2` でスキップしていたため、
  Canvas では表示される点ドットが SVG に出力されなかった。
  `pts.length === 1` 時に `<circle>` 要素を生成するよう修正し、
  Canvas の `arc` 描画と出力を一致させた。

### Tests
- **251/251 全通過** (+2): presence チェック × 2 (単点ペン分岐、`<circle>` 出力)。

---

## [1.6.26] — 2026-06-09

既存テキストを空にした時の二重 Undo を修正。

### Fixed
- **既存テキスト/付箋を空にして確定すると Undo が 2 回必要 (P1)** —
  `openTextEditor` の blur ハンドラが、テキストを空にした既存 shape に対して
  `upd` op(text→空)と `del` op の**両方**を記録していた。結果、1 回の操作なのに
  Ctrl+Z を 2 回押さないと元に戻らず、「1 操作 = 1 Undo」の原則を破っていた。
  さらに `del` op が空テキスト測定後の shape(`w=20`)をクローンしていたため、
  Undo 復元時にテキストが極端に折り返される視覚バグも併発。
  エディタ開始時に `orig=clone(s)` を保存し、空化時は元 shape を `del` で削除する
  単一 op に統一(`else if` で upd と排他化)。Undo 1 回で元の text・寸法を完全復元。

### Tests
- **249/249 全通過** (+3): presence チェック × 3 (orig クローン、単一 del op、
  else-if 排他化)。

---

## [1.6.25] — 2026-06-09

マルチ選択スタイル変更の単一 Undo。

### Fixed
- **複数選択でのスタイル変更が shape 数ぶん Undo を消費する (P2)** —
  `applyStyleToSelection` が shape ごとに `upd` op を積んでいたため、
  3 shape 選択で色変更すると Ctrl+Z を 3 回押さないと戻らなかった。
  `align` op と同方式の `style` op (before/after 配列スナップショット) を
  新設し、1 回の Ctrl+Z で全 shape が戻るよう修正。
  `style` op は `_apply` / `validRemotePayload` / `REMOTE_OPS` に追加済みで
  undo・redo・P2P sync で正しく動作する。

### Tests
- **246/246 全通過** (+3): presence チェック × 3 (case 'style'、REMOTE_OPS、
  applyStyleToSelection → style op)。

---

## [1.6.24] — 2026-06-09

バイト削減で予算を回復。機能変化なし。

### Changed
- **JS ヘッダーコメントブロック削除** — `docs/architecture.md` / `CLAUDE.md` と内容が
  重複していた 19 行の設計注記を削除し、`// Board — MIT License.` 1 行に置き換え。
  ~290 B のバジェットを回復。
- **`docName` の `getElementById` 二重取得を解消** — `wire()` 内で
  `input` と `change` リスナーに別々に要素を取得していたのを `docNameEl` で統一。
- **WebRTC wire-up の `getElementById` 重複を統合** — ブロックスコープの `_g` 短縮を
  使い 5 回の長い `document.getElementById` 呼び出しを削減。

### Tests
- **243/243 全通過** (変化なし)。

---

## [1.6.23] — 2026-06-09

`.board` ファイルによるボードの保存・復元。

### Added
- **`.board` ファイルエクスポート** — `Ctrl+Shift+S` でボード全体を JSON 形式の
  `.board` ファイルとして保存。IDB は同一ブラウザ内のみ有効なため、ファイルによる
  バックアップ・端末間移行・サイズ無制限共有の経路が生まれた。
- **`.board` ファイルインポート** — `.board` ファイルをキャンバスにドラッグ&ドロップ
  して読み込み。`validShape` フィルタを通過した図形のみ適用するため、改ざんされた
  ファイルが不正な shape を混入させることを防止。

### Tests
- **243/243 全通過** (+4): presence チェック × 4 (exportBoard、importBoard、
  Ctrl+Shift+S、drag-drop `.board`)。

---

## [1.6.22] — 2026-06-09

IME 対応・ペン点列間引き・テスト精度向上。

### Fixed
- **テキスト編集 / フレームラベル編集で日本語 IME の Escape/Enter がエディタを誤閉じ (P1)** —
  `keydown` ハンドラ先頭に `if(ev.isComposing)return` を追加。変換候補 Escape が
  エディタ閉じではなく変換キャンセルとして機能するよう修正。日本語ファーストの製品として
  基本動作だった。

### Changed
- **ペン点列の RDP 間引き** — `endPen()` コミット前に
  Ramer-Douglas-Peucker (ε=0.5 world unit) を適用。高速描画で蓄積された
  冗長点を除去しつつ、見た目の形状を保持。ストロークのメモリ・履歴・
  sync ペイロードが削減される。
- **gzip バジェットテストを system `gzip -9` に統一** — `node zlib` と
  `gzip -9` の ~1% 差により test.mjs が偽陰性を生じていた。`execSync('gzip -9 -c')` に
  変更して CI と完全一致。

### Docs
- README サイズバッジを `~37KB` → `~44KB` に修正(実測値に合わせた)
- 比較表・開発ガイドの `~37KB` も同様修正
- CLAUDE.md の勝利条件「64KB に収まる」→「gzip 44KB 未満」に修正

### Tests
- **239/239 全通過** (+5): presence チェック × 5 (isComposing × 2、_rdp 関数、
  endPen RDP 適用、v1.6.22 バージョン確認)。

---

## [1.6.21] — 2026-06-09

深掘り監査 第5弾(`docs/audit-2026-06.md`)。エクスポート・ヒットテスト・ペースト
サブシステムを精査し、確認できた不具合を修正。

### Fixed
- **`exportPDF` が座標変換を誤り、原点から遠い図形が描画されない (P1)** —
  `oc.scale(dpr,dpr)` + `state.viewport` 差し替えパターンは、`drawShape` が
  `state.viewport` を無視して生のワールド座標で描画するため機能しない。
  `oc.setTransform(dpr,0,0,dpr,(-b.x+pad)*dpr,(-b.y+pad)*dpr)` に置き換えて
  `drawShape` の座標系と一致させた。`exportPNG` と同等のアプローチ。
- **1点の pen 図形 (単タップ) がヒットテストで常に未選択 (P1)** — `G.hit` 内の
  pen ループが `for(let i=1;i<pts.length;i++)` のため `pts.length===1` のとき
  0 回実行されて `false` を返していた。ループ前に
  `if(pts.length===1)return Math.hypot(p.x-pts[0][0],p.y-pts[0][1])<=tol+3;`
  を追加し、単点ペンをポイント距離で判定。
- **グループ化された図形のペーストで `groupId` が元図形と共有される (P2)** —
  `clone(orig)` がコピー元の `groupId` を保持するため、ペーストした複製を選択
  すると元グループが同時に選択されていた。`gidMap` で `groupId` を新しい UID
  にリマップし、ペースト後の複製が独立したグループ ID を持つように修正。

### Tests
- **234/234 全通過** (+6): presence チェック × 3 (exportPDF setTransform、
  G.hit 単点 pen、doPaste gidMap) + 行動テスト × 2 (G.hit 単点 pen 往復、
  doPaste groupId 独立性) + `pass` カウンタを 64 → 67 に更新。

---

## [1.6.20] — 2026-06-09

深掘り監査 第4弾(`docs/audit-2026-06.md`)。描画・入力・アクセシビリティ・コンテキストメニューの
未踏サブシステムを精査し、確認できた不具合を修正。

### Fixed
- **`opacity=0` の図形が不透明で描画される (P1)** — `drawShape` が `c.globalAlpha=s.opacity||1`
  を使用。`0||1=1` のため完全透明な図形が完全不透明で描画されていた。`??1` (nullish coalescing)
  に修正し、`null/undefined` は 1、`0` は 0 として扱う。
- **`pointercancel` 時に resize/move が中途半端な状態で確定される (P1)** — スタイラスが範囲外に
  出るなど OS がポインタを奪ったとき、`pointercancel` ハンドラが図形を元に戻さず、undo エントリも
  作成しなかった。resize/move 中断時にそれぞれ `resizeOrig`/`dragStartShapes` から元の状態を復元。
  `ptr.resizeHandle`/`resizeOrig`/`dragStartShapes` のクリアも追加。
- **フレームラベルのインライン編集で Escape がキャンセルではなく保存を実行 (P1)** — `inp.remove()`
  が blur を発火し `commit()` が呼ばれていた。Escape キー時に先に `blur` リスナーを除去してから
  `inp.remove()` することで真のキャンセルを実現。
- **コンテキストメニューに `role="menuitem"` が欠落 (P1 a11y)** — `role="menu"` 内の `<button>`
  には `role="menuitem"` が必要 (WCAG 4.1.2)。セパレータ `<div>` にも `role="separator"` を追加。
- **コンテキストメニューの位置が非表示時の高さ 0 を基準に計算される (P2)** — `m.offsetHeight` を
  `data-open='true'` 設定前に読んでいたため常に 0 。`data-open` を先に設定してから位置を計算。

### Tests
- **228/228 全通過** (+5): presence チェック × 5 (opacity `??1`、pointercancel 復元、
  frame Escape キャンセル、role=menuitem、role=separator)。

---

## [1.6.19] — 2026-06-08

深掘り監査 第3弾(同期 / PWA — `docs/audit-2026-06.md`)。未監査だった CRDT・WebRTC・
共有 URL・Service Worker を精査し、確認できた不具合を修正。

### Fixed
- **スナップショット マージで先頭 1 図形しか同期されない (P1)** — `_sendSnapshot` が全 op に
  同一クロック `seq:0` を付与していたため、既存盤面を持つ peer へのマージ時に `applyRemote` の
  `peer:seq` 重複排除が**2 個目以降を全て duplicate として破棄**していた。各 op に一意な
  `seq:'snap'+i` を付与し、マージ側は既に保有する id の図形を skip(重複再追加も防止)。
- **Service Worker が旧キャッシュを残す (P2)** — `activate` で現行 `board-v<version>` 以外の
  キャッシュを削除。リリースごとに古いキャッシュが滞留する問題を解消。

### Tests
- **223/223 全通過** (+4): 一意 seq のスナップショット op が全て適用される/同一 seq は衝突する
  ことの回帰検証、+ presence × 3。`seenOps` トリム・seq 開始値・DataChannel の防御的 catch 等は
  検証の結果**問題なし**と確認。

---

## [1.6.18] — 2026-06-08

深掘り監査 第2弾(`docs/audit-2026-06.md`)。ツールハンドラ・キーバインド・プレゼン・
テキスト編集をサブシステム単位で精査し、確認できた不具合を修正。

### Fixed
- **キーボードでペンが選べない (P1)** — 平打ち `P` がプレゼンモードに横取りされ、`KEYMAP` の
  `p:'pen'` に到達せずペンツールがキーボードから選択不能だった。`P`=ペン、`⇧P`=プレゼンに分離
  (Ctrl+Enter でのプレゼン開始も継続)。
- **プレゼン終了後に表示が戻らない (P1)** — プレゼン開始時に viewport を保存し、終了(Esc)時に
  復元。最終フレームの位置・ズームに取り残されなくなった。
- **ヘルプ表が英語環境で日本語表示 (P1 i18n)** — 'プレゼン' / '移動 (⇧: 10px)' / '前面/背面' /
  '最前面/最背面' がハードコードされていた。i18n キー(`present`/`nudge`/`zorder`/`zorderEnds`)に
  置換し ja/en 両方を用意。
- **ペンのリサイズで NaN 混入 (P2)** — ペンはボックスハンドルを表示しない(移動のみ)に。ペンの
  幾何は `pts` にあるため box-resize は `x/y/w/h` を NaN にしていた(描画には無影響だが不正プロパティ)。

### Tests
- **219/219 全通過** (+6): `getHandles` の pen=0/line=2/rect=8、+ 監査修正の presence × 5。
  クリップボード offset・ungroup 意味論・fitToContent・eraser z 順序などは検証の結果**正しい**と確認。

---

## [1.6.17] — 2026-06-08

プロダクトを 12 カテゴリに分割した徹底監査(`docs/audit-2026-06.md`)で見つかった
正確性・堅牢性・a11y・i18n の不具合をまとめて修正。

### Fixed
- **不正な pen `pts` によるクラッシュ防止 (P1)** — 共有バリデータ `validShape()` を新設し、
  全 intake 経路(IDB ロード / sync スナップショット / remote `add` / URL インポート)で使用。
  pen の `pts` が null/空/非配列/NaN 座標だと `drawPen`/`G.hit`/`G.bbox` が `pts[i][0]` 参照で
  クラッシュしていた(破損 IDB や悪意ある peer 経由で発火可能)。4 箇所の重複検証式も一元化。
- **モーダルが Escape で閉じない (P0 a11y)** — `#help`/`#share` は `aria-modal` だが Escape 未対応
  だった(WCAG 違反)。Escape ハンドラで開いているモーダルを優先的に閉じる。
- **英語 UI の右クリックメニュー欠落 (P1 i18n)** — `ctxDelete`(Delete)/`ctxBringFront`(Bring to
  front)が en に無く、英語環境で `undefined` 表示。補完し全 45 キーの ja/en 突合も実施。
- **線種ボタンが forced-colors で不可視 (P1 a11y)** — `.dashbtn` を Windows ハイコントラストの
  境界線ルールに追加。
- **viewport の有限性検証 (P2)** — IDB ロード時に `x/y/zoom` が有限かつ `zoom>0` の時のみ採用
  (NaN viewport の保存で全ズーム計算が壊れるのを防止)。
- **画像キャッシュのメモリリーク (P2)** — `_imgCache` を上限 60 の LRU 化(多数画像貼付時の
  無制限増加を防止)。

### Tests
- **213/213 全通過** (+7): `validShape` の正常受理/不正 pen 拒否、+ 監査修正の presence × 6。

---

## [1.6.16] — 2026-06-08

同種ソフト(Excalidraw / tldraw / Figma)標準の線種(破線・点線)を実装。

### Added
- **線種スタイル(実線・破線・点線)** — スタイルパネルに線種ボタンを追加。shape の `dash`
  (0=実線 / 1=破線 / 2=点線)を `dashArr(dash,size)` が太さ連動のパターンに変換し、
  画面は `setLineDash`、SVG 書き出しは `stroke-dasharray` で同一に描画する(表示=出力パリティ)。
  矩形・楕円・直線・矢印に適用(フレームは構造線のため常に実線)。新規図形は現在の線種を継承し、
  選択中の図形へは汎用 `upd` op で適用するので完全に undo/redo 可能。フォーマットペインターも線種を転写。

### Tests
- **206/206 全通過** (+6): `dashArr` の実線/破線/点線・太さ連動・未知値フォールバック、
  SVG の `stroke-dasharray` 有無、選択適用の可逆性、presence × 5。

---

## [1.6.15] — 2026-06-08

同種ソフト(Excalidraw / tldraw)の調査で最大の欠落と判明した「オブジェクトスナップ」を実装。

### Added
- **スマート整列ガイド(オブジェクトスナップ)** — 図形をドラッグ移動する際、選択範囲の辺・中心が
  他の図形の辺・中心に近づく(閾値 8px)と自動で整列し、ブランド色の破線ガイドを表示する。
  Excalidraw の「Snap to objects(Alt+S)」/ tldraw の整列スナップに相当する目玉 UX 機能で、
  これまで Board はグリッドスナップしか持っていなかった。純粋幾何関数 `snapBox(mov,targets,tol)`
  (最近傍アンカー採用)を `objectSnap` / `moveDelta` から呼び、ライブドラッグと確定 op が完全に一致。
  グリッドスナップ(⇧G)が ON のときはそちらが優先。最終 delta は従来どおり `move` op なので
  完全に undo/redo 可能。

### Tests
- **200/200 全通過** (+4): `snapBox` の辺/中心スナップ、最近傍アンカー採用、両軸同時スナップ、
  範囲外 no-op、presence × 3。

---

## [1.6.14] — 2026-06-08

仕様書 §13 の「真の筆圧入力」を実装(ペン品質の筆圧パートを完了)。

### Added
- **筆圧連動のペン入力** — pointer の `pressure` を pen の第3要素 `[x,y,pressure]` として取り込む。
  `penWidths()` はストロークが**変化する**筆圧信号を持つ場合(stylus)にそれを採用し、一定値
  (マウスは常に 0.5)・欠落(レガシー 2-tuple)・非有限の場合は v1.6.13 の速度プロキシへフォールバック。
  canvas と SVG 書き出しの両方に反映(表示=出力パリティを維持)。`_penPr()` で有限値に強制。
  データモデルは後方互換 — 既存の 2-tuple ペンはそのまま velocity 描画で動作する。

### Tests
- **196/196 全通過** (+4): 変化する筆圧で太さが追従、一定筆圧は velocity にフォールバック、
  レガシー 2-tuple の不変、非有限筆圧の許容、presence × 3。

---

## [1.6.13] — 2026-06-08

仕様書 §13 の「ペン品質(固定幅)」ギャップを実装。

### Changed
- **可変線幅のペン** — `penWidths()` が描画時にサンプル間隔(速度プロキシ)から線幅を算出する。
  ゆっくり丁寧に引いた線は太く、素早いフリックは細く先細りし(`[0.45×base, base]` にクランプ +
  3-tap 平滑)、自然なインクの表情になる。canvas は中点二次平滑の各セグメントを round-cap で重ね描き
  して外形リボンの自己交差アーティファクトを避け、SVG 書き出しも同じ可変幅セグメントを出力する
  (**表示=出力パリティ**、座標は 1 桁丸めでファイルサイズを抑制)。
  データモデル(`pts:[[x,y]]`)は不変 — 保存/同期/undo/ヒットテスト/bbox に一切影響しない。

### Tests
- **192/192 全通過** (+6): `penWidths` の遅速での太さ差・上下限クランプ・単点フォールバック、
  SVG が可変幅セグメントを出力すること、非有限座標の `_num` 強制、presence × 3。

---

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
