# Architecture

> Board v1.6 の内部設計。Carmack (perf) · Martin (clean) · Pike (simple) の適用。

## 全体像

```
┌─────────────────────────────────────────────────────────────┐
│ index.html (single file, ~134KB raw / ~45KB gzip)           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐   ┌────────┐   ┌──────┐   ┌──────────┐       │
│  │ pointer  │→  │  tool  │→  │ op   │→  │  state   │       │
│  │ keyboard │   │ handler│   │-log  │   │(shapes,  │       │
│  │ wheel    │   └────────┘   └──────┘   │ viewport)│       │
│  └──────────┘                           └─────┬────┘       │
│                                               │            │
│                                               ↓            │
│  ┌──────────────┐                      ┌───────────┐       │
│  │  IndexedDB   │ ← debounced 500ms ───│  RENDER   │       │
│  │   persist    │                      │  RAF loop │       │
│  └──────────────┘                      │ (Canvas2D)│       │
│                                        └───────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## 層 (Martin 流)

### 1. Input
`canvas.addEventListener` と `window.addEventListener` で pointer / keyboard / wheel を受ける。ここでは **状態を変更しない**。ツールハンドラに委譲。

### 2. Tools
現在のツール (`state.tool`) に応じて `begin* / cont* / end*` の三段階で gesture を処理。途中状態は `state.draft` に置く (undo に入れない)。`end*` で Store.commit。

11 ツール: select, hand, pen, rect, ellipse, arrow, line, text, sticky, frame, eraser。

### 3. Store (op-log, Command pattern)
```js
Store.commit(op)              // apply + append + cap history
Store.undo()                  // apply inverse + emit inverse op + decrement idx
Store.redo()                  // re-apply + emit fresh-clock copy + increment idx
Store._apply(op, forward)     // switch on op.op
Store._recordCommitted(op)    // record pre-applied op (no re-apply)
Store.applyRemote(op)         // validate + apply remote op
Store._revOps(op)             // op → forward ops reproducing its reverse-apply (ADR-0015)
Store._emit(op)               // fresh clock + stamp + broadcast, NOT pushed to history
Store.broadcast(op)           // send to peers via BroadcastChannel + WebRTC
```

**undo/redo は複製される (ADR-0015)**。`undo()` はローカルで巻き戻すだけでなく、その逆効果を
*前向きに適用できる新しい op* として `_emit` する (新鮮なクロック付き)。歴史は書き換えられない —
ピアは既に元 op を観測済みなので、取り消しは未来向きの新しい書き込みとしてしか表現できない。
`_emit` は `state.history` に積まない (undo が自分自身の undo ステップになってはならない)。
`REMOTE_OPS` に無い op (`clear`/`replace`/`beautify`) は前向きにも複製されないため、その undo も
何も送らない。詳細と逆 op の対応表は `docs/ADR-0015-replicated-undo.md`。

op 型 (全て可逆; `_apply(op, false)` で完全に戻る):
- `{op:'add', shape}` — shape を push (**shape id で冪等**: 既に保持する id の remote add は重複
  push しない。`_applySnapshot` は seenOps を埋めずに shapes を差し替えるため、スナップショットが
  ライブ add op を追い越すと dedup を素通りする — 冪等性でその二重化を塞ぐ。ローカル commit は
  毎回新規 uid なので阻害されず、redo は undo が消した後なので再 push される)
- `{op:'del', shapes:[...]}` — 複数削除を1つに
- `{op:'upd', id, before, after}` — 汎用プロパティ変更
- `{op:'move', ids:[...], dx, dy}` — 平行移動
- `{op:'zorder', before:[{id,z},...], after:[{id,z},...]}` — z 順序スナップショット差分
- `{op:'style', before:[{id,...},...], after:[{id,...},...]}` — マルチ選択スタイル一括変更 (スライダーコアレス)
- `{op:'align', before:[{id,...},...], after:[{id,...},...]}` — 整列
- `{op:'resize', before:[{id,w,h},...], after:[{id,w,h},...]}` — キーボードリサイズ (Alt+矢印) の
  一括パッチ (style/align と同じ Object.assign 機構、複数選択でも単一 undo)
- `{op:'group', ids, gid}` / `{op:'ungroup', ids, gids}` — グループ
- `{op:'clear', shapes:[...]}` — 全消去

**全 op が可逆**。`_apply(op, false)` で完全に戻せる。`test.mjs` のプロパティベーステストで30シナリオ往復検証。

**反転 (flip H/V)** は専用 op を持たず、`align` op を再利用する: `doFlip(axis)` が選択 bbox 中心軸で
各シェイプ座標をミラー (`flipShape`) し、変更前後の完全クローンを `{op:'align',dir:'flip',before,after}`
として記録する。`align` の `_apply` が `Object.assign` でクローンを復元するため、追加の `_apply` 分岐は不要。
単一の非対称シェイプ (pen/line/arrow/text) で意味を持つ。⇧H/⇧V とコンテキストメニューから実行。

#### 受信 op / シェイプの検証 (security)
- `validShape(s)` — 全 intake 経路 (IDB ロード, sync スナップショット, remote add, URL import) が共有する
  構造検証。`id`/`type`/数値 `z` を要求し、pen は `pts` が非空かつ全要素が有限数の `[x,y]` であることを要求
  (欠落/非数の `pts` は `drawPen`/`G.hit`/`G.bbox` が `pts[i][0]` を参照する際にクラッシュするため)。
- `validRemotePayload(op)` — リモート op の payload を `_apply` 到達前に検証。ローカル op は in-process 生成で
  信頼するが、remote op (BroadcastChannel/WebRTC) は各 op 型が参照する正確なフィールドと有限な数値デルタを
  要求する (例: `move` の `dx={}` は全シェイプを NaN 化しうる)。構造的に健全な op にのみ true。

### 4. State
唯一の真実。以下しか存在しない:
```js
{
  shapes: [],
  selection: Set<id>,
  viewport: {x, y, zoom},
  tool, style, history, histIdx,
  clipboard, styleClipboard,
  hover, draft, editing, marquee, guides,
  showGrid, snap, docName, dirty, lastSaveAt,
  peerId, roomId, seq, seenOps,
}
```

### 5. Render
RAF ループ。`needsRender` フラグで再描画をゲート。毎フレーム `draw()` を呼ぶわけではない — `invalidate()` が立ってる時だけ。

描画順:
1. 背景クリア
2. world→screen transform 設定
3. グリッド (zoom が十分なら)
4. フレーム (最初に描画して他の shape が上に乗る)
5. 全 shape (z順、viewport culling で範囲外スキップ)
6. draft (if any)
7. スマート整列ガイド (drag 中のみ)
8. screen space で選択枠 + 8 handle (line/arrow は端点 2 つ)
9. marquee (if any)
10. ミニマップ (独立 canvas)

### 6. Persist
IndexedDB (`board` / `docs` / `main`)。500ms デバウンス。`beforeunload` で最終セーブ。`Ctrl+S` で即時保存。読み込み時に `validShape` で全 shape を検証。

## 座標系

- **world**: shape が持つ座標 (無限)
- **screen**: canvas 上のピクセル / DPR 倍
- 変換: `s2w(p) = p/zoom + viewport`、`w2s(p) = (p-viewport)*zoom`
- 描画は `ctx.setTransform(zoom*DPR, 0, 0, zoom*DPR, -vp.x*zoom*DPR, -vp.y*zoom*DPR)`

## Hit testing

bbox 先置き (quick reject) → shape 型別詳細。`tol = 6/zoom` でズーム時も一定の当たり判定。

**回転シェイプの順序が重要 (v1.7.70 の学び)**: 回転ボックスの当たり判定は
「① ワールド点 vs `G.bbox`(= 回転後のワールド外接矩形)で quick-reject → ② ポインタを
シェイプのローカル座標系に**逆回転** → ③ 未回転の `s.x/s.w` で型別判定」の順で行う。
①(quick-reject)を②(逆回転)より**後**に置くと、ローカル座標系の点をワールド座標系の
外接矩形と比較するフレーム不一致になり、回転した非正方形シェイプの中心から離れた領域が
**不可視の当たり判定漏れ**になる(描画は正常なのにクリックできない)。逆回転は
`shapeRot()` と同じく `s.w!=null`(ボックスシェイプ)でガードする — line/arrow/pen は
未回転で描画されるので当たり判定も未回転にしないと `s.x/s.w=undefined` で中心が NaN になり
永久に当たらなくなる(表示=当たり判定パリティ)。

ペンは line segments の距離チェック。エンドポイント: Ramer-Douglas-Peucker (ε=0.5px) で commit 時に decimation。

**Spatial index** (`v1.6.11`): board に 40+ shape 以上ある場合、`pickTop` は `_buildGrid` でグリッドセルインデックスを構築し `_queryGrid` で候補を絞る。`_apply` ごとに `_invalidateGrid()` で無効化、次の `pickTop` で再構築。

## フレームレート

DPR キャップ 3 (Retina 2x が実効上限)。
requestAnimationFrame 1 本。ユーザー操作中も常に 60fps を目標。

重い場合の緩和:
- `needsRender` でスキップ
- グリッドは `gsZ<6` で描画スキップ + `opacity` で fade
- 選択枠は screen space で描画 (transform 切替 1 回のみ)
- Viewport culling: `inView(s, visibleWorldRect())` で範囲外 shape をスキップ
- getCSS: `_cssCache` でテーマカラーを memoize (テーマ変更時に `clearCSSCache`)

## DPR

`canvas.width = cssW * DPR` で内部解像度を確保。Retina で滑らか。DPR 変化 (マルチモニタ移動) で `resize()` 再計算。

**オーバーレイパスの規約 (v1.7.62 の学び)**: `draw()` 後半のオーバーレイパス
(選択枠・ガイド・マーキー・レーザー・ピアカーソル/選択) は
`ctx.setTransform(DPR,0,0,DPR,0,0)` を張った **CSS px 空間**で描く。`G.w2s()` の出力を
そのまま使い、**`*DPR` を手で掛けてはならない** — トランスフォームが既に DPR を供給して
いるため二重適用になり、DPR>1 の画面で座標が DPR 倍にズレる。このバグは v1.6.5 から
5 関数に残存していた (DPR=1 では両者が一致するため、fake-DOM テストでも DPR=1 実機でも
原理的に検出不能だった)。線幅・破線・半径も CSS px で指定すればトランスフォーム経由で
正しくスケールする。test.mjs にプレゼンス検査 (`*DPR` の再混入検知) を追加済み。

## i18n

`I18N` オブジェクトに ja / en を併記。`navigator.language` で起動時判定。`T = I18N[LANG]`。
DOM 要素は `data-t` 属性 + `UI.applyI18n()` で翻訳 (起動時に 1 回走査)。
`t(key)` = `T[key] || I18N.en[key] || key` (キー名フォールバックで破綻しない)。

## セキュリティ

- `innerHTML =` は CI の grep で禁止 (ゼロ件確認)
- 外部リソース (`<script src>` / `<link href>`) は CI の grep で禁止
- SVG / PDF エクスポート: 全属性値を `_esc()` でエスケープ (`& < > "`)
- 画像: `data:image/` プレフィックス検証のみ許可
- 受信 op: `REMOTE_OPS` 許可リスト + `validRemotePayload` で型チェック
- `validShape` を全 intake パス (IDB, sync, URL, .board import) で適用

## アクセシビリティ (v1.6.37+)

- Canvas: `role="application"`, `aria-label` でキーボード操作を説明
- Toast: 親 `aria-live="polite"` + 個別 `role="alert"` (err/warn) / `role="status"` (ok)
- コンテキストメニュー: `role="menu"` / `role="menuitem"` / `role="separator"`, Escape で閉じる, 開時に最初の項目へフォーカス
- ヘルプモーダル / 共有モーダル: Escape で閉じる, `role="dialog"` + `aria-modal`
- 全インタラクティブ要素: `aria-label`, `aria-pressed`
- WCAG AAA: テキスト 18:1+, ブランドカラー `--brand-ink` (#003B40) で 7.5:1 非テキスト
- `prefers-reduced-motion` / `prefers-color-scheme` / `forced-colors` / `prefers-contrast` 対応

## P2P 同期

### BroadcastChannel (同一オリジン間)
`NET_CHANNEL_PREFIX+'board.'+roomId` チャンネルで op をブロードキャスト。`ping/pong` でピア検出 (`NET_PRESENCE_INTERVAL` 間隔)。

### WebRTC DataChannel (端末間)
手動シグナリング (offer/answer をコピーして交換)。DTLS 暗号化。

### CRDT clock
各 op は `{peer, seq}` clock を持ち、`seenOps` (Set) で重複排除。スナップショット sync は `seq:'snap'+i` で個別 clock を割当。

## 回転 (v1.6.62-65 — ソクラテス問答監査)

`shape.rotate` (度) は **全 box 型** (rect/ellipse/sticky/text/image/frame) に適用される。
pen/line/arrow は点ジオメトリで box 中心が無く回転中心が NaN になるため `doRotate` で除外
(`s.w!=null` フィルタ)。複数選択回転は選択 bbox 中心で各シェイプを公転 (`doFlip` と同じ
群中心セマンティクス)、単一選択はその場回転。`,`/`.` キーで ±15°、ロックシェイプは除外。

**ドラッグ回転ハンドル (v1.6.67)**: 単一選択時、`getRotHandle` がシェイプ上辺中央の外側
(`ROT_OFFSET` 画面px) に回転ノブの世界座標を返す (回転シェイプではノブも公転)。
`hitRotHandle` でヒット → `ptr.dragKind='rotate'`。ドラッグ中は
`atan2(wp.y-cy, wp.x-cx)+90°` で絶対角を算出 (ノブ上 = 0°)、Shift で 15° スナップ。
ピボットはシェイプ中心 (`drawShape` と一致)。コミットは `upd` op で可逆、確定時に
`describeShape` を `aria-live` トーストで読み上げ。`pointercancel` で `rotOrig` 復元。
ノブは resize ハンドルより優先 (bbox 外なので衝突しない)。

全経路で整合 (v1.6.65 で予算撤去後に完成):
- **draw**: `drawShape` が `ctx.translate/rotate` で box 中心周りに回転。
- **hit**: `G.hit` が点を逆回転して未回転ヒットテスト。
- **bbox**: `G.bbox` が回転包絡矩形を返す (text も v1.6.65 で対応)。
- **SVG**: rect/ellipse/text/image/sticky/frame に `transform="rotate(...)"`。
- **PNG**: `drawShape` 経由で自動的に回転。
- **ミニマップ**: 各 box シェイプに回転変換を適用 (v1.6.65)。
- **コネクタ束縛**: `_edgePt` が回転対応 — 対象点を逆回転 → 未回転 box のエッジ計算 →
  順回転で、回転シェイプの**実エッジ**に端点を投影 (包絡矩形角ではない、v1.6.65)。
- **describeShape**: SR アナウンスにロック状態と回転角を含む (v1.6.65)。
- **リサイズ (v1.6.69)**: `getHandles` は回転シェイプでも 8 ハンドルを回転位置に返す。
  `applyResize` はドラッグ点をローカル (未回転) フレームへ逆回転 → 既存 switch/Shift/Alt を
  適用 → 反対側アンカー (角/辺中点) をワールド座標で固定するよう平行移動。回転矩形の選択枠は
  `_rotPt` で 4 角をなぞる。Shift (比率)・Alt (中心固定) も回転シェイプで機能。

### 残る軽微な非対応
- **回転リサイズのカーソル向き**: `handleCursor` は軸並行の向きを返すため、回転シェイプでは
  カーソルの矢印向きが実際の伸縮方向と一致しない (機能は正しい、見た目のみ)。
- **マーキー選択はロックシェイプも選ぶ**: 選択はされるが `doMove` が移動をスキップするため、
  群移動でロックシェイプだけ取り残される (技術的に整合だが UX 上は分かりにくい)。
- **整列は回転後 bbox 基準**: `doAlign` は `G.bbox` (包絡矩形) で整列する。回転シェイプは
  見かけより大きい bbox を持つため、整列結果が直感と異なる場合がある。

## 検索ハイライトの描画 (v1.6.61)

`_sq` にマッチするシェイプはワールド変換ブロック内で `strokeRect` され、
`lineWidth=3/zoom` でズーム補正して一定の視覚太さを保つ (スクリーン空間描画の代替)。

## 今後

- マルチページ、スレッドコメント (v1.7+)
- z 順序の fractional indexing 化 (ADR 予定 — P0 可逆性/sync に触れる)
- Plugin API (iframe sandbox + postMessage)、Figma import (v2.0)
- AES-GCM E2E 暗号化 (URL fragment key + WebRTC DataChannel)


## テストハーネスの穴は「仕様」ではない (v1.7.75-76 の教訓)

短期間に3件、**テストで一度も実行されていない経路**からバグが出た。

| 経路 | 潜んでいたもの | 発覚した理由 |
|---|---|---|
| `Share.exportToUrl` | 共有リンクが平文だった (v1.7.71) | コードを読んだ (テストは無反応) |
| 同上の `z:` 分岐 | deflate が**一度も実行されていなかった** — 未使用変数への `getWriter()` が writable をロックし、共有 URL が意図の約7.2倍 | ハーネスに `location`/`history` を注入して初めて駆動できた |
| `Net._wrtcInit` | 接続失敗が完全に無反応 (FT-20) | `RTCPeerConnection` にスタブを与えて初めて駆動できた |

いずれも `index.html` を読めば「書いてある」ように見え、実際には動いていなかった。
**1600件超のテストが緑でも、その経路が1行も実行されていなければ何も保証していない。**

さらに悪いのは、ハーネスの制約が**バックログのブロック理由に昇格していた**ことである。
FT-20 は「ハーネスが `RTCPeerConnection` を `undefined` にしているので検証できない」を根拠に
「実ブラウザ検証が確保できるまで着手しない」と決めていた。実際に必要だったのは実ブラウザではなく
60行のスタブだった。

**方針**: 「実ブラウザが要る」と判断する前に、**その判断がハーネスの現状を仕様と取り違えて
いないか**を必ず一度疑うこと。注入するもの (`location` / `history` / `screen` /
`RTCPeerConnection` / `crypto`) を増やすコストは小さく、見えるようになる範囲は大きい。

### 盲点を運任せにしない — `node coverage.mjs` (v1.7.77)

上記3件はいずれも**偶然**見つかった (1件はコードを読んで、2件はハーネスに穴を開けたら出てきた)。
再現性のある手段に変えるため、依存ゼロのカバレッジ計測を入れた:

```bash
node coverage.mjs              # 未実行関数を大きい順に、index.html の行番号付きで列挙
node coverage.mjs --max=154    # ベースラインを超えたら exit 1 (CI 用)
```

Node 組込みの `NODE_V8_COVERAGE` は `new Function()` で eval されたソースも報告するため、
`index.html` のインライン `<script>` をそのまま計測できる。オフセットから行番号への写像は
**一意な名前を持つトップレベル関数の多数決**で経験的に求める (Node が
`function anonymous(...)` ヘッダの形式を変えても壊れない)。

**初回計測 (v1.7.77): 529 関数中 155 が未実行 (29%)**。判明した構造:

- 最大の未実行関数は **7KB のキーダウンディスパッチャ** (`index.html:3498`)。
  キーボードのテストは全て*アクション*を直接呼んでおり (`pickTool` / `nudgeSelection` /
  `Store.undo`)、**どのキーがどのアクションに届くかを決める部分**は一度も実行していなかった。
  プレゼン中の編集抑止・モーダル背後へのショートカット漏れ防止という、
  最も壊れてはいけないガードがそこにある。v1.7.77 で駆動対象にした。
- ポインタハンドラ5本 (`index.html:2504/2556/2614/2766/2802`) も同様に未実行。
  → **v1.7.77 の直後に pointerdown/move/up を駆動して解消** (未実行 154 → 142)。
  ドラッグ作成・マーキー選択・クリック選択・ドラッグ移動を、ハンドラ経由で実際に流している。
  残るのは drop / wheel 系 (`2766`/`2802`)。

**ハーネスがイベントを捕捉する仕組み**: 要素の `addEventListener` はその要素自身に記録する
(`_h[type]`)。`index.html` は `const canvas=document.getElementById('c')` で1つのオブジェクトを
保持し続け、テストは `api.canvas` で**同一オブジェクト**を得るため、`api.canvas._h.pointerdown`
が本物のハンドラ列になる。`getElementById` を memoize する必要がない (memoize は
オーバーライドしているテストを壊す)。`window` 側は `fakeWin._dispatch(type, ev, idx=0)`。

**この作業で学んだこと — テストの偽陽性は「次のケース」でしか見つからない**: pointer 層の
テストは初稿で3回続けて**フィクスチャの誤り**を出し、いずれも assertion 自体は通っていた。
(1) マーキーの始点 (5,5) が図形 (x=10) の当たり判定許容 6px 内にあり、ドラッグが
**移動**になっていた — 「作成されない」「選択される」の両方が偽の理由で通った。
(2) 塗りの無い矩形の**中心**をクリックして外れた — `G.hit` は `if(s.fill)return true` の後は
輪郭バンドのみ判定する仕様 (他の描画ツールと同じ慣習) で、製品は正しかった。
(3) 選択済み図形の輪郭は**8つのリサイズハンドル**に覆われるため、輪郭を掴むと移動ではなく
リサイズになった。**対策**: ケースごとに盤面を作り直す、空キャンバスのドラッグは図形から
十分離れた点から始める、意図した挙動は**両方向**で固定する
(塗り無しの中心は当たらない / 塗り有りの中心は当たる)。

**数値の読み方の注意**: (1) 関数単位なので、関数に入った時点で「実行済み」になる —
分岐網羅ではない。よって実際の盲点は**常にこの数以上**。(2) V8 は内部関数を遅延コンパイル
するため、カバレッジが上がると**分母も増える**。パーセントではなく**未実行の絶対数**を
リリース間で比較すること。

## ソースを見る検査は、結果を見る検査に負ける (v1.7.85 / ADR-0018 の教訓)

**「オフラインで等価に動く」は3つの勝利条件の1つで、リリース以来どのブラウザでも
成立していなかった。** `index.html` は SW を文字列 → Blob → `register(blob URL)` で
登録していたが、Service Workers 仕様の Register アルゴリズムは **http(s) スクリプト URL
しか受理せず**、blob:/data: を `TypeError` で拒否する。`.catch(()=>{})` がそれを黙殺し、
キャッシュは一度も作られなかった。修正前ビルドでオフライン再読込を実測すると
`title: 127.0.0.1` (= Chrome のエラーページ)、ボタン0個。

**この欠陥を守るはずの検査は4件あり、全て緑だった。**

| 検査 | 主張していたこと |
|---|---|
| `caches.open(` が html に現れる | 真 |
| `serviceWorker.*register` が html に現れる | 真 |
| `caches.keys()` と `k!==C` が html に現れる | 真 |
| navigate の network-first 文字列が html に現れる | 真 |

**すべて真で、何一つ意味が無かった。** 測っていたのは「コードが存在すること」であり、
「コードが動くこと」ではない。コードは存在した。実行されなかっただけである。

### 一般化できる規則

1. **同じ主張を4通りに言い換えても、証拠は1つも増えない。** ソース検査を増やすことは
   カバレッジの増加に見えるが、検査対象が同一 (= 文字列の存在) なら独立性はゼロ。
2. **どのハーネスも触れない領域を「検査済み」と数えてはならない。**
   `a11y-browser.mjs` は実ブラウザを使うが `file://` で読み込むため
   `'serviceWorker' in navigator` が**偽**で、この欠陥に構造的に到達できなかった。
   「実ブラウザで検査している」は「あらゆる欠陥が見える」を意味しない。
3. **エラーを握り潰す `catch` は、握り潰した事実を検査で置き換える。**
   `.catch(()=>{})` は正当な設計 (sw.js 非併置は正式にサポートする配置) だが、
   その正当性は**「失敗しても壊れない」を実際に走らせて示す**責任とセットになる。
   → `test.mjs` の fake `register()` は**拒否する**ようにした。ハーネスは http オリジンを
   持たないので、これが忠実な模倣でもある。catch を消せば未処理 rejection として現れる。
4. **プラットフォームの制約は、コードを読むより仕様を読むほうが速い。**
   「なぜインライン化できないのか」は実装差ではなく Register アルゴリズムの定義であり、
   何度デバッグしても答えは出ない。**動かない実装を最適化しない** — まず動くかを問う。

本プロジェクトで「文書・検査が実態を上回った」**6例目**であり、最も重い。
対応する結果レベルの検査は `offline-browser.mjs` (実 Chromium × 実 http オリジン、13検査、
修正前ビルドでは13中8が落ちる)。
