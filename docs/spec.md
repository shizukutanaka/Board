# Board — 仕様書 (Specification)

> Board v1.6.50 の正式仕様。実装(`index.html`)が満たすべき契約を定義し、末尾の
> **§13 適合ギャップ(不足)** で仕様と実装の差分を列挙する。本書は実装と対で更新する。
> 関連: 設計=`docs/architecture.md`、改善調査=`docs/research-improvements.md` /
> `docs/category-research*.md`、変更履歴=`CHANGELOG.md`。

## 1. 目的と不変条件 (MUST)

Board は「サインアップ/重量/有料/プライバシー侵害」を全否定するオフラインホワイトボード。

- **単一HTMLファイル**。外部 `<script src>` / `<link href>` / CDN / フォントを**追加しない**。
- JS バンドル < **gzip 44KB**(CI 強制)。raw 上限 160KB(暴走検知)。
- `state` の変更は必ず **`Store` 経由**(undo 完全性)。
- **Render は純粋**(`state` を読むのみ、副作用なし)。
- **XSS 安全**: `innerHTML =` を使わない。エクスポート(SVG/PDF)も含め、ユーザ/peer 由来の値を生挿入しない。
- 完全オフライン動作。ネットワーク通信は同期(opt-in の WebRTC / 同一オリジン BroadcastChannel)のみ。
- WCAG AAA コントラスト、`prefers-reduced-motion` / `prefers-color-scheme` / `forced-colors` 対応。

## 2. データモデル

### 2.1 state(唯一の真実)
`shapes[]`, `selection:Set<id>`, `viewport:{x,y,zoom}`, `tool`, `style:{stroke,fill,size,opacity}`,
`history[]`, `histIdx`, `clipboard`, `styleClipboard`, `hover`, `draft`, `editing`, `marquee`,
`snap`, `showGrid`, `docName`, `dirty`, `lastSaveAt`, `peerId`, `seq`, `seenOps:Set`。

### 2.2 shape(共通フィールド)
`{ id:string, type, z:number, stroke, fill, size:number, opacity:number }` +
種別固有: rect/ellipse/frame/sticky/image/text=`x,y,w,h`、line/arrow=`x1,y1,x2,y2`、
pen=`pts:[[x,y(,pressure)],…]`(pressure は任意の第3要素 0..1)、text/sticky=`text,fontSize`、sticky=`color`、image=`dataUrl`、
frame=`label`、group=`groupId`。
- **MUST**: 全 shape は `id`・`type`・数値 `z` を持つ。座標/サイズは**有限数**(intake で保証)。

### 2.3 op(可逆変更ログ)
| op | ペイロード | 逆操作 |
|---|---|---|
| `add` | `{shape}` | delete |
| `del` | `{shapes:[]}` | re-add |
| `upd` | `{id, before, after}` | swap |
| `move` | `{ids:[], dx, dy}` | translate(-d) |
| `z` | `{id, from, to}` | 配列順を戻す |
| `zorder` | `{before:[{id,z}], after:[{id,z}]}` | スナップショット復元(配列順+z) |
| `group` | `{ids, gid, before}` | groupId 復元 |
| `ungroup` | `{ids, gids}` | groupId 復元 |
| `align` | `{before:[], after:[]}` | スナップショット復元 |
| `clear` | `{shapes:[]}` | re-add |

- **MUST**: 各 op は `_apply(op,false)` で完全に逆操作できる(テストで往復検証)。

## 3. アーキテクチャ層
`Input → Tools(begin/cont/end) → Store(op-log) → State → Render(RAF, Canvas2D) → Persist(IDB)`。
座標: `s2w(p)=p/zoom+viewport`、`w2s(p)=(p-viewport)*zoom`。DPR キャップ 3。

## 4. ツール
select(V) / hand(H,Space) / pen(P) / rect(R) / ellipse(O) / arrow(A) / line(L) / text(T) /
eraser(E) / sticky(N) / frame(F)。Shift で軸拘束・正方形/正円。

## 5. 編集機能
マーキー/加算選択、移動、8 ハンドルリサイズ(line/arrow は端点)、group/ungroup(⌘G/⌘⇧G)、
整列(左右上下中央/均等)、z 順序(`]`/`[`/⇧付き)、グリッドスナップ(⇧G)、
オブジェクトスナップ(移動時に他図形の辺/中心へ整列、ガイド線表示。グリッドスナップ off 時)、
フォーマットペインター(Alt+C/V)、不透明度、線種(実線/破線/点線)、コピー/貼付/切取/複製、undo/redo 最大 500。

## 6. キーマップ
`KEYMAP` が全ツールを網羅。⌘Z/⌘⇧Z=undo/redo、⌘A=全選択、⌘C/V/X/D、⌫=削除、
⌘±/0=ズーム、⇧1=フィット、⌘E=PNG、⌘⇧E=SVG、⌘P=PDF、⌘S=保存、`?`=ヘルプ、Esc=解除、
矢印=ナッジ(⇧で10px)、**P=ペン**、**⇧P / Ctrl+Enter=プレゼン**。Esc は開いているモーダルを優先的に閉じる。

## 7. 永続化
IndexedDB(`board`/`docs`/`main`)。保存対象=`{v,shapes,viewport,docName,savedAt}`。
500ms デバウンス + `beforeunload`。**MUST**: open/load 失敗時も in-memory で起動継続(main の try/catch)。

## 8. 同期プロトコル(opt-in)
- 同一ブラウザ=BroadcastChannel、端末間=WebRTC DataChannel(手動シグナリング)。
- op エンベロープに CRDT clock `{peer, seq, ts}`、`peer:seq` で dedup(`seenOps`、上限 `MAX_SEEN_OPS`)。
- **MUST(受信検証)**: `applyRemote` は (a) op 型 allow-list(`REMOTE_OPS`)、
  (b) **ペイロード検証**(`validRemotePayload`: 各 forward-apply が参照するフィールドの型 +
  move/z の有限数)を通った op のみ適用。remote op は local undo に入れない。
- 共有: URL fragment にスナップショット。`importFromHash` は shape を検証してから採用。

## 9. エクスポート
- **PNG**: 2x、可視領域クロップ + 32px パディング。`toBlob` null ガード。
- **SVG**: `buildSVG(shapes,paper)` が純文字列を返す。**MUST(安全)**: 文字列属性は `_esc`、
  **数値属性は `_num` で有限数に強制**、`href` は `data:image/` のみ。→ 細工 shape で markup 注入不可。
- **PDF**: OffscreenCanvas → 印刷。`document.write` の `docName` は `_esc`。

## 10. アクセシビリティ
canvas に `role="application"` + 詳細 `aria-label` + `tabindex=0`。選択/リサイズハンドルは
`--brand-ink`(AAA 非テキストコントラスト)。全機能キーボード操作可(作成系を除く、§13 参照)。

## 11. PWA / オフライン
インライン manifest + inline Service Worker(cache-first)。初回後オフライン等価。

## 12. セキュリティモデル
- XSS: `innerHTML=` 不使用(CI grep 強制)。SVG/PDF 出力は全属性エスケープ + 数値強制。
- 同期: op 型 allow-list + ペイロード検証。`clone()`(JSON)で prototype 汚染を無効化。
- ネットワーク: 既定で通信なし。共有鍵は URL fragment(サーバ非通過)。

## 13. 適合ギャップ(不足)— 仕様 vs 実装

### ✅ v1.6.7 で解消
- **SVG 数値属性の注入**: 文字列色は escape 済みだったが `x/y/w/h/x1..` 等が生挿入で、
  共有URL/sync 由来の文字列座標で markup 注入が可能だった → `buildSVG` を `_num` で全数値強制。
- **受信 op 検証が `add` のみ**: `move`/`upd`/`zorder` 等の payload 未検証で、`move dx={}` 等が
  NaN で shape を破壊し得た → `validRemotePayload` で全 op の構造/有限数を検証。

### ✅ v1.6.8 で解消
- **大規模描画(viewport カリング)**: `draw()` が `visibleWorldRect()`/`inView()` で画面外 shape を
  描画スキップ(architecture.md 予告分の前半)。空間索引(quadtree)は引き続き将来課題。
- **`Persist.load` の shape 検証**: IDB から読む shape を他 intake と同条件で検証。
- **可逆性の網羅検証**: `test.mjs` に**依存ゼロの property-based テスト**を追加(seeded 乱数で
  add/move/upd/del/zorder/align を混在生成、30 シナリオで apply→undo=初期 / redo=適用後 を検証)。
  fast-check 等の外部 PBT 導入は任意の発展課題。

### ✅ v1.6.9 で解消
- **テキスト自動折返し(付箋)**: sticky テキストを箱幅へ word-wrap + 長語の文字 hard-break、
  箱でクリップ。純粋ヘルパ `wrapText()` を canvas/SVG で共有(表示=出力)。text shape は
  内容追従の自動サイズのため対象外(設計上 wrap 不要)。

### ✅ v1.6.10 で解消
- **キーボードでの図形巡回(a11y)**: Tab/Shift+Tab で選択を z 順に巡回(`cycleSel`)、画面外は
  中央寄せ(`centerOn`)、`describeShape` を `aria-live` トーストで SR 読み上げ。既存トーストも
  `#toasts` の aria-live で読み上げ対象に。

### ✅ v1.6.11 で解消
- **空間索引(pickTop O(n)→O(1) amortised)**: 200wu セル均一グリッドを `_buildGrid` で遅延構築し、
  `Store._apply`/`_recordCommitted` でキャッシュ無効化。`pickTop` は shapes > 40 枚時にグリッドの
  3×3 近傍セルで候補を絞り `G.hit` で確定(frames 2パス順序を維持)。大型 shape(8セル超)は
  `big` リストで線形スキャン(フレームは少数)。tol ≤ 60wu < 200wu なので 3×3 は完全。

### ✅ v1.6.12 で解消
- **キーボードでの図形作成(a11y)**: ツール選択後 Enter で viewport 中央に既定サイズの図形を作成
  (`createShapeKbd`)。rect/ellipse=120×80、line/arrow=水平160、sticky=160²(色ランダム+エディタ起動)、
  frame=800×500(連番ラベル)、text=エディタ起動。作成は通常の `add` op なので完全可逆。
  pen/select/hand/eraser は no-op。canvas `aria-label` と help grid に明記。これで作成→巡回(v1.6.10)
  →移動(矢印)→編集のループがポインタ無しで完結。

### ✅ v1.6.13 で解消
- **ペン品質(可変線幅)**: 固定幅を脱却。`penWidths()` が描画時にサンプル間隔(速度プロキシ)から
  線幅を算出(遅い=太い / 速い=細く先細り、`[0.45×base, base]` にクランプ + 3-tap 平滑)。canvas は
  中点二次平滑の各セグメントを round-cap で重ね描き(外形リボンの自己交差を回避)、SVG も同じ
  可変幅セグメントを出力(**表示=出力パリティ**、座標は 1dp 丸めでサイズ抑制)。データモデル
  (`pts:[[x,y]]`)は不変なので保存/同期/undo/hit-test/bbox に影響なし。

### ✅ v1.6.14 で解消
- **真の筆圧入力**: pointer の `pressure` を pen の第3要素 `[x,y,pressure]` として取り込み。
  `penWidths` はストロークが**変化する**筆圧信号を持つ時のみ採用(stylus)、一定値(マウスは常に 0.5)/
  欠落(レガシー 2-tuple)/非有限は速度プロキシへフォールバック。canvas/SVG 両方で反映(パリティ維持)。
  `_penPr` で有限値に強制、データモデル後方互換(既存 pen は 2-tuple のまま動作)。

### ✅ v1.6.19 で解消(深掘り監査 第3弾 — sync/PWA — `docs/audit-2026-06.md`)
- **スナップショット マージの dedup 衝突 (P1)**: `_sendSnapshot` が全 op に `seq:0` を付与し、
  `applyRemote` の `peer:seq` dedup で**先頭 1 図形しか適用されなかった**(既存盤面への参加=マージ時)。
  各 op に一意 `seq:'snap'+i` を付与し、マージは id 既存の図形を skip(重複再追加も防止)。
- **Service Worker の旧キャッシュ滞留 (P2)**: `activate` で `board-v*` の旧版キャッシュを purge。

### ✅ v1.6.18 で解消(深掘り監査 第2弾 — `docs/audit-2026-06.md`)
- **キーボードのペン到達不能 (P1)**: 平打ち `p` がプレゼンに横取りされ、`KEYMAP.p='pen'` に到達せず
  ペンがキーボード選択不能だった → `p`=ペン、`⇧P`=プレゼンに分離(Ctrl+Enter も継続)。
- **プレゼン後の viewport 未復帰 (P1)**: `enter` で保存し `leave` で復元。Esc 後に最終フレーム位置に
  取り残されなくなった。
- **pen のリサイズで NaN 混入 (P2)**: pen はボックスハンドル非表示(移動のみ)に。box-resize が
  `x/y/w/h` を NaN にしていた。
- **ヘルプ表のハードコード日本語 (P1 i18n)**: 'プレゼン'/'移動'/'前面/背面'/'最前面/最背面' を i18n 化
  (英語環境で日本語表示だった)。

### ✅ v1.6.17 で解消(カテゴリ別徹底監査 — `docs/audit-2026-06.md`)
- **不正 shape の intake 一元検証**: 共有 `validShape()` を IDB ロード / sync スナップショット /
  remote `add` / URL インポートの全経路で使用。特に pen の `pts`(null/空/非配列/NaN)を弾く
  — これらは `drawPen`/`G.hit`/`G.bbox` を `pts[i][0]` 参照でクラッシュさせ得た。
- **a11y**: モーダル(help/share)を Escape で閉じる(WCAG)。線種ボタン `.dashbtn` を forced-colors 対応。
- **i18n**: en の `ctxDelete`/`ctxBringFront` 欠落を補完(英語環境の右クリックメニュー `undefined` 解消)。
- **堅牢性**: IDB ロード時に viewport の有限性(`zoom>0`)を検証。画像キャッシュ `_imgCache` を上限 60 の LRU 化。

### ✅ v1.6.16 で解消
- **線種(破線/点線)**: 競合(Excalidraw/tldraw/Figma)標準の線スタイルを追加。shape の `dash`
  (0=実線/1=破線/2=点線)を `dashArr(dash,size)` で太さ連動のパターンに変換し、canvas は
  `setLineDash`、SVG は `stroke-dasharray` で同一描画(パリティ)。rect/ellipse/line/arrow に適用
  (frame は構造線なので常に実線)。スタイルパネルに線種ボタンを追加、選択へ適用は汎用 `upd` op
  なので可逆。`dash` は描画専用かつ `dashArr` が未知値を実線にフォールバックするので intake 検証不要。

### ✅ v1.6.15 で解消
- **オブジェクトスナップ(スマート整列ガイド)**: 競合(Excalidraw の Alt+S / tldraw)が持ち Board に
  無かった目玉機能。移動ドラッグ中、選択 bbox の辺/中心が他図形の辺/中心に閾値内(8px)で近づくと
  整列し、ブランド色の破線ガイドを表示。純粋幾何 `snapBox(mov,targets,tol)`(最近傍アンカー採用、
  単体テスト可)+ `objectSnap`/`moveDelta` で live drag と commit が一致。グリッドスナップ(⇧G)が
  優先、off 時に有効。最終 delta は従来通り `move` op なので完全可逆。

### ✅ v1.6.32–1.6.35 で解消(i18n 監査 第1弾)
- **ハードコード日本語/英語 (P2)**: `exportPDF` の popup-blocked トースト(日本語固定)、`importBoard` の
  invalid-board トースト(英語固定)、ドロップ画像の toast 未発火 — i18n キー追加+`t()` で解消。
- **Present ボタン小文字回帰 (P2)**: `data-t="present"` 追加時に en キー追加漏れ →
  `t('present')` がキー名フォールバックで `'present'`(小文字)を返していた。en テーブルに追加。
- **スナップ/グリッド/オンライン/オフライン 固定表示**: snap・grid・on/off・online/offline を i18n 化。

### ✅ v1.6.36 で解消(i18n 監査 第2弾)
- **exportFailed/saveFailed ハードコード英語 (P2)**: `exportPNG`/`exportPDF` の `'export failed'` と
  `Persist.save` の `'save failed: ...'` を `t('exportFailed')` / `t('saveFailed')` へ。
- **ステータスバーラベル固定 (P3)**: `shapes`/`saved` ラベルに `data-t` 付与(shapes='図形'等)。
- **describeShape が英語 raw 型名を使用 (P3)**: `T.k?.[s.type]??s.type` でロケール名を表示
  (日本語: '矩形 @ x,y'、英語: 'Rectangle @ x,y')。
- **7 つの冗長 `||'fallback'` 削除**: `t()` がキー名をフォールバックとして返すため常に不達だったコードを削除。

### ✅ v1.6.37 で解消(a11y 監査)
- **トースト `role` 属性なし (WCAG 4.1.2)**: 各トースト div に `role="alert"` (err/warn)
  または `role="status"` (ok) を設定。スクリーンリーダーが severity を正確に認識。
- **コンテキストメニューが Escape キーで閉じない (WCAG 2.1.2)**: `keydown` の Escape 分岐に
  コンテキストメニュー判定を追加。モーダル閉じより前に実行。

### ✅ v1.6.38 で解消(a11y 監査 続)
- **コンテキストメニュー開時にフォーカスなし (WCAG 2.1.1)**: `m.querySelector('.ctx-item')?.focus()`
  でメニュー開時に最初の項目へフォーカス移動。キーボードユーザーが Tab で項目を巡回可能に。

### ✅ v1.6.39 で解消(コードクリーンアップ)
- **`importFromHash` パース失敗が無音**: catch ブロックが `console.warn` のみで終了。
  `UI.toast(t('invalidBoard'),'err')` に置換してユーザーに通知。
- **保存失敗時の重複 console.error**: `Persist.save` が `console.error` と toast を両発行。
  toast は維持し `console.error` 行を削除。
- **BroadcastChannel 初期化失敗の console.warn**: 非クリティカル catch を `catch{}` に簡略化。

### ✅ v1.6.40 で解消(a11y: スタイルパネル + SW dead code)
- **スタイルパネル装飾ラベルが SR で読み上げられる (WCAG 1.3.1)**: "S"/"F"/"α" スパンに
  `aria-hidden="true"` 追加。各グループには `aria-label` が既存のため冗長ラベルを非表示化。
- **サイズ・不透明度グループの `role` 不在**: `role="group" aria-label="Size/Opacity"` を付与。
- **SW catch の dead code `r||`**: cache miss 後の catch で `r` は常に falsy。不要な `r||` を削除。

### ✅ v1.6.41 で解消(a11y: 残余 sp-label)
- **"Line style" グループの sp-label に `aria-hidden` なし**: `data-t="lineStyle"` スパンに
  `aria-hidden="true"` を追加。v1.6.40 で 4 件修正したが、このラベルのみ残存していた。

### ✅ v1.6.45 で解消(a11y: sConn aria-live + zoom-badge グループ)
- **オンライン/オフライン遷移が SR に無音**: `sConn` span に `aria-live="polite"` を追加。
- **ズームコントロールに ARIA グループなし**: `.zoom-badge` に `role="group" aria-label="Zoom controls"` を追加。

### ✅ v1.6.44 で解消(a11y: minimap role/label + x,y aria-hidden)
- **minimap canvas の `aria-label` が非説明的 (WCAG 1.1.1)**: `role="img"` と
  `aria-label="Board minimap — click to navigate"` に変更。SR が目的と操作方法を読み上げ可能に。
- **ステータスバー `x,y` ラベルが SR に読まれる**: 装飾的な `<span class="lbl">x,y</span>` に
  `aria-hidden="true"` を追加。隣接する座標値のみ SR に伝わるよう修正。

### ✅ v1.6.43 で解消(a11y: ズームボタン)
- **ズーム表示が `<div>` で非インタラクティブ (WCAG 2.1.1)**: `<button class="zoom-val">` に変換し
  Tab フォーカス・Enter/Space キーボードアクセスを可能に。`aria-label` 追加。

### ✅ v1.6.42 で解消(a11y: canvas aria-label 動的更新)
- **canvas `aria-label` がツール変更時に更新されない (WCAG 2.4.6)** (audit §9 ⬜ 解消):
  静的な長いラベルを `pickTool` 呼び出し時に `"${tool} — Drawing canvas. Tab/Shift+Tab cycles shapes,
  Enter creates, arrows move."` で動的更新。ツール名を含む記述で現在モードを SR が読み上げ可能に。
  副作用: 静的 HTML が 244 文字 → 14 文字に短縮し、gzip 54B 節約 (44,956B、100B under budget)。

### ⬜ 既知の未充足(将来 ADR で対応 / 詳細は research docs)
- **z 順序 op のスケーラビリティ**: `zorder` が全 shape スナップショットを保持(大規模で履歴/帯域肥大)。
  fractional index へ移行が望ましい(`research-improvements.md` 項目A)。専用 ADR 予定(P0 可逆性に触れるため)。
- **リサイズ時のオブジェクトスナップ**: 現状スナップは移動のみ。リサイズハンドルへの拡張は将来課題。
- **DOM ミラー a11y**: 図形ごとの DOM ノードによるネイティブ SR 対応は将来課題(§10、cat 6)。
- CI の `ci.yml` は GitHub App 権限の都合でブランチ未反映(手動適用要)。

> 凡例: MUST=必須契約、✅=本版で適合、⬜=未充足(優先度は research docs の総括表)。
