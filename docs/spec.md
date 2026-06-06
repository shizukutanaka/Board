# Board — 仕様書 (Specification)

> Board v1.6.7 の正式仕様。実装(`index.html`)が満たすべき契約を定義し、末尾の
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

### ✅ 本リビジョン(v1.6.7)で解消
- **SVG 数値属性の注入**: 文字列色は escape 済みだったが `x/y/w/h/x1..` 等が生挿入で、
  共有URL/sync 由来の文字列座標で markup 注入が可能だった → `buildSVG` を `_num` で全数値強制。
- **受信 op 検証が `add` のみ**: `move`/`upd`/`zorder` 等の payload 未検証で、`move dx={}` 等が
  NaN で shape を破壊し得た → `validRemotePayload` で全 op の構造/有限数を検証。

### ⬜ 既知の未充足(将来 ADR で対応 / 詳細は research docs)
- **可逆性の網羅検証**: property-based テスト(fast-check)未導入。op 列ランダム生成で
  「全適用→全undo=初期」を検証すべき(`category-research-2.md` §18)。
- **z 順序 op のスケーラビリティ**: `zorder` が全 shape スナップショットを保持(大規模で履歴/帯域肥大)。
  fractional index へ移行が望ましい(`research-improvements.md` 項目A)。
- **キーボードでの図形作成/巡回**: 作成系はマウス専用。Tab 巡回 + DOM ミラー a11y 未実装(§10、cat 6)。
- **`Persist.load` の shape 検証**: IDB から読む shape は未検証(他 intake は検証済み)。前方互換のため検証追加が望ましい。
- **テキスト自動折返し**: text/sticky は改行のみで幅折返し無し(cat 11)。
- **大規模描画**: viewport カリング / 空間索引未実装(architecture.md 予告、cat 1)。
- **ペン品質**: 固定幅。筆圧/平滑化(perfect-freehand)未実装(cat 3)。
- CI の `ci.yml` は GitHub App 権限の都合でブランチ未反映(手動適用要)。

> 凡例: MUST=必須契約、✅=本版で適合、⬜=未充足(優先度は research docs の総括表)。
