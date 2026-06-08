# Board — 仕様書 (Specification)

> Board v1.6.13 の正式仕様。実装(`index.html`)が満たすべき契約を定義し、末尾の
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
pen=`pts:[[x,y],…]`、text/sticky=`text,fontSize`、sticky=`color`、image=`dataUrl`、
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
フォーマットペインター(Alt+C/V)、不透明度、コピー/貼付/切取/複製、undo/redo 最大 500。

## 6. キーマップ
`KEYMAP` が全ツールを網羅。⌘Z/⌘⇧Z=undo/redo、⌘A=全選択、⌘C/V/X/D、⌫=削除、
⌘±/0=ズーム、⇧1=フィット、⌘E=PNG、⌘⇧E=SVG、⌘P=PDF、⌘S=保存、`?`=ヘルプ、Esc=解除、
矢印=ナッジ(⇧で10px)、F→present、Ctrl+Enter=present。

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

### ⬜ 既知の未充足(将来 ADR で対応 / 詳細は research docs)
- **z 順序 op のスケーラビリティ**: `zorder` が全 shape スナップショットを保持(大規模で履歴/帯域肥大)。
  fractional index へ移行が望ましい(`research-improvements.md` 項目A)。
- **真の筆圧入力**: 線幅は速度プロキシ。pointer の `pressure` を取り込めばペンタブで更に自然
  (データモデルに第3要素を足す拡張、cat 3)。
- **DOM ミラー a11y**: 図形ごとの DOM ノードによるネイティブ SR 対応は将来課題(§10、cat 6)。
- CI の `ci.yml` は GitHub App 権限の都合でブランチ未反映(手動適用要)。

> 凡例: MUST=必須契約、✅=本版で適合、⬜=未充足(優先度は research docs の総括表)。
