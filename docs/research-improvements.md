# 改善点調査 — 同種ソフト & arxiv リサーチ

> Board を「単一HTML / ゼロ登録 / 完全無料 / offline-first」の原則を守ったまま 100 点へ近づけるための、
> 競合ソフトウェアと学術研究 (arxiv 等) を参照した改善点リスト。
> 各項目に **出典**・**Board への対応づけ (該当コード)**・**原則との整合** を付す。
> 調査日: 2026-06-05。

## 調査範囲

**同種ソフト**: Excalidraw, tldraw (SDK), Figma / FigJam, Miro, AFFiNE, WBO, Pixelboard。
**研究 / 技術文献**: Ink & Switch "Local-first software" (CACM 2019)、Figma multiplayer 技術記事、
fractional indexing (Figma / tldraw / Linear)、perfect-freehand、arxiv の sketch 認識・beautification・
replicated undo 論文群。

---

## 1. 競合ソフトから学ぶ改善点

### A. Z-order を **fractional indexing** に置き換える ★最優先
> **設計 ADR**: `docs/ADR-0001-fractional-index-zorder.md` (Proposed, 2026-06-13) に判断・段階移行・
> 後方互換・テスト計画をまとめた。以下はその要約。
- **現状 (Board)**: `zorder` op が **全 shape の `{id,z}` スナップショット** を before/after で保持し、`]`/`[`
  1回ごとに O(N) のデータを undo 履歴と peer ブロードキャストに積む (1000 shape で 1 回 ~2000 エントリ)。
  該当: `index.html` `_zSnapshot` / `_commitZ` / `Store._apply` `case 'zorder'`。
- **改善**: 各 shape に文字列の分数インデックス `frac`(例 base62)を持たせ、並べ替えは **1 shape の `frac` だけ**
  更新する。描画・SVG 出力は `frac` 昇順でソート。move/reorder が O(1) データになり、undo は当該 shape の
  before/after のみ、同時並行の並べ替えも衝突せずマージできる(Phase 1.1 の CRDT 化に直結)。
- **caveat**: fractional indexing は同時挿入の interleaving を防げないが、図形では実害が小さい(Figma の見解)。
  精度枯渇を避けるため 64bit float ではなく **文字列 + base-N 平均** を使う(Figma は base95、tldraw は jittered fork)。
- **出典**: [Figma — Realtime Editing of Ordered Sequences](https://www.figma.com/blog/realtime-editing-of-ordered-sequences/) ·
  [tldraw PR #6646 jittered-fractional-indexing](https://github.com/tldraw/tldraw/pull/6646) ·
  [Liveblocks — fractional indexing](https://liveblocks.io/blog/how-crdts-and-sync-engines-keep-realtime-lists-ordered-with-fractional-indexing) ·
  [madebyevan — CRDT Fractional Indexing](https://madebyevan.com/algos/crdt-fractional-indexing/)
- **原則整合**: 単一HTML可(~30行の純関数)。サイズ予算内。**コードレビューで指摘した z-order の肥大化を構造的に解消**。

### B. ペンを **filled-outline スタイル** に昇格 (perfect-freehand 最終形)
- **現状 (§3.10 で訂正)**: ~~固定幅ポリライン~~ → **可変幅ベジェストロークは既に実装済み**。
  `penWidths()` (line 1499) が筆圧センサー (`_penPr`, pointer events `pressure`) または速度プロキシで
  per-point 幅を計算、3点移動平均でスムージング、`drawPen()` が `quadraticCurveTo` + 可変 `lineWidth` で描画。
  `buildSVG` の pen ケースも同アルゴリズムで per-segment `stroke-width` を出力。データは `[x,y,pressure]`
  トリプルで格納し RDP 間引きも圧力を保持。
- **残差(真の改善点)**: 現在は *lineWidth* を変えるモデルなので、急激な幅変化の区間境界に
  微細なギャップが出うる。perfect-freehand の本来の意義は **ストローク輪郭を閉じた filled-outline path で
  塗りつぶす**こと(thinning → outline polygon)。これにより: (a) テーパーエンド、(b) 滑らかな幅遷移、
  (c) 内塗りなので `stroke-width` の境界アーティファクトがゼロ。体感的に最も大きい品質向上。
- **出典**: [perfect-freehand (steveruizok)](https://github.com/steveruizok/perfect-freehand) ·
  [tldraw Draw shape docs](https://tldraw.dev/sdk-features/draw-shape) ·
  [Excalidraw issue #4802](https://github.com/excalidraw/excalidraw/issues/4802)
- **原則整合**: 依存追加なし。SVG 出力は `<path d="…" fill="..." stroke="none"/>` 形式に変わる。

### C. **空間インデックス**(quadtree / uniform grid)でヒットテストと描画カリング
- **現状**: `architecture.md` が >500 shape での quadtree 導入を予告済みだが未実装。hover ヒットテスト
  (`pickTop`)が毎 pointermove で O(N)、`draw()` は全 shape を毎フレーム描画。
- **改善**: commit 毎に遅延再構築する coarse uniform-grid を持ち、`pickTop`/marquee と **画面外 shape の描画カリング**
  に使う。tldraw は culling + 空間索引で数千オブジェクトを 60fps 維持。
- **出典**: [tldraw performance/culling (toolpick 比較)](https://www.toolpick.dev/blog/excalidraw-vs-tldraw-2026) ·
  Board `docs/architecture.md`(既存の予告)
- **原則整合**: ~40 行、単一HTML可。

### D. 同期データモデル: **per-property LWW レジスタ + 因果順序**(Figma 方式)
- **✅ 部分実装 (ADR-0002, 2026-06-15)**: `upd`/`style` にプロパティ単位 LWW を導入。`(ts,peer,seq)` 全順序 +
  `state.wclock`(図形非汚染)で同一プロパティ衝突を決定的に収束、互いに素なプロパティは双方生存。
  二者ハーネス(§3.14)で収束をテスト担保。残: `resize`/`align`(全図形スナップショット型)・undo×sync。
- **現状(実装前)**: op 全体をブロードキャスト + `{peer,seq,ts}` clock。受信 op は型 allow-list のみ検証
  (`Store.applyRemote`)、payload は `add` 以外未検証(レビュー指摘)。
- **改善**: Figma は OT ではなく **プロパティ単位の last-writer-wins レジスタ** + ツリー parent ポインタで
  実装。Board も「shape = レジスタの集合」と捉え、上記 A の `frac` と組み合わせると衝突が激減し payload も縮小。
  併せて `upd`/`move`/`del`/`zorder` の受信 payload も数値・構造を検証(NaN 注入で shape が消える事故を防ぐ)。
- **出典**: [Figma — How Figma's multiplayer technology works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/) ·
  [Hex — pragmatic live collaboration](https://hex.tech/blog/a-pragmatic-approach-to-live-collaboration/)

### E. **マルチページ**(frame をページに昇格)
- 競合(Miro / FigJam / tldraw)は複数ページ標準。Board は frame + presentation を持つので、frame を
  ページ抽象に拡張すれば自然に到達(README roadmap v1.7 相当)。

---

## 2. 研究 (arxiv 等) から学ぶ改善点

### F. **協調 undo/redo の正しさ**(P2P sync を実験から本番にする前の必須課題)
- **問題**: ローカル op-log の undo は、peer が同じ shape を並行編集した後に自分の op を undo すると整合性が崩れる。
  「単純な per-peer undo スタック」は CRDT 環境で破綻する。Board は remote op を undo 対象外にしている点は正しいが、
  本格 sync 化でこの設計判断を体系化する必要がある。
- **指針**: undo を「スタックの巻き戻し」ではなく **因果情報付きの逆 op を新規に発行** する方式にする
  (replicated register への undo 適用)。
- **出典**: [arxiv 2404.11308 — Undo and Redo Support for Replicated Registers (2024)](https://arxiv.org/abs/2404.11308) ·
  [Ink & Switch — Local-first software](https://www.inkandswitch.com/essay/local-first/)(Automerge)

### G. **スケッチ認識 / beautification(オンデバイス, BYOK)**
- README roadmap v1.4「AI shape recognition (BYOK)」に対応。研究を踏まえた現実的設計:
  - **shape detection / beautification**: ラフな矩形・円・矢印を整形(Excalidraw 風)。
    参照: [Sketch Beautification (arxiv 2306.05832)](https://arxiv.org/html/2306.05832v2)、
    幾何ヒューリスティック(角度・閉路検出)だけでも MVP 可。
  - **stroke ベース認識**: [SSR-GNNs (arxiv 2204.13153)](https://arxiv.org/abs/2204.13153)、
    [Sketch-R2CNN (arxiv 1811.08170)](https://arxiv.org/pdf/1811.08170)。
  - **手書き→テキスト / オンデバイス推論**: [TinyML on-device (arxiv 2405.07601)](https://arxiv.org/abs/2405.07601)。
    小型 WASM モデル or BYOK API を **任意機能** とし、offline-first を壊さない(クラウド必須にしない)。
- **原則整合**: 幾何ヒューリスティックは依存ゼロで単一HTML可。ML は WASM/BYOK でオプトイン。

### H. **E2E 暗号化同期**(local-first の Privacy 原則)
- README が予告する `#roomId:key` + AES-GCM を具体化。URL fragment の鍵はサーバへ送られない。
  WebCrypto(ブラウザ内蔵=依存ゼロ)で op payload を WebRTC 送信前に AES-GCM 暗号化。
- **出典**: [Ink & Switch — Local-first software](https://www.inkandswitch.com/essay/local-first/)(7 原則: Privacy / Longevity 等)

### I. **アクセシビリティ: canvas の DOM ミラー / 意味的フォールバック**
- **調査時点 (2026-06-05) の状態**: canvas の中身はスクリーンリーダーから不可視。SVG は意味論を内蔵。
  Board は `role="application"`+`aria-label` まで実装済みだが per-shape の意味が無い、と記載。
- **その後の進展 (§3.12 で訂正、v1.6.10)**: Tab 巡回 + 読み上げは **既に実装済み**。
  `cycleSel()` (line 1306) + `describeShape()` (line 1317) で Tab/Shift+Tab が z-order を巡回し、
  `aria-live` トースト (line 2529, 2538) で各 shape を読み上げ、`canvas` の `aria-label` も操作ヒントを
  動的更新 (line 2611)。キーボード/SR ユーザは shape を巡回・選択・移動・作成でき各操作が読み上げられる。
- **真の残差(改善点)**: 永続的な **offscreen DOM ミラー**(全 shape を常時 DOM に反映し、ブラウズモード/
  ランドマークで構造ナビゲーション可能に)は未実装。現在は「巡回時に1つずつ読み上げる」方式で全体の
  一覧性が無い。外部 a11y 監査通過にはこの DOM ミラーが要る。
- **出典**: [HTML canvas accessibility (pauljadam)](https://pauljadam.com/demos/canvas.html) ·
  [W3C WCAG 2.2 — Keyboard Accessible](https://www.w3.org/WAI/WCAG22/Understanding/keyboard-accessible.html) ·
  [MDN — Keyboard accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG/Keyboard)

### J. **描画パフォーマンス: dirty-rect / 静的レイヤキャッシュ**
- Board は毎フレーム全 canvas を再描画。Figma/tldraw は静的部分をキャッシュ。大規模ボードで
  dirty-rect 部分再描画 or オフスクリーン静的レイヤ合成を導入。(C の culling と併用)

---

## 3. 近接の正しさ修正(コードレビュー由来・着手容易)

研究テーマと独立に、すぐ直すべき確定バグ(`/code-review` で検出):
1. ~~**SVG エクスポートの座標フィールド未エスケープ**~~ **✅ 解決済 (2026-06-14 時点で確認)**: `buildSVG` は
   全座標を `_num()` で数値強制し、色/ラベル/dataUrl は `_esc()` でエスケープ済み。markup 注入経路なし。
2. ~~**受信 op の検証が `add` のみ**~~ **✅ 解決済 (2026-06-14)**: `validRemotePayload` を全 op に拡張。
   `validPatch()` を追加し、`upd`/`style`/`resize`/`align` の patch 値に **NaN/Infinity 注入と
   `__proto__`/`constructor` 等のプロトタイプ汚染を拒否**。`del`/`clear` は各 shape を `validShape` で検証。
   `move`(dx/dy 有限)・`zorder`(キー型) は既に検証済。これで「NaN で shape が消える」事故を構造的に防止。
3. (参考)`Array.prototype.push.apply` の超大規模ボードでの RangeError、旧 Safari の matchMedia リスナ。

---

## 3.5 ソクラテス式の新視点 — 「否定は反証可能でなければ信用できない」(2026-06-14)

既存の優先度は「効果 × 規模 × 原則整合」で並ぶ。だが問いを重ねると別の軸が見えてくる。

- **問**: Board の価値とは? → CLAUDE.md 曰く「4つ全部を否定する」(登録/重量/有料/プライバシー侵害)。
  価値は**否定で定義**されている。
- **問**: 否定が満たされていると、どうやって *知る* のか? → 単一ファイル系の否定
  (`no external script/link/font`) は **test.mjs で反証可能**。だが「オフライン等価」「ゼロトラッキング
  (プライバシー)」「0秒起動」は **spec/audit に散文で宣言されるだけでテストが無かった**。
- **問**: 反証不能な否定は、否定と言えるのか? → 言えない。検証できない約束は、いつ破れても気づけない。
  実際 `index.html` 内の唯一の `fetch` は Service Worker の cache-first フォールバック(503 'offline')で
  健全だが、それを **保証する仕組みは無かった**。明日の改修で `fetch('https://…/track')` が混入しても CI は黙る。
- **問**: かつて唯一の数値ガード(gzip 44KB 予算)を撤去したのは「指標は害」だからか? → 否。撤去理由は
  「予算の壁が実改善を据え置かせた」(CLAUDE.md)。つまり問題は **指標の存在ではなく、指標が *代理変数*
  (バイト数) を測り、*価値* (高速ロード/オフライン/所有権) を測っていなかった**こと。バイトを測るのをやめた
  のは正しいが、代わりに**価値そのものを測る指標**を置かなかったため、否定が散文に退化した。

**新視点(これが追加分)**: 「サイズ予算撤去」の教訓は *anti-metric* ではなく *value-metric への移行* だった。
否定で定義するプロダクトは、**各否定を falsifiable invariant (CI で破れるテスト) に変換**して初めて
その否定を名乗れる。ロードマップは「効果」順だけでなく **「どの勝利条件に、検証可能な形で近づくか」** で
も評価すべき。

**この視点からの最小実装 (本コミットで着手)**: test.mjs に value-metric ガードを追加 —
(1) テレメトリ/解析プリミティブ不在 (`sendBeacon`/`XMLHttpRequest`/`gtag`/analytics SDK)、
(2) サードパーティ起点ゼロ (W3C SVG 名前空間識別子を除き外部 origin 無し)、
(3) オフライン等価 (SW が cache-first の offline フォールバックを同梱)。
→ 「プライバシー」「オフライン等価」が散文から **反証可能な不変条件**へ昇格。

**未falsifiableのまま残る勝利条件 (今後の候補)**: 「0秒で使い始める」(cold-start / TTI の上限予算)、
「オフラインで *等価* に動く」(SW キャッシュに全 critical asset が載る、を実機 or jsdom で確認)。
これらは proxy ではなく value を測る次のガード候補。

---

## 3.6 ソクラテス式の新視点 — 「完成は加算ではない」(2026-06-14)

§3.5 は「否定を反証可能にせよ」(測定の視点)だった。本節はその直交軸 — **スコアモデル自体**を問う。

- **問**: Board の「100点」とは? → CLAUDE.md「残り30点 = sync(10)+multipage(7)+collab(5)+AI&i18n(4)+
  plugin(4)」。**完成 = 機能の加算**として定義されている。
- **問**: その30点は Board の WHY 基準か、競合基準か? → sync/collab/plugin/AI はいずれも**競合が持つ機能**。
  基準は競合であって「0秒・小さく・否定」ではない。
- **問**: 機能を足すと WHY は強まるか弱まるか? → collab は presence/identity を要求し「ゼロ登録」と緊張。
  AI は WASM/BYOK で「単一HTML/オフライン」と緊張。plugin は攻撃面を広げ「小さく」と緊張。
  **加算で稼ぐ点の多くは、否定で稼いだ点を削る。**
- **問**: 逆に Board が競合に *構造的に* 勝てる土俵は? → 「速い・私的・使い捨てできる単独スケッチ」。
  登録/重量/クラウドを持つ競合が**定義上できない**こと。
- **問**: その土俵で100点へ近づくのは加算か減算か? → 第一体験(描き味・スナップ・空白からの最初の一手・
  共有の一手)の**研磨**。引き算と磨き込みで、機能数では測れない。
- **問**: なぜ研磨より加算が優先される? → 加算は**可視で検証可能**(機能の有無は○×)。研磨は felt で
  測りにくい。§3.5 で足した value-metric ガードすら「検証可能なもの」を測った。
  **検証可能性バイアスが、ロードマップを felt から逸らしている。**

**新視点(これが追加分)**: 「100点 = 機能の総和」というスコアモデル自体が、*競合模倣バイアス* と
*検証可能性バイアス* を内包している。Board の限界点は、加算ロードマップ(★5–8)より **felt-quality の
研磨**(第一90秒)で稼げる可能性が高い。証拠: 本優先度表は felt な **B(perfect-freehand ペン)** を、
不可視な **C(空間インデックス)** の *下* に置く — 「ユーザが感じる価値」より「エンジニアが検証できる
価値」を上に置く並びだ。

**含意 (ロードマップの組み替え提案、CLAUDE.md の哲学は維持)**:
1. **felt-first 軸を追加**: 「第一90秒でユーザが*感じる*改善か?」を効果欄と別に評価する。
   B(ペン描き味)、スナップ/整列の手触り、空白キャンバスの最初の一手(テンプレ/ヒント)、共有の一手
   (1クリック URL 共有の発見性) を**昇格**。
2. **加算機能は「コア課税ゼロ」を条件化**: collab/AI/plugin は *opt-in* かつ**既定の単独・オフライン・
   ゼロ登録体験を一切重くしない**ことを採用条件にする(さもなくば否定で稼いだ点を失う)。
3. **「100点」の再定義の検討**: 競合機能網羅ではなく「単独スケッチの第一体験品質 × 否定の堅牢さ」を
   主軸に据える余地。これは ADR ではなくプロダクト方針の問いとして CLAUDE.md レビュー時に持ち込む。

> 注: この視点は §3.5(測定)と対立しない。むしろ補完する — 「felt を測る稀な指標」が *cold-start(0秒)*
> であり、両視点が交わる次の falsifiable 目標になる。

---

## 4. 優先度付き提案

| 優先 | 項目 | 効果 | 規模 | 原則整合 |
|---|---|---|---|---|
| ★1 | A. fractional index z-order ✅ | sync 衝突解消 + 履歴/帯域の肥大化解消(レビュー指摘の構造的解決) | 中 | ◎ 依存ゼロ |
| ★2 | §3 近接バグ修正 ✅ | セキュリティ/整合性 (SVG 注入 + 受信 op の値検証) | 小 | ◎ |
| ★3 | C. 空間インデックス + カリング | 大規模で 60fps | 中 | ◎ |
| ★4 | B. perfect-freehand ペン | 体感品質 | 中 | ◎ 自前移植 |
| ★5 | H. WebCrypto E2E sync | Privacy 原則 | 中 | ◎ 内蔵API |
| ★6 | I. a11y DOM ミラー | v2.0 監査 | 中 | ◎ |
| ★7 | F. 協調 undo 体系化 | sync 本番化の前提 | 大 | ○ |
| ★8 | G. shape beautification(幾何のみ) | AI 機能の入口 | 中 | ◎(ML はオプトイン) |
| 後 | D/E/J/K | データモデル・ページ・描画最適化 | 大 | ○ |

各項目は **ADR を 1 枚書いてから** 着手(CLAUDE.md WORKFLOWS 準拠)。一度に全部はやらない。

---

## 3.7 ソクラテス式の新視点 — 「持てないデータは、所有と言えるか」(2026-06-14)

§3.5 は「否定を反証可能に」、§3.6 は「完成は加算ではない」。本節は別前提 — **「所有(ownership)」**
を問う。本リサーチは Ink & Switch の local-first(7原則)を繰り返し引くが、その原則を Board 自身の
**永続化の実態**に当てたことが無かった。

- **問**: ユーザのボードはどこに在る? → 既定の自動保存は **IndexedDB**(`Persist.save`)。共有は URL
  fragment、書き出しは手動の `.board` ファイル。
- **問**: その IndexedDB は永続的か? → 既定では **best-effort(退避可能)バケット**。`navigator.storage.persist()`
  を呼ばない限り、ディスク逼迫時の eviction や「サイトデータを消去」で**消える**。コード調査時点で
  `index.html` に storage 永続化要求は **無かった**(唯一の `evict` は画像 LRU キャッシュ)。
- **問**: では既定でユーザは自分の作品を「所有」しているか? → していない。**手で `.board` を書き出すまで、
  作品は退避可能なブラウザキャッシュに *賃借り* されている。** local-first の *Longevity* 原則は
  既定経路で未充足だった。
- **問**: なぜ見落とされた? → 「オフライン等価」(SW キャッシュ)は語られたが、それは *コードの* 永続。
  *ユーザデータの* 永続(Longevity)とは別物。両者を同一視していた。

**新視点(これが追加分)**: 「local-first / 所有」を名乗るなら、*コードのオフライン化* だけでなく
*ユーザデータの耐久性* を既定で担保せねばならない。所有とは「手で書き出せる」ことではなく
「**既定で失われない**」こと。エクスポート機能の存在は、所有の証明にならない。

**この視点からの最小実装 (本コミットで着手)**:
- `Persist.requestDurable()` を追加し `navigator.storage.persist()` で**耐久バケットへ昇格**。依存ゼロ・
  ネットワーク不要・UIなし。
- ただし §3.6(felt-first)に従い、**空白の初回ロードでは要求しない** — ユーザが実際に内容を保存した時
  (`state.shapes.length>0` の保存成功)に一度だけ要求し、耐久プロンプトで第一体験を汚さない。
- test.mjs に falsifiable ガード(耐久ストレージを要求しているか)を追加 → §3.5 と接続。

**未充足のまま残る Longevity 課題 (今後)**: 大きなボードでの URL 共有のサイズ/履歴漏洩、自動の
ファイルバックアップ(File System Access API は opt-in)、`storage.estimate()` による残量警告。

---

## 3.8 ソクラテス式の新視点 — 「『プライベート』という一語は、何を約束しているのか」(2026-06-14)

§3.5–3.7 は測定・スコア・所有を問うた。本節は否定の一つ「プライバシー侵害をしない」の **意味の解像度**
を問う。Board は「サーバ無し / 登録不要 = プライベート」と等置するが、この一語には**少なくとも4つの
別々の性質**が畳み込まれている。

1. **非監視 (no surveillance)**: 第三者が覗いていない。
2. **機密性 (confidentiality)**: 意図した相手だけが内容を読める。
3. **完全性 (integrity)**: 内容・操作が改竄されていない/同一発信元から連続している。
4. **真正性 (authenticity)**: 相手が「誰であるか」を検証できる。

- **問**: Board は今どれを持つ? → **1(非監視)のみ**を構造的に保証(サーバ非通過・テレメトリ無し、§3.5 で
  反証可能化済)。README は誠実に E2E を「(予定)」と明記し過大広告はしていない。
- **問**: ロードマップで 2・3・4 は埋まるか? → H(WebCrypto AES-GCM)が **2(機密性)**、「署名付き op-log
  (各 peer の公開鍵で検証)」が **3(完全性)** を与える。だが **4(真正性)は?**
- **問**: 署名付き op-log は真正性を与えるか? → **与えない。** 公開鍵で検証できるのは「同じ鍵が署名した」
  =*完全性/連続性*まで。その鍵が「意図した人」のものだとは、**登録(identity)が無い以上、検証しようがない**。
  zero-registration は真正性を *後回し* にするのではなく **構造的に排除**する。匿名性(機能)と真正性
  (セキュリティ性質)は同じ negation の表裏で、両立しない。

**新視点(これが追加分)**: 「署名付き op-log で peer を *検証*」という記述は、暗黙に **identity モデル**を
仮定している。だが zero-registration の Board が実際に成立できるのは **capability モデル**(=「鍵=リンクを
*知っている* ことが権限」)だ。真正性は「相手が誰か」ではなく **「自分がこのリンクを *誰に渡したか*」** から
来る — 認証は**アプリ外(out-of-band)の共有チャネル**で既に済んでいる。つまり Board の正しいセキュリティ
モデルは **identity-based ではなく capability-based(link-as-authority)**。これを明示すると、見かけの矛盾
(匿名なのに信頼?)が解ける: *知らない相手を検証する*のではなく *信頼する相手にだけリンクを渡す*。

**含意 (実装ではなく設計言語の修正)**:
- ロードマップの「peer を検証」は **「op-log の完全性を検証(同一 capability 保持者からの連続性)」** と
  正確に書き直すべき。真正性を約束しない。
- UI/README で `#roomId:key` を共有する箇所は **「このリンクを渡した相手＝参加者」** という capability の
  含意を明示すると、ユーザの脅威モデルが正しくなる(リンク漏れ=参加者増、という直感が持てる)。
- §3.6(felt-first)に従い、ここでは **あえてコードを足さない**。「検証可能だから」とトークン的なテストを
  足すのは §3.6 が戒めた verifiability bias。本節の成果物は *概念の解像度* であり、それで十分。

> 帰結: Board は「**信頼できる相手と、私的に、使い捨てで共有する**」道具として完成度が高い。
> 「*知らない相手とも安全に*」は zero-registration が排除する領域であり、そこを competitor 基準で
> 追わないことが、むしろ否定の一貫性を守る(§3.6 とも整合)。

---

## 3.9 ソクラテス式の新視点 — 「アーキテクチャは既に投票を終えている」(2026-06-14)

§3.5–3.8 は各々別の前提を問うた。本節はそれらを**収束**させ、避けてきた一つの問いに答える:
**Board は *使い捨ての単独スケッチパッド* か、*復帰する多人数ワークスペース* か。**

事実(コード)を並べると、基盤は既に一方へ投票し終えている:
- **単一ドキュメント**: 永続化は `DOC_KEY` ただ一つ。ボード一覧も「新規ボード」概念も無く、自動保存は
  **唯一のスロットを上書きし続ける**(`Persist.save`)。
- **揮発する既定**(§3.7): データは退避可能バケット(耐久化は本セッションで追加したが、*所有するスロットは
  依然一つ*)。
- **無アイデンティティ**(§3.8): capability ベース。「誰が」は無く「このリンクを渡した相手」だけ。
- **線形・大域 undo**: history は永続化されず、リロードで消える(セッション内のみ)。

これらはすべて **「速い・私的・使い捨ての単独スケッチ」** に整合する。一方ロードマップ
(multipage / collab / sync / plugin)は **「永続する多人数ワークスペース」** を志向し、上の*全決定*と戦う。
**アーキテクチャは scratchpad に投票済み。ロードマップはそれを認めていない。**

- **問**: 「単一ドキュメント上書き」は欠陥か、正体か? → 正体だ。だが*無自覚*ゆえに**隠れた牙**を持つ:
  `doClearAll`(confirm 付き)や import は丸ごと置換し、自動保存が `DOC_KEY` を上書き、**リロード後は
  復元不能**(セッション内 undo と `.board` 手動書き出しを除く)。§3.7 の耐久化は *eviction* を防ぐが
  *self-overwrite* は防がない。「0秒で使い始める」の裏に「**0秒で前の思考を消す**」が同居している。
- **問**: では正しい一手は? → **正体を選ぶ**こと。straddle(股がけ)が最悪。
  - (a) **scratchpad を選ぶ**なら: multipage/collab を「100点」から外し(§3.6)、代わりに *単独体験の研磨* と
    *自己上書きからの保護*(下記)に投資。Board は競合が定義上できない「最速の私的スケッチ」で勝つ。
  - (b) **workspace を選ぶ**なら: identity(§3.8)・multi-doc・durable history の対価を**意識的に**払う。
    否定で稼いだ点の一部を手放す覚悟を明示する。

**新視点(これが追加分)**: 「100点への距離」を *機能の不足* と読むのは誤読。基盤が下した
**未宣言の製品定義(=disposable solo scratchpad)** と、ロードマップの**暗黙の願望(=workspace)** の
*不一致* こそが、本当の負債。先に決めるべきは機能ではなく **正体**。これは ADR ではなく CLAUDE.md
「WHY/100点への距離」レビュー時の**製品判断**として持ち込む。

**この視点が指す最小実装(要 green-light、本コミットでは未着手)**: scratchpad を選ぶ場合の
*self-overwrite 保護* — 破壊的置換(clear-all / import)時に直前状態を副キー(`DOC_KEY:prev`)へ退避し、
リロード後も「直前のボードを復元」できる単一スロットのバックアップ。§3.7(所有/Longevity)を
*eviction* だけでなく *自己上書き* にも広げる、小さく原則整合な一手。

---

## 3.10 ソクラテス式の新視点 — 「プロジェクトは自分が作ったものを知っているか」(2026-06-15)

§3.5–3.9 は *未来の仮定* を問うた。本節は逆方向 — **現在の実態の自己記述精度**を問う。

**具体的な矛盾(コード調査で発覚)**:

`docs/research-improvements.md` 項目 B は pen の「**現状**」を次のように記述する:

> 「**現状**: ペンは固定幅ポリライン (`drawShape` の `case 'pen'`、`size` 一定)」

だが `index.html` を調べると:

| 機能 | 研究ドキュメントの「現状」 | コードの実態 |
|---|---|---|
| ストローク幅 | 固定幅 (`size` 一定) | **可変幅** — `penWidths()` が筆圧/速度プロキシで per-point 幅を計算 |
| 曲線モデル | ポリライン (`lineTo`) | **2次ベジェ** — `quadraticCurveTo` で各セグメントを補間 |
| 筆圧取得 | なし | `_penPr(e)` でスタイラス 0–1 / マウス 0.5 を取得しモデルに格納 |
| SVG 出力 | (含意: 固定幅パス) | **可変幅 SVG パス** — `buildSVG` が `penWidths()` を呼んで per-segment `stroke-width` を出力 |
| データモデル | pts は `[x,y]` | **`[x,y,pressure]`** トリプル — RDP 間引きも圧力を保持 |

「固定幅ポリライン」は **2重の意味で誤り** だった。

- **問**: これはいつ正しかったのか? → おそらく研究ドキュメントの作成時点。その後コードが先行した。
- **問**: ドキュメントは「どこにいるか」を記す地図のはずだが、地図が現実より遅れている。誰が修正するのか?
  → コードを書いた人は「ここを更新し忘れた」。それは責任問題ではなく **構造的な問題**。コードと
  その自然言語記述は別ファイルに住んでいて、同期を強制するメカニズムが無い。
- **問**: 「現状: 固定幅」と書かれた改善項目を誰かが着手したとして、何が起きるか? →
  *すでに実装済みのものを再実装する*か、「なぜ固定幅のコードが見つからないのか」と混乱する。
  二度手間かバグ混入のどちらかが生じる。
- **問**: 機能が存在することを知らずに存在しないと書くことのコストは何か? →
  (1) 優先度の誤配分: すでにある機能に開発工数が割り当てられる。
  (2) ユーザへの虚偽: README や CHANGELOG に「未実装」と書かれていれば、ユーザは機能を知らずに使う。
  (3) 自信の損傷: 「自分たちは何を作ったのか分からない」というシグナルが蓄積する。

**新視点(これが追加分)**: ドキュメントの「現状」は *一度書いたら腐る*。`現状` という言葉は
**「書いた瞬間の状態」** でしかない。コードが進化するほど現状記述との乖離は広がる。

この問いの本質は pen だけの話ではない。同じ検索パターン——「ドキュメントが 『現状: X』と書いて
いるが、コードでは既に Y が実装されている」——を他の項目にも適用できる。それはつまり、
**自分たちが作ったものを正確に知ることが、正確に何を作るかを決める前提だ**、という当然の命題が
成立していないことを示す。

**この視点からの具体アクション**:

1. 項目 B の「現状」を事実に即して修正する(下記)。
2. 残差を明確化: 項目 B でまだ実装されていない部分は **アウトライン塗りつぶし型の filled-outline
   スタイル**(perfect-freehand 方式 — 可変幅を `lineWidth` で表現するのではなく、ストロークの *輪郭を
   閉じたパスで塗る*)。これは現実装とは別の表現方法であり、より有機的な筆致を与える。ただし
   点だけのストロークや単純な直線でも filled-outline は機能するか、SVG との一致が難しくなる。
3. 定期的な「ドキュメントを現在のコードで読む」セッション(短時間でいい)を WORKFLOWS に加える——
   コードを書くのと同じ頻度で自然言語記述を更新することを期待するのではなく、**乖離を発見する仕組み**
   を意図的に入れる。

**項目 B の「現状」修正**(このコミットで適用):

```
現状: ペンは可変幅ベジェストローク (drawPen → penWidths())。
  筆圧センサー対応デバイスは pointer events .pressure を 0–1 で取得 (_penPr)、
  非対応は隣接点間距離(速度プロキシ)で幅を推定、3点移動平均でスムージング済み。
  pts は [x,y,pressure] トリプルで格納し、RDP 間引きも圧力を保持、SVG 出力も同一アルゴリズム。

未実装の改善案: filled-outline パス(ストローク輪郭を閉じた path で塗り、テーパーエンドも自然)。
  現在は per-segment lineWidth を変えているだけなので、区間境界に僅かなギャップが見える可能性がある。
  perfect-freehand の本来の意義は outline 化にあり、これが本当の「体感品質の向上」になる。
```

---

## 3.11 ソクラテス式の新視点 — 「undo の約束はいつ期限切れになるか」(2026-06-15)

§3.9 はアーキテクチャの暗黙投票を問い、§3.10 は自己記述の遅れを問うた。本節はより小さく、
かつより密かな前提を問う: **undo はいつまで効くのか。**

CLAUDE.md の RULES は明示的に書く:
> 「history に非可逆 op を push するな」

この規則は op の *可逆性*を要求する(正しい)。しかし問いはそこではない。問いは:
**undo スタックそのものはいつまで存在するのか。**

**コードの事実**:

- `state.history` は `[]` で初期化されセッション中に積まれる (`Store.push`, line 1024)
- `Persist.save()` は `{v, shapes, viewport, docName, savedAt}` を IndexedDB に書く — **`history` は含まれない**
- `Persist.load()` でリロードすると `state.history=[]`, `state.histIdx=-1` に戻る
- 自動保存は `SAVE_DEBOUNCE` ms ごとに発火する — ユーザの操作直後にも静かに走る

つまり: **undo の有効期限はブラウザセッションの寿命と一致する**。

- **問**: ユーザは「保存済み」と表示されたとき、何が保存されたと思っているか? →
  「自分の作品が安全になった」。これは正しい(shapes は残る)。だが implicit には
  「間違えてもやり直せる」という安心感も持つ。これは **保存後のリロードでは** 誤りだ。
- **問**: 保存の確認メッセージ「保存済み」は真実を語っているか? → 技術的には真(shapes が
  DBにある)。体験的には半分の真——undo 安全網は今まさに切れた、とは言わない。
- **問**: 最も危険なシナリオは何か? →
  1. ユーザが大量に作業する。
  2. Ctrl+S で明示保存、または自動保存が発火。
  3. 少し後にページをリロード(偶発でも意図的でも)。
  4. 間違いに気づく。
  5. Ctrl+Z → 何も起きない。履歴は消えた。
  これは「0秒で始める」と「0秒で間違いを永続させる」の対称性 — §3.9 が指摘した速度の裏面。
- **問**: なぜ history を保存しないのか? → おそらく意図的ではなく、「shapes だけ保存すれば再現できる」
  という暗黙の最小性。history が無くても board は表示できる。だが *逆戻り可能性* は表示とは別の価値。
- **問**: history を永続化すればいいか? → できる(op は JSON シリアライザブル)。ただし MAX_HISTORY=500 op
  × 典型的な op サイズでは数百KB になりうる。圧縮や世代管理が必要になる。小さくない作業。

**新視点(これが追加分)**: undo は **時間的な機能** だ——同一セッション内の時間を巻き戻す。
しかし Board は undo を *永続的な安全保障* として扱う(RULES の規則がそう読める)。
これはカテゴリ錯誤だ。永続的な安全保障は「バージョン」「バックアップ」「変更履歴」と呼ばれる。
undo はそれらを代替しない。

**このカテゴリ錯誤が生む二つの誤解**:

1. **開発者への誤解**: 「history に非可逆 op を push するな」は *session 内の* 正しさを守る。
   しかし *session 間の* 正しさは別の機構が必要だ。現在それは無い(§3.9 の `DOC_KEY:prev` が部分的に
   埋める予定だが未実装)。
2. **ユーザへの誤解**: 「保存済み」と「undo可能」が同時に成立すると思っている。実際には
   保存後のリロードで後者は消える。UI はこれを知らせない。

**この視点からの最小アクション**:

- **短期(設計変更なし)**: CHANGELOG / README / CLAUDE.md の適切な場所に
  「undo 履歴はセッション内のみ有効。リロードでリセット」と明記する。ユーザが知るべき事実を
  ドキュメントが言っていない。
- **中期(小規模実装)**: §3.9 で提案した `DOC_KEY:prev` — clear-all / import の破壊的操作の直前に
  shapes スナップショットを副スロットに退避。これは history の代替ではないが、
  最も危険な self-overwrite シナリオ(§3.9)を防ぐ。
- **長期(非自明)**: history の IndexedDB 永続化。op が JSON シリアライザブルなのは現在真
  (sync がその前提)。MAX_HISTORY を下げ、圧縮して保存するのは技術的には可能だが、
  設計コスト対効果を ADR で評価してから判断する。

> 帰結: 「history に非可逆 op を push するな」は **正しく、かつ不十分**。可逆性は正確さの前提だが、
> *持続性* は別の軸。undo が正しく動くことと、undo が使えることは、セッション境界を越えると乖離する。
> この乖離を認識したうえで意識的に受け入れるか、埋めるかを決める——それが次の判断。

---

## 3.12 ソクラテス式の新視点 — 「文書はそれぞれ別の時計で時を刻む」(2026-06-15)

§3.10 は pen の自己記述の遅れを *一つの誤り* として扱った。本節は問う:
**それは一つの誤りか、それとも症状か。**

§3.10 直後に、同じパターンの **二例目** が見つかった:

- **項目 I (アクセシビリティ)** は「**改善**: Tab で shape を巡回 + 読み上げ」を *未来の作業* として記す。
- だがコードには既に `cycleSel()` (line 1306) + `describeShape()` (line 1317) があり、Tab/Shift+Tab で
  z-order を巡回し、`aria-live` トースト (line 2529, 2538) で読み上げる。`canvas` の `aria-label` も
  「Tab/Shift+Tab cycles shapes, Enter creates, arrows move…」と動的更新される (line 2611、v1.6.10)。

つまり項目 B(pen)も項目 I(a11y)も、**「これから作る」と書かれた機能が既に動いている**。
一例なら誤記。二例なら **パターン**。

**問: この乖離はなぜ常に *同じ方向* に倒れるのか?**

これが本節の核心。乖離には二方向ありうる:

| 方向 | 例 | 危険度 |
|---|---|---|
| **過大記述** (doc が言う > コードの実態) | 「E2E 暗号化あり」と書いて実は無い | **高** — ユーザを欺く |
| **過小記述** (doc が言う < コードの実態) | 「固定幅 pen」と書いて実は可変幅 | 中 — 二度手間・混乱 |

§3.8 で確認済みのとおり README は E2E を誠実に「**(予定)**」と書く — **過大記述はしていない**。
一方ここで見つかる乖離は **すべて過小記述**(B も I も)。なぜ一方向なのか?

**問: 何が方向を決めているのか?** → **文書ごとの「時計の速さ」が違う**から。

- **README**: 公開の顔。過大広告を恐れて頻繁に手入れされる。だから「言う ≦ 実態」に保たれる
  (E2E を予定と書くのはこの保守性の現れ)。
- **research-improvements.md**: 調査成果物。冒頭に `調査日: 2026-06-05` と**日付印**を持つ。
  一度書かれて、その後コードが先行しても**再同期されない**。だから「言う < 実態」に腐っていく。
- **CHANGELOG**: 追記専用。過去は正しいが「現在の総体」は語らない。
- **CLAUDE.md**: 憲法。変更頻度が最も低く、最も安定だが、最も古びうる(MAP のサイズ記述等)。

**新視点(これが追加分)**: プロジェクトの文書は単一の「正史」ではなく、**各々別の更新周期を持つ
独立した時計の集合**だ。読者がすべての文書を *同じ鮮度* と暗黙に仮定すると、最も遅い時計
(research-improvements.md)を最も速い時計(コード)と取り違える。§3.10 の誤りは個人の不注意ではなく、
**鮮度のメタデータが欠けている**という構造の症状だった。

**根本原因は「日付」ではなく「時制」**: research-improvements.md は冒頭に日付印を持つ点で *正直*
だ——「これは 2026-06-05 のスナップショット」と自己申告している。にもかかわらず各項目は
「**現状**: …」と **現在時制** で書かれる。「現状」という語は *書いた瞬間の鮮度* を暗黙に主張するが、
日付印付きスナップショットはその鮮度を裏書きできない。バグは *日付の欠落* ではなく
**時制の不整合**——スナップショット文書が現在時制を使うこと——にある。

**この視点からの具体アクション**:

1. **項目 I の「現状/改善」を事実に即して修正**(§3.10 で B にやったのと同じ。下記)。
2. **時制の規約**: research-improvements.md のような日付印付き調査文書では、状態記述を
   「**`調査時点 (2026-06-05)` では …**」という *日付つき過去形* で書く。「現状」という現在時制の
   語を、鮮度を裏書きできない文書では使わない。
3. **巡回検証のトリガ**: 各 `改善` 項目に着手する者は、**まずコードで現状を確認してから**手を動かす。
   これを項目テンプレートの一行ヘッダとして入れる(「⚠ 着手前にコードで現状を再確認」)。乖離が
   *一方向* である以上、危険は低いが、二度手間の回避には十分効く。

**項目 I の修正**(このコミットで適用):

```
調査時点 (2026-06-05) の状態: chrome (toolbar/buttons) は ARIA 完備、canvas は
  role="application"+aria-label。per-shape の意味はまだ無いと記載。

その後の進展 (v1.6.10、本調査後): cycleSel + describeShape + Tab/Shift+Tab 巡回 +
  aria-live トースト読み上げ + 動的 canvas aria-label を実装済み。キーボード/SR
  ユーザは shape を巡回・選択・移動・作成でき、各操作が読み上げられる。

真の残差: 永続的な offscreen DOM ミラー (全 shape を常時 DOM に反映し、ブラウズモードや
  ランドマークで構造ナビゲーション可能にする) は未実装。現在は「巡回時に1つずつ読み上げる」
  方式で、全体構造の一覧性は無い。外部 a11y 監査通過にはこの DOM ミラーが必要。
```

> 帰結: §3.10 と §3.12 を合わせると、Board の自己記述の問題は「ある文書が間違っている」ではなく
> 「**文書群の鮮度が不揃いで、それを読者に伝える仕組みが無い**」。直すべきは個々の記述だけでなく、
> *どの文書が現在について語る資格を持つか* を明示する規約。最も速い時計はいつもコードであり、
> 着手前にそれを読むことが、あらゆる文書より信頼できる。

---

## 3.13 ソクラテス式の新視点 — 「単一HTMLは『軽さ』のためか、『信用しないで済む』ためか」(2026-06-15)

§3.8 は「プライベート」を 4 性質に分解し、Board が構造的に保証するのは **非監視(no surveillance)**
のみだと確かめた。本節は一歩戻って問う: **その非監視を、ユーザは何を根拠に *信じる* のか。**

- **問**: 「サーバを通さない / テレメトリ無し」は *主張* だ。ユーザはなぜそれを信じられる? →
  二通りある。(a) **作者を信用する**(「彼らがそう言うから」)。(b) **自分で確かめる**(ソースを読む)。
- **問**: Board で (b) は可能か? → **可能。そして例外的に容易だ。** 事実をコードで裏取りすると:
  - `index.html` は **単一ファイル・非ミニファイ**(3846 行、関数名フル・コメント有り、最長行でも 643 字)。
  - **`eval` / `new Function` / 動的 `import()` / 外部 `<script src>` が一つも無い**(grep 確認)。
    実行されるコードは **すべてこの一枚に在る**。後から挙動を変える外部スクリプトが存在しない。
  - 唯一の `fetch` は Service Worker が **自分自身をキャッシュする** ためのもの。外部オリジンはゼロ
    (STUN サーバを除く——これは WebRTC シグナリング用で、データは載らない)。
- **問**: ならば「非監視」は *証明可能* か? → **ほぼそうだ。** 中程度に技術のあるユーザが DevTools で
  ソースを開けば、「サーバへ送信する行が無い」ことを **自分の目で確認できる**。`#roomId:key` 共有や
  自動保存(IndexedDB)以外にネットワーク送信が無いことは、コードを読めば *分かる*。

**新視点(これが追加分)**: CLAUDE.md は単一HTMLの価値を「**単一ファイル・高速ロード**」(サイズ/配布)
として説明する。だがその *最も深い* 正当化はそこではない——**監査可能性(auditability)**だ。
単一・非ミニファイ・外部コード無しという構成は、**プライバシーの否定を「約束」から「誰でも確かめられる
証明」へ変える**。ユーザは作者を信用する必要が無い。"Don't trust, verify" の *verify* を、開発者でない
読者にも手の届く距離に置いている。これは §3.5(否定をテストで反証可能に)の **ユーザ版**だ——
§3.5 はテストスイートに検証させ、本節は **ユーザ自身**に検証させる。両者は同じ原理の内側と外側。

**含意(設計言語と優先順位の修正)**:

1. **単一HTML不変条件の *本当の理由* を明文化する**。「外部 `<script src>` を絶対に追加しない」
   (CLAUDE.md RULES)は、いま *サイズ/オフライン* の規則として読める。実は **信用最小化(trust-
   minimisation)** の規則でもある: 外部コードが一行でも入れば、ユーザの「自分で確かめた」監査は
   その瞬間に無効化される(外部スクリプトは後から差し替え可能だから)。この理由を RULES に併記すべき。
2. **§3.6(何を最適化するか)への原則的な答え**: 機能でもサイズでもなく **監査可能性**を最適化する。
   小さく・読みやすく・外部コード無しを保つことは、否定を *検証可能なまま* に保つこと。サイズ予算を
   撤去した(2026-06-13)いまも、「小さく保つ」指針には *第二の根拠* がある——**小さく読みやすいほど
   監査しやすい**。巨大化は機能の負債である前に **信用の負債**だ。
3. **ミニファイは原則違反になりうる**。配布サイズのためにビルドステップでミニファイすると、サイズは
   減るが **監査可能性は激減**する(読めないコードは確かめられない)。単一HTMLの価値が auditability に
   あるなら、**非ミニファイ配布を意識的な決定として守る**べき。現状そうなっている(確認済み)が、
   *なぜ*そうかが明文化されていない。
4. **将来の E2E 暗号化(H)はこの原理と整合的**: WebCrypto を *インラインで* 実装すれば、暗号コードも
   ユーザが読める。暗号を外部ライブラリに出した瞬間、「正しく暗号化している」も検証不能な約束に戻る。
   単一HTML制約は E2E の *信頼性* の前提条件でもある。

> 帰結: 「単一HTMLで小さく保つ」を *配布の都合* と読むのは過小評価。それは **Board の否定群を、
> 作者への信用無しに成立させる土台**だ。4 つの否定(単一HTML/ゼロ登録/無料/E2E予定)のうち、
> 単一HTMLだけが *他の三つを検証可能にするメタ否定* ——「私を信用しないでいい、読めばいい」。
> これを失えば、残り三つは再び *信じるしかない約束* に戻る。

---

## 3.14 ソクラテス式の新視点 — 「テストスイートの形は、何を『現実』と見なすかの告白だ」(2026-06-15)

§3.10–3.13 は *文書* の自己記述を問うた。本節は別の自己記述 — **テストスイート**を問う。
本セッション(2026-06-15)の監査が、この問いに **新しい一次データ**を与えた。

**事実(本セッションで起きたこと)**:

本セッションは「長所短所を洗い出して改良」を3周し、**同期(sync)バグを3件**修正した:

1. `validPatch` がネストを見ず、peer の `upd` に埋めた `{pts:[[1,NaN]]}` が素通り(描画破壊)。
2. WebRTC の `dc.onopen` がスナップショットを `ops` 抜きで送り、**非空 peer 同士がマージ不能**。
3. スナップショット clock が index ベースで、再スナップショット時に新 shape が **dedup でドロップ**。

**問: この3件に共通する性質は何か?** → 全て **2 peer 以上でしか発現しない**。そして全て
**591 のテストではなく、コードを *読んで* 見つかった**。テストが見つけたバグは **ゼロ**。

**問: なぜテストは1件も捕まえられなかったのか?** → テストハーネスが **単一の世界**しか
構築しないから。`test.mjs` は `<script>` を一度だけ eval し、**1つの `state` / `Store` / `Net`**
を返す。**二人目の peer が存在しない。** 二者間でメッセージを往復させる構造が無い。
ゆえに「2 peer でしか発現しないバグ」は、ハーネスの**形からして観測不能**だった。
これは見落としではなく **構造**だ — モデルに無い現象は、テストに映らない。

**問: では本セッションの3件は、なぜ見つかったのか?** → *読んだ*から。`_onRecv` のマージ分岐が
`msg.ops` を要求するのに送信側が省いている、という **コードの突き合わせ**で。つまり協調機能の
安全網は今、**人間/AI の読解**に依存している。次の同期バグも、また誰かが読まねば見つからない。
最も難しく、最もロードマップ価値の高いコード(「100点への距離」で **P2P sync = 10点**、単一最大)
の真下に、**テストの空白**が空いている。

**新視点(これが追加分)**: テストスイートは中立な検証器ではない。**「何が壊れうるか」=「何が現実か」
についての告白**だ。591 テストのほぼ全てが単一 peer を測る。その形は暗黙にこう宣言している——
*「これは一人用の描画ツールだ」*。ロードマップが *「これは多人数になる」* と宣言する一方で。
§3.9 は「アーキテクチャは scratchpad に投票した」と言った。本節はその **テスト版**だ:
**テストも単独利用に投票している。** 製品の意図(multiplayer)と、テストが体現する現実(single
peer)が食い違う限り、同期コードは「書けるが検証できない」状態に留まる。

**§3.5 との接続(falsifiable な後続)**: §3.5 は「否定を反証可能に」と説いた。本節の否定は
「*このバグはもう起きない*」。それを反証可能にする唯一の方法は **二者ハーネス**——独立した二つの
世界を eval し、`Net` の送受信を相互配線し、**収束(convergence)を assert する**こと。本セッションの
3バグは、そのハーネスがあれば *自動で* 落ちていた(読解に頼らずに)。

**この視点からの最小実装(本コミットで着手)**:
- `test.mjs` に **二者収束ハーネス**を追加。`<script>` を二度 eval して peer A / B の独立世界を作り、
  A の `Net.broadcast` / `Net._send` を B の `_onRecv` に(逆も)配線。
- **収束テスト**: (a) A が描いた図形が B に伝播する。(b) A・B が各自オフラインで描いた後にスナップショット
  交換 → **両者が和集合へ収束**(バグ2・3が壊していた非空マージを実地で守る)。
- これは §3.6(完成は加算でない)の警告に反しない: トークン的な検証ではなく、**実在した欠陥の
  クラス**を塞ぐ最小の網。verifiability bias ではなく、空白そのものの除去。

**残課題(今後)**: 3者以上での因果順序、ネット分断後の再収束、`seenOps` トリム下での重複適用、
署名付き op(§3.8 の完全性)。二者ハーネスはその入口にすぎない。

> 帰結: §3.9(アーキテクチャの投票)・§3.10–3.13(文書の自己記述)・本節(テストの自己記述)は
> 一つの主題に収束する——**Board は自分が「何であるか」を、複数の媒体で single-user と告白し続けて
> いる**。multiplayer を本気で「100点」に含めるなら、最初に変えるべきは機能ではなく、*自己記述の
> 形*(アーキテクチャの宣言・文書の時制・テストの世界数)だ。本セッションは、その最後の一つ
> (テストの世界数)を 1 から 2 へ動かし始めた。

---

## 3.15 ソクラテス式の新視点 — 「収束のテストは、収束を証明したのか、収束する場合だけを選んだのか」(2026-06-15)

§3.14 は二者ハーネスを作り、「収束を assert した」。本節はそのハーネス自身に刃を向ける —
**私はテストを *書いた* ことで安心したが、テストは何を証明したのか。**

- **問**: §3.14 の収束テストは何を見せたか? → 二 peer が **互いに素な(disjoint)図形**を描いて
  スナップショット交換すると和集合へ収束する、こと。
- **問**: それは「Board の同期は収束する」を証明したか? → **していない。** 互いに素な編集が
  混ざらないのは当然(衝突が無い)。証明されたのは *衝突しない場合* だけ。**収束する場合を選んで
  テストした**のであって、収束を証明したのではない。§3.6 が戒めた「検証可能なものを測る」罠に、
  §3.14 のハーネス自身が落ちかけていた。
- **問**: では衝突する場合 — 二 peer が **同じ図形の同じプロパティ**を同時に編集したら? →
  **二者ハーネスで実測した(本セッション)**: A が `stroke=red`、B が `stroke=blue` を*同時に* commit
  し、両 op をバッファして相互配信すると——

  ```
  A sees X.stroke = blue
  B sees X.stroke = red
  DIVERGED ✗   (A ≠ B)
  ```

  **収束しない。** 受信 op は `applyRemote` で **受信順に `Object.assign` されるだけ**で、
  clock の `ts` を使った last-writer-wins も versionNonce も無い。各 peer は「自分の op → 相手の op」
  の順で適用するので、**互いに相手の値で終わる**(A=blue, B=red)。古典的な発散。

**新視点(これが追加分)**: テストを書く行為は、それ自体では正しさを保証しない。**テストは
「測った場合」しか語らない。** §3.14 の緑✓は「同期は動く」ではなく「*衝突しない同期*は動く」しか
意味しない。にもかかわらず緑は「sync ✓」と読まれ、**実装より先に安心が生まれる**。これは
§3.6(完成は加算でない)の系: *検証を足すと、検証していない領域が見えなくなる*。最も危険なのは
赤いテストではなく、**何を測っていないかを隠す緑のテスト**だ。

**この視点からの falsifiable な処置(着手 → 解消)**:
- まず二者ハーネスに **衝突の characterization テスト**を追加し、同一プロパティ同時編集が *発散する*
  ことを assert(`A.stroke !== B.stroke`)。「既知の限界を反証可能に固定」する forcing function。
- **その後 ADR-0002(プロパティ単位 LWW)を実装し、この assert を収束(`A===B` かつ決定的勝者)へ
  反転した。** §3.15 の予言どおり「LWW が入った瞬間に characterization テストが壊れ、収束テストへ
  書き換えられる」が実際に起きた — falsifiable ガードが設計を駆動した実例。
- 詳細: `docs/ADR-0002-per-property-lww.md`。`(ts,peer,seq)` の全順序 + `state.wclock`(図形非汚染)で
  `upd`/`style` の同プロパティ衝突を決定的に収束、互いに素なプロパティは双方生存。

> 帰結(更新): 収束は **`upd`/`style` の同プロパティ衝突について証明された(ADR-0002, テスト担保)**。
> 残るは `resize`/`align`(全図形スナップショット型ゆえ受信順のまま)と undo×sync(§F)。
> 「Board の同期は *衝突しない協働* で動く」は、いまや「*同一プロパティ衝突でも収束する*(主要 op)」
> まで前進した。「衝突しても安全」の約束範囲が、実測 → ガード → 実装で一段広がった。

---

## 3.16 ソクラテス式の新視点 — 「どの編集が収束するかを決めたのは、同期アルゴリズムではなく op の書き方だった」(2026-06-15)

§3.15 は「同じプロパティへの同時 `upd` は発散する」と実測した。本節はその境界線を問う —
**「衝突」とは何か。何が発散し、何がしないのか。**

- **問**: §3.15 は `upd`(stroke の設定)で発散した。では同じ図形を二 peer が *同時に動かしたら*? →
  **二者ハーネスで実測**: A が `move dx:+10`、B が `move dy:+5` を同時に commit し相互配信すると——
  **両者とも (x=10, y=5) に収束した。** 受信順に関係なく、**両方の移動が合算**される。
- **問**: なぜ `upd` は発散し `move` は収束するのか? → `move` の `_apply` は `Shape.translate(sh, dx, dy)`
  =**相対デルタの加算**。加算は**可換(commutative)**だから受信順が結果を変えない。一方 `upd` は
  `Object.assign`=**絶対値の上書き**。上書きは可換でないから、最後に書いた方が勝つ=順序依存=発散。
- **問**: この「move は収束 / upd は発散」を、誰が・いつ設計したのか? → **誰も、明示的には。**
  `move` をデルタで書き、`upd` を絶対値で書いた——その **op エンコーディングの選択**が、*結果として*
  「どの編集が CRDT 的に収束するか」を決めていた。同期アルゴリズム(LWW/OT/CRDT ライブラリ)は
  一行も無いのに、**op の書き方が暗黙の同期意味論を確定させていた**。

**新視点(これが追加分)**: Board の収束特性は「同期層」が決めているのではない。**各 op を *デルタ*で
書いたか *絶対値*で書いたか**が決めている。これは §3.13(単一HTMLが*意図せず*監査可能性を担保)、
§3.9(アーキテクチャが*無自覚に*製品を定義)と同じ構造 — **基盤の実装選択が、上位の性質を
自覚なく決定している**。`move`/`zorder`(frac は既に CRDT 寄り)は可換側に、`upd`/`style`/`resize`/
`align`(絶対パッチ)は非可換側に、**偶然**振り分けられている。

**設計含意(item D/K/L への橋)**:
- 収束のために *必ずしも*重量級 LWW は要らない。**可換なデルタ・エンコーディングを増やす**だけで
  収束領域は広がる(例: `style` を「絶対設定」ではなく「直前値からの差分」で持てば可換化しうる)。
  これは CRDT の op-based 設計そのもの。
- 真に非可換なプロパティ(同一スカラの競合: 1つの `stroke` 色)にだけ LWW(version/versionNonce,
  item K)を当てる。**「全部 LWW」より「可換化できるものは可換化し、残りに LWW」**の方が、
  依存ゼロ・単一HTML原則に適合する(item L の Kleppmann move-op と同系統)。
- ADR を書く価値がある問い: **各 op を可換に書き換えられるか** を op ごとに棚卸しする
  (move=済/zorder=ほぼ済/style・resize・align・upd=要検討)。

> 帰結: 「Board は CRDT を持たない」は不正確。**部分的な op-based CRDT を、自覚なく既に持っている**
> (可換な move と frac 順序)。100点への sync は「CRDT を導入する」ではなく「**既にある可換性を
> 自覚し、非可換な穴を塞ぐ**」作業 — ゼロからの構築ではなく、暗黙の資産の棚卸しと補完だ。

---

## 5. 追補(第2次調査): 単一HTML制約に最適な具体手法

第1次の方向性を、Board の「単一HTML / 依存ゼロ」制約に**最も適合する実装手段**へ落とし込む追加調査。

### K. 同期は「重い CRDT ライブラリ」を避け、Excalidraw 方式(version + versionNonce の LWW)を採る ★sync の本命
- **背景**: CRDT ライブラリ比較(Yjs / Automerge / Loro)では Loro/Yjs が高速だが、**WASM / バンドルが単一HTML原則と相反**
  する(Yjs でも別バンドル、Loro は WASM ロード)。Board に丸ごと取り込むのは原則違反。
- **改善**: Excalidraw は各 element に `version`(変更ごと +1)と `versionNonce`(変更ごとの乱数)を持たせ、マージ時に
  **version が大きい方を採用、同 version は versionNonce が小さい方を決定的に採用**(LWW + 決定的タイブレーク)。
  これだけで実用上の協調問題の大半を解決し、E2E 暗号化と両立。**依存ゼロで実装でき、Board 既存の op-log/clock と親和**。
- **Board 対応**: shape に `version`/`versionNonce` を付与し、`Store.applyRemote` の dedup/適用を「clock 順」から
  「version/versionNonce 比較」へ。これが項目 D(LWW レジスタ)の具体実装。
- **出典**: [Excalidraw — Building P2P Collaboration](https://plus.excalidraw.com/blog/building-excalidraw-p2p-collaboration-feature) ·
  [Excalidraw Collaboration System (DeepWiki)](https://deepwiki.com/excalidraw/excalidraw/7-collaboration-system) ·
  [CRDT benchmark — Yjs/Automerge/Loro](https://www.pkgpulse.com/guides/yjs-vs-automerge-vs-loro-crdt-libraries-2026) ·
  [crdt-benchmarks](https://github.com/dmonad/crdt-benchmarks)

### L. 並べ替え/移動の同時編集 = Kleppmann の move op + 安定 position ID
- 項目 A の fractional index に **「安定 position ID への単一 move op」** を組み合わせると、複数ユーザが同じ要素を
  同時に reorder しても破綻しない。既存の list CRDT に後付け可能な汎用アルゴリズム。
- **出典**: [Kleppmann — Moving Elements in List CRDTs (PaPoC 2020, PDF)](https://martin.kleppmann.com/papers/list-move-papoc20.pdf) ·
  [Extending JSON CRDTs with Move Operations (arxiv 2311.14007)](https://arxiv.org/pdf/2311.14007) ·
  [move-op 実装](https://github.com/trvedata/move-op)

### M. 図形認識 MVP = **$Q / $1 Unistroke Recognizer**(<100行・依存ゼロ)★AI機能の現実的な入口
- **背景**: 項目 G の ML 認識は強力だが WASM/BYOK が必要。一方 **$1/$Q はテンプレートマッチのみ**で
  line/circle/rectangle/triangle 等を **97% 認識**、位置・拡縮・回転不変、**コード <100 行・依存ゼロ**。
- **改善**: ペンストローク終了時に $Q を走らせ「ラフ図形を整形(beautify / snap-to-shape)」やジェスチャコマンドへ。
  **単一HTML・完全オフラインのまま** Excalidraw 的な体験を最小コストで実現。ML 版(G)は将来の上位互換。
- **出典**: [Wobbrock et al. — $1 Unistroke Recognizer (UW)](https://depts.washington.edu/acelab/proj/dollar/index.html) ·
  ($Q: super-quick, articulation-invariant, low-resource 版)

### まとめ: 制約適合の sync スタック提案
Board の Phase 1.1(P2P sync 本番化)は、**重量級 CRDT ライブラリではなく**以下の依存ゼロ構成が最適:
`fractional index(順序, A)` + `Kleppmann move op(同時並べ替え, L)` + `version/versionNonce LWW(プロパティ衝突, K)`
+ `WebCrypto AES-GCM(E2E, H)` + `因果情報付き逆opによる undo(F)`。すべて単一HTMLに収まり、原則を破らない。

---

## 出典一覧 (主要)

- Ink & Switch, *Local-first software: you own your data, in spite of the cloud* — https://www.inkandswitch.com/essay/local-first/
- Figma, *How Figma's multiplayer technology works* — https://www.figma.com/blog/how-figmas-multiplayer-technology-works/
- Figma, *Realtime Editing of Ordered Sequences* — https://www.figma.com/blog/realtime-editing-of-ordered-sequences/
- Liveblocks, *Fractional indexing* — https://liveblocks.io/blog/how-crdts-and-sync-engines-keep-realtime-lists-ordered-with-fractional-indexing
- tldraw, *jittered-fractional-indexing* (PR #6646) — https://github.com/tldraw/tldraw/pull/6646
- steveruizok, *perfect-freehand* — https://github.com/steveruizok/perfect-freehand
- tldraw Docs, *Draw shape* — https://tldraw.dev/sdk-features/draw-shape
- arxiv 2404.11308, *Undo and Redo Support for Replicated Registers* (2024) — https://arxiv.org/abs/2404.11308
- arxiv 2306.05832, *Sketch Beautification* — https://arxiv.org/html/2306.05832v2
- arxiv 2204.13153, *SSR-GNNs: Stroke-based Sketch Representation* — https://arxiv.org/abs/2204.13153
- arxiv 1811.08170, *Sketch-R2CNN* — https://arxiv.org/pdf/1811.08170
- arxiv 2405.07601, *On-device Online Learning of TinyML Systems* — https://arxiv.org/abs/2405.07601
- arxiv 2212.02618, *Collabs: A Flexible and Performant CRDT Collaboration Framework* — https://ar5iv.labs.arxiv.org/html/2212.02618
- Kleppmann, *Moving Elements in List CRDTs* (PaPoC 2020) — https://martin.kleppmann.com/papers/list-move-papoc20.pdf
- arxiv 2311.14007, *Extending JSON CRDTs with Move Operations* — https://arxiv.org/pdf/2311.14007
- Excalidraw, *Building Excalidraw's P2P Collaboration Feature* (version/versionNonce) — https://plus.excalidraw.com/blog/building-excalidraw-p2p-collaboration-feature
- Wobbrock et al., *$1 Unistroke Recognizer* (and $Q) — https://depts.washington.edu/acelab/proj/dollar/index.html
- *Yjs vs Automerge vs Loro* CRDT benchmark — https://www.pkgpulse.com/guides/yjs-vs-automerge-vs-loro-crdt-libraries-2026
- dmonad, *crdt-benchmarks* — https://github.com/dmonad/crdt-benchmarks
- W3C WCAG 2.2, *Keyboard Accessible* — https://www.w3.org/WAI/WCAG22/Understanding/keyboard-accessible.html
- HTML `<canvas>` Accessibility (Paul J. Adam) — https://pauljadam.com/demos/canvas.html
