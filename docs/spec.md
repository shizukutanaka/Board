# Board — 仕様書 (Specification)

> Board v1.6.70+(`[Unreleased]` 反映)の正式仕様。実装(`index.html`)が満たすべき契約を定義し、
> **§13 適合ギャップ** で解消済み/未充足を、**§14 長所・短所・改善点** で現状評価とロードマップを示す。
> 本書は実装と対で更新する。関連: 設計=`docs/architecture.md`、ADR=`docs/ADR-000N-*.md`、
> 改善調査=`docs/research-improvements.md` / `docs/category-research*.md`、変更履歴=`CHANGELOG.md`。

## 1. 目的と不変条件 (MUST)

Board は「サインアップ/重量/有料/プライバシー侵害」を全否定するオフラインホワイトボード。

- **単一HTMLファイル**。外部 `<script src>` / `<link href>` / CDN / フォントを**追加しない**(CI grep 強制)。
- **サイズはハード上限なし**(2026-06-13 に gzip 44KB 予算を撤去。理由は CLAUDE.md 参照)。
  小さく保つことは依然「指針」だが、整合性・正しさを優先してよい。暴走防止に **raw 512KB の緩い上限**のみ
  `test.mjs` で残す(現状 raw ~185KB / gzip ~56KB)。
- `state` の変更は必ず **`Store` 経由**(undo 完全性)。
- **Render はほぼ純粋**(`state` を読むのみが原則)。唯一の例外は `getImg()` の `_imgCache`(LRU)書換 +
  `img.onload` 登録(非同期画像ロード。`state` は変更しない)。`drawShape` に新たな副作用を足さない。
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
| `add` | `{shape}` | delete(id 一致は idempotent) |
| `del` | `{shapes:[]}` | re-add |
| `upd` | `{id, before, after}` | パッチ swap(最小パッチ) |
| `move` | `{ids:[], dx, dy}` | translate(-d)(可換 = 並行収束) |
| `zorder` | `{changes:[{id,before,after}]}`(最小デルタ)/ 旧 `{after:[…]}` | frac 復元 + `sortZ()` |
| `group` | `{ids, gid, before}` | groupId 復元 |
| `ungroup` | `{ids, before}` | groupId 復元 |
| `align` | `{before:[], after:[], dir}` | スナップショット復元(flip/lock/rotate も再利用) |
| `style` | `{before:[], after:[]}` | スナップショット復元(色/線種/不透明度) |
| `resize` | `{before:[], after:[]}` | スナップショット復元(w/h) |
| `clear` | `{shapes:[]}` | re-add |
| `replace` | `{before:[], after:[]}` | 盤面まるごと swap(共有URLインポート。**local 専用** = 非 `REMOTE_OPS`) |

- **MUST**: 各 op は `_apply(op,false)` で完全に逆操作できる(`test.mjs` の property-based テストで
  add/move/upd/del/zorder/align を混在生成し往復検証)。
- `align` op は `dir`(`'flip'`/`'lock'`/`'rotate'`/整列方向)で意味を分けつつ同一の before/after
  スナップショット機構を共有 — `_apply` 分岐を増やさず可逆性を担保する設計。

## 3. アーキテクチャ層
`Input → Tools(begin/cont/end) → Store(op-log) → State → Render(RAF, Canvas2D) → Persist(IDB)`。
座標: `s2w(p)=p/zoom+viewport`、`w2s(p)=(p-viewport)*zoom`。DPR キャップ 3。

## 4. ツール
select(V) / hand(H,Space) / pen(P) / rect(R) / ellipse(O) / arrow(A) / line(L) / text(T) /
eraser(E) / sticky(N) / frame(F)。Shift で軸拘束・正方形/正円。

## 5. 編集機能
マーキー/加算選択、移動、8 ハンドルリサイズ(line/arrow は端点)、**回転**(`doRotate`、box 系のみ、
グループ中心で公転)、**反転 H/V**(`doFlip`、⇧H/⇧V)、**ロック**(`doLock`、位置固定。移動/削除/整列/
回転/反転すべてがスキップ)、group/ungroup(⌘G/⌘⇧G)、整列(左右上下中央/均等)、z 順序(`]`/`[`/⇧付き)、
グリッドスナップ(⇧G)、オブジェクトスナップ(移動・**リサイズ**時に他図形の辺/中心へ整列、ガイド線表示。
グリッドスナップ off 時)、**バインド済みコネクタ**(line/arrow 端点を図形に結合 → 図形追従、端点は実エッジへ投影)、
**コネクタ(エッジ)ラベル**(line/arrow をダブルクリックで中点にラベル、フロー図の判断分岐等。ADR-0003)、
フォーマットペインター(Alt+C/V)、**カスタムカラー**(`<input type=color>` ストローク/塗り)、不透明度、
線種(実線/破線/点線)、コピー/貼付/切取/複製(`groupId`・コネクタ結合先を新 id へ再マップ)、
**キーボード移動・リサイズ**(矢印=ナッジ、Alt+矢印=リサイズ。共に frame 子要素追従 + ロックスキップで
ポインタドラッグとパリティ)、undo/redo 最大 500。

## 6. キーマップ
`KEYMAP` が全ツールを網羅。⌘Z/⌘⇧Z=undo/redo、⌘A=全選択、⌘C/V/X/D、⌫=削除、
⌘±/0=ズーム、⇧1=フィット、⌘E=PNG、⌘⇧E=SVG、⌘P=PDF、⌘S=保存、`?`=ヘルプ、Esc=解除、
矢印=ナッジ(⇧で10px)、**Alt+矢印=リサイズ**、**⇧H/⇧V=反転**、**`,`/`.`=回転 ∓15°**、
**Tab/⇧Tab=図形巡回**、Enter=作成(`select` 以外のツール)/ 選択中の単一シェイプのラベル・
テキストを編集(`select` ツール、ADR-0013)、**P=ペン**、**⇧P / Ctrl+Enter=プレゼン**。
Esc は コンテキストメニュー → 開いているモーダル → 選択解除 の順で閉じる。

## 7. 永続化
IndexedDB(`board`/`docs`/`main`)。保存対象=`{v,shapes,viewport,docName,savedAt}`。
500ms デバウンス + `beforeunload`。**MUST**: open/load 失敗時も in-memory で起動継続(main の try/catch)。

## 8. 同期プロトコル(opt-in)
- 同一ブラウザ=BroadcastChannel、端末間=WebRTC DataChannel(手動シグナリング)。
- op エンベロープに CRDT clock `{peer, seq, ts}`、`peer:seq` で dedup(`seenOps`、上限 `MAX_SEEN_OPS`)。
- **MUST(受信検証)**: `applyRemote` は (a) op 型 allow-list(`REMOTE_OPS` =
  add/del/upd/move/clear/group/ungroup/zorder/align/style/resize)、(b) **ペイロード検証**
  (`validRemotePayload`: 各 forward-apply が参照するフィールドの型 + move の有限数、`validPatch` で
  NaN/Inf・prototype 汚染キーを再帰的に排除)、(c) **クロック検証**(`validClock`)を通った op のみ適用。
  remote op は local undo に入れない。`replace`(盤面まるごと swap)は `REMOTE_OPS` に**含めない** —
  悪意ある peer が盤面を消せないように local 専用。
- **並行収束 (ADR-0002 / プロパティ単位 LWW)**: 同一図形の**同一プロパティ**への並行編集は
  `(ts,peer,seq)` の全順序 `clockNewer()` と書込クロック `state.wclock`(`shapeId→{prop:clock}`、
  図形には載せない)で**古い書込を落として決定的収束**。**互いに素なプロパティは双方生存**。
  `move`/`zorder` は可換なので LWW 非適用。`upd`/`style`/`resize`/`align`/`group`/`ungroup` に適用。
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

### ✅ v1.7.69 で解消(セキュリティ — 画像 dataUrl の外部 URL 注入)
- **画像 `dataUrl` が外部 URL でも通る intake ゲートの穴**: `validShape`(全受信経路の
  単一ゲート)が画像の `dataUrl` を検証せず、`getImg()`→`img.src` 経由で外部 URL への
  ネットワークリクエストが発生しえた(トラッキングピクセル / P2P での IP 逆匿名化、
  「外部リソース不読込」不変条件の破れ)。悪意あるピアの `add` op でも到達。`validPatch`
  に `/^data:image\//` ガードを追加し全経路(shape + upd パッチ)を一括で封鎖。

### ✅ v1.7.68 で解消(多次元 deep-audit — 8観測軸並列 + 3票制敵対的検証、9件確認)
- **【最重要】undo が LWW 確定済みのリモート新規書き込みを踏み潰す(ADR-0002 適用漏れ)**:
  `_stampWrites` は `upd`/`style`/`resize`/`align`/`group`/`ungroup` 全てに書き込み
  クロックを記録するのに、undo 時の「新しいリモート書き込みを保護する」ガードが `upd`
  にしか無かった。`_lwwSkip` 共有ヘルパーで全ケースに拡張。詳細は ADR-0002 の
  「2026-07-13 追記」節。
- **テーマトグルの localStorage 常時失敗時のスタック**: 毎回ライブ再読していたのを
  `_themeCache`(メモリ内、ADR-0014 の LANG/T と同方式)に変更。
- **自分のアバターの「You」が英語固定**: `t('you')` 化 + `toggleLang()` の再同期対象に追加。
- **SVG エクスポートがフレームの無ラベル・不透明度で canvas と乖離**: 既定文字列
  「Frame」フォールバックと `*0.9` 不透明度係数を SVG 側にも適用。
- **SVG エクスポートの単点ペン(size 欠落)半径が canvas と不一致**: フォールバックを
  `(SZ||1)/2` → `(SZ||2)/2` に修正。
- 副次的に文書側の矛盾も2件発見・修正: `docs/ADR-0009-id-index.md` の箇所数内訳の
  算術誤り(5+3=8≠9)、`docs/spec.md` §6 の `Enter` キーマップ記述漏れ(ADR-0013 未反映)。

### ✅ v1.7.63 で解消(製品全体監査 — 堅牢性 5 件 + UX/i18n 6 件)
- **SW 更新不能(最重要)**: fetch が全リクエスト cache-first・再検証なしのため、初回
  キャッシュ後は旧 HTML→旧 SW の自己再生産で activate/controllerchange が構造的に発火せず、
  「オフライン等価 + 自動更新」の後者が v1.6.5 以来死んでいた。navigation を network-first に。
- **ピア intake**: peer id の型/長さ無検証 + `state.peers` 無上限(WebRTC は全メッセージ種別を
  無フィルタ受信)→ `MAX_PEERS=32` + 64字ガード。スナップショット送信も 1s スロットル。
- **importBoard onerror 欠落 / docName 4経路無クランプ**。
- **aria-label/title 英語固定(44箇所)**: `applyI18n` を data-t-aria/data-t-title 対応に拡張。
  「a11y の積み上げ」(§14.1)と「日英対応」の主張が SR ユーザーに対して初めて同時に真になる。
- **doBeautify のメニュー到達経路 / t() 生キー2件 / en `grid` キー欠落 / SR 無音 5 操作 /
  ヘルプ 2 行欠落**。ja/en キーセット一致は恒久テスト化。
- 監査で健全と再確認: XSS 皆無、remote op ペイロード検証、JSON.parse/localStorage/タイマー、
  sticky コントラスト。

### ✅ v1.7.62 で解消(ADR-0011 — ピア選択ハイライト + HiDPI オーバーレイ修正)
- **プレゼンス(他者の選択状態)未実装 [P2]**: ADR-0010 が明示的に持ち越した残件。
  `{k:'selection',peer,ids}` を新規メッセージ種別として追加。送信は `state.selection` の
  40 箇所超の mutation 部位ではなく `frame()`(rAF ドライバ)での変化検出 1 箇所に集約
  (選択変更は必ず再描画を伴うため全経路を捕捉)。新規ピア参加時は 1 回だけ再送。受信は
  `viaRtc ? _rtcPeerId : msg.peer` ルーティング(ADR-0010 の落とし穴を踏襲)+ 防御的
  intake。非空虚テスト 12 件(2-peer 収束ハーネス)。
- **HiDPI で全オーバーレイ UI がズレる描画バグ(v1.6.5 から残存)**: `draw()` の
  オーバーレイパスは DPR トランスフォームを張るのに、選択枠・ハンドル・ガイド・
  マーキー・レーザー・ピアカーソルの 5 関数が `G.w2s` 出力へさらに `*DPR` を掛けて
  おり DPR>1 で座標が二重スケールしていた。DPR=1 では一致するため fake-DOM テストでは
  原理的に検出不能だった(§14.2「テストの偏り」が指摘するリスクの実例)。オーバーレイ
  パスを「CSS px で描く」規約に統一して修正。

### ✅ [Unreleased] で解消(ADR-0010 — ピアカーソル表示)
- **プレゼンス(他者カーソル)未実装 [P1]**: §14.2 が挙げていた弱点。`{k:'cursor',peer,x,y}`
  を新規メッセージ種別として追加、既存の `broadcast()` と同じ二経路(BC + WebRTC dc)で
  送信、`CURSOR_THROTTLE_MS=60` でスロットル。非永続(op-log/Persist 対象外)。実装中に
  「WebRTC 経路は hello/ping が流れないため、相手ピアは実 peerId でなく自分側の合成
  `_rtcPeerId` で管理されている」という既存の非対称性を発見し、`_onRecv` に `viaRtc`
  フラグを追加してルーティングを正しく分岐。他者の**選択状態**のハイライトは意図的に
  スコープ外(別 ADR)。非空虚テスト8件(2-peer 収束ハーネス、BC経路・スロットル・
  viaRtc分岐・未知ピアの無視・非有限数の拒否を固定)。

### ✅ [Unreleased] で解消(文書間の整合性監査 — ステータス表記の矛盾)
- **ADR-0001 Step 4 が「Proposed」のまま放置されていた**: ADR 本文(Step 4 節)には既に
  「整数 `z` の完全削除は高リスク・低価値のため恒久的に見送る」という明確な決定と理由が
  書かれていたにもかかわらず、ADR 冒頭のステータス行は「Step 4 は Proposed」(未決定)の
  ままで、本 spec の §13 も「残: 整数 z 廃止 (Step 4)」と未充足の TODO として扱っていた。
  本文の決定とステータス表記が矛盾しており、将来のセッションが「Proposed=着手すべき」と
  誤読して高リスク・低価値な変更に着手しかねなかった。ADR-0001 冒頭とステップ見出しを
  「見送り確定」に修正し、本 spec の §13 からも未充足リストではなく解消済みとして記載
  (下記「既知の未充足」から z 順序の項目を削除)。§2.2 の MUST 契約(`z:number` 必須)は
  この決定と整合しており、変更不要であることも確認済み。

### ✅ [Unreleased] で解消(ソクラテス式問答 — 新視点「機能間 a11y パリティ」)
- **検索ナビが SR に「何が見つかったか」を伝えない (P1, a11y)**: 新視点=「**検索機能は他の a11y と
  同じユーザーに奉仕しているか?**」。検索ナビ(Enter/Shift+Enter)は移動の度に裸のカウント「2/7」のみを
  アナウンスし、晴眼者には見えるマッチ図形を SR ユーザーには名指していなかった。検索は**内容で**マッチ
  するのに結果がその内容を省くのは自己矛盾。Tab 巡回は既に `describeShape` で内容を読み上げており、
  検索ナビだけがカウントのみ=機能間 a11y パリティ違反。`_sqAdvance` を `describeShape(sh) + 位置`
  に変更し Tab 巡回と統一。非空虚テスト(6 アサート、修正前失敗を確認)。

### ✅ [Unreleased] で解消(正しさ監査 第N弾 — コードパスのパリティ)
- **キーボード移動と ポインタ移動の不整合 (P2)**: 矢印ナッジが (a) frame 子要素を追従せず
  (ポインタドラッグは追従)、(b) **ロック図形を移動**していた(`doMove`/`endSelect`/`doDelete`/
  `doAlign`/`doRotate`/`doFlip` は全て `!locked` をスキップ)。frame 子要素展開を `withFrameChildren`
  に共通化し、`nudgeSelection` がドラッグと完全パリティ(子追従 + ロックスキップ)。非空虚テストで
  「子が追従」「ロック子は不動」「move op にロック子が不在」を担保。
- **コピー/複製でコネクタ結合先が元図形のまま (P2)**: `_placeCopies` は `groupId` を `gidMap` で
  再マップするが `sh.a`/`sh.b` を放置。図形+コネクタをまとめて複製するとコネクタが**コピー先でなく
  元図形**に結合したまま。二段階(`idMap` 先行生成 → `sh.a`/`sh.b` 差替)で解消。
- **`doAlign` がロック図形を移動 (P2)**: 唯一 `filter(Boolean)` のままだった整列/分配を
  `filter(s=>s&&!s.locked)` に。ロック図形は整列の参照計算からも除外。
- **付箋ダブルクリック編集後に幅が崩れる (P2)**: blur ハンドラが text/sticky を区別せず幅を上書き。
  `resizeAfterTextEdit(s,text,c)` で型分岐(text=w/h 自動、sticky=ユーザ幅保持 + `wrapText` 行数で
  h のみ追従)。
- **大盤面の PNG/PDF が空白化 (P2)**: 固定スケールでブラウザのキャンバス上限(~16384px / 面積)を
  超えると `toBlob` が null/切れ。`exportScale(w,h,desired)` で幅・高さ・面積を満たす倍率にクランプ。

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

### ✅ v1.6.57 で実装(feat: シェイプ反転 flip H/V)
- **回転・反転が無い**: 機能ギャップ監査の P1。`doFlip(axis)` が選択 bbox 中心軸でミラー。
  専用 op を持たず `align` op を再利用するため `_apply` 分岐の追加ゼロで完全可逆。
  ⇧H/⇧V とコンテキストメニューから実行。box は x/y、line/arrow は端点、pen は全点を反転。

### ✅ v1.6.56 で実装(feat: カスタムカラーピッカー)
- **プリセット 7 色以外を選べない**: 機能ギャップ監査(`docs/feature-gap-2026-06.md`)で最頻出の
  欠落と判明。スタイルパネルにネイティブ `<input type="color">`(ストローク用・塗り用)を追加。
  既存の `applyStyleToSelection` 経路を再利用し、選択中シェイプにも即時反映。外部依存なし。

### ✅ v1.6.52 で解消(a11y: ダイアログフォーカス管理 WCAG 2.4.3)
- **ヘルプ/共有ダイアログ開閉でフォーカスが移動しない**: `toggleHelp`/`openShare`/`closeShare` を改修。
  開くとき Close ボタンへ、閉じるときトリガーボタンへフォーカスを移動。

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

### ✅ v1.6.66 で解消
- **リサイズ時のオブジェクトスナップ**: リサイズハンドルをドラッグすると動かす辺が近傍シェイプの
  辺/中心へスナップ(`resizeSnap`、移動スナップとパリティ)。整列ガイド表示、グリッド優先(排他)、
  回転シェイプ・線端点はスキップ、コミットでガイドをクリア。

### ⬜ 既知の未充足(将来 ADR で対応 / 詳細は research docs)
- **DOM ミラー a11y**: 図形ごとの DOM ノードによるネイティブ SR 対応は将来課題(§10、cat 6)。
  README のアクセシビリティ節に「canvas 内容はスクリーンリーダーから本質的に不可視」という
  構造的制約を明記済み(2026-07)— この項目はその制約を解消する将来の拡張であり、現状の
  README の記述と矛盾するものではない。
- CI の `ci.yml` は GitHub App 権限の都合でブランチ未反映(手動適用要、ファイル自体は
  作成済み — CLAUDE.md MAP 参照)。

> 凡例: MUST=必須契約、✅=本版で適合、⬜=未充足(優先度は research docs の総括表)。

## 14. 長所・短所・改善点(現状評価)

仕様 vs 実装の全面レビューで洗い出した、製品としての評価とロードマップ。優先度: **P1**=価値直撃 /
**P2**=整合性・正しさ / **P3**=磨き込み。実装済みは §13 / CHANGELOG を参照。

### 14.1 長所(維持すべき価値)
- **ゼロ摩擦**: 単一HTML・登録不要・即描画。SW でオフライン等価、URL fragment 共有はサーバ非通過。
- **アーキテクチャの一貫性**: 全変更が可逆 op-log を通り、undo/redo・sync・永続化が同一経路。
  property-based テストで往復可逆性を機械検証。
- **CRDT 収束**: プロパティ単位 LWW(ADR-0002)+ 分数インデックス z 順序(ADR-0001)で、
  並行編集が決定的に収束。二者ハーネスで実測。
- **防御的 intake**: 全受信経路(IDB/sync/URL/remote)が `validShape`/`validPatch` を共有し、
  NaN・prototype 汚染・型不正を一元排除。エクスポートも属性エスケープ + 数値強制で注入不可。
- **a11y の積み上げ**: キーボードで作成→巡回→移動→リサイズ→編集が完結。WCAG AAA コントラスト、
  forced-colors / reduced-motion 対応。
- **表示=出力パリティ**: pen 可変線幅・破線・テキスト折返しを canvas と SVG が同一ヘルパで描画。

### 14.2 短所(既知の弱み)
- **a11y の天井**: canvas は単一の `role=application`。図形ごとの DOM ミラーが無く、スクリーン
  リーダーは個々の図形を木構造として辿れない(巡回トーストで緩和するのみ)。**[P1]**
- **同期の運用性**: WebRTC は手動シグナリング(URL 手渡し)。シグナリングサーバ無しは長所だが
  「URL を開くだけで共同編集」には届かない。プレゼンス(他者カーソル ADR-0010・選択状態の
  ハイライト ADR-0011)は実装済みで、残る弱点はシグナリング UX のみ。**[P2]**
- **多ページ非対応**: 1 盤面のみ。`docs` ストアは単一 `main` 固定で、ページ追加/切替/サムネが無い。**[P2]**
- **入出力の幅**: インポートは画像 + 自盤面 JSON のみ。`.excalidraw` / SVG 取込 / Markdown 貼付は無い。**[P2]**
- **大規模スケール**: viewport カリングは有るが空間索引は pickTop のグリッドのみ。>2000 図形での
  全描画・bbox 再計算は線形。quadtree / ダーティ矩形再描画は未着手。**[P3]**
- **z 順序の二重管理**: `frac`(正準)と整数 `z`(レガシーボードの移行アンカー兼 back-compat
  フォールバック)が併存。ADR-0001 Step4 で**恒久的に併存させる**と決定済み(未完の作業では
  ない)— 完全な単一正準化は高リスク・低価値と判断されたため、ロードマップからは除外。**[P3]**
- **画像の肥大**: dataURL を state にインライン保持 → 大画像で盤面 JSON / IDB が膨張。
  参照分離・再圧縮は無い。**[P3]**
- **テストの偏り**: 多くが文字列プレゼンス検査。behavioral 比率は上がったが、レンダリング実体や
  ポインタ操作シーケンスの検証は薄い。**[P3]**

### 14.3 改善点(ロードマップ)
| 優先 | 項目 | 概要 | 形態 |
|---|---|---|---|
| P1 | DOM ミラー a11y | 図形ごとの off-screen DOM ノードで SR ネイティブ対応 | 大型 ADR |
| P2 | 多ページ | `docs` を複数キー化 + ページ切替 UI + サムネ | ADR + リリース |
| P2 | インポート拡張 | `.excalidraw` / SVG / Markdown 取込 | 段階実装 |
| P2 | コードパス・パリティ監査の継続 | drag/keyboard/remote の機能差を埋める(本リリースで nudge を解消) | 継続監査 |
| P3 | 空間索引(quadtree) | >2000 図形の描画/ヒット/bbox を準対数化 | ADR |
| P3 | 画像参照分離 | dataURL を CAS 的に分離し state を軽量化 | ADR |

> 方針(CLAUDE.md 準拠): 各 P1/P2 は**別 ADR + 独立リリース**。一気に全部は作らない。
> 「ゼロ秒で使える/オフライン等価/単一HTMLで小さく保つ」を破る改善は採用しない。
