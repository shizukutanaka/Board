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

### B. ペンを **筆圧/速度連動の可変幅ストローク** に (perfect-freehand アルゴリズム)
- **現状**: ペンは固定幅ポリライン (`drawShape` の `case 'pen'`、`size` 一定)。
- **改善**: Excalidraw・tldraw が採用した perfect-freehand のアルゴリズム(thinning / streamline / smoothing /
  pressure or velocity)を **インラインで移植**(外部依存不可なので ~200 行を自前実装)。pointer events の
  `pressure` を使い、非対応デバイスは速度から擬似筆圧。描き味の体感品質が大幅向上。
- **出典**: [perfect-freehand (steveruizok)](https://github.com/steveruizok/perfect-freehand) ·
  [tldraw Draw shape docs](https://tldraw.dev/sdk-features/draw-shape) ·
  [Excalidraw issue #4802](https://github.com/excalidraw/excalidraw/issues/4802)
- **原則整合**: 依存追加なし。SVG 出力は path の variable-width 化(複数 path or filled outline)。

### C. **空間インデックス**(quadtree / uniform grid)でヒットテストと描画カリング
- **現状**: `architecture.md` が >500 shape での quadtree 導入を予告済みだが未実装。hover ヒットテスト
  (`pickTop`)が毎 pointermove で O(N)、`draw()` は全 shape を毎フレーム描画。
- **改善**: commit 毎に遅延再構築する coarse uniform-grid を持ち、`pickTop`/marquee と **画面外 shape の描画カリング**
  に使う。tldraw は culling + 空間索引で数千オブジェクトを 60fps 維持。
- **出典**: [tldraw performance/culling (toolpick 比較)](https://www.toolpick.dev/blog/excalidraw-vs-tldraw-2026) ·
  Board `docs/architecture.md`(既存の予告)
- **原則整合**: ~40 行、単一HTML可。

### D. 同期データモデル: **per-property LWW レジスタ + 因果順序**(Figma 方式)
- **現状**: op 全体をブロードキャスト + `{peer,seq,ts}` clock。受信 op は型 allow-list のみ検証
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
- **研究知見**: canvas の中身はスクリーンリーダーから不可視。SVG は意味論を内蔵。Board は
  `role="application"`+`aria-label` まで実装済みだが per-shape の意味が無い。
- **改善**: 画面外に shape 一覧を反映する **aria-live な DOM ミラー** を持ち、Tab で shape を巡回 + 読み上げ、
  各 shape に alt/label。v2.0「外部 a11y 監査通過」へ前進。
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
