# Changelog

All notable changes to Board follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.315] - 2026-09-24

### Changed
- drawio export の共通 style キー出力を `_dioStyEmit` に集約 (ADR-0263)

## [1.7.314] - 2026-09-24

### Fixed
- .drawio export: edge の opacity= 出力漏れを修正 (往復の非対称、
  ADR-0262)

## [1.7.313] - 2026-09-24

### Added
- .drawio: rotation= ↔ s.rotate を vertex で往復 (ADR-0261)

## [1.7.312] - 2026-09-24

### Added
- .drawio: flipH/flipV ↔ s.flip ビットマスク往復 (vertex+edge、ADR-0260)

## [1.7.311] - 2026-09-24

### Added
- .drawio: 画像シェイプを shape=image;image=<url> として往復 (ADR-0259)。
  data URL は `;base64,` を含むため末尾配置 + raw style 抽出で対応

## [1.7.310] - 2026-09-24

### Changed
- drawio import の共通 style キー適用を `_dioStyApply` に集約 (ADR-0258)。
  edge の opacity 適用漏れも解消

## [1.7.309] - 2026-09-24

### Added
- .excalidraw export: appState に scrollX/scrollY/zoom を同梱し開いた
  時点の表示位置を復元 (ADR-0257)

## [1.7.308] - 2026-09-24

### Added
- .drawio: endArrow タイプ (oval|open|none) ↔ s.head 往復、startArrow の
  独立判定で line+start-head を復元 (ADR-0256)

## [1.7.307] - 2026-09-24

### Added
- .drawio: dotted 線を dashed=1+dashPattern として往復 (vertex+edge、
  ADR-0255)

## [1.7.306] - 2026-09-24

### Added
- .drawio: s.locked を editable/deletable/movable=0 として往復
  (vertex+edge、ADR-0254)

## [1.7.305] - 2026-09-24

### Added
- .drawio: vertex の fontFamily を mono/serif カテゴリへマップし往復
  (ADR-0253)

## [1.7.304] - 2026-09-24

### Performance
- コネクタ/ボックスラベルの行幅 measureText を WeakMap でメモ化 — 定常
  フレームの計測コストを解消 (ADR-0252)

## [1.7.303] - 2026-09-24

### Fixed
- iOS Safari の URL バー収縮/ソフトキーボードでキャンバスが再サイズ
  されない問題を visualViewport.resize で修正 (ADR-0251)

## [1.7.302] - 2026-09-24

### Added
- .drawio: 圧縮 (deflate-raw+base64) ファイルを DecompressionStream で
  インポート — 既定保存の .drawio がそのまま開ける (ADR-0250)

## [1.7.301] - 2026-09-24

### Added
- .drawio: edge ラベルの labelBackgroundColor/fontSize/fontStyle を往復
  (ADR-0249)。edge の fontColor は線色とラベル色を分離できないため未対応

## [1.7.300] - 2026-09-24

### Changed
- commit+origSel の3行イディオムを `_rcOp`/`_cOp` ヘルパーに集約 (39サイト、
  ~3.5KB 回収、ADR-0248)

## [1.7.299] - 2026-09-24

### Added
- .drawio 書き出し/読み込み: visible="0"・shadow=1・fontColor を往復
  (ADR-0245..0247)。非表示図形は除外せず visible="0" で保持するよう変更

## [1.7.298] - 2026-09-24

### Added
- .excalidraw 書き出し/読み込み: locked・lineHeight・fontFamily・
  verticalAlign を往復 (ADR-0241..0244)

## [1.7.297] - 2026-09-24

### Fixed
- .drawio インポートが出荷時からランタイムで動作しなかった致命的バグを修復
  (excScene の閉じ括弧欠落により drawioToShapes 系がネストされていた、ADR-0240)

### Added
- .drawio インポート: グループ/スイムレーン内の子セルの親相対座標を解決し、
  正しい世界座標へ配置 (ADR-0240)

## [1.7.296]

### 内部変更
- **style op 共有化** (ADR-0239)。27箇所に重複した
  `{op:'style'}` コミット定型文を `_styleOp()` へ —
  約3.1KB削減 (挙動不変、512KB上限内に余裕回復)。

## [1.7.295]

### 修正
- **drawio verticalAlign 往復** (ADR-0238)。import で
  `verticalAlign`→`s.valign`、export で逆出力 —
  値域一致により縦揃えが完全往復。

## [1.7.294]

### 追加
- **ラベル入力中の装飾キー** (ADR-0237)。ラベル input
  でも ⌘B/I/U/⇧X が図形ラベルの装飾をトグル —
  Tab 巡回による連続ラベリングの手を止めない。

## [1.7.293]

### 追加
- **編集中の装飾キー** (ADR-0236)。インラインエディタ
  内で ⌘B/I/U/⇧X が図形の bold/italic/under/strike を
  トグル — グローバルキーは textarea で止まるため
  ローカルに配線。オーバーレイ表示も即時反映。

## [1.7.292]

### 修正
- **SVG `<image>` インポート** (ADR-0235)。`href`/
  `xlink:href` の `data:image/` を image 図形へ復元 —
  Board 自身の SVG 出力が往復する。
- excalidraw コンテナtext と SVG font 属性束を
  `_ct()`/`_svgFont()` に共有化 (~1.7KB 削減、
  512KB 上限内へ復帰)。

## [1.7.291]

### 修正
- **excalidraw ラベル往復** (ADR-0234)。ラベル付き
  図形がコンテナtext (`bLabel` マーカー) として出力
  され、取込時に `label` へ復元 — sticky fold と
  判別できるため型も正しく往復する。

## [1.7.290]

### 追加
- **矢印ヘッド巡回に 'none'** (ADR-0233)。ctx メニュー
  のヘッド巡回が arrow→dot→open→none の4値に —
  ヘッドを消すのに型変換が不要になった。

## [1.7.289]

### 追加
- **クリップボード mxfile 受付** (ADR-0232)。drawio で
  ⌘C した図形 (非圧縮 `<mxfile>` XML) をペーストで
  drawio インポートへルーティング — 従来はテキスト
  図形に落ちていた。

## [1.7.288]

### 修正
- **excalidraw エクスポートfidelity** (ADR-0231)。
  `fstyle`→hachure/cross-hatch、head/start→arrowhead
  スタイル、flip→scale を出力。インポートは
  `type:'image'` を `files` マップから復元 (`scale`
  →flip) — 画像が往復で保存される。

## [1.7.287]

### 修正
- **excalidraw 装飾fidelity** (ADR-0230)。インポートで
  hachure/cross-hatch→fstyle、roundness→r、textAlign→
  align、endArrowhead→head、startArrowhead→start に
  復元。ヘッドなし矢印 (`endArrowhead:null`) は新値
  `head:'none'` で表現し両レンダラが描画を省略。

## [1.7.286]

### 修正
- **excalidraw groupIds 往復** (ADR-0229)。インポートで
  `groupIds[0]` を `groupId` に復元 (ネストは最外へ
  平坦化) — エクスポートしたグループが取込時に保持。
- container text の `angle` を親 rect の回転に揃えた
  (回転した付箋が本物の excalidraw で正しく表示)。

## [1.7.285]

### 修正
- **drawio ラベル装飾往復** (ADR-0228)。インポートで
  `align`→`s.align`、`fontStyle` ビットマスク→
  bold/italic/under に復元。エクスポートも対称出力し
  中央揃え・太字・斜体・下線が drawio 往復で保存。

## [1.7.284]

### 追加
- **ストレージ残量警告** (ADR-0227)。保存後に
  `storage.estimate()` を参照し、使用量が 80% 超で
  エクスポート誘導トーストを表示 — 保存失敗の前に
  気づける (5分クールダウン、非対応環境は no-op)。

## [1.7.283]

### 修正
- **drawio note/swimlane 逆マップ** (ADR-0226)。インポート
  で `shape=note`→sticky (`fillColor`→`color`)、
  `swimlane`→frame に復元 — ADR-0220 エクスポートとの
  往復で sticky/frame が保存される。

## [1.7.282]

### 修正
- **excalidraw sticky 往復** (ADR-0225)。export が text に
  `containerId` を出力し rect の `boundElements` に登録 —
  import は container text を親に fold して sticky を復元
  (従来は rect+text に分解したまま)。

## [1.7.281]

### 修正
- **excalidraw 往復** (ADR-0223)。import が `start/endBinding`
  を `s.a/s.b` に復元 + export が rect を正しい型名
  `rectangle` で出力 (従来は往復で矩形が消失)。
- **drawio import fidelity** (ADR-0224)。`endArrow=none`→
  直線、`startArrow`→始点ヘッド、`curved`/`jumpStyle` を
  フラグにマップ — エッジが往復保存される。

## [1.7.280]

### 修正
- **excalidraw 結合修復** (ADR-0222)。エクスポートが
  存在しない `bind1/bind2` を読み常に unbound だった
  バグを `s.a/s.b` に修正 + `boundElements` 出力と
  aF/bF → focus 近似。

## [1.7.279]

### 追加
- **drawio 固定アンカー往復** (ADR-0221)。`exitX/exitY` /
  `entryX/entryY` を aF/bF 固定エッジアンカーと双方向
  マップ — drawio↔Board で固定ポートが保存される。

## [1.7.278]

### 追加
- **.drawio エクスポート** (ADR-0220)。エクスポートメニューに
  drawio 形式を追加 — ADR-0203 インポートとの往復。
  bound 端点・waypoints・orthogonal routing・curve/hop・
  共有スタイル語彙を mxGraphModel にマップ。

## [1.7.277]

### 追加
- **⌥ 中心基点描画** (ADR-0219)。rect/ellipse/diamond/
  sticky/frame のドラッグ中に ⌥ でアンカーを中心に拡大
  (Figma/draw.io 慣例)。⇧ 併用で中心+正方形/真円。

## [1.7.276]

### 追加
- **コネクタのホップ (交差ジャンプアーク)** (ADR-0218)。
  ctx メニューでトグル — 交差点を半円で飛び越す回路図/
  draw.io "jump" スタイル。直線・ウェイポイント・エルボー
  に対応、canvas/SVG 同一幾何。

## [1.7.275]

### 修正
- **ルートリセットの ctx 到達性** (ADR-0217)。`labelPos` /
  `cbend` だけが残ったコネクタにも「ルートをリセット」が
  出るようゲートを拡張 (⌥click の代替到達)。

## [1.7.274]

### 改善
- **ラベル位置のスロット吸着** (ADR-0216)。コネクタラベルの
  ドラッグ位置が 0/0.25/0.5/0.75/1 に磁石吸着
  (draw.io の start/center/end 系)。

## [1.7.273]

### 改善
- **モーダルのフォーカストラップ** (ADR-0215、a11y)。help/share
  ダイアログで Tab が内部を巡回 (外への抜け防止 + 閉鎖時に
  呼び出し元へフォーカス復帰、WCAG 2.1.2/2.4.3)。

## [1.7.272]

### 改善
- **端点結合先探索のグリッド索引化** (ADR-0214)。`_bindAt` の
  全図形走査を pickTop と同じ `_queryGrid` 3×3 近傍+逆 z に
  (>40 図形時)。端点ドラッグごとの O(n) を解消。

## [1.7.271]

### 追加
- **ctx「アンカー固定/解除」** (ADR-0213)。結合済みコネクタの
  固定アンカーをタッチ/キーボードからも操作可能
  (現在の接触点を保存して固定、再実行で解除)。

## [1.7.270]

### 修正
- **コネクタラベルの行間反映** (ADR-0212)。ctx「行間」で設定した
  `s.lineH` が描画に反映 (canvas+SVG、`fs*1.25` ハードコードを
  ボックスラベルと同じフォールバック式に)。

## [1.7.269]

### 追加
- **テキスト・コネクタのドロップシャドウ** (ADR-0211)。ctx「影」が
  text/line/arrow でも有効化 (canvas+SVG 同一、ラベル pill は
  二重影を回避、epilogue に防御クリア追加)。

## [1.7.268]

### 修正
- **コネクタラベルの複数行描画** (ADR-0210)。インポート由来の
  `\n` 入りラベルを canvas/SVG とも行スタックで表示
  (pill は全行包含、下線/取消線は行毎、`<tspan dy>` 対応)。

## [1.7.267]

### 追加
- **コネクタ固定エッジアンカー** (ADR-0209)。端点を ⌥+ドロップで
  結合すると draw.io exitX/exitY 相当の固定アンカー (bbox 分数
  座標、最近接エッジへクランプ) になり、図形移動で接続点が
  回り込まない。⌥無しは従来のフローティング。

## [1.7.266]

### 追加
- **テキストの幅折返し** (ADR-0208)。ctx「テキスト折返し」で text
  図形を `s.w` 幅で word-wrap (draw.io wordWrap=1 相当、付箋と同一
  禁則処理、canvas+SVG 同一行生成、リサイズでリフロー)。

## [1.7.265]

### 追加
- **エルボーコネクタの角丸** (ADR-0207)。ctx「角丸を切替」で
  elbow 経路のジョイントを 8/16/24px 半径で角丸化 (draw.io
  rounded edgeStyle 相当、canvas+SVG 同一数学、矢印ヘッド方向保持)。

## [1.7.264]

### 追加
- **コネクタ端点ドラッグの 45° 拘束** (ADR-0206)。端点掴み中に
  Shift で固定端から 45° 刻み (新規描画の Shift 拘束と同一規約)。

### 修正
- ラベルエディタの入力フォントを `s.fontSize`/`s.italic` に一致
  (従来は常に 12px 通常体)。

## [1.7.263]

### 追加
- **字間 (letter-spacing)** (ADR-0205)。ctx メニュー「字間」で
  text/sticky/フレーム/ラベル系の字送りを 標準→1px→2px に巡回
  (canvas `ctx.letterSpacing` + SVG `letter-spacing`、継承・
  eyedropper・style-copy・付箋連鎖 対応)。

## [1.7.262]

### 追加
- **フレームラベルの装飾** (ADR-0204)。フレーム名に italic・下線・
  取消線を適用 (⌘I/⌘U/⌘⇧X、canvas+SVG、600 ウェイト維持)。

## [1.7.261]

### 追加
- **.drawio インポート** (ADR-0203)。draw.io (非圧縮 mxGraphModel)
  のドロップ/ファイルピッカー対応 — vertex→図形、edge→結合矢印
  (orthogonal→elbow、waypoints、ラベル)、色/線幅/破線/opacity/角丸
  を対応プロップへ。圧縮ペイロードは警告表示。

## [1.7.260]

### 追加
- **描画中の寸法/線長ピル** (ADR-0202)。rect/ellipse/diamond/
  sticky/frame のドラッグ描画で W×H、line/arrow で ↔長さ をライブ
  表示 — 既存図形のリサイズ表示と同一形式。

## [1.7.259]

### 追加
- **移動中の X,Y リードアウト** (ADR-0201)。選択ドラッグ中に選択群
  bbox の左上座標をライブピル表示 (回転角/寸法/線長の既存表示と
  揃い、Figma の X/Y パネル相当)。

## [1.7.258]

### 追加
- **Shift でペン直線モード** (ADR-0200)。ストローク中に Shift を
  押すと始点からの直線に拘束 (Excalidraw parity)、離すとその点から
  フリーハンド継続。marker も同様。

## [1.7.257]

### 追加
- **付箋をテキストに合わせる** (ADR-0199)。ctx メニューで付箋の
  幅を最長行に縮め、高さを折返し行数へ自動調整 (draw.io Autosize
  相当、長文のクリップ溢れを解消)。

## [1.7.256]

### 追加
- **コネクタ方向の反転** (ADR-0198)。ctx メニュー「方向を反転」で
  line/arrow の端点・結合先・ウェイポイント順を一括入替
  (draw.io "Reverse" 相当、labelPos も鏡像化)。

## [1.7.255]

### 追加
- **フレームラベルの文字揃え** (ADR-0197)。フレーム名が
  cycleTextAlign/ctxTextAlign で左→中央→右に揃え可能
  (canvas+SVG、ラベル未設定フレームにも到達)。

## [1.7.254]

### 追加
- **ラベル編集の Tab 巡回** (ADR-0196)。ラベルエディタで Tab /
  Shift+Tab がコミットして次/前のラベル対応図形に移動 — 連続
  ラベリングが一発化。

## [1.7.253]

### 追加
- **画像キャプション帯に s.fill** (ADR-0195)。キャプションの帯
  背景が fill スウォッチに追随 (canvas+SVG、透過0.85規約維持)
  — fill 系到達経路が全種で整合。

## [1.7.252]

### 追加
- **ドロップシャドウ** (ADR-0194)。ctx メニュー「影」で rect/
  ellipse/diamond/image にシャドウをトグル — canvas の
  shadow* プロパティ + SVG 共有 `feDropShadow` フィルタ。
  last-used 継承・スタイルコピー・スポイトも一貫。

## [1.7.251]

### 追加
- **コネクタラベル背景に s.fill** (ADR-0193)。エッジラベルの pill
  背景が fill スウォッチに追随 (canvas+SVG、透過0.9規約維持) —
  「設定可能だが描画されない」監査完結。

## [1.7.250]

### 追加
- **付箋の文字色** (ADR-0192)。`s.stroke` が付箋本文・下線/取消線
  の色に反映 (canvas+SVG) — stroke スウォッチ/スタイルコピーが
  付箋でも有効に。

## [1.7.249]

### 追加
- **テキストの背景塗り** (ADR-0191)。fill スウォッチ等で設定した
  `s.fill` がテキスト背面のハイライトプレートとして描画 (align
  各モード対応、canvas+SVG)。従来は設定のみ可能で描画されない
  隙間だった。

## [1.7.248]

### 修正
- **付箋チェーンの全タイポグラフィ継承** (ADR-0190)。⌘Enter 連鎖の
  新付箋が font/lineH/bold/italic/under/strike/valign も引き継ぐ —
  連続メモの見た目がばらけない。

## [1.7.247]

### 追加
- **行間 (line-height) 巡回** (ADR-0189)。ctx メニュー「行間」で
  標準→狭い (1.0)→広い (1.5) を巡回 — text/sticky/全ラベルの
  canvas+SVG、テキスト編集後の自動高さ、スタイルコピー/スポイト/
  last-used 継承まで一貫。

## [1.7.246]

### 追加
- **フレームラベルの書体巡回** (ADR-0188)。cycleFont/ctxFont が
  フレームに効き、`Shape.make` も font を継承 — フレーム名を
  mono/serif に切替可能。

## [1.7.245]

### 追加
- **付箋本文の縦揃え** (ADR-0187)。ctx メニュー「縦揃え」が付箋にも
  効き、上→中央→下を巡回。canvas と SVG export の両方に実装
  (下線/取消線も追従)。ctxVAlign の名称を「縦揃え」に汎用化。

## [1.7.244]

### 修正
- **フレームラベル/ラベルエディタが s.font を反映** (ADR-0186)。
  フレーム名とラベル編集入力が `_fontFam` に対応 — 600 ウェイト
  規約は維持しファミリのみ継承。ラベル付きフレームで cycleFont が
  完結する。

## [1.7.243]

### 追加
- **スポイトの全ルックプロパティ吸収** (ADR-0185)。スポイトが
  font/head/elbow/curve/r/fstyle/align/fontSize など `state.style`
  に永続化される全キーを吸収 — 拾った見た目が次の図形に継承
  (Figma parity)。両端ヘッド `start` も継承対象に追加。

## [1.7.242]

### 追加
- **r/fstyle/align の last-used 継承** (ADR-0184)。角丸・ハッチ・
  文字揃えの最終適用値が `state.style` に残り、次に作る同種図形に
  継承 (ADR-0180/0181/0183 と同一規則)。

## [1.7.241]

### 追加
- **コネクタルートの last-used 継承** (ADR-0183)。ctx エルボー/曲線
  トグルの結果が `state.style` に残り、次に引くコネクタに継承 —
  フローチャートで毎回切替不要に。「ルートをリセット」で継承も解除。

## [1.7.240]

### 追加
- **ラベルエディタの viewport 追従** (ADR-0182)。ラベル編集 input が
  pan/zoom で図形に追従 (テキストエディタと同一規則、ADR-0053)。

## [1.7.239]

### 追加
- **head/font の last-used 継承** (ADR-0181)。矢印ヘッドスタイルと
  書体の最終使用値が `state.style` に残り、次に作る同種図形に継承。

## [1.7.238]

### 追加
- **fontSize の last-used 継承** (ADR-0180)。⌘⇧,/. で設定した
  fontSize が `state.style` に残り、次に作る text/sticky に継承
  (stroke/fill/size と同じ規則)。

## [1.7.237]

### 追加
- **画像キャプションの上下位置** (ADR-0179)。`s.valign` がラベル所持
  の画像にも適用 — キャプション帯を画像上部へ (draw.io parity)。

## [1.7.236]

### 追加
- **フレーム/画像ボーダーの破線** (ADR-0178)。dash スタイルが
  フレーム枠と画像ボーダーにも適用 (canvas/SVG 一致)。

## [1.7.235]

### 追加
- **消しゴムホバーハイライト** (ADR-0177)。消しゴムで図形をホバー
  すると赤破線枠で消去対象を予告 (Excalidraw parity) — 誤削除を防ぐ。

## [1.7.234]

### 追加
- **画像のボーダー** (ADR-0176)。`s.stroke`+`s.size` で画像に角丸
  ボーダーを描画 (canvas/SVG) — 設定可能だったが描画されていなかった
  スタイルを視覚化。

## [1.7.233]

### 追加
- **フレームの塗り色** (ADR-0175)。`s.fill` が canvas/SVG 両経路で
  描画される — 塗りボタン/スタイルコピーで設定できていた値が
  視覚化。未設定フレームは従来の半透明のまま。

## [1.7.232]

### 追加
- **ctx 不透明度巡回** (ADR-0174)。ctx「不透明度 (巡回)」で選択の
  不透明度を 1→0.7→0.4→0.1 に巡回 — 数字キー (0-9) と同じ style op
  経路をタッチ/ctx からも到達可能に。

## [1.7.231]

### 追加
- **書体ファミリ巡回** (ADR-0173)。ctx「書体」で system→等幅→serif を
  巡回 (text/sticky/ラベル保持図形)。canvas/SVG/テキストエディタで
  一貫、オフライン安全なシステムスタックのみ使用。

## [1.7.230]

### 追加
- **ロック選択に鍵バッジ** (ADR-0172)。ロック済み図形の選択枠に
  padlock アイコンを表示 (draw.io parity) — 破線のみだった「動かせ
  ない」状態の視認性を改善。

## [1.7.229]

### 追加
- **ボックス/画像ラベルの水平揃え** (ADR-0171)。ctx「文字揃え」が
  ラベル保持図形にも適用 — canvas/SVG ともに `s.align` で左/中央/右
  (コネクタラベルは中点ピルのため対象外)。

## [1.7.228]

### 追加
- **ラベルの太字/斜体/下線/取消線** (ADR-0170)。⌘B/⌘I/⌘U/⌘⇧X が
  ラベル保持図形にも適用 — canvas は `_fontStr` + 手動ストローク、
  SVG は font-weight/style/text-decoration 属性で一致。

## [1.7.227]

### 追加
- **ラベルのフォントサイズ** (ADR-0169)。コネクタ (既定12px)、
  ボックス/画像キャプション (既定14px) のラベルが `s.fontSize` を
  尊重 — ⌘⇧,/⌘⇧. がラベル所持図形にも適用。

## [1.7.226]

### 追加
- **画像の角丸** (ADR-0168)。ctx「角丸」巡回が画像にも適用 —
  canvas は roundRect クリップ、SVG は clipPath、フリップ/回転と
  独立に合成。

## [1.7.225]

### 追加
- **数字キーで不透明度設定** (ADR-0167)。選択中に `0-9` のベア
  数字キーで不透明度を直接設定 (`5`→50%、`0`→100%、Figma
  parity)。

## [1.7.224]

### 追加
- **⇧X で塗り↔線色スワップ** (ADR-0166)。Illustrator parity —
  rect/ellipse/diamond/frame/sticky (付箋は color を塗りとして交換)、
  単一 style op で undo 1回。

## [1.7.223]

### 追加
- **非選択時の矢印キーでビューポートをパン** (ADR-0165)。40px 相当
  (⇧で200px) のスクロール (Excalidraw parity) — 選択がある場合は
  従来の nudge を維持。

## [1.7.222]

### 追加
- **ステータスバーに選択寸法を表示** (ADR-0164)。選択 bbox の
  W×H を常時表示 (Figma parity) — 非選択時は折り畳み、署名
  ゲートで DOM 書き換えは変化時のみ。

## [1.7.221]

### 修正
- **Tab サイクルから非表示図形を除外** (ADR-0163)。ポインタで触れ
  ない図形がキーボードで選択できる不整合を解消 — 全経路の
  `visible!==0` 監査を完結。

## [1.7.220]

### 追加
- **ダブルクリックでグループ潜り** (ADR-0162)。グループ選択状態での
  dblclick がクリックしたメンバー単体に絞り込み (Figma parity)、
  再度の dblclick でラベル編集に到達。

## [1.7.219]

### 追加
- **スポイトツール (I)** (ADR-0161)。クリックした図形の見た目属性を
  既定スタイル + スタイルクリップボードへ取得し前ツールへ自動復帰
  (Figma parity)。⌥V で選択にも適用可能。

## [1.7.218]

### 修正
- **WebRTC 招待トークンの近代化** (ADR-0160)。廃止済み
  `escape/unescape` を UTF-8 安全な base64url (`_b64uEnc`) に
  置換 — デコーダは旧形式をフォールバック受理 (後方互換)。

## [1.7.217]

### 追加
- **ボックスラベルの縦揃え** (ADR-0159)。ctx「ラベル縦揃え」で
  中央→上→下を巡回 — rect/ellipse/diamond のラベルを `s.valign`
  で上揃え/下揃えに (canvas+SVG+styleClipboard)。

## [1.7.216]

### 追加
- **⌥+ドラッグのラッソ選択** (ADR-0158)。空キャンバス上の
  Alt ドラッグでフリーハンド選択 — bbox 中心の点包含判定、
  ⇧で加算、ロック/非表示は除外。

## [1.7.215]

### 追加
- **ctx「結合を解除」** (ADR-0157)。選択したコネクタの端点結合
  (a/b) を一括クリア — フローチャート部分複製時の解除作業を
  1操作に集約。undo 完全対応。
- README サイズバッジを実測に更新 (~144KB gzip)。

## [1.7.214]

### 追加
- **ダイヤの角丸** (ADR-0156)。ctx「角丸を切替」が diamond にも
  適用 — 各頂点を二次ベジエで丸める `_diamondPath` (canvas/
  SVG 両経路)。既定は尖ったまま (r=0 で後方互換)。

## [1.7.213]

### 修正
- **⇧1 / 起動時フィットが非表示図形を含むバグ** (ADR-0155)。
  可視図形のみにフィット — 全件非表示時のみ全図形に
  フォールバック。

## [1.7.212]

### 修正
- **DOM ミラー (SR 図形一覧) で非表示図形に `(非表示)` タグ**
  (ADR-0154)。除外すると発見経路が消えるため、状態表示で対応。

## [1.7.211]

### 修正
- **非表示図形がスナップを引き寄せるバグ** (ADR-0153)。
  `_snapIndex` のターゲット収集から `s.visible===0` を除外 — 
  移動・リサイズ・等間隔スナップの全経路で不可視エッジへの
  吸着を解消。

## [1.7.210]

### 修正
- **グループリサイズで曲線ベンドが取り残されるバグ** (ADR-0152)。
  `s.cbend` をアフィン写像 `sx·sy·len/len'` で再計算 — ハンドル
  跨ぎフリップではキラリティも正しく反転。

## [1.7.209]

### 追加
- **Alt+hover 距離ガイド** (ADR-0151)。図形選択中に Alt を押して
  別図形にホバーすると、選択エンベロープとの軸ギャップを実線+
  ティック+pxピルで表示 (Figma measure mode parity)。

## [1.7.208]

### 修正
- **SVG エクスポートに非表示図形が混入するバグ** (ADR-0150 追補)。
  buildSVG は drawShape を通らず独自に要素を構築するため、
  `s.visible===0` のフィルタを追加。

## [1.7.207]

### 修正
- **非表示図形が検索ヒット・バインド対象になる残存経路**
  (ADR-0150)。検索リスト構築と `_bindAt` の候補走査が
  `s.visible===0` をスキップするよう統一。

## [1.7.206]

### 修正
- **画像フリップが効かないバグ** (ADR-0149)。`s.flip` ビット
  マスクを追加し canvas/SVG/ミニマップの全3経路でピクセルを
  実反転 — 従来は対称箱の鏡像のみで見た目が変わらなかった。

## [1.7.205]

### 修正
- **複数選択リサイズでエルボー trunk が残るバグ** (ADR-0148)。
  `_mapToBox` が `s.bend` をスケール対象に追加 — 軸平行
  スケールで trunk 向きは不変のため座標を再導出。

## [1.7.204]

### 修正
- **エルボー移動で trunk が取り残されるバグ** (ADR-0147)。
  `Shape.translate` が `s.bend` を平行移動しなかった問題を修正
  — ドラッグ/ナッジ/整列/複製の全経路で trunk が追従。

## [1.7.203]

### 修正
- **エルボー回転で trunk が旧位置に残るバグ** (ADR-0146)。
  キーボード回転・回転ノブ両経路で `s.bend` を trunk 線分の
  剛体回転で追従させるよう修正 — 軸平行を維持する場合は新座標
  を導出、斜めなら自動中央に復帰。

## [1.7.202]

### 追加
- **Alt+click でコネクタラベルを中点へ** (ADR-0145)。選択中
  コネクタのラベル位置を ⌥クリックで `labelPos` 解除し既定の
  中点に復帰。

## [1.7.201]

### 追加
- **Alt+click でカーブを自動ボウへ** (ADR-0144)。選択中カーブの
  apex を ⌥クリックで手動 `cbend` を解除し自動計算に復帰。
  waypoint/elbow/curve の全ルート修整が ⌥click で統一。

## [1.7.200]

### 追加
- **Alt+click でエルボー trunk を中央へ** (ADR-0143)。選択中
  elbow の中間セグメントを ⌥クリックで `s.bend` を解除し自動
  中央位置に復帰 (ルートリセットせずに trunk だけ戻せる)。

## [1.7.199]

### 修正
- **回転図形の水平フリップで角度が誤るバグ** (ADR-0142)。'h'
  ミラーは `180−θ` が正解 (30°→150°) のところ `360−θ` を
  適用していた — テキスト等の向きがある図形で倒置していた。

## [1.7.198]

### 追加
- **Alt+click でウェイポイント削除** (ADR-0141)。選択中の直線/
  矢印の既存中間頂点を ⌥クリックで個別削除 (Figma 式)。ルート
  リセットせずに1点だけ消せる。

## [1.7.197]

### 追加
- **選択2図形のコネクタ接続** (ADR-0140)。未選択中の2図形に対し
  ctx「2図形をコネクタで接続」が両端バインド矢印を一発生成。

## [1.7.196]

### 追加
- **選択の反転** (ADR-0139)。⌘⇧I または ctx「選択を反転」で
  未選択の図形を選択 (ロック・非表示は除外)。

## [1.7.195]

### 変更
- **スタイルコピーの対象拡大** (ADR-0138)。⌥C がテキスト揃え・
  フォントサイズ・下線/取消線・角丸・矢印ヘッド・ルート
  (elbow/curve/cbend) も拾うよう拡大。付箋色は fill として
  読み出され矩形等へも貼付可能。

## [1.7.194]

### 追加
- **図形の非表示 / すべて表示** (ADR-0137)。選択を ⌘⇧H または
  ctx「非表示」で隠す — 描画・ヒット・マーキー・⌘A・export の
  全経路から除外。ctx「すべて表示」で一括復帰。

## [1.7.193]

### 追加
- **矩形の角丸サイクル** (ADR-0136)。ctx メニュー「角丸を切替」で
  選択中の矩形の角丸を 0→8→16→24 に巡回 — 描画経路に存在した
  `s.r` を実際に編集可能に。

## [1.7.192]

### 追加
- **ビュー系トグルの ctx メニュー項目** (ADR-0135)。全体を表示 /
  ズーム100% / グリッド / 吸着 / ミニマップをコンテキスト
  メニューから — キーボード限定だった表示操作がタッチでも到達。

## [1.7.191]

### 追加
- **検索ボックスの ctx メニュー項目** (ADR-0134)。⌘F 限定だった
  図形検索を `toggleSq()` に集約し、コンテキストメニューからも
  呼び出し可能に (タッチの長押し経路で到達)。

## [1.7.190]

### 修正
- **elbow コネクタのフリップ** (ADR-0133)。trunk のワールド座標
  `s.bend` が鏡像化されず反転後の経路が元位置を横断していた —
  trunk 走行軸とフリップ軸が一致する時に `s.bend` も鏡像化。

## [1.7.189]

### 追加
- **曲線コネクタのベンドドラッグ** (ADR-0132)。選択中の曲線の頂点を
  ドラッグすると `s.cbend` (弦法線方向の符号付きオフセット) で
  カーブの強さ/向きを調整 — ラベル位置ドラッグも自動追従。
  リセットルートで解除、フリップで符号反転。

## [1.7.188]

### 追加
- **90°回転** (ADR-0131)。ctx「90°回転」+ `⇧R` で選択を直行回転
  (draw.io parity、選択が無い時は従来通り rect ツール)。

## [1.7.187]

### 追加
- **⇧マーキーで加算選択** (ADR-0130)。⇧+領域ドラッグが既存選択を
  保持してヒットを追加 (Figma parity)。方向付きマーキーと組合わせ可。

## [1.7.186]

### 追加
- **⇧click で選択解除** (ADR-0129)。選択済み図形への ⇧click は
  選択から外す (Figma/draw.io のトグル選択、グループはまとめて)。

## [1.7.185]

### 追加
- **Alt 押下で全スナップ抑制** (ADR-0128)。移動ドラッグ中に Alt を
  押すとグリッド/オブジェクト両方の吸着が素通しになる
  (draw.io parity)。離すとコミット時にスナップが再び効く。

## [1.7.184]

### 変更
- **マーキー選択はロック形状を除外** (ADR-0127)。領域ドラッグで
  ロック済み図形が選択に混ざらない (Figma/draw.io parity)。
  ロック解除は従来通りクリック選択 + ctx、または「全てロック解除」。

## [1.7.183]

### 追加
- **クリック-クリック式 line/arrow** (ADR-0126)。ドラッグせず
  1クリック目で始点・2クリック目で終点を指定 (Excalidraw parity、
  結合バインド/⇧角度拘束も通常通り動作)。Esc/ツール切替でキャンセル。

## [1.7.182]

### 追加
- **マーカー (ハイライター) ツール** (ADR-0125)。ツールバー + `K` キー、
  幅8・透明度0.4・圧力フラットの太い半透明線で手書きの強調に最適 —
  pen シェイプ + `hl` フラグなので全レンダ経路は変更不要。

## [1.7.181]

### 変更
- **方向付きマーキー** (ADR-0124)。左→右ドラッグは従来通り完全包含、
  右→左ドラッグは bbox 交差 (touch) 選択 — CAD/draw.io の crossing/
  window 慣例。密集盤面の重なり形状が一括選択できる。

## [1.7.180]

### 追加
- **全てロック解除** (ADR-0123)。ctx「全てロック解除」でボード上の
  全ロック形状を一括解除 (`align` op dir:'lock' で単一 undo・同期、
  選択と独立に動作)。

## [1.7.179]

### 追加
- **空キャンバス dblclick でテキスト作成** (ADR-0122)。ヒット無しの
  dblclick は `beginText(wp)` でその点にテキストを新規作成し
  エディタを開く (Excalidraw parity、全ツールで有効)。

## [1.7.178]

### 追加
- **表示範囲を PNG 書き出し** (ADR-0121)。export メニューに
  「表示範囲を PNG 書き出し」— コンテンツ bbox ではなく現在の
  ビューポート矩形を既定 2x でクロップ (余白・部分切りを含む
  見たまま、exportScale 上限適用)。

## [1.7.177]

### 追加
- **同じ種類を選択** (ADR-0120)。ctx「同じ種類を選択」で単一選択の
  shape.type と同じ全形状を一括選択 (全コネクタ・全付箋など、
  selectSamePaint のタイプ版)。

## [1.7.176]

### 追加
- **矢印ヘッドスタイル** (ADR-0119)。ctx「矢印ヘッド」で矢印→丸→
  シェブロンを巡回 (`s.head`、両端に適用)。canvas・SVG export 共通
  ヘルパーで描画、`style` op で undo/同期。

## [1.7.175]

### 追加
- **PNG 書き出しスケール選択** (ADR-0118)。export メニューに
  @1x/@4x を追加 (既定は従来通り 2x、exportScale の寸法/面積
  キャップは全スケールで有効)。非2x はファイル名に @Nx 付与。

## [1.7.174]

### 追加
- **コネクタラベル位置ドラッグ** (ADR-0117)。ラベル付き単一コネクタ
  選択で中点ドットをドラッグ→弧長 `s.labelPos` (0..1) に配置
  (way/elbow/curve 全経路・中点磁吸)。`style` op で undo/同期、
  ルートリセットで初期化、SVG export も一致。

## [1.7.173]

### 追加
- **選択をグリッドに吸着** (ADR-0116)。ctx「グリッドに吸着」で選択
  各形状の bbox 左上を最寄りグリッド点へ平行移動 (幾何は不変、
  `align` op dir:'gsnap' で一括 undo・同期)。

## [1.7.172]

### 追加
- **クリップボード経由の .board 転送** (ADR-0115)。export メニュー
  「ボードJSONをコピー」で `.board` JSON をクリップボードへ。
  ペースト側は `"shapes":[` を検出して `_placeCopies` (id 再割当)
  でビューポート中央に追加 — ファイル往復なしにボード間転送。

## [1.7.171]

### 追加
- **同じ位置に貼り付け ⌘⇧V** (ADR-0113)。クリップボードの図形を
  コピー元と同じ座標に複製 (Figma Paste-in-place parity)。
  ctx メニューにも「同じ位置に貼り付け」。⌘⇧V が従来の ⌘V
  バインドに吸収されないよう shift 判定を分割。
- **選択を .board 書き出し** (ADR-0114)。`exportBoard(shapes)` に
  shapes 引数を追加し、ctx メニューに「選択を.board書き出し」を
  追加 (選択PNG/SVGの .board 版、形式は全面書き出しと同一)。

## [1.7.170]

### 追加
- **共有リンクにビューポート同梱** (ADR-0112)。`exportToUrl` が
  `{x,y,zoom}` を含め、`importFromHash` が同じ数値ゲート
  (`clampZoom` 込み) で採用 — 受け手は送り手の景色で開く
  (旧リンクは従来通り)。

## [1.7.169]

### 追加
- **フレームの内容を選択** (ADR-0111)。frame 選択時の ctx
  「内容を選択」で `withFrameChildren` の包含判定 (ドラッグ/
  nudge と同一ルール) に一致する内包形状だけを選択に置換。
  フレーム自身は外れるため後続 op が内容へ効く。

## [1.7.168]

### 追加
- **付箋↔テキスト変換** (ADR-0110)。ctx メニューで `s.type` を
  sticky↔text に反転 (text/align/fontSize/装飾全保持、色属性も
  残るため往復変換はロスレス、style op で undo・同期対応)。

## [1.7.167]

### 追加
- **直線↔矢印の型変換** (ADR-0109)。ctx メニューで `s.type` を
  line↔arrow に反転 (bindings/way/label/route 全保持、style op
  で undo・共有同期対応、ラベル動的切替)。

## [1.7.166]

### 追加
- **位置を入れ替え** (ADR-0108)。選択2の ctx「位置を入れ替え」で
  両 unit を相手の bbox 中心へ平行移動する `align` op
  (Figma Swap positions parity)。

## [1.7.165]

### 追加
- **グリッドに整列 (Tidy up)** (ADR-0107)。ctx メニューで選択群を
  読み順の近方形グリッドにリフロー — 列ピッチ=列最大幅・行ピッチ
  =行最大高+32px、frame/group を1単位として扱う `align` op。

## [1.7.164]

### 追加
- **起動時の空ビュー自動フィット** (ADR-0106)。復元された viewport
  に形状が1つも見えていない (= 空白ボード＝消失誤認) 場合のみ
  `fitToContent()` で案内。永続ビューの復元は従来通り優先。

## [1.7.163]

### 追加
- **付箋 ⌘Enter 連鎖** (ADR-0105)。付箋の編集中に ⌘Enter で確定後、
  同スタイルの付箋を右隣に生成して即編集継続 (FigJam 式の連続
  ノート入力。text 形状は従来通り確定のみ)。

## [1.7.162]

### 追加
- **同色を選択** (ADR-0104)。単一選択時の ctx メニュー「同色を選択」で
  同じ paint (sticky=color、その他=fill) を持つ全形状を選択
  (Figma Select Same parity、ロック含む、件数トースト)。

## [1.7.161]

### 追加
- **ここに貼り付け** (ADR-0103)。ctx メニュー開放点へクリップ
  ボード内容を中心配置する「ここに貼り付け」を追加 (カスケード
  無しの確定位置。⌘V のビューポート中央ペーストと併存)。

## [1.7.160]

### 追加
- **選択をフレームで包む ⌘⌥G** (ADR-0102)。選択群の union bbox
  +16px を覆うフレームを生成 (Figma parity、ctx メニューにも)。
  z を最下位メンバ直下へ分数配置し中身を覆わない。`e.code` 経由で
  macOS の ⌥ 修飾キー化けを回避。

## [1.7.159]

### 追加
- **付箋色クイックサイクル** (ADR-0101)。ctx メニュー「付箋の色」で
  `STICKY_COLORS` 6色を順送り (style op、複数選択可、パレット外の
  色からも先頭色へ復帰)。

## [1.7.158]

### 追加
- **取り消し線** (ADR-0100)。`⌘⇧X` で `s.strike` トグル (style op)。
  canvas は各行中央に手動ライン、SVG は `text-decoration` を
  `"underline line-through"` 連結に一般化、編集 overlay も同期。
  4装飾 (太字/斜体/下線/取消線) が完結。

## [1.7.157]

### 追加
- **クリップボード .excalidraw のペースト取り込み** (ADR-0099)。
  Excalidraw でコピーした JSON をそのままペーストでシーン
  インポート — 従来は巨大なテキスト形状になっていた。パース
  失敗時は従来のテキスト形状化へフォールバック。

## [1.7.156]

### 追加
- **.excalidraw エクスポート** (ADR-0098)。エクスポートメニューに
  「Excalidraw」追加 — 全図形を excalidraw 要素へ変換
  (sticky→rect+text、line/arrow→points+way、image→files 辞書、
  binding/groupIds 維持)。id 保持により ADR-0097 経路で再
  インポート可能なラウンドトリップをテスト担保。

## [1.7.155]

### 変更
- **.excalidraw 多点コネクタの実インポート** (ADR-0097)。3点以上の
  line/arrow が `pen` 化していたのを、真のコネクタ + `s.way`
  中間点へマッピング — elbowed 矢印が矢印のまま編集可能に復元
  (矢印ヘッド・バインド・ルート編集すべて有効)。`freedraw` は
  従来通り `pen`。

## [1.7.154]

### 追加
- **等サイズスナップ** (ADR-0096)。リサイズ中、新しい幅/高さが
  他図形の `w`/`h` と近いとき一致側へ吸着 (draw.io スマート寸法)。
  edge スナップと共存、ガイドは対象図形の該当辺に表示。lock/alt/
  グリッドスナップ時は従来通り非適用。

## [1.7.153]

### 追加
- **テキスト/付箋の下線** (ADR-0095)。`⌘U` トグル (`s.under`、
  style op で undo/複数選択可)。canvas は各行 measureText 幅の
  手動ライン (align 3種)、SVG は `text-decoration="underline"`、
  編集 overlay も同期。ヘルプを `⌘B / ⌘I / ⌘U` に更新。
- README サイズバッジを実測に同期 (113→126KB gzip)。

## [1.7.152]

### 追加
- **Esc でドラッグキャンセル** (ADR-0094)。move/resize/marquee/
  erase 進行中の Esc が `_cancelPointerGesture` を呼び、in-place
  変異を巻き戻す — 従来は pointerup まで変位が残り意図しない
  commit になった。選択は維持。

## [1.7.151]

### 追加
- **⇧+ホイール水平パン** (ADR-0093)。マウスホイールの縦回転を
  ⇧で横パンに変換 (Figma/draw.io 慣例)。トラックパッドの deltaX
  は素通し、ctrl+wheel ズーム経路は無影響。

## [1.7.150]

### 追加
- **矩形の角スタイル** (ADR-0092)。ctx メニュー「角スタイル」で
  適応角丸 (min(8,w/4,h/4)) ↔ 直角 (`s.r=0`) を切替 — style op で
  undo/共有対応、複数選択可。canvas・SVG `<rect rx>` とも反映。

## [1.7.149]

### 追加
- **検索結果の全選択** (ADR-0091)。検索ボックス内で `⌘Enter` /
  `Ctrl+Enter` — 全マッチを一括選択してボックスを閉じる
  (一括移動/スタイル変更の前段)。SR 通知と件数トースト付き。

## [1.7.148]

### 追加
- **複数ウェイポイント** (ADR-0090)。直線コネクタの `s.way` を
  `{x,y}` 単体から `[{x,y},…]` 配列へ格上げ — 各セグメント中点
  ドラッグで頂点挿入、頂点ドラッグで移動、中点6pxで削除、
  全変換・SVG・ミニマップ・ヒット・bbox・ラベル(総延長の中点)が追従。
  `_wayArr` が旧 object 形式を後方互換で正規化。

## [1.7.147]

### 追加
- **画像差替え** (ADR-0089)。画像単一選択の ctx「画像を差替え」で
  位置・幅を保持したままバイトを置換 (高さは新アスペクトに追従)。
  `_imgImportFile` 既存経路 (4MB上限・2048px縮退)、style op で undo 可。

## [1.7.146]

### 修正
- **ウェイポイント/エルボートランクのドラッグがグリッドスナップに従う**
  (ADR-0088)。全配置ジェスチャで唯一スナップを通らなかった2経路を
  `snapPt`/`snapV` に統一。way の6pxクリア判定は生座標のまま
  (グリッドに吸われて削除不能にならないよう)。

## [1.7.145]

### 追加
- **選択 SVG をクリップボードへコピー** (ADR-0087)。選択 ctx に
  「選択のSVGをコピー」— `buildSVG` 出力を `copyText` で送る
  (ClipboardItem の SVG MIME はブラウザ差が大きいため text コピー)。

## [1.7.144]

### 追加
- **クリック単発で box 図形をスタンプ** (ADR-0086)。rect/ellipse/
  diamond ツールの非ドラッグクリックで既定 120×80 (center-stamp
  と同寸) を配置。従来は sticky/frame のみ既定サイズ化だった。

## [1.7.143]

### 追加
- **フレームをコンテンツに合わせる** (ADR-0085)。ctx メニュー
  「コンテンツに合わせる」で選択 frame を完全内包シェイプの union
  bbox + 12px にリサイズ (draw.io コンテナ parity)。複数 frame を
  1 align op で原子化。空 frame は no-op。

## [1.7.142]

### 追加
- **ルートリセット** (ADR-0084)。ctx メニュー「ルートをリセット」で
  コネクタの way/bend/elbow/curve を一括クリアし直線に戻す
  (draw.io Clear Waypoints)。1つの style op で原子化、undo 一発。

## [1.7.141]

### 追加
- **画像キャプション** (ADR-0083)。image にも dblclick/Enter でラベル
  編集が開き、内側下端に paper 帯 + 折返しテキストで描画 (draw.io式)。
  画像高でクリップし溢れは '…'。SVG 書き出しにも同様に emit。

## [1.7.140]

### 修正
- **付箋の色変更** (ADR-0082)。fill スウォッチ/カラーピッカーを sticky
  では `s.color` にマップ — 生成時ランダム固定だった付箋色が変更可能に。
  `applyStyleToSelection` の before パッチを `??null` にし、未設定
  プロパティでも undo が確実に戻るよう修正 (clone が undefined を落とす
  潜在的な undo 欠損を同時に解消)。

## [1.7.139]

### 修正
- **ラベル編集オーバレイの正位置化** (ADR-0081)。diamond でダブル
  クリック/Enter のラベル編集が開かなかった抜けを解消し、
  elbow/curve/waypoint コネクタではラベル描画位置と同じアンカー
  (`_connLabelXY` で canvas/editor の位置計算を単一化) に開く。

## [1.7.138]

### 追加
- **スマート複製 (反復変換)** (ADR-0080)。複製したシェイプを移動して
  もう一度 ⌘D で**同じベクトルが反復**され、等間隔の行/列/グリッドが
  一発で並ぶ (Figma/draw.io parity)。`dupIds`/`dupDelta` で複製
  チェーンを追跡し、move/nudge コミットでネット変位を累積。
  既存 op で undo・同期は無料。

## [1.7.137]

### 追加
- **幅 / 高さ揃え (match size)** (ADR-0079)。ctx メニューに
  「幅を揃える」「高さを揃える」「幅と高さを揃える」— 最初に選択した
  シェイプを基準に box 型の寸法を揃える (draw.io parity)。`align` op
  で一括 undo、位置は不変 (top-left アンカー相当)。

## [1.7.136]

### 追加
- **テキストの太字 / 斜体** (ADR-0078)。⌘B/⌘I で選択中 text/sticky の
  `s.bold`/`s.italic` を `style` op トグル (Figma/draw.io parity)。
  `_fontStr` が canvas フォント宣言を単一化、編集オーバレイと
  SVG 書き出し (`font-weight`/`font-style`) も一致。copyStyle で伝搬。

## [1.7.135]

### 追加
- **ハッチ / 斜格子フィル** (ADR-0077)。rect/ellipse/diamond に
  `s.fstyle` ('hatch'|'cross') — ctx メニュー「塗りスタイル」で
  塗り→ハッチ→斜格子を巡回 (Excalidraw parity)。fill 色と直交で
  fill=null でも線のみ描画、canvas `clip()` と SVG `<clipPath>` が
  `_hatchSegs` の線分列を共用。copyStyle/pasteStyle でも伝搬。

## [1.7.134]

### 追加
- **直線コネクタの中間ウェイポイント** (ADR-0076)。選択中の直線 line/arrow
  の中点ハンドルをドラッグで `s.way` を作成・移動 (draw.io parity) —
  直線中点 ±6px に戻すと自動削除。`_linePts` が draw/hit/bbox/SVG/
  minimap/label の共通経路源で、translate/flip/rotate/gresize/grot の
  全変換経路で追従。`style` op で undo・同期は既存経路。

## [1.7.133]

### 追加
- **フォントサイズのキーボード増減** (ADR-0075)。⌘⇧, / ⌘⇧. で選択中の
  text/sticky の fontSize を ±2 (8–64 clamp)、Figma/draw.io parity。
  `style` op で undo・同期は既存経路。help grid 追記。

## [1.7.132]

### 修正
- **ボックスラベルの折返し** (ADR-0074)。rect/ellipse/diamond のラベルが
  図形幅からはみ出していた問題を解消 — `wrapTextCached` (禁則処理付き) で
  `w-8` に wrap し中央揃えで複数行描画。SVG export も同幅で wrap し
  `<tspan>` 複数行化 (表示=出力パリティ)。長いラベルがフロー図で
  読めるようになる。

## [1.7.131]

### 追加
- **テキスト揃え** (ADR-0073)。ctx メニュー「テキスト揃え」で text/sticky
  本文の揃えを左→中央→右に巡回 (`s.align`、Excalidraw parity)。
  canvas・SVG export (`text-anchor`)・インライン editor の全経路で一貫。
  `style` op で undo・同期は既存経路。既存図形は left で見た目同一。

## [1.7.130]

### 追加
- **elbow trunk ドラッグ** (ADR-0072)。選択中のエルボーコネクタで中間
  trunk セグメント (ハンドル表示あり) をドラッグして経路位置を調整 —
  `s.bend` に絶対座標で永続化、`style` op で undo・同期は既存経路。
  未設定時は従来の自動経路で視覚退行なし。

## [1.7.129]

### 追加
- **等間隔スナップ** (ADR-0071)。移動ドラッグでエッジ吸着が無い位置でも、
  同一行/列の連続図形ペアの既存間隔と同じ隙間を作る位置に吸着し
  等しい2区間をガイド表示 (draw.io スマートガイド parity)。
  行末端・行内挿入とも対応。エッジ吸着優先、未成立軸のみ評価。

## [1.7.128]

### 追加
- **quick-connect** (ADR-0070)。選択ツールで図形にホバーすると4辺中点に
  接続ドットを表示 (draw.io parity) — ドットからドラッグで始点結合済み
  矢印を一発作成。locked/connector/pen 除外、hover 変化時は overlay のみ
  再描画 (ADR-0024 層分離でシーンコストゼロ)。commit は `add` op で
  undo・同期は既存経路。

## [1.7.127]

### 変更
- **ワイヤーレベル画像参照** (ADR-0069)。`add`/`addMany` op と snapshot
  の画像バイトを `img` 参照 + 別メッセージ `{k:'img'}` (64KB チャンク、
  op 先行送信) に分離 — ピア間で画像を含む op のワイヤーサイズが大幅減、
  RTCDataChannel ~256KB/メッセージ上限による静的失敗も解消。受信側は
  `_imgChunks` 再構成→`_imgIn` 格納、未着参照は `_imgPending` に保留して
  blob 到着時に補完。共有リンクは URL 自体が輸送路のため対象外。
  実ブラウザ loopback で 200KB 画像の chunked 復元を実測。

## [1.7.126]

### 追加
- **曲線コネクタ** (ADR-0068)。ctx メニュー「曲線」で line/arrow を二次
  ベジエ化 (制御点 = 中点 + 法線 × min(0.25·len,80))。elbow と排他トグル
  (style op 1エントリで両 prop)、両端ヘッド・結合・ラベル (ベジエ中点)
  ・SVG/ミニマップ全経路対応。

## [1.7.125]

### 修正
- **コネクタ結合点が真の輪郭に着地** (ADR-0067)。`_edgePt` が従来 bbox
  辺に投影していたため diamond では輪郭の無い bbox 角に矢が刺さって
  いた。diamond は `|dx|/rx+|dy|/ry=1`、ellipse は `hypot(dx/rx,dy/ry)=1`
  のコンター式で解決 — 直線・elbow 両方の `connEnds` 経路すべてに反映。

## [1.7.124]

### 追加
- **Shift+ドラッグの軸拘束移動** (ADR-0066)。移動ドラッグ中に Shift を
  押すと支配軸 (水平 or 垂直) に拘束 — draw.io/Figma と同じ。拘束中は
  objectSnap をスキップ、readout が `+N, 0` で拘束を可視化。

## [1.7.123]

### 追加
- **コネクタ端点の再結合 / 解除** (ADR-0065)。選択中の line/arrow の
  p1/p2 ハンドルを結合済みでも常時表示 — 結合端を掴むと即座にフリー化し
  プレビューがポインタに追従、図形上にドロップで再結合 (破線ハイライト)、
  空白ドロップで解除。自分自身・他端の結合先には結合しない。1 `upd` op
  で undo・同期は既存経路のまま。

## [1.7.122]

### 追加
- **ジェスチャー中のライブ寸法表示** (ADR-0064)。リサイズ中は `W × H`、
  移動中はスナップ適用後の `±dx, ±dy`、回転中は角度 (`N°` / `±N°`) が
  対象の直下にピル表示 — draw.io/Figma と同じ。複数選択のグループ
  リサイズ・回転、pen pts・接続長 (`↔ N`) も同一経路。render-only で
  undo/同期に無関与。

## [1.7.121]

### 追加
- **双方向矢印 (始点側ヘッド)** (ADR-0063)。選択した arrow をコンテキスト
  メニュー「両端ヘッド」で始点側にもヘッドを描画 — 相関・対称関係・寸法線を
  1本で表現 (Excalidraw startArrowhead 相当)。肘経路との合成も動作
  (始端ヘッドは stub 法線に沿う)。`style` op で undo/同期が既存経路。

## [1.7.120]

### 追加
- **エルボー (直角) コネクタ** (ADR-0062)。選択した line/arrow をコンテキスト
  メニュー「エルボー (直角)」で折れ線化 — 結合端はエッジ法線方向のスタブを
  出し、中間点で直交結合 (Manhattan 経路)。arrow のヘッドは最終セグメント
  方向、ヒット判定は折れ線全セグメント、ラベルはスタブ先端の中点、SVG は
  `<polyline>` 出力。`style` op 記録で undo/同期/property-LWW が既存経路で
  動作。diamond (ADR-0061) と合わせてフローチャートが Board 内で完結。

## [1.7.119]

### 追加
- **diamond (ひし形) ツール** (ADR-0061)。Excalidraw 標準パレットで唯一欠けていた
  図形種別 — ツールバーまたは 'D' キーでドラッグ描画。ボックス型なので
  fill/dash/label/リサイズ/回転/複製/整列/接続点/undo/同期/SVG/ミニマップが
  すべて既存経路で動作。`.excalidraw` インポートの diamond も pen 近似から
  真の型に変更 (round-trip 忠実性向上)。

## [1.7.118]

### 追加
- **Alt(⌥)+ドラッグで複製** (ADR-0060)。選択図形 (または未選択ヒット図形/グループ) を
  Alt を押しながらドラッグするとコピーが作られ、そのままドラッグで移動できる —
  Figma/Excalidraw/draw.io と同じ慣例。複製は `_placeCopies` (addMany 単一 op) で
  atomic undo、ロック図形は対象外、フレームは中身ごと複製。

## [1.7.117]

### 追加
- **スタイルパネルが選択図形の値を反映** (ADR-0059)。図形を選ぶとストローク/フィル/
  破線/サイズ/不透明度のコントロールがその値を表示 — 従来は常にグローバル既定を
  表示し続けていた (audit §8 の残課題)。選択内で値が混在するプロパティは据置、
  空選択は現状維持。`state.style` も同期するため次の新規図形は選択図形の
  スタイルを継承する (Excalidraw と同じ挙動)。

## [1.7.116]

### 追加
- **スナップショットマージを per-property LWW で収束** (ADR-0058)。hello/sync-req 応答の
  snapshot op に `wc`(shape ごとの wclock) を同梱し、既存図形をプロパティ単位で
  マージ — 従来は「未保有図形のみ取込」で、両ピアが同一図形を編集すると内容が
  発散したままだった。旧版ピア (wc なし) は従来どおり keep。undo 履歴には積まない
  (収束動作)。

## [1.7.115] - 2026-09-23

**ADR-0057: 回転ノブの点ジオメトリ / 複数選択対応** — `getRotHandle` を
`G.bbox` 経由に一般化し、pen/line/arrow 単一選択でもノブが出るように。
複数選択では `_grpRotHandle(gb)` が選択群 bbox にノブを出す (回転は合成
できるため ADR-0056 と違い回転メンバ混在でも可)。新 `dragKind='grot'`
は掴み時の atan2 を基点とする**デルタ角**で `_rotShape` が orig→live を
毎フレーム再計算: 箱形は中心 orbit + `rotate+=deg`、pts/端点は剛体回転、
Shift=15°スナップ。コミットは `align` op (`dir:'grot'`) で undo 一括復元。
箱形単一は従来の絶対角 `dragKind='rotate'` パスを維持 (upd op)。

併せて修正: 回転を持たないシェイプのキャンセル復元で `rotate` が残存する
既存バグ (Object.assign は orig に無いキーを消せない) — rotOrig/gOrig の
restore で `delete sh.rotate` / orig 正規化を追加。`getRotHandle` の
bbox ガードを `w>0&&h>0` に堅牢化 (空 pts の NaN bbox を排除)。

## [1.7.114] - 2026-09-23

**ADR-0056: 複数選択リサイズ** — 複数選択時に選択群 bbox に8ハンドルを
出して一括スケール (Excalidraw / Figma parity)。ADR-0051 の仮想ボックス
再帰を拡張: `ptr.dragKind='gresize'`、開始 bbox を `vorig` として共有の
`applyResize` に通すため Shift=縦横比・Alt=中心対称・オブジェクトスナップが
そのまま効き、`_mapToBox` が各メンバの幾何 (box/pen pts/line 端点) を
アフィン写像。`resizeSnap` の除外を `state.selection` 化して自己スナップを
排除。undo は `align` op (`dir:'gresize'`) で一括復元、キャンセルは
abortGesture/_cancelPointerGesture 両経路で復元。回転メンバ混在時は
skew を生まないようハンドル非表示。

併せて修正: 複数選択の4隅に描画されていたハンドル表示は初期版から
ヒット判定未配線の死んだ UI だった — 実際に動く8ハンドルに置き換え。
README サイズバッジを実測値に同期 (raw ~349KB / gzip ~113KB)。

## [1.7.113] - 2026-09-23

**ADR-0055: 点ジオメトリの回転 (`ペン・線・矢印`)** — `doRotate` が
`s.w!=null` の箱形のみ対象だったのを、`_rotatable` (w OR pts OR x1) に
拡張。点ジオメトリは `rotate` フィールドを持たないため、`_rotPtsAbout`
で全点を選択群 bbox 中心に剛体回転 — 単一ペンは自身の中心でその場で
回る。doFlip (flipShape 全型対応) と対の設計。`,`/`.` キー経路のみ
(回転ノブの逐次ドラッグは別 ADR)。コネクタ端点の binding は connEnds
再計算で自動追従。undo は既存 `align` op で完結。

## [1.7.112] - 2026-09-23

**ADR-0054: ズーム境界での純粋 no-op** — min/max ズームに達した状態でも
`zoomAt` がアンカー再計算で viewport を微小に滑らせていた (audit-2026-06
残課題の最終項目)。`nz===v.zoom` で早期 return — `_pinchSnapNow`・
`UI.refreshZoom`・`invalidate` も含めて完全 no-op。

## [1.7.111] - 2026-09-23

**ADR-0053: テキスト編集中の pan/zoom 追従** — 編集中の textarea は DOM
アンカーのため、編集を閉じずにパン/ズームすると図形から取り残されていた
(audit-2026-06 の残課題)。`frame()` の最後に `_teFollow()` を追加 —
viewport 署名 (x,y,zoom) が変わったフレームだけ `positionTextEditor` を
再実行し、エディタを図形に追従させる (fontSize の zoom 乗算込み)。
ADR-0011/0041 と同じ「frame 境界で追従」パターン。新 op なし。

## [1.7.110] - 2026-09-23

**ADR-0052: 選択図形のみのエクスポート** — 選択コンテキストメニューに
「選択をPNG書き出し / 選択のPNGをコピー / 選択をSVG書き出し」を追加
(Excalidraw parity)。`exportPNG`/`copyPNG`/`exportSVG`/`_renderPngBlob`
に shapes 引数を導入 (既定 `state.shapes` で後方互換) — 全面・選択の
両経路が同一レンダラを共有するため、出力は常に同一生成経路由来。
選択 bbox + pad 32 で切り出し、空選択は `noSelection` トースト。

## [1.7.109] - 2026-09-23

**ADR-0051: ペンストロークの真のリサイズ** — ペンが従来「リサイズ不可」
だったものを、pts を orig bbox→リサイズ後 bbox へアフィン写像する方式で
実現 (Excalidraw parity)。`getHandles` のペン分岐は 8 ハンドルを発行、
`applyResize` は仮想ボックスに既存ハンドル数式 (Shift 縦横比・Alt 対称・
スナップ) を丸ごと適用してから `sx/sy` で pts を写像 — 圧力値 `p[2]` は保持、
1点ドットは不可 (スケール不能)。undo は既存 `upd` op で完結。

## [1.7.108] - 2026-09-23

**ADR-0050: クリップボードへの PNG コピー** — Export メニューに
「PNGをクリップボードにコピー」を追加 (Excalidraw parity)。
`exportPNG` の描画パスを `_renderPngBlob()` に切り出して共有 —
download と clipboard が同一の PNG 生成を経る。API 非対応環境は
`copyUnsupported`、write 拒否は `copyFailed` トースト (ショートカット
なし — ⌘⇧C は DevTools と衝突)。

## [1.7.107] - 2026-09-23

**ADR-0049: 選択にズーム (`⇧2`)** — Excalidraw パリティ。選択 bbox を
pad 60/cap 4 でフィット (fit-all の cap 2 より深く寄るので小さい選択が
実際に大きく見える)。選択空 → `noSelection` トースト。合わせて 3 箇所目の
複製になった viewport-fit 数式を `_fitViewport(b,pad,cap)` に集約 —
`fitToContent`/`_mirrorGo`/`zoomToSelection` が同一路径を共有。

## [1.7.106] - 2026-09-23

**ADR-0048: 検索ハイライトのマッチリストキャッシュ** — 検索ボックスに文字が
入っている間、overlay リペイントのたびに全形状の `label|text|type` を
`toLowerCase().includes()` で再走査していたのを `{_gridVer, _sq}` 連動の
`_sqMatches()` 化 (ADR-0047 と同イディオム)。検索を開いたままの
マーキードラッグ/カーソル移動で O(matches) に。`_sqAdvance` (Enter ナビ) も
同じ順序付きリストを共有するよう統一。現在マッチ強調 (`_sqNav.idx`) は
メンバーシップに影響しないためキー外・毎フレーム評価のまま。

## [1.7.105] - 2026-09-23

**ADR-0047: グループハローのキャッシュ** — `drawOverlay` が毎フレーム全形状を
走査して構築していた `Map<groupId, shapes[]>` を `_gridVer` 連動の
`_grpMapGet()` 化。グルーピングは group/ungroup op 経由でしか変わらないため
全コミットの dirty key と一致 — overlay-only リペイント (マーキードラッグ、
ピアカーソル、選択更新) が O(n) 走査なしで済む。bbox は従来どおり毎回
`G.bboxAll` で再評価 (translate の in-place 変異に追従)。

## [1.7.104] - 2026-09-23

**ADR-0046: ペンのアウトライン塗り** — 可変線幅を「セグメント台形 + 頂点円盤の
和集合」として 1 回の fill で描画。従来のセグメントごと stroke 描画が抱えた
区間境界の僅かなギャップを構造的に解消し、両端 `PEN_TAPER=8` サンプルの
ランプで自然に細る筆跡に (perfect-freehand 式)。全プリミティブは凸かつ同一
巻き方向なので急カーブでの自己交差は原理的に発生しない。ドラフトの増分
スタンプ (ADR-0029) は append-only プリミティブ設計によりそのまま継続 —
末端テーパー区間のみ生 tail に残し、コミット済み/ドラフト/SVG エクスポート
の3経路が同一幾何を共有 (display=output パリティ維持)。実ブラウザで内部
網羅性 (holes 0) と先端テーパーを検証。

## [1.7.103] - 2026-09-23

**ADR-0045: 招待リンク** — WebRTC 手動シグナリングの受け手側手順を一段削減。
招待コードを `#s=<offer>` として URL に埋め込み「招待リンクをコピー」ボタンで
発行。受け手はリンクを開くだけで Share モーダルが開き招待欄が充填される
(貼り付け不要)。プライバシーのため自動接続はしない — 「応答コード作成」の
クリックは従来どおり必須。

## [1.7.102] - 2026-09-23

**ADR-0044: テキストのペースト** — OS クリップボードの `text/plain` が
何も起きなかったギャップを解消。トリム後非空のテキストを viewport 中央に
`text` shape として貼付 (改行保持、幅は最長行で決定、`PASTE_MAX_CHARS=4000`
で切り詰め)。優先順位は `image/*` > `<svg` markup > `text/plain`。
Markdown は構文解釈せず平文として置く (リッチ表現の受け皿がないため)。

## [1.7.101] - 2026-09-23

**ADR-0043: .excalidraw インポート** — `JSON.parse` で scene を走査し
rectangle/ellipse/diamond/line/arrow/freedraw/text/frame を Board 図形に写像
(diamond は polygon pen、3点以上の line/arrow は pen)。`points` の相対座標を
絶対化、`strokeColor/backgroundColor/strokeWidth/opacity/strokeStyle/angle` を
Board スタイルへ対応付け、`isDeleted` tombstone は読まない。検出は
`.excalidraw` 拡張子 + `"type":"excalidraw"` 内容マーカー (中身優先)。
`EXC_MAX_ELEMS=50000`/`EXC_MAX_PTS=10000` の天井、`addMany` 単一 op。

## [1.7.100] - 2026-09-23

**ADR-0042: SVG インポート** — DOMParser で SVG を走査し対応要素
(rect/circle/ellipse/line/polyline/polygon/path/text) を Board 図形に写像。
`<svg` で始まるテキストのペースト、`.svg`/`image/svg+xml` のドロップと
ファイルピッカーの3入口。transform 累積行列で座標に焼き込み、viewBox は
最大幅 800px に正規化、path 曲線は固定分割の polyline 近似。
非対応要素 (use/defs/filter/gradient/外部参照) はスキップ、
`SVG_MAX_ELEMS=5000`/`SVG_MAX_PTS=2000` の天井で巨大 SVG も安全。
`addMany` 単一 op で挿入 (undo 一発)。

## [1.7.99] - 2026-09-23

**ADR-0041: 図形の DOM ミラー (spec P1 ギャップ解消)** — スクリーンリーダーが
盤面の図形を「一覧」として走査できるよう、視覚的に隠した `#shapeMirror`
region に `<ul>` を生成 (各 `<li><button>` = `インデックス. describeShape`)。
Enter でその図形を選択+中央寄せ+アナウンス。再構築は `_gridVer` 連動のみ
(フレーム毎の DOM 更新なし)、`MIRROR_MAX=300` で上限、超過時は末尾に
「N 個は一覧に未掲載」を明示。innerHTML は使わない。

## [1.7.98] - 2026-09-23

**ADR-0040: 共有リンクの長さ警告と生成失敗フィードバック** — `exportToUrl` の
reject を `.catch(()=>{})` で握り潰して古い URL がフィールドに残っていた問題を
修正 (失敗時はフィールドクリア + `shareExportFailed` toast)。また 32KB 超の
共有リンクに「チャットで切り詰められる恐れ、.board エクスポート推奨」の
警告を追加。

## [1.7.97] - 2026-09-23

**ADR-0039: 共有リンクペイロードのリソース上限** — `z:` リンクの展開+parse は
confirm より先に走るため、巨大な deflate ボムでタブがフリーズし得た。
展開後 128MB・形状数 200,000 の天井を設け、超過は `invalidBoard` toast +
ハッシュクリアで拒否 (ADR-0038 と同じ経路)。.board ファイル取り込みは
ユーザー自身の選択なので対象外。

## [1.7.96] - 2026-09-23

**ADR-0038: 共有リンク拒否経路のフィードバック統一** — 未知の kind・非ボード JSON・
全形状無効の 3 経路が無言 `return false` でハッシュも残留だった問題を、
鍵経路と同じく `invalidBoard` toast + ハッシュクリアに統一。decode/parse 失敗の
catch でもハッシュをクリア。ユーザー自身が confirm でキャンセルした場合のみ
従来どおりハッシュを残す。

## [1.7.95] - 2026-09-23

**ADR-0037: ポインタ選択のスクリーンリーダーアナウンス** — クリック/グループ選択、
マーキー結果、⌘A、Escape 解除がスクリーンリーダーに無音だった非対称を解消。
`_announceSel()` が `UI.toast` (aria-live) 経由で `選択を解除` / 1件は
`describeShape` / N件は `N個を選択` を通知 (ja/en 対応、WCAG 4.1.3)。

## [1.7.94] - 2026-09-23

**ADR-0036: ミニマップのドラッグスクローブ** — クリック単発ナビゲートを
`pointerdown`/`pointermove`/`pointerup` へ移行。ボタンを押したまま動かすと
viewport が連続追従 (Figma/tldraw 標準)。`setPointerCapture` でポインタが
ミニマップ外にはみ出てもドラッグ継続。単発クリックは従来どおり1回移動。

## [1.7.93] - 2026-09-23

**ADR-0035: 画像参照の輸出入ハイジーン** — ADR-0031 の後始末3件。
`_imgKey` を 3 セグメント指紋 (mime+長さ+先頭/中間/末尾各48文字) に強化 —
同一長・同一末尾の別画像がキャッシュ上誤表示され得る隙を塞ぐ。
`roundShapesForExport` で内部 blob 参照 `img` を輸出から遮断。
dataUrl 欠落の画像 (細工された import) が `drawShape`→`getImg` で
TypeError となり draw() 全体が停止する経路を、プレースホルダ描画 + 
`getImg` の `data:` ガードで解消。

## [1.7.92] - 2026-09-23

**ADR-0034: ペンコミット時 RDP — 反復インデックス実装 + ズーム適応 eps** —
再帰 `pts.slice()` 版は長いストロークで O(n log n) の配列コピーを行っていたのを、
`[lo,hi)` レンジをスタックで回る反復版へ (出力は再帰版と完全一致を検証:
21ストローク×4eps)。`eps` を固定 0.5 から `0.5/state.viewport.zoom` へ —
`contPen` の採点分解能 (~1/zoom) と揃え、ズームインで描いた精密ストロークの
詳細がコミット時に消えないようになった。

## [1.7.91] - 2026-09-23

**ADR-0033: ctrl+wheel ズームのスナップショットプレビュー** — トラックパッドの
2本指ピンチはデスクトップブラウザで `ctrl+wheel` として届く経路であり、
ADR-0030 でタッチピンチに入れたスナップショット・スケールプレビューが
未適用だった。バースト先頭で `_pinchSnapNow()` (0030 と同一機構を共有)、
最後のイベントから 180ms のクワイエットタイマーで破棄→高精細へ settle。
通常ホイール(パン)は非干渉。settle 後フレームは直接描画とピクセル一致
(実測 diff=0)。

## [1.7.90] - 2026-09-23

**ADR-0032: ヒットテスト/マーキーのグリッド索引流用** — ADR-0016 の空間索引を
pointer イベント駆動の2経路へ適用。マーキー選択は `pointermove` 毎の全走査を
矩形近傍候補へ縮退 (完全包含シェイプのセルは必ず矩形内 → 結果は全走査と一致、
3061シェイプ盤面で 200 ステップ **14.6ms→2.0ms、7.3×**)。`pickTop` は候補を
`_grid.idx` 降順反復に置き換え、全シェイプ2回のフィルタ走査を解消。

## [1.7.89] - 2026-09-23

**ADR-0031: 画像バイト列の永続化層分離 (FT-15 ステージ1)** — `dataUrl.length>128`
の画像を IDB レコードから切り離し、content-hash キーの `imgs` ストアへ
(content-addressable, Git blob/tree と同型)。doc + `:prev` バックアップは
同一 blob を共有し重複コピーを解消、doc レコード自体も画像分だけ縮小。
衝突は `:1`,`:2` … の決定論チェーンで上書き不可能、孤立 blob は save 毎に GC。
**ワイヤ形式 (ops/共有リンク/.board/history) は不変** — live shape は常に
`dataUrl` を保持し、load/restoreBackup 時に再装着してから validShape を通す。
注意: DB_VER 1→2 — 旧ビルドで開くと VersionError で空ボードに見える
(データは残り、新ビルドで復元)。

## [1.7.88] - 2026-09-23

**ADR-0030: ピンチズームのスケールプレビュー** — 連続ピンチ中に残っていた最後の
全面再描画発生源を解消。2 本指での最初の `zoomAt` が canvas を一度だけ
スナップショット(`_pinchSnap` + 開始 viewport)し、以降のピンチフレームは
シーン走査なしにジェスチャ蓄積変換でのスケール blit のみで即応答
(地図/写真アプリの blurry-preview→crisp-settle 定石)。開始時のプリスティン
バッファから毎回 blit するためブラーは累積しない。終了時
(`_resetPinch` で指が 2 本未満)に破棄+全面再描画 — 終了フレームは直接描画と
ピクセル完全一致(実測 diff=0)。

## [1.7.87] - 2026-09-23

**ADR-0029: 下書きペンの増分インクスタンプ** — ペン入力中の下書きがポインタ
イベント毎に全点をベクトル再ストロークしていたのを、確定済みセグメントのみを
オフスクリーン bitmap に焼き付けて blit + 末尾の生きている数セグメントのみ
ベクトル描画に分割 (Excalidraw freedraw / Perfect Freehand 系の定石)。幅が
安定したセグメントのみコミット (i ≤ n-4) するため見た目は不変、n=2000
ストロークの追記フレームが ~0ms に。

- `drawPenMaybeCached` が draft を `drawPenDraft` へ振り分け
- `_inkSegDraw`/`_inkRebuild`/`_inkGrow`: 確定セグメントの単発スタンプ、
  圧力極値更新・モードフリップ時のみ全体再構築、矩形拡張時は旧 bitmap を
  `drawImage` 移植
- ラスタ原点をデバイスグリッドへスナップ + 1:1 blit で AA レベル一致
  (実測 diff=2px / 600点ストローク)

## [1.7.86] - 2026-09-23

**ADR-0028: パンのピクセル blit (露出帯のみ再描画)** — 世界座標系が一様に
シフトするパンは ADR-0026/0027 の局所 damage では表現できず、各 pointermove に
全面再描画が必要だった最後の大きな操作。`_lastVp` (前フレームの effective
viewport) を記録し、zoom 不変の x/y 変化を検出したら `canvas` 自己 drawImage で
保持ピクセルを device px 単位に丸めてシフトし、新たに露出する端の帯
(最大2矩形) + 保留 damage のみ clip 再描画。

実機検証 (400 rect + 10 pen, 15px/回 × 8 連続パン): blit+帯描画 ~0.1–0.2ms/
フレーム (同盤面の全面再走査 ~2–6ms)。全面再描画との差分 0.31% は全て丸めに
よる ≤0.5px のサブピクセル AA 縁差で、欠落・ゴースト・シームはなし (effective
viewport が設計上 ≤0.5px ずれ、次の全面再描画で自然に精緻化される)。
リサイズ時は `_lastVp=null` — バッキングストア再割当で保持ピクセルが消えるため。

## [1.7.85] - 2026-09-23

**ADR-0027: op 単位のダメージ伝播 (Store._apply / applyRemote の局所再描画)** —
コラボレーション中の受信 op 一つ一つが `invalidate()` (= 全面再走査+全面再描画)
を発行し、重い盤面ではピアの連続操作が受信側フレームを律速していた。
`_apply` の冒頭で op が触り得る全 id/ペイロード図形の変異前 bbox、switch 後に
変異後 bbox を収穫し、union を `invalidateDamage` へ (ADR-0026 の機構をそのまま
利用)。`applyRemote` 末尾の `invalidate()` を除去 — リモート op が矩形 clip で
局所再描画される。

実機検証 (400 rect 盤面): `applyRemote(upd 移動)` → 542×432wu clip,
`applyRemote(del)` → 142×132wu clip, いずれも全面再描画とのピクセル差分 **0**。
union が viewport の 60% を超える op は全面再描画にフォールバック、収穫が空なら
`invalidate()` — 「取りこぼしが絶対にない」側に倒した設計。undo/redo・ローカル
commit も `_apply` 経由で damage を得る (呼び出し側の `invalidate()` は保守的に残置)。

## [1.7.84] - 2026-09-23

**ADR-0026: ドラッグ系ジェスチャの局所再描画 (drag-local damage rect)** —
移動/リサイズ/回転/下書き(矩形系・線系・ペン)/消去ジェスチャの各 pointermove が
全面再走査付き再描画を発行していた。Canvas2D はピクセルを保持するため、
「変わった領域」を clip+局所再描画すればジェスチャ中は小矩形のみを更新すればよい。
新 `invalidateDamage(worldRect)` が `_damage` へ累積 union (ジェスチャ中は縮小しない
= 高速テレポートでも旧位置のゴーストなし) し、`draw()` はその矩形に clip して
背景fill+シーンを局部再描画。damage は世界座標のため vp/zoom/DPR 変化は無関係
(これらは全て `invalidate()` 経由で全面再描画+リセット)。

実機検証 (400 rect + 15 pen の盤面, headless Chrome, `frame()` 同期駆動):
move-drag 20 回の damage 描画が ~0.1ms/frame、ジェスチャ末尾の damage フレームと
直後の全面再描画のピクセル差分 **0**。グリッドがドラッグ中 stale (ADR-0009) の
ため、damage パスではドラッグ対象シェイプを `_drawIter` に強制 include
(z 順は `state.shapes` 走査で保持)。FT-13 (dirty-rect) の主流派生導。

## [1.7.83] - 2026-09-23

**ADR-0025: ミニマップのコンテンツビットマップキャッシュ** — `Minimap.draw()` が
呼ばれるたびに全シェイプを縮小レンダリングし直していた (重い盤面では
パン/ズーム毎に全ペン点再走査)。シェイプ描画部分は `_gridVer` でメモ化された
160×100 オフスクリーンビットマップへ、ビューポート矩形のみ毎回描画へ分離。
パン/ズーム・ホバー等 `_gridVer` 不変のフレームでは全シェイプ走査が消え、
`drawImage + strokeRect` のみになる。無効化経路は `_gridVer` (シェイプ変更)、
`applyTheme` (配色)、`img.onload` (非同期ロード完了) の3系統を網羅。

### Changed
- ミニマップ描画を `_renderScene()` (キャッシュ) + ビューポート矩形に分割

## [1.7.82] - 2026-09-23

**ADR-0024: レイヤードキャンバス — オーバーレイ層の分離** — シーン (#c) と
エフェメラルな UI クローム (選択枠・ハンドル・マーキー・ガイド・ピアカーソル/
選択・レーザー・検索ハイライト・空盤面ヒント) を別キャンバス #ov に分離
(Excalidraw の static/interactive 2 層と同型)。クロームだけの更新で全シーン
再ラスタライズが走っていた無駄を解消: マーキードラッグ・ピアカーソル・
レーザーは `invalidateOverlay()` でオーバーレイのみ再描画。実測: 重い盤面での
マーキードラッグ 30 move でシーン描画 30→0 回。プレゼン時は #ov も #c と共に
fixed 昇格しレーザーが背面に隠れない。描画に影響しない `state.hover` 変更の
再描画要求も除去。

### Changed
- 描画を `draw()` (シーン) / `drawOverlay()` (クローム) に分割、フレームは
  2 フラグ (`needsRender`/`needOverlay`) で駆動

## [1.7.81] - 2026-09-23

**ADR-0023: ペン入力の predicted-events 先行インク** — 下書きストロークの末尾に
`getPredictedEvents()` の最後の予測点への1セグメントを描画し、スタイラスの
見た目ラグを ~1フレーム短縮。予測点は `_penPred` (render-only のモジュール
変数) に保持し `draft.pts` を汚染しない — Store/IDB/共有ペイロードに混入
しない。非対応ブラウザでは完全な no-op。

### Added
- `getPredictedEvents` による予測インクテール (Chrome; 他ブラウザは無視)

## [1.7.80] - 2026-09-23

**ADR-0021: 画像キャッシュの O(1) フィンガープリントキー** — `_imgCache` が
dataURL 本体 (最大 ~4MB) を Map キーにしていたため、可視画像ごとに毎フレーム
文字列全体のハッシュが走っていた (メイン+ミニマップ)。mimeヘッド+長さ+末尾64
文字の `_imgKey()` に置換 — キー計算が入力長に依らず一定 (~100 chars)。LRU
セマンティクスと dedup 効果は不変。

**ADR-0022: 画像インポートの条件付きダウンスケール** — ドロップ/ペーストの
2経路に重複していた ingest ロジックを `_imgImportFile(f, cb)` に統合し、
2048px 超の画像を `image/webp` q0.85 に縮退。WebP 非対応・元より増大する
場合は元の dataURL を維持 (劣化しない条件付き最適化)。表示サイズ 400wu に
対して数 MB のフル解像度が IDB・op history・共有リンクに乗っていた問題を
緩和。実測: 4000×3000 JPEG の dataURL 1.63MB → 364KB (4.5×)。

### Performance
- `_imgKey`: per-frame の multi-MB 文字列ハッシュを排除 (画像ボードで最大
  数ms/frame)

### Fixed
- 画像取り込み2経路 (drag-drop / paste) のコード重複を解消

## [1.7.79] - 2026-09-23

**ADR-0020: オブジェクトスナップのエッジ索引** — `objectSnap` (move) と
`resizeSnap` (resize) が毎 pointermove に `state.shapes` を全走査してスナップ
対象エッジ (左/中央/右 × 上/中央/下) を構築していた。

### Performance
- `_snapIndex`: エッジ座標を x/y 軸それぞれソートした索引を `_gridVer`
  (新設の変異カウンタ — 全変異が通る `_invalidateGrid` でインクリメント) +
  除外キーで有効性判定し、ジェスチャ/変異ごとに1回だけ構築。照会は二分探索
  `_snapNear` で O(log n)
- `snapBox` の公開インターフェースは維持 (内部で索引化)。move/resize 両
  ドラッグ経路が索引経路に
- 実測 (pen 4000 + rect 1000): resizeSnap **1.08ms → 0.002ms** (≈540×)、
  総当たり結果と 40/40 一致

## [1.7.78] - 2026-09-23

**ADR-0019: ペン bbox のメモ化** — `G.bbox` がペンシェイプの包絡矩形を毎回全点
走査 (O(pts)) していた。`inView()` の可視判定とミニマップで ~9,700 コール/
フレームに達し、ADR-0018 適用後の draw() で支配コストになっていた。

### Performance
- `_penBboxCache`: ADR-0018 と同じ O(1) シグネチャ (pts 参照 + 長さ +
  先頭/中央/末尾の絶対座標 + size) で包絡をメモ化。in-place 変異
  (translate/flip) も検知、観測上純粋で `state` 不変
- 実測 (pen 4000 + rect 1000、全可視ズーム): draw() p50 **15.6ms → 6.9ms**。
  ADR-0018 適用前から累計 **175ms → 6.9ms (≈25×)**
- ミニマップ描画 (全シェイプの bbox 走査) も同じ恩恵を受ける

## [1.7.77] - 2026-09-23

**ADR-0018: ペンストロークのビットマップキャッシュ** — `drawPen` は可変幅インクのため
毎フレーム全ポイントを再ラスタライズしていた (penWidths + セグメント毎 stroke)。
コミット済みストロークは op 間で不変なので、オフスクリーン canvas に一度描き
`drawImage` で使い回す。

### Performance
- `drawPenMaybeCached`: メイン canvas のペン描画をビットマップ経路に
  (Excalidraw/Konva の shape レベルラスタライズ先例)。実測 draw() p50:
  4000 ペン全可視で **175ms → 15ms (11.5×)**
- 有効性は O(1) シグネチャ (pts 参照 + 長さ + 先頭/中央/末尾の絶対座標 +
  stroke + size) で判定 — `Shape.translate`/`flipShape` の in-place 変異も検知。
  ミス時はそのフレームはベクトル描画にフォールバックし、シグネチャが安定した
  次フレームで一度だけ再ラスタライズ (ドラッグ中の canvas churn を回避)
- ラスタライズ解像度は zoom 連動 (`zoom*DPR` を 0.25..2 にクランプ) —
  縮小表示で余分なピクセルを食わない。連続ズームでは 1.5× バケット単位でのみ
  再レンダー
- LRU + ピクセル予算 12M px (≈48MB RGBA)。エクスポート・ミニマップ・
  高倍率 (zoom*DPR>4)・draft は従来のベクトル経路で忠実性維持
- 同一盤面のスクリーンショット差分 (zoom 0.8): 差分画素 66/737,280 = **0.009%**
  (ストローク縁 AA リサンプルのみ)

## [1.7.76] - 2026-09-23

**FT-20 (ADR-0017): WebRTC 接続失敗のユーザーフィードバック** — 手動シグナリングで
トークン交換後に ICE が失敗しても、DataChannel が一度も `open` しない場合は
`onclose` も発火しないためユーザーは無反応で待ち続けていた。

### Fixed
- `_wrtcInit` で `rtc.onconnectionstatechange` を配線し、`connectionState==='failed'`
  で `connectFailed` トースト(ja/en)を表示 + ピアを掃除
- open 後の failed → `dc.onclose` が続く経路では `_rtcConnFailed` フラグで
  `disconnected` の二重トーストを抑制。`disconnected` 状態(一過性 ICE 再試行)は
  トースト対象外
- 実ブラウザ検証(playwright, 同機2ページ loopback DataChannel): 接続→
  `Connected`、failed 注入→`Connection failed` 単発、通常 close→`Disconnected`
  の3ケースを確認

## [1.7.75] - 2026-09-23

**FT-14 (ADR-0016): 空間索引を描画パスに拡張** — `draw()` が毎フレーム全シェイプを
走査していた O(n) 処理を、`pickTop` と同じ均一グリッドのビューポート矩形クエリで
粗選する2段構成に変更。2000 図形超で顕在化する走査コストを解消。

### Changed
- `_buildGrid` が `idx`(shape→z位置)を併せて構築し、`_gridRectCandidates` が
  z順ソート済みの候補配列を返す。`draw()` は候補のみを走査(`_drawIter`)し、
  `inView()` が最終判定 — 描画結果は従来と完全に同一
- `G.bbox` を持たないシェイプ・8セル超の巨大シェイプは `big` で常時候補に
- 小盤面(`state.shapes.length<=40`)は従来通り線形走査(`pickTop` と同閾値)

### Fixed
- ⇧1 (fitToContent) が US/JIS 配列で一度も発火していなかった — Shift 押下時の
  `e.key` は `'1'` ではなく `'!'` を返すため。`k==='1'||k==='!'` で両対応

### Performance
- 走査コスト: 5000 図形(rect+pen 混在)で 2.90ms → 0.004ms / frame
  (マイクロベンチ ~727×)。`_buildGrid` は変異時に1回のみ(9.75ms)。
- 実ブラウザ計測(file:// headless Chrome, rAF 計時): 可視描画なし領域で
  frame() 平均 4.90 → 3.75ms

## [1.7.74] - 2026-09-23

**FT-10: axe-core による本格自動 a11y 監査を実施し、検出された全違反を修正** —
依存ゼロの静的検証では届かなかった ARIA ロール整合性・計算済みスタイルの領域を
カバー。初期 / ヘルプ / Share / コンテキストメニュー / エクスポートメニュー /
ダークテーマの 6 状態で Playwright(システム Chrome, headless) + `axe.run()`
を実行。検出 4 ルールをすべて修正し再実行で **violations = 0**。

### Fixed (a11y, axe-core 検出)
- `<nav class="toolbar">` の `role="toolbar"` を除去 — nav に許可されないロールで、
  ランドマーク性も失わせていた(`aria-allowed-role` + `region` 双方の原因)
- ステータスバー `.lbl` の `opacity:.7` を除去 — 実効コントラストが 2.71:1 に
  低下していた(本来の `--ink-3` = 4.7:1 AA に復帰)
- `meta viewport` から `user-scalable=no` を削除 + body の `touch-action:none` を
  除去 — ピンチズーム禁止の解除。canvas#c 側の `touch-action:none` は保持し、
  盤面ジェスチャは従来通りアプリ内ズームが担う
- ランドマーク漏れを解消: `#minimapWrap` に `role="navigation"`、`#ctx` を
  `<main>` 内へ移動(`region` ルール対応)
- `.brand` の冗長 `aria-label` を除去(可視テキストあり)、`#peerStack` に
  `role="group"` を付与(`aria-prohibited-attr` incomplete の解消)

### Docs
- `docs/a11y-audit-2026-07.md` に「axe-core 追監査」節を追記(検出・修正・再実行
  結果、残る incomplete = kbd 字形類のレビュー判断)。FT-10 を DONE 化。

## [1.7.73] - 2026-09-23

**FT-21 (ADR-0015): 共有リンクの E2E 暗号化** — 製品の第4柱「プライバシー」の構造的
ギャップを解消。v1.7.71 が「圧縮のみ・暗号化なし」と正直化した平文リンクを、実際に
AES-256-GCM で暗号化する本実装。先行例は Excalidraw の `#json=<id>,<key>`
(鍵は URL fragment 内 = サーバー非通過) で、これを単一ファイル配布の Board に合わせた
`#b=e:<base64url(iv‖ct)>&k=<base64url(key)>` 形式に落とした。

### Added
- **共有リンクの AES-256-GCM 暗号化** (`Share.exportToUrl(enc)`, `Share._encrypt`):
  `e:` kind は既存の `z:`/`j:` ペイロード文字列全体を UTF-8 で暗号化したもの
  (圧縮→暗号の正しい順序で、将来の内部形式変更にも無条件で追随)。IV は 12B 乱数、
  `additionalData='board:e1'` で形式バージョンに束縛。鍵は `generateKey` で毎リンク新規
  生成され `&k=` でフラグメント内に載る — fragment は HTTP リクエストに含まれないため
  中間者・ホスティング先は内容を読めない。file:// ではそもそも送信自体が発生しない。
- **Share モーダルの暗号化オプション** (`shareEnc` チェックボックス): `crypto.subtle`
  が使える環境では**既定 ON** (推奨)。外すと従来の平文リンク (`z:`/`j:`) を発行できる
  (opt-out + 後方互換)。暗号時は警告文が「鍵はリンク内に含まれ、リンクを知る人だけが
  開けます」という注記に切り替わる (`shareUrlNoteEnc`)。
- **インポート側の3エラー経路** (`importFromHash`): 鍵欠落 `shareNoKey` / 復号失敗
  `shareBadKey` / 非セキュアコンテキスト `shareNoCrypto` (全て ja/en)。失敗時にも
  `history.replaceState` でハッシュを除去し、破損リンクでのエラーループと
  アドレスバーへの鍵残留を防ぐ。
- **test.mjs: 共有リンクの振る舞いテスト** (ADR-0015 ブロック): 暗号化 export の
  `e:` 形式・フラグメント内鍵・毎リンク新規鍵+IV、fresh world での復号 round-trip
  (import が可逆な replace op として undo 可能であることも検証)、誤鍵/鍵欠落の
  拒否、平文 opt-out + 旧形式インポートの後方互換。
- **test.mjs: `location`/`history`/`screen`/`BroadcastChannel` を Function パラメータ化** —
  従来は裸識別子が Node の未定義グローバルに解決され、`main()` が `wire()` 内の
  `screen` 参照で毎回 reject していた (非同期 IIFE のため未配送のままスイートが
  完走していた潜伏不具合)。併せて `Share` を API エクスポートに追加。

### Changed
- **README 競合比較表の E2E 欄を `✓ AES-256-GCM (ADR-0015)` に更新** — v1.7.71 で
  `✗ (未実装 — 計画中)` に落とした正直化を、実装側から閉じた。セキュリティ節も
  「リンク自体が資格情報になる」という正確なトレードオフを明記。

### Notes
- 既存の `z:`/`j:` リンクは変更なく開き続ける (後方互換)。
- `crypto.subtle` はセキュアコンテキスト限定: `file://` 直開き (Board の主用途) では
  Chrome/Firefox が potentially trustworthy として扱うため動作する。`http://`
  非 localhost 配信では生成側が自動で平文フォールバック + 警告表示。

## [1.7.72] - 2026-08-08

First Principles 監査の続き。`CLAUDE.md` WHY は4本柱に加えて**3つの勝利条件**
(「0秒で使い始める」「オフラインで等価に動く」「**単一HTMLで小さく保つ**」)を定義する。
3つを実測で検証し、**3番目だけ公称値が実態から乖離**していた。

### Fixed
- **サイズの公称値が実測比 38% の過少申告だった**: README バッジ / 競合比較表 / CLAUDE.md /
  `docs/spec.md` の計5箇所が `~61KB gzip`(spec は `~56KB`)と記載していたが、実測は
  **gzip 85KB / raw 268KB**。とくに競合比較表は他社と数値を並べて優位性を主張する箇所であり、
  v1.7.71 で是正した E2E 誇大表記と同種の不正確さだった。全箇所を実測値に訂正。
  根本原因は 2026-06-13 の gzip 44KB 予算撤去時に**サイズを検証する仕組みごと失われた**こと
  (`test.mjs` は gzip 値を計算していたが `console.log` するだけで assert していなかった)。
- **raw サイズを文字数で計測していた**: `html.length` は UTF-8 の**文字数**であり、i18n の
  多バイト文字により実バイト数を約4KB 過少報告していた(269,941 vs 273,996)。512KB 上限
  チェックとログをバイト数基準に是正。
- 競合比較表のサイズ欄を **`268KB (gzip 85KB)`** に変更。他社列は非圧縮バンドル概算のため、
  自社だけ圧縮値を出すのは比較として不公正だった。

### Added
- **README Size バッジと実測 gzip の整合性テスト**(`test.mjs`、±10% 許容)。v1.6.77 が
  *version* バッジを `const V` に縛ったのと同じ手法を *size* バッジに適用し、同種の drift を
  構造的に不可能にした。サイズ増加自体は引き続き許容する(2026-06-13 の判断を尊重)。
  乖離させると実際にビルドが落ちることを確認済み。
- gzip 実測を外部 `gzip` コマンドから **Node 組込み `zlib`** に変更(Windows/最小 CI イメージ
  に `gzip` が無い問題を解消。加えて CLI と zlib は memLevel 既定値の差で約750バイトずれ、
  バッジ判定を左右しうるため実装を一本化)。
- **brotli q11 の実測値を併記**(~71KB)。静的ホストが実際に返すのは brotli であり、
  利用者の実転送量に最も近い。参考値としてログ表示のみ(assert はしない)。

## [1.7.71] - 2026-07-14

First Principles による監査 — `CLAUDE.md` WHY の4本柱(単一HTML / ゼロ登録 / 完全無料 /
**プライバシー・E2E**)を1つずつ実装と突き合わせた結果、**プライバシー柱だけ主張が実装を
上回っていた**ことが判明したため是正。

### Fixed
- **共有リンクの暗号化に関する誇大表記を是正**: README の競合比較表は Board の欄に
  「E2E 暗号化 (予定) … **URL fragment key**」と記載していたが、実装には
  `crypto.subtle`/AES-GCM が**1件も存在せず**、`Share.exportToUrl` が生成する共有 URL は
  `#b=z:<deflate-raw + base64>` の**平文**だった(Node で同手順を再現し、第三者が鍵なしで
  盤面全文・ドキュメント名を復元できることを実証)。deflate+base64 は圧縮であって暗号ではない。
  ユーザーが製品を選ぶまさにその表で、プライバシーを実態より強く見せていた。
  表記を **`✗ (未実装 — 計画中)`** に訂正。§セキュリティ本文の「将来 (P2P sync 強化時)」の
  記述は元から正しくスコープされていたため保持。

### Added
- **共有モーダルに非暗号化の警告**(`shareUrlWarn`、ja/en): リンクを**生成するその場で**
  「盤面の内容はURLに埋め込まれます(圧縮のみ・暗号化なし)。リンクを知る人は誰でも
  閲覧できます」と表示。`--warn` トークンで通常のヘルプ文と視覚的に区別。
- README セキュリティ節にも同趣旨の明示を追加。
- `docs/feature-backlog.md` に **FT-21「共有リンクの E2E 暗号化」** を追加(本質的な改善)。
  設計論点(鍵配置と後方互換、鍵欠落時のエラー、`crypto.subtle` がセキュアコンテキスト限定で
  `file://` 直開きでは使えない問題、圧縮→暗号の順序)を記録。**要 ADR**、今回は未実装。

### Tests
- presence × 2: 共有リンクが依然として平文 `#b=` 形式であること(暗号を騙っていない)、
  Share モーダルの非暗号化警告が ja/en 両方に存在すること。将来 E2E を実装する際、
  前者が失敗することで「仕様が変わった」ことを明示的に知らせる。
- 非空虚性は stash 法で確認。合計 1634 pass, 0 fail

## [1.7.70] - 2026-07-14

未監査領域(geometry / hit-testing)のレビューで発見した2件のヒットテスト不具合を修正。

### Fixed
- **回転した非正方形ボックスの一部がクリックできない(既存バグ)**: `G.hit` は回転
  シェイプに対し、まずポインタをシェイプのローカル座標系に**逆回転**してから
  `G.bbox(s)`(回転シェイプの場合は**回転後のワールド外接矩形**)で quick-reject して
  いた。ローカル座標系の点をワールド座標系の外接矩形と比較するフレーム不一致のため、
  回転した長方形/付箋/画像/フレームの**中心から離れた領域が不可視の当たり判定漏れ**に
  なっていた(描画は正常なのにクリックできない)。既存の回転ヒットテストは中心点しか
  検証しておらず(中心は逆回転しても中心のまま)見逃していた。修正: quick-reject を
  **逆回転の前**に(ワールド点 vs ワールド外接矩形で)実行するよう順序を入れ替え。
- **point-geometry シェイプ(line/arrow/pen)の stray `rotate` で当たり判定が NaN**:
  `shapeRot()` は `s.w!=null`(ボックスシェイプ)のときだけ回転を描画に適用するため、
  `rotate` を持つ line/pen は**未回転で描画**される。しかし `G.hit` の逆回転は
  `s.w!=null` でガードされておらず、line の中心が `s.x+(undefined||0)/2 = NaN` となり
  ポインタが `{NaN,NaN}` に飛んで**永久に当たらない**シェイプになっていた(細工した
  インポート / リモート op 経由で到達。`validPatch` は任意シェイプに `rotate` を許可)。
  逆回転を `s.w!=null` でガードし描画=当たり判定のパリティを回復。

### Tests
- behavioral × 4(回転ボックスの回転後フットプリント内ヒット・遠方ミス、line/pen の
  stray rotate でのヒット維持)+ presence × 1(quick-reject が逆回転より前にある順序を固定)
- 非空虚性は stash 法で確認(修正前コードで新規テストが fail/crash)
- 合計 1632 pass, 0 fail

### Docs
- `docs/instructions-opus-sonnet.md`(Opus/Sonnet 向けの文脈ゼロ着手指示書)を新規追加。

## [1.7.69] - 2026-07-14

未監査領域(永続化/スキーマ検証)のレビューで発見したセキュリティ/プライバシー修正。

### Security
- **画像 `dataUrl` の外部 URL 注入(トラッキングピクセル / IP 露出)を遮断**:
  `validShape`(= `.board` インポート・URL ハッシュ共有・IndexedDB ロード・**リモート
  sync の `add`/`addMany`/`del`/`clear`/snapshot** すべてが通る単一 intake ゲート)は
  画像シェイプの `id`/`type`/`z`/座標は検証していたが、**`dataUrl` が `data:` URL か
  どうかを検証していなかった**。画像の `dataUrl` は `getImg()` 経由で `img.src` に流れる
  ため、`dataUrl:"https://evil.example/pixel.gif"` を持つ画像シェイプを描画すると
  ブラウザが**外部へネットワークリクエスト**を送る。これは「外部リソースを一切読み込まない」
  という Board の核心的不変条件を破り、細工した `.board`/共有リンク/IDB レコード、
  あるいは**悪意あるピアの `add` op**(= 全ピアの canvas で描画される)経由で、
  トラッキングピクセルや P2P セッションでの IP 逆匿名化に悪用できた。`buildSVG` は
  既に `/^data:image\//` でガードしていたが canvas/描画経路は無防備だった。修正は
  単一チョークポイント `validPatch` に同じガードを追加し、全 intake 経路
  (`validShape` + `upd` パッチ)を一度に塞いだ。`data:image/svg+xml` は許可
  (`<img>` 経由の SVG はスクリプト実行・外部サブリソース取得ができないため安全)。

### Tests
- behavioral × 9: `data:image/` 許可、外部 http(s)・プロトコル相対・非画像 data:・
  非文字列 dataUrl の拒否、リモート `add`/`upd` 経由の外部 URL 拒否、非画像シェイプの
  非退行。presence × 1。非空虚性は stash 法で確認(修正前コードで新規テストが fail)。
- 合計 1627 pass, 0 fail

### Docs
- `docs/feature-backlog.md` に FT-20(WebRTC 接続失敗の無反応、実ブラウザ検証待ち)を
  記録。README のセキュリティ節に dataUrl 制限を明記。

## [1.7.68] - 2026-07-14

多次元 deep-audit(8観測軸を並列エージェントで走査 → 各所見を3票制の敵対的検証で
採否判定、47エージェント)で発見・確認された9件を修正。

### Fixed
- **【最重要】undo が LWW で確定済みのリモートの新しい書き込みを踏み潰す
  (ADR-0002 の適用漏れ)**: `_stampWrites` は `upd`/`style`/`resize`/`align`/
  `group`/`ungroup` の全てに per-property 書き込みクロックを記録するのに、
  逆適用(undo)時に「リモートの新しい書き込みを踏み潰さない」ガードは `upd`
  ケースにしか実装されていなかった。2者が同じ図形を並行 resize → LWW で新しい方
  (peerB, w=99)に収束 → A が「自分の(既に無効化された)resize」を Ctrl+Z すると
  w=10 に退行し、`wclock` は peerB を最終書き込み者と記録したままの矛盾状態に
  静かに陥る(undo は broadcast しないため B は気づかない)。group/ungroup の
  groupId も同型。`_lwwSkip` を共有ヘルパーとして新設し全ケースに適用。
- **テーマトグルが localStorage 常時失敗環境で無限ループする**: `_themeMode()` が
  毎回 `localStorage.getItem` を再読していたため、ストレージアクセスが常に例外を
  投げる環境(Cookie 全ブロック・ストレージパーティショニング・サンドボックス
  iframe)では「値なし」と「読み取り失敗」を区別できず、トグルボタンが永久に
  「自動」を表示し続けたまま実際のテーマは「ライト」に固定される、という DOM と
  UI 表示の乖離が発生した。ADR-0014 の言語トグルと同じ「メモリ内キャッシュ」方式
  (`_themeCache`)に変更。
- **自分のアバターのツールチップ「You」が英語固定**: i18n キー化されておらず、
  日本語環境でも「You」のまま表示されていた。`t('you')` 化し `toggleLang()` の
  再同期対象にも追加。
- **SVG エクスポートがフレームの無ラベル・不透明度をキャンバスと異なって描画**:
  (a) ラベル無しフレームは canvas では既定文字列「Frame」が出るが SVG では
  ラベル要素自体が無かった、(b) canvas は不透明度に関わらずフレームを常に
  `(opacity??1)*0.9` で描くが SVG にはこの 0.9 倍が無く、既定不透明度(1)の
  フレームが SVG だけ完全不透明で書き出されていた。
- **SVG エクスポートの単点ペン(size 欠落)の半径が canvas と不一致**: 外部/旧
  `.board` データ由来で `size` が無い単点ペンは、canvas は半径1、SVG は半径0.5
  (フォールバック `(SZ||1)/2` が誤り)で書き出されていた。`(SZ||2)/2` に修正し
  canvas の `(s.size||2)/2` と一致させた。

### Docs
- `docs/ADR-0002-per-property-lww.md`: undo ガード適用漏れの発見・修正を追記。
- `docs/spec.md` §6: `Enter` の二重の意味(ADR-0013)を反映。
- `docs/ADR-0009-id-index.md`: 無効化箇所の内訳が「5+3=8」で本文の「9」と矛盾して
  いた誤記を訂正(消しゴム関連は3箇所でなく4箇所: `eraseAt`/`flushErase`/
  `abortGesture`/`_cancelPointerGesture`)。
- `test.mjs`: HiDPI recording-canvas ブロック(commit af5c0e2)が実際には6アサート
  なのに7と誤タグ付けされ、以降の累計 pass 数に +1 のずれが持続していたのを訂正。

### Tests
- behavioral × 30(undo-clobber の resize/group 各ペア + 非退行確認、テーマの
  ストレージ常時失敗シナリオ + 新規インスタンスでの起動時復元、self-avatar
  ローカライズ、フレーム SVG のラベル/不透明度、単点ペン半径)+ presence × 5
- 非空虚性は stash 法で確認(修正前コードに対して新規テストが fail — 例:
  resize undo-clobber は `10 !== 99` として実際に再現)
- 合計 1617 pass, 0 fail(HiDPI ブロックの誤カウント訂正込みの実数)

## [1.7.67] - 2026-07-13

`docs/feature-backlog.md` FT-18b(言語トグル、ADR-0012 で言語側だけ見送っていた分)。

### Added
- **言語手動トグル(ADR-0014)**: トップバーに `btnLang` アイコンボタンを追加。
  クリックで日本語⇄English を切替、`localStorage` に永続化し次回起動時に復元。
  `LANG`/`T` を `const` から `let` に変更して `UI.toggleLang()` で再代入 — `t()` は
  `T` を閉包しているため、以後のトースト・コンテキストメニュー・`applyI18n` の
  `data-t` 走査等は**追加コード無しで自動的に新言語へ追従する**。生成時に一度だけ
  訳文をキャッシュしていた3箇所(検索ボックスの placeholder/aria-label、
  `main()` で一度しか呼ばれないヘルプグリッド、接続状態変化イベント待ちのオンライン
  表示)だけ `toggleLang()` から明示的に再同期する。
  ADR-0012 は当初この言語トグルを「生成時キャッシュ箇所が複数あり検証コストが高い」
  として見送ったが、実際に悉皆調査したところ上記3箇所のみと判明し、想定より小さい
  スコープで実装できた(ADR-0014 に詳細)。

### Tests
- behavioral × 13: en⇄ja の往復、`localStorage` 永続化、検索ボックス/canvas
  aria-label の再同期、起動時の永続化済み言語の復元(新規 eval インスタンスで検証)
- presence × 2
- 非空虚性は stash 法で確認(修正前コードに対して新規テストが fail)
- 合計 1597 pass, 0 fail

## [1.7.66] - 2026-07-13

`docs/feature-backlog.md` FT-19(コネクタ/フレームラベルのキーボード編集経路)。

### Added
- **Enter でラベル/テキストを再編集(ADR-0013)**: 唯一の入口がダブルクリックだった
  frame/rect/ellipse のラベル、line/arrow のコネクタラベル、text/sticky の内容を、
  `select` ツールで単一選択中に `Enter` を押すだけで編集できるようになった。
  `Tab`(巡回・選択)→`Enter`(編集)→入力→`Enter`(確定)/`Escape`(破棄)で
  ポインタ無しの操作列が完結する。
  - キー衝突なし: `Enter` は既存で「アクティブなツールの図形を中央に作成」に
    割り当てられているが、`select` ツールのときは何もしない(no-op)ため、
    `state.tool==='select'` のときだけ本機能を割り当てても既存動作を壊さない。
  - ダブルクリックハンドラが個別に持っていたラベル位置計算ロジックを
    `_openLabelEditorFor(hit)` として抽出・共有(dblclick / キーボードの両方が
    同じ関数を呼ぶため、位置ズレや型追加漏れが構造的に起きない)。
  - ロック中の図形・複数選択・無選択では no-op(既存のロック不変条件を維持)。

### Tests
- behavioral × 17: 無選択/複数選択/ロック中の no-op、frame/rect/ellipse の
  ラベルエディタ起動、line のコネクタラベルエディタ起動、text の内容エディタ起動
  (**選択中の図形の内容で**エディタが開くことをピンポイントで検証)、pen の no-op、
  `select` ツール以外では従来通り `createShapeKbd` に委譲されること
- presence × 2、既存の dblclick ロックガードのテストを新しい共有関数の形に追従
- 非空虚性は stash 法で確認(修正前コードに対して新規テストが fail)
- 合計 1582 pass, 0 fail

## [1.7.65] - 2026-07-13

`docs/feature-backlog.md` FT-18 のうちテーマ側(ADR-0012)。言語トグルは別スコープに
切り出し、着手しない(下記参照)。

### Added
- **テーマ手動トグル**: トップバーに `btnTheme` アイコンボタンを追加。クリックで
  自動(OS の `prefers-color-scheme` 追従)→ライト→ダーク→自動を循環し、
  `documentElement.dataset.theme` を設定/削除する。既存の `:root[data-theme=light/dark]`
  CSS セレクタ(a11y-audit-2026-07 で整備済みだが JS から一度も設定されずデッドコード
  だった)が初めて実際に使われるようになる。選択は `localStorage` に永続化し、次回起動時
  ADR-0004 のバックアップ復元等より前に復元。SR には `UI.announce` で状態を通知
  (v1.7.63 で追加した SR live region を再利用)。

### Changed
- `test.mjs`: fake-DOM ハーネスの `localStorage` が実際に Function パラメータとして
  配線されておらず、`PEER_ID`/`toggleMinimap` の永続化コードはこれまで常に
  try/catch のフォールバック分岐だけを通っていた(本物の read/write パスは一度も
  実行されないままテストされていた)。今回のテーマトグル実装で初めて永続化の実際の
  挙動を検証する必要が生じたため配線を修正 — 既存機能のテスト忠実度も副次的に上がった。

### Deferred
- 言語トグル(FT-18 の残り半分)は `docs/ADR-0012-theme-toggle.md` で意図的に
  スコープ外にした: `LANG`/`T` は読み込み時に一度だけ決まる `const` で、検索ボックスの
  placeholder 等「生成時に一度だけ翻訳文字列をキャッシュする」箇所が複数あり、
  テーマ(CSS 変数が属性変化に即応)より安全な設計に手間がかかる。`docs/feature-backlog.md`
  に FT-18b として独立記録。

### Tests
- behavioral × 11(auto→light→dark→auto の循環、localStorage 永続化・削除、
  起動時復元)+ presence × 3
- 非空虚性は stash 法で確認(修正前コードに対して新規テストが fail)
- 合計 1563 pass, 0 fail

## [1.7.64] - 2026-07-13

`docs/feature-backlog.md` FT-17(v1.7.63 の長所短所監査で発見、当時は新機能のため見送り）。

### Added
- **空盤面のオンボーディングヒント**: 図形が1つも無いとき、キャンバス中央に淡色
  (`--ink-3`, 4.7:1 AA)のヒント文字列を表示。「クリックまたはツールバーから描き始める
  · ? でショートカット一覧」(ja) / 対応する英語。図形を1つ追加した瞬間に消える。
  描画のみで `state` には触れない(CLAUDE.md の Render 副作用最小化を維持)。
  それまで発見経路は `?` ヘルプモーダルのみだった。

### Tests
- behavioral × 5(記録キャンバスで fillText を捕捉): 空盤面で1回だけ描画される、
  文字列が i18n キー由来、キャンバス中央に位置、図形追加後は描画されない
- 非空虚性確認済み(stash 法で新規テストが fail)
- 合計 1550 pass, 0 fail

## [1.7.63] - 2026-07-13

製品全体の長所短所監査(堅牢性/セキュリティ + UX/i18n の2系統)で発見した実バグ 11 件を
修正。長所側の再確認: XSS 皆無(innerHTML 不使用・SR/トースト出力は textContent・
SVG/PDF は `_esc` 経由)、JSON.parse/localStorage/タイマー/主要 async 経路のエラー処理は
健全、sticky コントラストも問題なし。

### Fixed(堅牢性)
- **SW が cache-first のみで更新が永遠に届かない**: fetch ハンドラは navigation を含む
  全リクエストをキャッシュ優先・再検証なしで返していた。初回キャッシュ後は古い HTML が
  返り続け、その HTML が生成する SW も古いバージョンのまま — activate のキャッシュ掃除も
  controllerchange(v1.6.93 の更新通知)も構造的に一度も発火しなかった。navigation を
  network-first(オフライン時はキャッシュへフォールバック)に変更。オフライン等価は不変。
  ※ SW はフェイク環境で実行できないため、この修正の実機確認(オンラインで旧版から
  新版へ更新されること)が望ましい。
- **ピア id 無検証 + `state.peers` 無上限**: WebRTC DataChannel は全メッセージ種別を
  無フィルタで `_onRecv` に流すため、悪意ピアが任意長・任意個の `peer` 文字列で
  hello/ping を送ると Map と DOM アバターが無限成長した。`MAX_PEERS=32` の上限と
  64 文字・string 型の intake ガードを追加。
- **スナップショット増幅**: hello/sync-req 1通ごとに全盤面 clone×2 + JSON 化が
  無制限に走った。`_sendSnapshot` を 1秒 1回にスロットル。
- **`importBoard` の読み込み失敗が無反応**: FileReader に onerror が無かった
  (画像インポート・importFromHash は失敗をトーストしており非対称)。
- **`docName` が intake 4経路で無制限**: 入力欄の maxlength=80 と揃えて
  `.board`/IDB/バックアップ/URL ハッシュ経路もすべて 80 文字にクランプ。

### Fixed(UX / i18n / a11y)
- **ツールバー等 44 箇所の `aria-label`/`title` が英語ハードコード**: 日本語 SR ユーザー
  にはツールパレット全体が英語で読み上げられていた。`applyI18n()` が `data-t-aria`/
  `data-t-title`(値は i18n キー、`k.` プレフィックスで nested テーブル参照)を処理する
  よう拡張し、全コントロールに付与。title の `(V)` 等ショートカット表記は保持。
  `pickTool` の canvas aria-label も同時にローカライズ。
- **doBeautify(ADR-0005)が ⌥B 限定**: コンテキストメニューに `ctxBeautify` 項目を追加
  (選択に pen を含むときのみ表示)。タッチ/マウスから初めて到達可能に。
- **`t('searchNav')`/`t('search')` が生キー表示**: 両キーは nested `k:{}` にしか無く、
  ヘルプに「searchNav」、検索ボックスに「search」がそのまま出ていた。参照を修正。
- **en ブロックに top-level `grid` キー欠落**: 英語のグリッド切替トーストが「grid On」
  と生キー混じりだった。
- **SR 無音の状態変化**: SR 専用 live region(`#sr`)+ `UI.announce()` を追加し、
  ツール切替・ズーム(⌘+/−/0/⇧1)・反転(⇧H/⇧V)・ロック(⌘⇧L)・キーボード回転
  (,/.)をアナウンス(視覚トーストを増やすとキー操作のたびに UI ノイズになるため
  SR 専用領域を選択。undo/グループ化等は従来どおりトーストが読み上げる)。
- **ヘルプグリッドの欠落**: 実装済みの ⇧H/⇧V(反転)と ⌥C/⌥V(スタイル転写)の
  2行を追加。

### Added
- ja/en の i18n キーセット完全一致テスト(top-level と nested `k` の両方)— 片言語
  欠落キーを恒久的に構造検知。
- `docs/feature-backlog.md` 第3弾(FT-17〜19): 監査で発見したがバグでない3件
  (空盤面ヒント / テーマ・言語トグル / ラベルのキーボード編集)をチケット化。

### Tests
- behavioral × 20(ピアフラッド 5・スナップショットスロットル 2・importBoard 4・
  i18n パリティ 2・announce/aria 7)+ presence × 10
- 非空虚性は stash 法で確認(修正前コードに対して新規テストが fail)
- 合計 1544 pass, 0 fail

## [1.7.62] - 2026-07-11

ADR-0010 が明示的に持ち越した「他者の選択状態のハイライト」を実装(ADR-0011、
`docs/feature-backlog.md` FT-12)。実装調査中に、初期インポート(v1.6.5)から存在した
HiDPI 描画バグを発見・修正。

### Fixed
- **HiDPI(Retina 等 DPR>1)でオーバーレイ UI が正しい位置の DPR 倍の座標に描かれる
  バグ**: `draw()` のオーバーレイパスは `ctx.setTransform(DPR,0,0,DPR,0,0)` を張るのに、
  その下の描画関数 5 つ(選択枠・リサイズハンドル・回転ノブ・整列ガイド・マーキー・
  レーザー・ピアカーソル)が `G.w2s` の出力にさらに `*DPR` を掛けており、DPR が
  二重適用されていた(グループ外枠のみ正しい規約で描いていた)。DPR=1 では両者が一致
  するため、fake-DOM のテストでも DPR=1 の実機でも検出されず v1.6.5 から残存。
  修正: オーバーレイパスは「CSS px で描き、DPR はトランスフォームが供給する」規約に
  統一し、5 関数から `*DPR` を除去(線幅・破線・半径もトランスフォーム経由で正しく
  スケールするようになる)。規約はコメントとして `draw()` に明記。
- 再現手順: DPR=2 のディスプレイで図形を選択 → 選択枠・ハンドルが図形から右下に
  大きくズレた位置に表示される(ズーム 100%・原点付近でも図形との距離が画面座標で
  2 倍になる)。

### Added
- **ピア選択ハイライト(ADR-0011)**: 接続中のピアが選択している図形の bbox に、
  そのピアの `PEER_COLORS` 色の細い破線枠([3,3])を表示。自分の選択
  (`--accent-contrast` 実線+ハンドル)とは色・線種・ハンドル有無で区別。非永続
  (op-log/Persist/undo の対象外)、プレゼンモード中は非表示 — いずれも ADR-0010 と
  同じ扱い。
  - 送信は `state.selection` の 40 箇所超の mutation 部位への配線ではなく、
    `frame()`(rAF ドライバ)での変化検出 1 箇所に集約(選択変更は必ず再描画を
    伴うため全経路を捕捉できる。`draw()` 本体に置かないのは「Render は state を
    読むのみ」の不変条件のため)。変化時のみ送信するのでスロットル不要。
  - 新規ピア参加時は `_lastSelSent` をリセットして 1 回だけ再送 — 後から参加した
    ピアにも現在の選択が即座に見える。
  - 受信は `case 'cursor'` と同じ `viaRtc ? _rtcPeerId : msg.peer` ルーティング
    (ADR-0010 で発見した WebRTC ピア識別の落とし穴を踏襲)。防御的 intake:
    配列でない ids は拒否、文字列以外の要素は除去、`MAX_OP_SHAPES` 件で打ち切り。

### Tests
- behavioral × 12(2-peer 収束ハーネス): 選択 ids の伝播と解除(空配列)、変化
  検出(不変なら再送しない/変われば送る)、新規ピア参加での再送、viaRtc 分岐、
  防御的 intake(非配列・非文字列・未知ピア)を固定
- presence × 3: HiDPI 修正(オーバーレイパスに `*DPR` が残っていないこと)、
  ADR-0011 の送受信/描画の配線、latecomer 再送トリガ
- **記録キャンバス behavioral × 7**: fake-DOM の canvas コンテキストは完全な no-op で、
  だからこそ座標バグ(今回の double-DPR)が v1.6.5 から検出されずに残った
  (spec §14.2「テストの偏り」)。アフィン変換を追跡して `strokeRect` の **デバイス座標**を
  記録する ctx を追加し、DPR=2 で選択枠を実際に `draw()` してデバイスサイズが DPR に正確に
  比例すること(102→204、バグ時は→約404)を数値で固定。バグを一時的に再導入すると
  この7件が fail することを確認済み(非空虚性)。将来の座標バグ全般に対する検出機構でもある。
- 非空虚性確認済み(index.html を stash / バグ再導入すると新規テストが fail する)
- 合計 1514 pass, 0 fail

## [1.7.61] - 2026-07-01

`docs/spec.md` §14.2 が挙げていた優先度 P1 の弱点「プレゼンス(他者カーソル)未実装」に
対応(ADR-0010)。

### Added
- **ピアカーソル表示**: 接続中のピアのポインタ位置をリアルタイムに表示する
  `{k:'cursor',peer,x,y}` メッセージを追加。非永続(op-log/Persist/undo の対象外)。
  既存の `broadcast()` と同じ二経路(BroadcastChannel + WebRTC DataChannel)で送信、
  `CURSOR_THROTTLE_MS=60`(約16回/秒)でスロットル。プレゼンモード中は非表示
  (共同編集の文脈でのみ意味を持つ機能のため)。
  実装中、既存コードの非対称性を発見: WebRTC 経路には `hello`/`ping`/`sync-req` が
  一切流れない(これらは BroadcastChannel 限定の `_send()` 経由)ため、WebRTC ピアは
  相手の実 `peerId` ではなく自分側が発行した合成 `_rtcPeerId` で管理されている。
  新規メッセージが素直に `msg.peer` でルックアップするとこの経路で見つからず
  カーソル更新が黙って捨てられる(またはピアエントリの二重化を招く)おそれがあった
  ため、`_onRecv` に `viaRtc` フラグを追加して正しく分岐。
- 他者の**選択状態**のハイライトは本 ADR では意図的にスコープ外(将来の別 ADR)。

### Tests
- behavioral × 8(2-peer 収束ハーネス): BC経路での座標伝播、スロットル境界、
  viaRtc 分岐が正しく `_rtcPeerId` に紐づき phantom ピアを作らないこと、未知ピアへの
  更新が無視されること、非有限数(NaN)が拒否されることを固定
- 合計 1492 pass, 0 fail

## [1.7.60] - 2026-07-01

`docs/a11y-audit-2026-07.md` のフォローアップ。前バージョンで CSS の `:focus-visible`
のみ修正していたが、同じ「ライトモードで `--brand` が3:1未満」の問題が canvas 描画・
実テキスト・別の UI 要素にも存在することが分かり、まとめて解消した。

### Changed
- `--focus-ring` トークンを `--accent-contrast` にリネーム(CSS フォーカスリング
  専用ではなく、canvas の UI 指標描画にも使う汎用トークンになったため)。

### Fixed
- **canvas 描画の UI 指標5箇所**が生の `--brand` を使っていた: 選択バウンディング
  ボックス外枠、回転ノブのテザー線、スマート整列ガイド線、ドラッグ選択マーキー、
  ミニマップの現在ビューポート枠。すべて `--accent-contrast` に統一。
  新規フレーム/付箋の**既定ストローク色フォールバック**(5箇所)は図形自体の
  スタイル選択であり a11y 対象ではないため意図的に据え置き — 両者の区別は
  presence check で固定。
- **フレームラベル編集欄の文字色**: `openLabelEditor()` がフレームラベル
  (`bold=true`)の文字色に生の `--brand` を使っており、非テキスト3:1どころか
  実テキストの4.5:1基準にも届いていなかった(ライトモードで2.15:1)。
  `--accent-contrast` に切り替え。
- **フローティング検索ボックスの枠線**(`Ctrl+F`)も同じパターンで修正。

### Tests
- presence × 2 追加(フレームラベル・検索ボックス)、既存の focus-ring 系
  presence check を `--accent-contrast` 命名に追従、canvas UI指標 vs シェイプ
  既定色フォールバックの使い分け(5件/5件)を固定。
- 既存の `dblclick label editor handles rect and ellipse` テストが古い文字列を
  検索していたため更新(トークンリネームに追従)。
- 合計 1484 pass, 0 fail

## [1.7.59] - 2026-07-01

a11y 監査 (`docs/a11y-audit-2026-07.md`)。当初は Playwright + axe-core での自動監査を
予定していたが、npm install の許可をユーザーに確認する `AskUserQuestion` がインフラ
エラーで届かず、自動モードの分類器が「エージェント自己判断での外部パッケージ導入」を
正しくブロックしたため、依存ゼロの静的コントラスト検証に切り替えて実施した。

### Fixed
- **フォーカスリングが WCAG SC 1.4.11(非テキストコントラスト 3:1)未達だった**:
  `:focus-visible`/`:focus` の7箇所すべてが `var(--brand)`(#00C4CC)を直接使用しており、
  ライトモードでは紙面(白)に対し実測 2.15:1 で基準未達だった(ダークモードでは
  偶然 8.71:1 で達成)。新規テーマ対応トークン `--focus-ring` を導入し、ライトモードは
  `--brand-ink`(12.36:1 AAA)、ダークモードは `--brand`(8.71:1 AAA)を指すよう
  切り替え。既存のテーマ切り替え慣行(`:root`/`@media`/`:root[data-theme]` の3点セット)
  に沿って実装。
- **`--brand-ink` のコントラスト比コメントが誤っていた**: ソース中のコメントは
  「brand 地に brand-ink 文字: 7.5:1 AAA」と主張していたが、実測すると 5.75:1(AA)
  だった。一度も自動検証されていなかった自己申告値の誤りを、今回の監査で発見・修正。

### Tests
- behavioral: ソースから実際の色トークン値を抽出して WCAG コントラスト比を直接計算、
  ライト/ダーク双方のフォーカスリングが3:1を満たすことを固定。修正前のペアが実際に
  3:1未満であることも同時に固定し、非空虚性を保証。
- presence: `--focus-ring` トークンの3箇所定義、生の `var(--brand)` outline が0件、
  `var(--focus-ring)` が7件であることを固定。
- 合計 1481 pass, 0 fail

## [1.7.58] - 2026-07-01

「市販レベルの品質」への投資の第一弾。CLAUDE.md が未着手として挙げていたパフォーマンス
項目(`byId` O(n))と、文書と実態が乖離していた CI の欠如に対応。

### Added
- **CI ワークフローを作成 (`.github/workflows/ci.yml`、未コミット)**: CLAUDE.md の MAP
  は以前から `.github/workflows/ # CI (lint + size budget)` と記載していたが、実際には
  ブランチに存在しなかった — `node test.mjs`・構文チェック・`innerHTML=` 禁止・外部
  リソース禁止・512KB 暴走防止ガードのすべてが一度も機械的に強制されていなかった。
  npm 依存ゼロ(checkout + node のみ)のワークフローを作成しローカルの全ゲートで
  検証済みだが、リポジトリの `.gitignore` が `.github/` を意図的に除外しており
  (push に workflows スコープが要るため、コメント曰く「managed manually」)、
  この変更ではコミットしていない。ファイル自体は用意済みで、適切な権限を持つ人が
  手動で追加すれば即座に有効になる。
- **`byId()` の O(1) 化 (ADR-0009)**: 74 箇所から呼ばれる `byId` を線形探索から
  lazy-rebuild `Map` に変更。`connEnds()` 経由で RAF 描画ループ内から実際に毎フレーム
  線形走査されていたことを確認した上での対応。実装中に `Store._apply` 内部で
  `byId` を冪等性/ロックチェックに使ってから同ケース内で push/splice するパターンが
  複数箇所にあり、単純な無効化では拾えない一段階遅れたキャッシュ不整合を引き起こすことを
  発見・修正(サイズ不一致検出を安全網として追加)。同時に、既存の空間グリッドキャッシュ
  (`_grid`)の無効化漏れ(9箇所の `state.shapes` 再代入/splice 経路が
  `_invalidateGrid()` を経由していなかった)も修正 — `pickTop` のヒットテストが
  スナップショット受信直後などに陳腐化したグリッドを参照しうる潜在バグだった。

### Fixed
- **`exportPDF` の `convertToBlob` rejection が無視されていた**: `toBlob` 経路は
  `null` blob を `exportFailed` トーストで通知するのに、`convertToBlob` の reject は
  `.catch` が無く無言の unhandled rejection になっていた。両経路を同じ通知パスに統一。

### Tests
- behavioral × 17: `byId` が add/addMany/del(+undo)・`_applySnapshot`・
  消しゴム(`eraseAt`+`abortGesture`)それぞれの直後に正しい参照を返すことを固定
  (実装中に見つけた「1操作分遅れる」バグの回帰テスト)
- presence × 2: `_invalidateGrid`/`byId` のサイズチェック実装、`exportPDF` の
  エラーハンドリング対称化
- 既存 143+ 箇所の `state.shapes=[]`/`state.shapes.length=0` テストリセットパターンに
  `_invalidateGrid()` 呼び出しを機械的に追加(id インデックスが無効化されないまま
  テスト間で状態が漏れるのを防止)
- 合計 1475 pass, 0 fail

## [1.7.57] - 2026-07-01

`docs/feature-backlog.md` FT-05 の実装。これで同バックログの全項目が完了(残るは
KEEP と判定済みの3件のみ)。

### Changed
- **Share モーダルの明確化 (ADR-0008, FT-05)**: 手動 WebRTC シグナリングの各手順ラベルに
  「誘う側」「招待された側」を明記し、初見でも自分がどちらの手順に従うべきか一目で
  分かるように。招待コード(`#rtcOffer`)・応答コード(`#rtcAnswer`)にコピーボタンを
  追加(既存の `copyText()`/`shareCopyBtn` と同じパターン)し、readonly textarea を
  手動で全選択する必要をなくした。応答コード生成後の「相手に送り返す」という次の
  一手も明記。機能面(`Net.wrtcCreateOffer`/`wrtcConsumeAnswer`/`wrtcAcceptOffer`)は
  無変更。

### Removed
- 未使用の i18n キー `sharePasteAnswer`(ja/en とも、どのマークアップからも参照
  されていないことを確認済み)。

### Tests
- presence × 5: 新規コピーボタンの DOM/配線・新トーストキー・役割ラベルの存在、
  死蔵キー削除の確認
- 合計 1456 pass, 0 fail

## [1.7.56] - 2026-07-01

`docs/feature-backlog.md` FT-07 の実装。これで `docs/feature-triage-2026-07.md` §4 の
タッチ到達不能性はほぼ解消(ADR-0006 の long-press に続く2件目の直接投資)。

### Added
- **エクスポートメニュー + `.board` インポートのファイルピッカー (ADR-0007, FT-07)**:
  `btnExport` 隣の新規シェブロンボタン(`btnExportMenu`)から PNG/SVG/PDF/.board の
  全エクスポート形式 + `.board` インポートを選択可能に。非表示の
  `<input type="file" accept=".board">` を追加し、drag-drop に加えてタッチでもファイル
  選択で `.board` を読み込めるように。`UI.openCtxMenu` に後方互換な `customItems` 引数を
  追加し、既存の位置決め・キーボードナビ・フォーカストラップを新規コードなしで再利用。

### Tests
- presence × 4: 新規 DOM/配線/i18n キーの存在確認
- behavioral × 9: `UI.openExportMenu` が正しい項目(ラベル・ショートカット・実関数)で
  `UI.openCtxMenu` に委譲することを検証(モンキーパッチによるスパイ、非空虚性を
  pre-fix コードに対する失敗で確認)
- 合計 1451 pass, 0 fail

## [1.7.55] - 2026-07-01

`docs/feature-backlog.md` FT-06(最優先)+ FT-04/FT-08 の実装。タッチ端末での
到達不能性(`docs/feature-triage-2026-07.md` §4)への最初の直接投資。

### Added
- 機能バックログ (`docs/feature-backlog.md`) 追加 — `docs/feature-triage-2026-07.md` の
  ソクラテス式トリアージ結果を、Opus/Sonnet が文脈なしで着手できるチケット形式に変換。
- **long-press でコンテキストメニューを開く (ADR-0006, FT-06)**: select ツールで
  タッチポインタが 500ms 静止すると `UI.openCtxMenu` を開く。`_cancelPointerGesture`
  (既存)で進行中のジェスチャーを巻き戻してから開く。移動量が閾値(10px)を超えたら
  抑制、resize/rotate ハンドルドラッグ中も抑制。これ1件で整列/均等配置・全消去・
  複製・グループ化/解除・z順序・フリップ・ロック・スタイル転写がタッチ到達可能に。

### Removed
- **手動保存 ⌘S (FT-04)**: 自動保存 (`Persist.schedule`、500ms デバウンス)と完全に
  重複していたキーボード限定の冗長なショートカットを削除。help grid・i18n(ja/en)・
  README のショートカット表からも対応する記述を削除。

### Changed
- ツールバーに `overflow-y:auto` を追加 (FT-08) — 背の低い横持ち画面でも全11ツールに
  到達できるように。

### Tests
- behavioral × 10: `_longPressFire` の通常発火・移動量超過での抑制・resize/rotate中の
  抑制・ポインタ離脱後の no-op、`_clearLongPress` の冪等性、`_armLongPress`/
  `_clearLongPress` の arm/clear ラウンドトリップ(実タイマーは待たない)
- 合計 1438 pass, 0 fail

## [1.7.54] - 2026-07-01

製品判断「Board は scratchpad(単独体験)を選択」(2026-07-01) に基づく最初の具体的な投資。
`docs/research-improvements.md` item M ($1/$Q unistroke recognizer) を Board の実図形
(rect/ellipse/line)に特化した軽量版として実装。

### Added
- **スケッチ整形 (`Alt+B`, ADR-0005)**: 選択中の pen シェイプのうち、矩形・楕円・直線に幾何的に
  近いものを対応する図形へ変換する。`recognizeStroke(pts)` は純粋関数・依存ゼロ・決定的な
  幾何ヒューリスティック(ML なし、テンプレートDBなし):
  - **line**: 始点→終点の弦からの最大垂直距離が弦長の8%以下、経路長が弦長の1.35倍以下。
  - **rect**: 閉じたループ(始点≈終点)かつ全点がバウンディングボックスの4辺いずれかに
    短辺の12%以内で密着。
  - **ellipse**: 閉じたループかつ、重心からの距離をバウンディングボックス半幅/半高で正規化した
    値の変動係数が0.22以下。
  - 三角形等 Board に無い図形は意図的に非対応(変換先が無いため)。
  新しい op 型は追加せず、既存の `case 'style':/'resize':/'align':` の「複数シェイプ絶対パッチ・
  単一 undo」機構に `case 'beautify':` として相乗り。ロック済み・pen 以外のシェイプは対象外。
  ローカル専用(`REMOTE_OPS` に未追加 — `replace`/`clear` と同じ「ブロードキャストされるが
  受信側では無視される」パターン。共同編集相手のペン画を勝手に変換しないため)。

### Changed
- README ロードマップ表・キーボードショートカット表・機能一覧を更新。

### Tests
- behavioral × 26: `recognizeStroke` の rect/ellipse/line 認識 + star/zigzag/極小ストローク
  の正しい棄却 (11)、`doBeautify` の単一変換・undo/redo (5)、ロック済み/非pen/未認識混在
  選択での単一undo (8)、全未認識時のno-op (2)
- presence check × 1: `_apply` の `beautify` fallthrough 登録
- 合計 1428 pass, 0 fail

## [1.7.53] - 2026-07-01

`docs/research-improvements.md` §3.18「過不足の機能」— ソクラテス式問答で4つの仮説を検証、
3つは反証、1つ(ミニマップの常時表示・非表示手段なし)が実証された結果への対応。

### Added
- **ミニマップの表示切替 (§3.18)**: `.minimap-wrap{opacity:.85}` は常時表示で、非表示に
  できるのはプレゼンモード中のみだった。図形が数個しかない小規模ボードでも右下に常駐し続け、
  ユーザーが閉じる手段が一切なかった。`M` キーでトグル、設定は `localStorage` に永続化(次回
  起動後も保持)。`Minimap.schedule()` も非表示中は `requestAnimationFrame` 自体を呼ばない
  (CSSで隠すだけでなく描画コストもゼロにする — Carmack「必要最小限の invalidate」に整合)。

### Changed
- README キーボードショートカット表に `M` を追加。

### Tests
- behavioral × 5: `UI.toggleMinimap` の状態反転 (2) + `Minimap.schedule()` の非表示時
  RAFスキップ・二重スケジュール防止 (3、spy 付き独立サンドボックスインスタンスで検証)
- presence check × 3: キー割り当て、ヘルプグリッド記載、schedule() のガード節
- 合計 1402 pass, 0 fail

## [1.7.52] - 2026-07-01

バグ修正パス(v1.7.45–v1.7.51)に続く「次の一手」。`docs/research-improvements.md` §3.9
「アーキテクチャは既に投票を終えている」が指摘した、要 green-light の最小実装に着手。

### Added
- **自己上書き保護 (ADR-0004)**: `doClearAll`(全消去)/`importBoard`/`importFromHash`(共有リンク
  読込)は `state.shapes` を丸ごと置換する。セッション内 undo (Ctrl+Z) は有効だが、直後の自動保存が
  唯一の IndexedDB スロットを上書きするため、**リロード後・タブを閉じた後は復元不能**だった
  (「0秒で使い始める」の裏で「0秒で前の思考を消す」が同居していた)。
  - `Persist.saveBackup(shapes,viewport,docName)`: 破壊的置換の**直前**の状態を副キー
    (`DOC_KEY+':prev'`)へベストエフォートで退避。スキーマ変更・`DB_VER` bump 不要。
  - `Persist.checkBackup()`/`restoreBackup()`/`discardBackup()`: 起動時に一度だけ
    `confirm()` で復元を確認 (single-slot・single-notification — 単一スロット、一度だけ通知)。
    復元は既存の `replace` op を再利用するためセッション内 undo/redo も可能。
  - 新規 UI chrome なし。既存の `confirm()` パターン(`confirmClear`/`importConfirm` と同じ)を再利用。

### Changed
- README ロードマップ表を実態に合わせて更新(v1.6 を完了に、v1.7 の実績を明記、
  マルチページ/スレッドコメントは§3.9の製品判断待ちである旨を明示)。

### Tests
- behavioral × 16: `Persist.saveBackup/checkBackup/restoreBackup` 往復・undo/redo・単一スロット
  消費 (10) + 空配列での no-op (2) + `doClearAll` パターンでの復元可能性 (4)
- presence check × 4: `doClearAll`/`importBoard`/`importFromHash` のバックアップ呼び出し、
  起動時の一度きり復元プロンプト
- 合計 1394 pass, 0 fail

## [1.7.51] - 2026-07-01

v1.7.50 に続く監査パス。CHANGELOG の直近履歴を踏まえ、既出の修正を除外した上で新規に発見した
問題のみ対応。

### Fixed
- **remote `del` がロック済みシェイプを無視して強制削除する (P0 セキュリティ)**:
  `_apply` の全リモート op (`upd`/`move`/`style`/`resize`/`align`/`group`/`ungroup`/`zorder`)
  は一貫して `forward&&sh.locked` ガードを持つが、`del` の forward 分岐だけこのガードが
  欠落していた。悪意あるピアが `{op:'del',shapes:[{...ロック済みシェイプ...}],clock:{...}}`
  を送ると、ローカルでロックしたシェイプが強制削除される — README が明記する
  「シェイプロック: 移動・リサイズ・削除・消去すべて不可」という不変条件への違反。
  修正: 削除ループの先頭に `if(byId(sh.id)?.locked)continue;` を追加 (ローカル削除経路は
  既にロック済みシェイプを `op.shapes` から除外済みのため、ローカル操作への影響なし)。

- **`Presentation.enter()`/`leave()` が canvas backing buffer を再同期しない (P1 表示バグ)**:
  プレゼン開始/終了時に `canvas.style.position/inset/zIndex` を変更してフルスクリーン⇔通常
  レイアウトを切り替えるが、これは純粋な CSS レイアウト変更でありネイティブの `resize` イベ
  ントは発火しない。`canvas.width`/`height` (実ピクセルバッファ) は明示的な `resize()` 呼び
  出しでしか更新されないため、プレゼン開始直後は古い (通常レイアウト時の) バッファがフルス
  クリーン CSS ボックスへ引き伸ばされてぼやけ、`_zoomToFrame` の `window.innerWidth/Height`
  前提のズーム計算ともサイズが食い違う。プレゼン終了時も同様に、フルスクリーン時のバッファが
  通常レイアウトへ戻った後も残ってしまう。
  修正: `enter()`/`leave()` それぞれで CSS 変更直後に `resize()` を明示呼び出し。

### Changed
- **z順序操作4関数のロック除外フィルタの重複を解消**: `doBringFront`/`doSendBack`/
  `doBringForward`/`doSendBackward` に逐語的に重複していた
  `[...state.selection].filter(id=>!byId(id)?.locked)` を `unlockedSelectionIds()` へ抽出。

### Tests
- behavioral × 6: remote del locked-shape guard (2) + Presentation enter/leave resize() sync (4)
- 合計 1374 pass, 0 fail

## [1.7.50] - 2026-07-01

多角的な製品監査 (正しさ・UX・パフォーマンス・a11y・コード品質・テストカバレッジ) の結果を受けた改善パス。

### Fixed
- **`_syncTextFinalize` の「新規テキストを空欄のまま放棄」経路が `connClears` を計算しない (P2 レア競合)**:
  新規テキスト作成直後、確定前に別ピアの矢印/直線がそのテキストへ束縛される競合ウィンドウが
  存在する。ローカルで空欄のまま確定すると `Store.undo()` がシェイプを削除するがコネクタの
  束縛には触れず、ブロードキャストされる `del` op にも `connClears` が含まれないため、
  ローカル・リモート双方でコネクタの `.a`/`.b` がダングリング参照のまま残る。
  修正: 削除経路すべてで共有する `computeConnClears()` を呼び、ローカルの束縛修正とブロード
  キャストの両方に反映。

### Changed
- **コネクタ束縛クリア (`connClears`) 計算ロジックの重複を解消**: `doDelete`/`flushErase`/
  `openTextEditor` (既存テキスト空欄化) の3箇所にほぼ逐語的に重複していたロジックを
  `computeConnClears(delIds)` へ抽出。同一バグクラスが新しい削除経路に紛れ込むのを構造的に防止。
- **付箋テキストの折り返し計算をメモ化 (パフォーマンス)**: `wrapText()` が毎 RAF フレーム、
  可視な付箋ごとに `measureText` を再計算していた。`wrapTextCached(shape,...)` で
  `(text,maxWidth,fontSize)` をキーに WeakMap メモ化し、テキスト量の多いボードでの描画負荷を
  削減。shape オブジェクト参照は Store が in-place mutate するため undo/redo でも安全に機能する
  (CLAUDE.md の drawShape 副作用例外リストに追記)。

### Verified (対応不要と判断)
- `state.wclock` の del/clear/replace undo 復元 — 既に `op.wc`/`op.afterWc` スナップショットで
  正しく実装済みだった (過去のバージョンで修正済み)。
- エラー系トーストの `aria-live` — 個々のトースト要素は既に `role="alert"` を持ち、WAI-ARIA
  仕様上これは祖先の `aria-live="polite"` と独立して暗黙の `assertive` ライブリージョンになる。
  追加対応不要。
- `validRemotePayload` の zorder レガシースナップショット `op.before` 未検証 — `_apply` の
  リモート適用は常に `forward=true` で呼ばれるため `op.before` は到達不能パス。実害なし。

### Tests
- behavioral × 8: `_syncTextFinalize` connClears race fix (3) + `computeConnClears` 共有ヘルパ (1)
  + `wrapTextCached` メモ化 (4)
- presence check × 2: 更新 (text-blur del pattern, sticky wrapTextCached call site)
- 合計 1368 pass, 0 fail

## [1.7.49] - 2026-07-01

### Fixed
- **`validRemotePayload upd`: フラット `pts` 配列を許容 (P1 クラッシュ)**:
  `validPatch({pts:[1,2,3]})` は有限数の配列なので `true` を返すが、`drawPen` は
  `[[x,y],...]` 形式を前提とし、フラット配列を受信するとクラッシュする。
  修正: `case 'upd'` に `op.after.pts` の構造検査を追加
  (`Array.isArray(p) && p.length >= 2 && p.every(isFinite)`)。

- **SVG テキスト/付箋の y 座標が `+fontSize` 分ずれる (P2 表示バグ)**:
  旧コード `y="${Y+oy+fs}"` は canvas の `textBaseline='top'` と不一致。
  修正: `y="${Y+oy}" dominant-baseline="hanging"` に変更して上端揃えを統一。

- **`openTextEditor` の空テキスト削除パスで connClears を計算しない (P2 ゾンビ binding)**:
  テキストシェイプを空にして確定すると、そのシェイプに束縛された矢印/直線の
  `a`/`b` が `null` にならず、削除済みシェイプへのダングリング参照が残る。
  修正: `doDelete` と同じ `connClears` 計算ロジックを追加。

- **`Net._onRecv` スナップショットマージループに上限なし (P1 DoS)**:
  悪意あるピアが `{k:'snapshot',ops:[...600件...]}` を送ると UI スレッドが
  フリーズし OOM になりうる。修正: `msg.ops.slice(0,MAX_OP_SHAPES)` で上限を設定。

- **`validRemotePayload ungroup`: `gids` に空文字列を許容 (P2 パリティ)**:
  `group` の `gid` は `&&op.gid.length>0` で空文字列を拒否するが、`ungroup` の
  `gids.every(g=>typeof g==='string')` は `''` を通過させていた。
  修正: `&&g.length>0` を追加して `group` との一貫性を確保。

### Tests
- behavioral × 11: flat pts upd (3) + SVG dominant-baseline (1) + del+connClears text (3) + snapshot merge cap (1) + ungroup empty gid (2)
- presence check × 4: updated to match new code after each fix
- 合計 1360 pass, 0 fail

## [1.7.48] - 2026-07-01

### Fixed
- **`REMOTE_OPS` に `'clear'` が含まれている (Critical セキュリティ)**:
  BroadcastChannel/WebRTC の任意のピアが `{op:'clear',shapes:[],clock:{...}}` を送るだけで
  全シェイプを消去できた。`clear` はローカルの undo スタックを経由せず、
  `replace` と同様にボード全消しの破壊的操作。修正: `REMOTE_OPS` から `'clear'` を除去。

- **`_applySnapshot` がシェイプ数を制限しない (P1 DoS)**:
  join 時のスナップショット受信パスで `shapes.filter(validShape)` に上限がなく、
  悪意あるピアが 100,000 シェイプのスナップショットを送ると UI スレッドがフリーズ。
  修正: `shapes.slice(0,MAX_OP_SHAPES)` でキャップ。

- **付箋 (sticky) のドロップシャドウが `fill()` の後に設定される (P2 描画ミス)**:
  Canvas では shadow 状態は描画前に設定する必要がある。`c.fill()` の後に
  `shadowColor` を設定しているため付箋の背景にシャドウが適用されず、
  べた塗りのカードになっていた。修正: shadow 行を `c.fill()` の前に移動。

- **`validRemotePayload` group: `gid` が空文字列を許容 (P2 不可視グループ)**:
  `gid:''` を持つ remote group op が通過し、`sh.groupId=''` が設定される。
  `draw()` の `if(s.groupId)` が falsy で視覚フィードバックなし。
  修正: `&&op.gid.length>0` を追加。

- **`validRemotePayload` move: `dx`/`dy` に文字列型を許容 (`+op.dx` 型強制)**:
  `"42"` のような文字列が `Number.isFinite(+"42")` を通過し、シリアライズ後の
  ワイヤ形式に文字列が含まれてしまう。修正: `typeof op.dx==='number'` を追加。

### Tests
- behavioral × 7: clear remote reject (1); group empty gid (2); move string dx/dy (3)
- presence check × 6: REMOTE_OPS clear; _applySnapshot cap; sticky shadow order; group gid; move typeof
- 合計 1350 pass, 0 fail

## [1.7.47] - 2026-07-01

### Fixed
- **`validRemotePayload` align: `dir` フィールドを whitelist で検証しない (P1 セキュリティ)**:
  不明な `dir` 値を持つ remote align op が `noLock` の評価に影響を与える可能性があった。
  修正: `const DIRS=new Set([...])` で既知のディレクション (`left/right/cx/top/bottom/cy/hspace/vspace/flip/rotate/lock`) のみ受け入れる。未知の dir を持つ op は即 reject。

- **`doPaste` が貼り付け座標に `window.innerWidth`/`window.innerHeight` を使用 (P2 ズレ)**:
  ツールバーとステータスバーが含まれるため、実際のキャンバス領域より ~26px 右、~36px 下に貼り付けられていた。
  修正: `canvas.getBoundingClientRect().width` / `height` を使用。

- **ミニマップのビューポート矩形・クリックナビゲーションが `window.innerWidth`/`innerHeight` を使用 (P2 ズレ)**:
  ミニマップのビューポート枠が実際の可視キャンバスより広く描画され、クリックジャンプ先も微妙にずれていた。
  修正: `canvas.getBoundingClientRect()` を両方で使用。

- **`_apply del` forward で `op.wc` が初回のみキャプチャされる (P2 LWW 収束欠陥)**:
  del → undo → リモートが同シェイプを書き換え → redo → undo の順で操作すると、
  undo 時に `op.wc` が初回 del 時の古いクロックを復元してしまい、
  リモートの LWW タイムスタンプが失われ、収束が壊れる。
  修正: `if(!op.wc)` ガードを除去し、forward apply のたびに `op.wc` を再キャプチャ。

### Tests
- behavioral × 5: align unknown dir rejected (3 asserts, v1.7.47a); del wc refresh (2 asserts, v1.7.47c)
- presence check × 5: align DIRS whitelist; doPaste getBCR; minimap draw getBCR; minimap click getBCR; del wc non-lazy
- 合計 1337 pass, 0 fail

## [1.7.46] - 2026-07-01

### Fixed
- **`validRemotePayload` `del.connClears` 配列に `MAX_OP_SHAPES` 上限がない (P1 DoS)**:
  v1.7.44/v1.7.45 で他の配列にキャップを追加したが `connClears` が漏れていた。
  501 エントリの `connClears` を送るだけで `validPatch()` が再帰呼び出しされ
  CPU を枯渇できる。修正: `&&op.connClears.length<=MAX_OP_SHAPES` を追加。

- **`drawShape` が rect/ellipse のラベルを 1 フレームに 2 回描画 (P2 レンダリング汚染)**:
  `case 'rect'`/`case 'ellipse'` 内で `_drawBoxLabel(s,c)` を呼んだ後、
  switch 外に同じラベルを描く裸のコードブロックが存在していた。
  不透明度が低いシェイプでは `1-(1-α)²` の二重合成が発生し、ラベルが意図より暗くなる。
  また `c.font`/`c.fillStyle` が `save()/restore()` なしで汚染されていた。
  修正: 重複ブロック (6 行) を削除。`_drawBoxLabel` が唯一の描画経路に。

- **`_apply del` backward が `connClears` に `sh.locked` チェックを行わない (P2 非対称ロック)**:
  forward パスでは `if(sh&&!sh.locked)` でロック済みコネクタのバインディングを保護するが、
  backward (undo) パスでは `if(sh)` のみで同じ保護がなかった。
  del 後にコネクタをロックした状態で undo すると、ロック済みコネクタに古いバインディング
  が強制書き戻される。修正: backward パスに `&&!sh.locked` を追加。

### Tests
- behavioral × 4: del connClears DoS cap (2); del-backward locked connector guard (2)
- presence check × 3: connClears length cap; duplicate label block removed; backward lock guard
- 合計 1329 pass, 0 fail

## [1.7.45] - 2026-07-01

### Fixed
- **`validRemotePayload` の `zorder.changes`・`zorder.after`・`group.ids`・`group.before`・`ungroup.ids`・`ungroup.gids` 配列に `MAX_OP_SHAPES` 上限がない (P1 DoS)**:
  v1.7.44 で `addMany`/`del`/`clear`/`move` 等にキャップを追加したが、`zorder`・`group`・`ungroup`
  の配列は漏れていた。悪意あるピアが 100,001 要素の zorder/group/ungroup を送ると
  バリデーションを通過し UI スレッドをフリーズさせる。修正: 各配列に `&&<array>.length<=MAX_OP_SHAPES` チェックを追加。

- **`applyStyleToSelection` / `_sfbFlush` が `origSel` を記録しない (P2 undo 選択復元欠落)**:
  スウォッチ・カラーピッカー・サイズスライダーで色/サイズを変更後に Ctrl+Z を押しても
  変更前の選択が復元されない。修正: `Store._recordCommitted({op:'style',...})` の直前後に
  `origSel` キャプチャ・付与を追加 (`applyStyleToSelection` と `_sfbFlush` の両方)。

- **`openLabelEditor` / `openTextEditor` の `upd` コミットが `origSel` を記録しない (P2 undo 選択復元欠落)**:
  ボックスラベル・テキスト編集の Blur コミット後に Ctrl+Z を押しても変更前の選択が復元されない。
  修正: 両パスの `Store._recordCommitted({op:'upd',...})` の前後に origSel キャプチャ・付与を追加。

### Tests
- behavioral × 8: zorder/group/ungroup >MAX_OP_SHAPES 拒否 (6 assertions, v1.7.45a);
  applyStyleToSelection origSel undo (2 assertions, v1.7.45b)
- presence check × 4: group/ungroup `MAX_OP_SHAPES` cap; openLabelEditor origSel; openTextEditor origSel
- 合計 1322 pass, 0 fail

## [1.7.44] - 2026-07-01

### Fixed
- **`validRemotePayload` が配列サイズを制限しない (P1 DoS / メモリ枯渇)**:
  `addMany.shapes`、`del.shapes`、`clear.shapes`、`move.ids`、`align/style/resize` の
  パッチ配列が無制限で、悪意あるピアが 100,000 要素の op を送ると UI スレッドが
  フリーズし、メモリが枯渇する。修正: `const MAX_OP_SHAPES=500` を定義し、
  各 op の配列に `length<=MAX_OP_SHAPES` チェックを追加。

- **`nextZ()` が `Math.max(...array)` スプレッドを使用 (P1 クラッシュリスク)**:
  65,536 以上のシェイプがある状態で新規シェイプを作成すると V8 の引数上限を超えて
  `RangeError` が発生し、以降のシェイプ作成がすべて失敗する。
  修正: `state.shapes.reduce((m,s)=>Math.max(m,s.z||0),0)` に置き換え。

- **`_apply replace` forward が `afterWc` を復元しない (P2 wclock 不整合)**:
  undo 後に redo すると `state.wclock={}` に強制リセットされ、import 時に
  記録した `afterWc` クロックが失われる。修正: `if(forward&&op.afterWc)state.wclock=clone(op.afterWc)` を追加。
  `importBoard`・`importFromHash` 両方に `afterWc:clone(state.wclock)` を付与。

### Tests
- behavioral × 2: addMany >500 shapes 拒否 (v1.7.44a); replace redo restores afterWc (v1.7.44b)
- presence check × 3: MAX_OP_SHAPES 定数, nextZ reduce, replace forward afterWc
- 合計 1312 pass, 0 fail

## [1.7.43] - 2026-07-01

### Fixed
- **`_zCommit` / `doBringFront` / `doSendBack` / `doBringForward` / `doSendBackward` が `origSel` を記録しない**:
  z 順序変更 (`]`/`[`/`⇧]`/`⇧[`) の undo 後に選択が消える。修正: `_zCommit` に
  `const origSel=[...state.selection]` キャプチャと付与を追加。
  `_apply case 'zorder'` 後退パスに `if(!forward&&op.origSel)state.selection=...` を追加。

- **キーボードリサイズ (Alt+矢印) が `origSel` を記録しない**:
  Alt+Arrow でリサイズ後に undo すると選択が消える。修正: `Store._recordCommitted({op:'resize',...})` の
  前後に origSel キャプチャ・付与を追加 (共有 `_apply style/resize/align` 後退パスは v1.7.42 で整備済)。

- **ドラッグリサイズ・ドラッグ回転の `upd` op が `origSel` を記録しない**:
  pointer ドラッグでリサイズ/回転後に undo すると選択が消える。
  修正: drag-resize (line ~2218) と drag-rotate (line ~2227) の両 `_recordCommitted` 前後に
  origSel キャプチャ・付与を追加。また `_apply case 'upd'` 後退パスに
  `if(!forward&&op.origSel)state.selection=...` を追加 (テキスト/ラベル upd は origSel を
  持たないため既存動作に影響なし)。

### Tests
- behavioral × 2: zorder undo origSel (v1.7.43a); upd backward origSel (v1.7.43b)
- presence check × 5: _zCommit, zorder backward, keyboard resize, drag-resize, upd backward
- 合計 1304 pass, 0 fail

## [1.7.42] - 2026-07-01

### Fixed
- **`nudgeSelection` / `endSelect` が `origSel` を記録しない (undo 後に選択が消える)**:
  矢印キーやドラッグ移動の undo で `move` op を巻き戻しても `state.selection` が空のまま
  だった。修正: 両関数で `const origSel=[...state.selection]` を `_recordCommitted` 前に
  キャプチャし、commit 後に `state.history[state.histIdx].origSel=origSel` を付与。
  `_apply case 'move'` 後退パスに `if(!forward&&op.origSel)state.selection=...` を追加。

- **`doAlign` / `doFlip` / `doRotate` / `doLock` が `origSel` を記録しない (undo 後に選択消失)**:
  整列・反転・回転・ロック操作の undo で選択が復元されなかった。修正: 4 関数とも
  同パターンで `origSel` をキャプチャ・付与。`_apply case 'align'` 後退パスに
  `if(!forward&&op.origSel)state.selection=...` を追加。

- **`validRemotePayload('move')` が空 `ids[]` と 零変位を通過する (セキュリティ)**:
  空の `ids` 配列 (`[].every()` は常に `true`) または `dx===0&&dy===0` の
  no-op move op を受信しても検証が通り、`seenOps` スロットを無駄に消費する。
  修正: `op.ids.length>0` と `(op.dx!==0||op.dy!==0)` を条件に追加。

### Tests
- behavioral × 3: nudgeSelection undo origSel (v1.7.42a); doAlign undo origSel (v1.7.42b);
  remote empty-ids/zero-move 拒否 (v1.7.42c)
- 合計 1295 pass, 0 fail

## [1.7.41] - 2026-07-01

### Fixed
- **`validRemotePayload('align')` が `dir:'lock'` op を拒否する (P2P ロック同期不能)**:
  `noLock=p=>!('locked' in p)` が `{locked:true}` / `{locked:null}` を含む全パッチを
  拒否するため、`doLock()` で生成される `align/lock` op が受信ピアに適用されず、
  シェイプのロック状態が P2P 経由で一切伝播しなかった。
  修正: `noLock=p=>op.dir==='lock'||!('locked' in p)` — `dir:'lock'` op はガードを免除。

- **redo of unlock がロック解除を適用しない (v1.7.38 ガード退行)**:
  v1.7.38 で追加した `!(forward&&sh.locked)` ガードが `_apply` redo パス (forward=true) で
  lock op の redo を妨害していた。lock → unlock → undo (再ロック) → redo (再アンロック) の
  操作で redo が `sh.locked=null` を適用せずシェイプがロック状態のままになる。
  修正: `!(forward&&sh.locked&&!('locked' in p))` — パッチに `locked` キーが含まれる場合は
  ガードを通過させ、lock/unlock op の redo が正しく適用されるようにした。

### Tests
- behavioral × 2: remote lock op がピアの shape を `locked=true` にする (v1.7.41a);
  lock→unlock→undo→redo が `locked=null` を正しく復元する (v1.7.41b)
- presence check × 2: 更新された validator/guard パターンを確認
- 合計 1289 pass, 0 fail

## [1.7.40] - 2026-07-01

### Fixed
- **`_apply('zorder', forward)` がロック済みシェイプの `frac`/`z` を保護しない (セキュリティ)**:
  `changes` パスと legacy snapshot パスの両方で `sh.locked` チェックなしに `sh.frac`/`sh.z` を
  上書きしていた。悪意あるピアがロックされたシェイプを含む `zorder` op を送ると z 順序が
  変更される。修正: `changes` パスに `!(forward&&sh.locked)` ガードを追加、
  legacy snapshot パスにも同ガードを追加。

- **`_apply('group', forward)` がロック済みシェイプに `groupId` を書き込む (セキュリティ)**:
  ロックされたシェイプが remote `group` op でグループに追加されると、グループ全体の
  移動でロックシェイプも動いてしまう (シェイプロックのバイパス)。
  修正: `if(sh&&!(forward&&sh.locked))sh.groupId=op.gid`。

- **`_apply('ungroup', forward)` がロック済みシェイプの `groupId` を削除する (セキュリティ)**:
  ロックされたシェイプが remote `ungroup` op でグループ解除される。
  修正: `if(sh&&!(forward&&sh.locked))delete sh.groupId`。

  すべて v1.7.38 で確立した `!(forward&&sh.locked)` パターンの適用。

### Tests
- behavioral × 3: remote zorder/group/ungroup が locked shape を変更しないことを確認 (各 2 assert)
- presence check × 3: zorder changes ガード、group forward ガード、ungroup forward ガード
- 合計 1287 pass, 0 fail

## [1.7.39] - 2026-07-01

### Fixed
- **`_apply('del', forward)` の `connClears` ループがロック済みコネクタを保護しない (セキュリティ)**:
  `_apply('del', forward)` は削除シェイプに束縛されたコネクタのバインディングを `p.after` で
  上書きする (connClears)。ローカルの `doDelete` はロック済みコネクタをスキップして
  connClears を作らないが、`validRemotePayload` は `p.id` が指すコネクタのロック状態を
  検証しない。悪意あるピアが ロックされたコネクタを `connClears` に含む `del` op を送ると、
  `_apply` はそのロック済みコネクタの `a`/`x1`/`y1`/`b`/`x2`/`y2` を無条件に上書きする。
  v1.7.38 で `upd`/`style`/`resize`/`align` forward に追加したロックガードと同クラスのバグ。
  修正: `if(sh)Object.assign(sh,p.after)` → `if(sh&&!sh.locked)Object.assign(sh,p.after)`。

### Tests
- behavioral: remote del with connClears targeting locked connector → binding preserved (3 assert)
- presence check: `_apply del forward connClears: if(sh&&!sh.locked) guards locked connectors` (1)
- 合計 1280 pass, 0 fail

## [1.7.38] - 2026-07-01

### Fixed
- **`_apply('upd', forward)` がロック済みシェイプを保護しない (セキュリティ)**:
  `_apply('move', forward)` は `if(forward&&sh.locked)continue` でロック済みシェイプを
  スキップするが、`_apply('upd', forward)` には同等のガードがなかった。
  悪意あるピアが `{op:'upd', id:X, after:{rotate:45}}` を送ると、ローカルでロックされた
  シェイプ X の属性が書き換えられる (x/y/w/h/rotate/text/label 等すべて対象)。
  修正: `const sh=byId(op.id);if(!sh)break;` の直後に `if(forward&&sh.locked)break;` を追加。
  backward (undo) 方向はスキップしない — `move` と同じ設計方針 (undo はロックを超えて復元)。

- **`_apply('style'/'resize'/'align', forward)` がロック済みシェイプを保護しない (セキュリティ)**:
  パッチ適用ループ `if(sh)Object.assign(sh,clone(p))` がロック状態を確認しないため、
  ロックされたシェイプの fill/stroke/size/x/y/w/h 等を remote op で書き換えられた。
  修正: `if(sh&&!(forward&&sh.locked))Object.assign(sh,clone(p))` に変更。

### Tests
- behavioral: remote upd on locked shape → rotate unchanged (2 assert)
- behavioral: remote style on locked shape → fill unchanged (2 assert)
- presence check × 2: upd forward lock guard, style/resize/align forward lock guard
- 合計 1276 pass, 0 fail

## [1.7.37] - 2026-06-30

### Fixed
- **`doGroup` / `_apply('group', backward)` の `origSel` 未設定 (selection-loss)**:
  グループ化 (Ctrl+G) 後に選択を変更し Ctrl+Z すると、グループ化前に選択していた
  シェイプが再選択されなかった。`doGroup` は `Store._recordCommitted` を直接呼ぶため
  `origSel` が記録されず、`_apply('group', backward)` にも `if(op.origSel)` 復元節が
  なかった (二重の欠落)。
  修正: `doGroup` に origSel キャプチャ + パッチ を追加、`_apply('group', backward)` に
  `if(op.origSel)state.selection=new Set(...)` を追加。

- **`doUngroup` / `_apply('ungroup', backward)` の `origSel` 未設定 (selection-loss)**:
  グループ解除 (Ctrl+Shift+G) は `state.selection` をグループ全メンバーに拡張するが、
  `origSel` が記録されないため、Ctrl+Z 後も拡張された選択状態が残ってしまう。
  解除前に選択していたシェイプのみに戻るべきところが戻らない。
  修正: `doUngroup` に `const origSel=[...ids]` (選択拡張の**前**) + パッチ を追加、
  `_apply('ungroup', backward)` に origSel 復元節を追加。

### Tests
- behavioral: doGroup undo restores pre-group selection (3 assert)
- behavioral: doUngroup undo restores pre-ungroup selection (4 assert)
- presence check × 4: doGroup origSel patch, _apply group backward restore,
  doUngroup origSel capture, _apply ungroup backward restore
- 合計 1270 pass, 0 fail

## [1.7.36] - 2026-06-30

### Fixed
- **`flushErase` の `del` op に `origSel` が記録されない (selection-loss)**:
  消しゴムツールで図形を消去後に Ctrl+Z すると消した図形は復元されるが、
  消去前に選択していた図形が再選択されなかった。
  `_apply('del', false)` の backward path は `if(op.origSel)state.selection=...` で
  `origSel` があれば選択を復元するが、`flushErase` は `Store.commit(op)` の前後に
  `origSel` キャプチャ/パッチを行っていなかった。
  `doDelete` (キーボード削除) / `doClearAll` で既に正しく実装済みのパターンが
  eraser path にのみ欠けていた。
  修正: `const origSel=[...state.selection]` → commit → `origSel` パッチ の 3 行パターンを追加。
  **非空虚テスト** (4 assert):
  - 選択中シェイプを消去 → undo → `state.selection.has(shape.id)` を検証 ✓
  - undo 前: selection size === 0 (del forward が selection.delete 済み) ✓

### Tests
- behavioral: flushErase undo restores pre-erase selection (4 assert)
- presence check: `flushErase del: origSel captured before commit and patched after` (1)
- 合計 1262 pass, 0 fail

## [1.7.35] - 2026-06-30

### Fixed
- **`validRemotePayload` の `style`/`resize`/`align` op が `op.before==null` を許容 (セキュリティ/整合性)**:
  `_apply` の backward branch は `op.before` が必須 (`const patches=forward?op.after:op.before;
  if(!Array.isArray(patches))break;`) だが、`validRemotePayload` では
  `(op.before==null||(patches(op.before)&&...))` と `null` を許可していた。
  悪意あるピアが `before:null` の `style` op を送ると、正しいスタイル変更が適用され、
  受信端で undo が silent no-op になる (backward で `before:null` → `!Array.isArray(null)` → break)。
  修正: `op.before==null` フォールバックを削除し、`before` を必須フィールドとして強制。
  ローカルコミット (`doStyle`/`doResize`/`doAlign`) は常に `before` を含むため影響なし。
  **非空虚テスト** (2 assert):
  - `before:null` の style op が `applyRemote` で拒否され shape が変化しない ✓
  - 既存テスト (v1.7.23/v1.7.24b) の valid op 呼び出しに `before` を追加して contract 更新 ✓

- **テキスト編集ブラーで既存テキスト削除時に `origSel` を記録しない (selection-loss)**:
  テキストシェイプをダブルクリックして内容を全消去してブラーすると
  `Store.commit({op:'del',shapes:[orig]})` が呼ばれるが `origSel` が記録されなかった。
  Ctrl+Z でシェイプは復元されるが、`_apply('del', backward)` の
  `if(op.origSel)state.selection=...` が発動せず、削除前に選択していたシェイプが
  再選択されないバグ。`doDelete` (キーボード削除) では正しく実装済みの pattern が
  textarea blur path にのみ欠けていた。
  修正: `const origSel=[...state.selection]` → commit → `origSel` パッチ の 3 行パターンを追加。

### Tests
- behavioral: `before:null` style op rejected by `validRemotePayload` (2 assert)
- presence check: `validRemotePayload style/resize/align: before required` (1)
- presence check: `text-blur del: origSel captured and patched` (1)
- 既存テスト 2 件 (v1.7.23 align, v1.7.24b style) に `before` を追加 (正当な op contract 反映)
- 合計 1259 pass, 0 fail

## [1.7.34] - 2026-06-30

### Fixed
- **`_apply('ungroup', backward)` が `op.gids` 未定義時に TypeError でクラッシュ (undo 破壊)**:
  backward branch の else 節 `const gid=op.gids[0]` が `op.gids` が `undefined` のとき
  `TypeError: Cannot read properties of undefined (reading '0')` でクラッシュしていた。
  `Store._recordCommitted` で直接 `ungroup` op を記録する場合 (シグナリング/テスト等) や
  旧バージョンの op を受け取るケースで再現。
  修正: `op.gids?.[0]` (optional chaining) に変更。`op.before` ガードが先に使われるため
  通常フロー (`doUngroup` 経由) での変化はなし。
  **validator 強化**: `validRemotePayload('ungroup')` に
  `&&Array.isArray(op.gids)&&op.gids.every(g=>typeof g==='string')` を追加し、
  `gids` を必須フィールドとして強制。`_apply backward` の else 節が依存するフィールドを
  ゲートキープすることで、null guard と validator が対称関係を保つ。
  **非空虚テスト** (3 assert):
  - `op.gids` も `op.before` も undefined の ungroup op で `Store.undo()` がクラッシュ
    しないことを `assert.doesNotThrow` で確認 ✓
  - セットアップ: op が history stack に積まれる ✓
  - console.log で pass メッセージ出力 ✓

### Tests
- presence check: `validRemotePayload ungroup: requires gids array with string elements` (1)
- presence check: `_apply ungroup backward: op.gids?.[0] optional chaining null guard` (1)
- behavioral: `_apply ungroup backward null guard` クラッシュ防止テスト (3 assert)
- 合計 1255 pass, 0 fail

## [1.7.33] - 2026-06-30

### Fixed
- **`validRemotePayload` の `group` op が `op.before` を要求しない (セキュリティ/整合性)**:
  `doGroup` は常に `before=[{id,groupId},...]` を op に含めるが、`validRemotePayload` の
  `case 'group'` は `ids` と `gid` しか検証しなかった。悪意あるピアが `before` なしの
  `group` op を送ると検証を通過し、シェイプがグループ化されるものの Ctrl+Z が silent no-op
  になる (`_apply group backward` の `if(op.before)` ガードにより安全に無視されるが、
  undo が機能しない状態が残る)。
  修正: `validRemotePayload` の `case 'group'` に
  `&&Array.isArray(op.before)&&op.before.every(b=>b&&typeof b.id==='string')` を追加し、
  `before` を必須フィールドとして強制。既存テストの `applyRemote` 呼び出しも `before` を
  含むように更新 (正当な group op は常に `before` を持つ)。
  **非空虚テスト** (3 assert):
  - `before` なし group op が `validRemotePayload` で拒否される ✓
  - 正当な `before` を持つ group op が引き続き受け入れられる ✓
  - `before` エントリに非 string な id を持つ op が拒否される ✓

## [1.7.32] - 2026-06-30

### Fixed
- **`_apply('group', backward)` が `op.before` のない op で TypeError クラッシュ**:
  `Store.undo()` が `{op:'group'}` エントリを逆適用するとき、`op.before` が
  `undefined` の場合に `for(const b of op.before)` が `TypeError: op.before is not iterable`
  でクラッシュした。`_apply('ungroup', backward)` (line 1328) は既に
  `if(op.before){...}` ガードを持っていたが、`group` backward には同ガードが欠けていた。
  修正: `for` ループの前に `if(op.before)` ガードを追加し、`ungroup` と対称にした。
  `op.before` がない場合は backward は no-op として扱われる (グレースフルデグラデーション)。
  **非空虚テスト** (3 assert):
  - `op.before` なしの group op を history に積む ✓
  - `assert.doesNotThrow(()=>Store.undo())` — 修正前は `TypeError` で失敗 ✓
  - グラッシュなく完了する ✓

## [1.7.31] - 2026-06-30

### Fixed
- **ポインタ描画ツール (`endRectLike` / `endLineLike` / `beginText`) がアンドゥ後に
  描画前の選択状態を復元しない**:
  矩形・楕円・付箋・フレーム・直線・矢印・テキストをポインタで描いてアンドゥすると、
  シェイプは消えるが `state.selection` が空になり、描画開始前に選択していたシェイプが
  再選択されなかった。`createShapeKbd` (v1.7.30) / `doPaste` (v1.7.29) / `doClearAll`
  (v1.7.24a) / `importBoard` (v1.7.26) と同系列の `origSel` パターン欠落バグ。
  修正: `endRectLike` / `endLineLike` / `beginText` の各関数で `Store.commit({op:'add'})`
  呼び出し前に `origSel=[...state.selection]` をキャプチャし、コミット後に
  `state.history[state.histIdx].origSel=origSel` を設定。v1.7.30 で追加した
  `_apply('add', backward)` の origSel 復元ロジックがそのまま適用される。
  **非空虚テスト** (4 assert):
  - 2 シェイプ選択状態で矩形を `endRectLike` で描くと選択が新シェイプのみに変わる ✓
  - アンドゥで新シェイプが削除される ✓
  - アンドゥ後に元の 2 シェイプが再選択される ✓

## [1.7.30] - 2026-06-30

### Fixed
- **`createShapeKbd` がアンドゥ後に作成前の選択状態を復元しない**:
  キーボード (Enter キー) でシェイプを作成すると `Store.commit({op:'add',...})` を呼び出した後
  `state.selection` を新シェイプの id に切り替えるが、`origSel` パターンが欠けていたため
  Ctrl+Z すると選択が空になった。`doDuplicate` / `doPaste` / `doClearAll` / `importBoard` で
  使用している同パターン (`origSel=[...state.selection]` 前キャプチャ +
  `state.history[state.histIdx].origSel=origSel` 後アタッチ) を適用。
  さらに `_apply('add', backward)` に `if(op.origSel)state.selection=new Set(...)` を追加し、
  `addMany` backward と同等の origSel 復元ロジックを 'add' にも付与。
  **非空虚テスト** (4 assert):
  - 事前選択シェイプ A が存在する状態で `createShapeKbd` を呼ぶと新シェイプ B が選択される ✓
  - アンドゥで B が削除される ✓
  - アンドゥ後に A が再選択される ✓

## [1.7.29] - 2026-06-30

### Fixed
- **`doPaste` がアンドゥ後に貼付け前の選択状態を復元しない**:
  `doDuplicate` は `origSel` パターン (`state.history[state.histIdx].origSel=origSel`) で
  複製前の選択を履歴エントリに保持し、アンドゥで復元する。`doPaste` には同パターンが
  欠けていたため、Ctrl+V → Ctrl+Z すると選択が空になり、元のオブジェクト (コピー元) が
  再選択されなかった。修正: `_placeCopies` 呼び出し前に `origSel=[...state.selection]` を
  キャプチャし、呼び出し後に `state.history[state.histIdx].origSel=origSel` を適用。
  `doDuplicate` と完全に対称なパターン (v1.7.24a / v1.7.26 の `origSel` 系列の継続)。
  **非空虚テスト** (4 assert):
  - コピー後のペーストで 2 つの新シェイプが選択される ✓
  - 貼付け後の選択は元の id と異なる (新鮮な id) ✓
  - アンドゥ後に元の 2 シェイプ (コピー元) が再選択される ✓

## [1.7.28] - 2026-06-30

### Fixed
- **リモートピアが `upd` op で `locked` を設定できる (セキュリティ)**:
  `validRemotePayload` の `style` / `resize` / `align` は `!('locked' in p)` ガードで
  リモートからの `locked` 変更をブロックしているが、`upd` に同ガードがなかった。
  悪意のある peer が `{op:'upd', id:'X', after:{locked:true}, clock:{ts:999999}}` を
  送ると `validPatch` を通過し (`boolean` は `_cleanVal` で許可される)、ターゲット
  シェイプをリモートロックできた。逆に `{locked:false}` でロック解除も可能だった。
  修正: `case 'upd'` に `const noLock=p=>!('locked' in p)` ガードを追加し、
  `after` に `locked` キーを含む `upd` op を `validRemotePayload` の段階で拒否。
  `style` / `resize` / `align` と完全に対称なパターン (v1.7.23 / v1.7.24b の拡張)。
  **非空虚テスト** (4 assert):
  - `{locked:true}` のみの `upd` → 拒否 ✓
  - `{stroke, locked:true}` 混合 `upd` → op 全体を拒否 (部分適用なし) ✓
  - `locked` キーなしの正当な `upd` → 引き続き適用される ✓

## [1.7.27] - 2026-06-30

### Fixed
- **`_apply('upd', backward)` がリモートピアに上書きされたプロパティをアンドゥで巻き戻す**:
  ローカル `upd` をアンドゥすると `op.before` で `Object.assign` していたため、
  リモートピアが同じプロパティを (より新しいクロックで) 上書きしていても元の値に戻った。
  同期セッションで「ボブが stroke を青に変えた後、アリスが Ctrl+Z したら青が消えた」という
  分岐を引き起こす。
  修正: `_apply('upd', false)` で `op.before` の各キーを確認し、
  `state.wclock[id][key].peer !== state.peerId` (= リモートの書き込み) かつ
  `clockNewer(wclock[id][key], op.clock)` が真の場合はそのキーの復元をスキップ。
  ローカルのみの編集 (wclock エントリが自ピアのもの) は常に完全復元し、
  ランダムシード PBT (30シード) の undo-all 不変条件を維持。
  **非空虚テスト** (3 assert):
  `upd` → `applyRemote` (より新しい ts) → `undo` の順で、
  アンドゥ後もリモートの値が維持されることを確認。

## [1.7.26] - 2026-06-30

### Fixed
- **ボードインポートの Undo が選択状態を復元しない**:
  `importBoard` / `importFromHash` は `state.selection.clear()` を呼んだ後で
  `Store._recordCommitted({op:'replace',...})` を記録するが、`origSel` を op に含めていなかった。
  `_apply('replace', backward)` は選択をクリアするだけで復元しないため、ボードインポートを
  Ctrl+Z で取り消してもシェイプは戻るが選択は空のままになっていた。
  v1.7.24 の 'clear' 修正と完全に同じパターン。
  修正: `importBoard` / `importFromHash` でクリア前に `origSel=[...state.selection]` を捕捉して
  op に付与、`_apply('replace', backward)` に `if(!forward&&op.origSel)state.selection=...` を追加。
  **非空虚テスト** (3 assert): `_apply('replace', backward)` に origSel をセットした op で
  アンドゥ後に選択が復元されることを確認 (同家族の v1.7.24a テストと同一手法)。

## [1.7.25] - 2026-06-30

### Fixed
- **`doCopy` がフレームの子シェイプをクリップボードに含めない (データロスの危険)**:
  `doCopy` は `[...state.selection]` のみを反復しており `withFrameChildren` を呼ばなかった。
  フレームを選択して Ctrl+C すると、フレーム内に空間的に含まれる子シェイプがクリップボードに
  入らず、Ctrl+V でフレームのシェルだけが貼り付けられた。
  さらに Ctrl+X (カット = コピー+削除) では `doDelete` が `withFrameChildren` でフレーム子を
  展開して正しく削除するため、削除されるが貼り付けられない子シェイプが**永久に失われた**。
  修正: `doCopy` の `[...state.selection]` を `[...withFrameChildren(state.selection)]` に
  変更 (`doDuplicate` や `nudgeSelection` と完全なパリティ)。
  **非空虚テスト** (3 assert): フレームのみ選択状態で `doCopy()` 後にクリップボードが
  フレーム+子の 2 シェイプを含むこと、および切り取り+貼り付けで子が消えないことを確認。

## [1.7.24] - 2026-06-30

### Fixed
- **`undo` の Clear-All が選択状態を復元しない**:
  `doDelete` は `Store.commit` 後に `origSel` を履歴エントリに格納し、`_apply('del', backward)` が
  削除前の選択を復元する (`state.history[state.histIdx].origSel = origSel`)。
  `doClearAll` はこの格納を行っておらず、`_apply('clear', backward)` も `origSel` を読まなかった。
  結果: Clear-All の Undo でシェイプは戻るが選択は空のまま、直後の Ctrl+X が効かない。
  修正: `doClearAll` に `origSel` キャプチャ + 履歴パッチを追加、
  `_apply('clear', backward)` に `if(op.origSel)state.selection=...` 復元を追加
  (`doDelete` / `_apply('del', backward)` と完全なパリティ)。
  **非空虚テスト** (3 assert): 'clear' op に origSel をセットしてアンドゥ後に
  選択が復元されることを確認 (`_apply` 後方パスを直接テスト)。
- **リモートの `style`/`resize` op が `locked` キーでシェイプをロックできる**:
  v1.7.23 は `'align'` の `validRemotePayload` に `!('locked' in p)` ガードを追加したが、
  `'style'` と `'resize'` は同じ `patches()` ヘルパーを共有したまま残っていた。
  修正: `'style'` / `'resize'` ケースを同様に分割し、同じ `noLock` ガードを追加。
  **非空虚テスト** (3 assert): `{op:'style', after:[{id:X, locked:true}]}` および
  `{op:'resize', ...}` が拒否されること、有効な style op は通常どおり適用されることを確認。

## [1.7.23] - 2026-06-30

### Fixed
- **リモートピアが `align` op を悪用してシェイプをロックできる脆弱性**:
  `validRemotePayload` の `'align'` ケースは `patches()` ヘルパー (内部で `validPatch` / `_cleanVal`)
  を呼ぶが、`_cleanVal` はブール値をクリーンと判定するため `{id:X, locked:true}` を含む
  パッチが検証を通過してしまっていた。悪意あるピアが
  `{op:'align', after:[{id:X, locked:true}], clock:{...}}` を送ると Alice のボード上の
  シェイプが強制ロックされ、その後の `move` op が `if(forward&&sh.locked)continue` で
  サイレントに無視される状態になっていた。
  修正: `validRemotePayload` の `'align'` ケースを `'style'`/`'resize'` から分離し、
  各パッチに `'locked'` キーが含まれていないことを確認する `!('locked' in p)` チェックを追加。
  正常な整列 op (x/y 調整など) は従来どおり適用される。
  **非空虚テスト** (3 assert): リモート `align` op に `locked:true` を含めたとき
  シェイプがロックされないこと、および `locked` キーを含まない通常の `align` op が
  正しく適用されることを確認。

## [1.7.22] - 2026-06-30

### Fixed
- **`doAlign` がデジェネレートシェイプを含む選択でクラッシュする**:
  `doAlign` は各整列ユニットに対して `G.bboxAll(u.shapes)` を呼び出し (line 3308)、
  その結果を直後の `case 'left': ... u.b.x` 等で使用していた (line 3315–3329)。
  v1.7.19 以降、`bboxAll` はデジェネレートシェイプ (空 pts ペン) に対して null を返すため、
  そのユニットの `u.b.x` が `TypeError: null.x` でクラッシュしていた。
  修正: `units` 配列の生成時に `.filter(u=>u.b)` を追加し、null bbox のユニットを除外
  (有効シェイプ同士の整列は通常どおり続行)。
  **非空虚テスト** (3 assert): デジェネレートペンを含む 3 シェイプ選択で `doAlign('left')` が
  クラッシュしないこと、および有効な 2 矩形が正しく左揃えされることを確認。

## [1.7.21] - 2026-06-30

### Fixed
- **`drawSelection` / `doFlip` が `G.bboxAll` の null に対してクラッシュする**:
  v1.7.19 で `bboxAll` がデジェネレートシェイプに対して `null` を返すようになったが、
  `drawSelection()` (line ~1965) と `doFlip()` (line ~3353) の両方が `bboxAll` の戻り値に
  対して即座に `.x`/`.y`/`.w` にアクセスしており null チェックがなかった。
  `drawSelection` は毎フレーム呼ばれるためデジェネレートシェイプが選択状態だとレンダリングループが
  クラッシュし、`doFlip` は Shift+H/V で同様にクラッシュしていた。
  修正: 両関数の `bboxAll` 呼び出し直後に `if(!b)return;` / `if(!bb)return;` を追加。
  **非空虚テスト** (3 assert): デジェネレートペンを選択して `doFlip('h')` を呼び出した際に
  例外が発生しないこと、および履歴エントリが追加されないこと (早期リターン) を確認。

## [1.7.20] - 2026-06-30

### Fixed
- **`doUngroup` が選択に含まれないグループ外シェイプを消失させる**:
  `doUngroup` の line 3275 が `state.selection` をグループ解除されたシェイプのみで上書きしていた。
  例: シェイプ A (グループ `gid` 内) と B (グループなし) を選択してグループ解除すると、
  選択が `{A, C}` (`gid` の全メンバー) に置き換えられ、B が失われていた。
  修正: `state.selection=new Set([...ids.filter(id=>byId(id)),...ungrouped])` — 元の選択を保持
  (まだ存在するシェイプのみ) し、グループ解除されたメンバーを追加する。
  **非空虚テスト** (3 assert): グループ済み A と非グループ B を選択してグループ解除した後、
  A・B・C (A のグループ仲間) のすべてが選択に含まれることを検証。

## [1.7.19] - 2026-06-30

### Fixed
- **`G.bboxAll` がデジェネレートなペンシェイプ (空の `pts`) で `Infinity`/`NaN` を返す**:
  `pts` が空の `pen` シェイプに対して `G.bbox` を呼ぶと、内部ループが実行されず
  `{x:Infinity, y:Infinity, w:-Infinity, h:-Infinity}` を返す。
  `bboxAll` はその値を受け取っても `mnx`/`mxx` の初期値を更新できず、
  最終的に `{x:Infinity, y:Infinity, w:NaN, h:NaN}` を返していた。
  これはデジェネレートシェイプのみのボードで PNG/SVG エクスポート時に空白出力を招く原因となっていた。
  修正: `bboxAll` の `return` 直前に `if(mxx===-Infinity)return null;` を追加
  (`mxx` が初期値 `-Infinity` のまま = 全入力シェイプが有効な右端を提供しなかった = 全デジェネレート)。
  **非空虚テスト** (3 assert): 単一デジェネレートペン → `null`、全デジェネレート配列 → `null`、
  有効 rect + デジェネレートペンの混在 → 有限な有効 bbox (回帰ガード)。

## [1.7.18] - 2026-06-30

### Fixed
- **`doBringFront`/`doSendBack`/`doBringForward`/`doSendBackward` がロックシェイプをスキップしない**:
  4 つの z 順序関数がすべて `const ids=[...state.selection]` とロックフィルタなしで開始していた。
  ロックされたシェイプを選択して `]`/`[` を押すか前面/背面コンテキストメニューを使うと、
  ロック済みシェイプの `frac` (z-index) が変更され、`zorder` op として undo 履歴に記録されていた
  (ロック不変条件の侵害; `doAlign`/`doDelete`/`doMove` が既に持つ `!s.locked` フィルタのパリティ)。
  修正: 4 関数それぞれの `ids` 初期化を
  `[...state.selection].filter(id=>!byId(id)?.locked)` に変更。
  **非空虚テスト** (6 assert): ロック済みシェイプの `frac` が前面/背面操作後も不変であり、
  履歴エントリが追加されないことを確認 (前面+1ステップ、前面フル、後面+1ステップ、後面フル 各ペア)。

## [1.7.17] - 2026-06-30

### Fixed
- **`_apply` が `op.before==null` で undo クラッシュする**:
  `case 'style'/'resize'/'align'` の `const patches=forward?op.after:op.before` に
  null ガードがなかった。`validRemotePayload` は `op.before==null` を許容するため、
  将来のインポートパスでこの状態が local history に入ると `for(const p of null)` が
  `TypeError` をスローし undo スタックが永続的に詰まる。
  修正: `if(!Array.isArray(patches))break;` を追加。
  **非空虚テスト** (3 assert): `op.before=null` の style op を history に注入して `Store.undo()` が throw しないことを確認。
- **`validPatch` が数値ジオメトリフィールドの文字列値を受け入れる**:
  `_cleanVal` は文字列値に対して `true` を返す。敵対的ピアが
  `{op:'resize',after:[{id:'x',x:'NaN'}]}` を送ると `validRemotePayload` を通過し、
  `Object.assign` で `sh.x='NaN'` (文字列) が設定される。
  `sh.x + sh.w/2` が文字列結合になり座標系が完全に壊れる。
  修正: `validPatch` に既知の数値フィールドの型チェックを追加。
  **非空虚テスト** (3 assert): 文字列 x/y を含む resize op が rejected、正当な数値は accepted。

## [1.7.16] - 2026-06-30

### Fixed
- **`flushErase` がロックされたコネクタのバインディングを消去する**:
  `flushErase` の connClears ループに `sh.locked` チェックがなかった (`doDelete` v1.7.15 修正の対称パス)。
  消しゴムで束縛元シェイプを消去するとロック済みコネクタの `a`/`b` バインディングも消去され、
  ロックの意図が無効化されていた。修正: `if(sh.locked)continue` を追加。
  **非空虚テスト** (3 assert): ロック済みコネクタの `.a` が eraseAt 後も保持されることを確認。
- **`_remoteDelConnFix` がロックされたコネクタを変更する**:
  リモートピアがバインド元シェイプを削除した際、受信側のローカルコネクタ修正処理
  (`_remoteDelConnFix`) に `sh.locked` チェックがなかった。
  ロック済みのローカルコネクタが、リモート del を受信した際に無断で unbind されていた。
  修正: `if(sh.locked)continue` を追加。
  **非空虚テスト** (3 assert): リモート del 受信後もロック済みコネクタの `.a` が保持されることを確認。

## [1.7.15] - 2026-06-30

### Fixed
- **`_apply move` undo方向がロックシェイプをスキップする (undo整合性)**:
  `case 'move'` の `if(!sh||sh.locked)continue` が forward/backward 両方向に適用されていた。
  シェイプを移動後にロックし Ctrl+Z すると、undo方向もロックチェックでスキップされ位置が復元されなかった。
  修正: `if(!sh)continue; if(forward&&sh.locked)continue;` — undo方向はロックを無視して常に復元。
  **非空虚テスト** (3 assert): 移動→ロック→undo で x が 0 に戻ることを確認。
- **`doDelete` がロックされたコネクタのバインディングを消去する**:
  `doDelete` の connClears ループに `sh.locked` チェックがなかった。バインド先シェイプを
  削除するとロック済みコネクタの `a`/`b` バインディングも消去され、ロックの意図が無効化されていた。
  修正: `if(sh.locked)continue` を追加。`connEnds()` は既に byId が null を返した場合に
  フォールバック座標を使うため、dangling binding のまま安全に描画可能。
  **非空虚テスト** (3 assert): ロック済みコネクタの `.a` がバインド先削除後も保持されることを確認。
- **`_sfbFlush` がキャプチャ後にロックされたシェイプへスタイルをコミットする**:
  スライダーキャプチャ後にシェイプをロックしてスライダーを離すと、`_sfbFlush` が
  ロック済みシェイプを含む `style` op をコミットしていた。
  修正: `const s=byId(id); if(s&&!s.locked){...push b/a...}` でロックシェイプを除外。
  `delete _sbf[k]` は常に実行して古いキャプチャが残留しないようにする。
  **非空虚テスト** (3 assert): キャプチャ→ロック→フラッシュで履歴が増えないこと + size が 2 のままであることを確認。

## [1.7.14] - 2026-06-30

### Fixed
- **ダブルクリックでロックシェイプのエディタが開く**:
  `dblclick` ハンドラが `hit.type` でディスパッチする際に `!hit.locked` ガードがなかった。
  ロックされた `text`/`sticky`/`rect`/`ellipse`/`frame`/`line`/`arrow` をダブルクリックすると
  テキスト or ラベルエディタが開き、`upd` op がコミットされてロックの意図が無効化されていた。
  修正: 3 つの `if/else if` 条件すべてに `!hit.locked&&` を前置。
  **非空虚テスト** (3 presence checks): 修正前はガード文字列が存在せずテスト失敗、修正後は通過。

## [1.7.13] - 2026-06-30

### Fixed
- **`doUngroup` がロックシェイプをスキップしない**:
  `doUngroup` は `state.shapes` 全体を走査して選択グループに属するシェイプの `groupId` を削除する。
  ロックチェックがないため、ロックされたシェイプの `groupId` もロックの意図に反して消去されていた。
  修正: for-loop の条件を `if(gids.has(s.groupId))` → `if(gids.has(s.groupId)&&!s.locked)` に変更。
  **非空虚テスト** (4 assert): 3 シェイプをグループ化後に 1 つをロック → doUngroup で
  修正前はロックシェイプの groupId も消える (テスト失敗)、修正後は保持される。
- **`doDuplicate` がロックフレーム子シェイプを除外しない**:
  `withFrameChildren` でフレーム選択が子シェイプ (ロック済み含む) に展開されるが、
  `doDuplicate` の `.filter(Boolean)` がロックシェイプをフィルタしていなかった。
  フレームを複製するとロックされた子シェイプも複製され、ロックの目的が無効化されていた。
  修正: `.filter(Boolean)` → `.filter(s=>s&&!s.locked)` に変更 (`nudgeSelection` と同じパターン)。
  **非空虚テスト** (3 assert): フレーム + 通常子 + ロック子 → フレーム複製後に
  修正前はロック子まで複製 (addedCount===3, テスト失敗)、修正後は 2 のみ複製。

## [1.7.12] - 2026-06-30

### Fixed
- **`move` op が `_apply` でロックシェイプをスキップしない (リモート移動がロックを無視)**:
  ローカルの `doMove` はロックシェイプをフィルタしてから op の `ids` を構築するため、
  ローカル op には locked な id が含まれない。しかしリモート peer の op (applyRemote) は
  peer 側でロックされていなかったシェイプを ids に含めて送信してくる。
  `_apply move` に `||sh.locked` チェックがなかったため、ローカルでロックしたシェイプが
  リモート move op で移動されてしまっていた。
  修正: `if(!sh)continue;` → `if(!sh||sh.locked)continue;` に変更。
  **非空虚テスト** (2 assert): locked L + unlocked U を含む move op を直接コミット →
  修正前は L が移動 (テスト失敗)、修正後は L が保護される。
- **`doGroup` がロックシェイプを除外しない**:
  doAlign / doDelete / nudgeSelection / doCopy など全ての書き込み操作がロックシェイプを
  スキップしているのに `doGroup` だけ `state.selection` をそのまま使っていた。
  ロックシェイプの `groupId` が doGroup で変更され、doUngroup でも変更される (不整合)。
  修正: ids 構築に `.filter(id=>{const s=byId(id);return s&&!s.locked;})` を追加。
  **非空虚テスト** (3 assert): A + B (ロック) + C を選択して doGroup →
  修正前は B に groupId が設定される (テスト失敗)、修正後は B の groupId が不変。

## [1.7.11] - 2026-06-30

### Fixed
- **`del` op undo が `state.wclock` を復元しない (add undo と対称)**:
  `_apply(del, forward)` は `delete state.wclock[sh.id]` で wclock を消去するが、
  reverse (undo) は消去前の wclock を復元しなかった。
  `add` undo (v1.7.10) や `addMany` undo (v1.7.09) と同じカテゴリの不整合。
  修正: `_apply del forward` の先頭で `if(!op.wc)` ガード付きで wclock をスナップショット
  (op.wc に保持、redo 時の二重スナップショット防止)。
  reverse で `if(op.wc)for(const [id,w] of Object.entries(op.wc))state.wclock[id]=clone(w)` を実行。
  **非空虚テスト** (3 assert): add → wclock 手動設定 → del → undo →
  修正前は wclock 空のまま (テスト失敗)、修正後は復元される。
- **スライダー / カラーピッカーの oninput がロックシェイプを直接変更する**:
  size スライダー、opacity スライダー、カラーピッカーの input イベントハンドラが
  `s[prop]=value` を直接ミューテートする際に `s.locked` チェックが欠けており、
  ドラッグ中にロックシェイプのプロパティが永続的に変更されていた。
  また `_sfbCapture` も locked チェックを欠いていたため、`_sfbFlush` がロックシェイプ向けの
  `style` op を history に積んでしまっていた。
  修正: 3 つの oninput ループに `&&!s.locked` を追加。
  `_sfbCapture` に `&&!s.locked` を追加 (キャプチャ時点でロックシェイプをスキップ)。
  **非空虚テスト** (3 assert): _sfbCapture でロックシェイプが _sbf に入らないことを確認、
  _sfbFlush の style op にロックシェイプが含まれないことを確認。

## [1.7.10] - 2026-06-30

### Fixed
- **`applyStyleToSelection` がロックシェイプのスタイルを変更してしまう**:
  カラースウォッチ / ダッシュピッカー / フォーマットペインター (Alt+V) が、
  ロックされたシェイプを選択中のまま適用すると、ロックを無視してスタイルを変更していた。
  doDelete / doMove / doRotate / doFlip / doAlign / doCopy / cycleSel など全ての書き込み操作が
  ロックシェイプをスキップしているのに、`applyStyleToSelection` だけが欠けていた。
  修正: `for` ループに `if(!sh||sh.locked)continue;` を追加。
  **非空虚テスト** (2 assert): A (ロック) + B (解除) を選択して `applyStyleToSelection({stroke:'#FF0000'})` →
  修正前は A.stroke が変更される (テスト失敗)、修正後は A.stroke 維持・B.stroke のみ変更。
- **`add` op undo が `state.wclock` エントリをリークする**:
  `_apply(add, false)` はシェイプを state.shapes から削除するが、
  `state.wclock[op.shape.id]` を削除しない (`addMany` undo と同じカテゴリの不整合。v1.7.09 で addMany は修正済み)。
  `del` forward が `delete state.wclock[sh.id]` を実行するのと対称になるよう修正。
  修正: add else ブランチに `delete state.wclock[op.shape.id]` を追加。
  **非空虚テスト** (2 assert): add → wclock 手動設定 → undo →
  修正前はエントリが残る (テスト失敗)、修正後は削除される。

## [1.7.09] - 2026-06-30

### Fixed
- **`addMany` undo が `state.wclock` エントリをリークする**:
  ペースト/複製 (addMany op) を undo すると、シェイプは state.shapes から削除されるが、
  それらのシェイプに対して applyRemote が設定した wclock エントリが state.wclock に残り続ける。
  残留エントリはゴースト・クロックとなり、以降の同一 ID 向けリモート op が LWW 比較できなくなる。
  修正: `_apply` addMany else ブランチに `delete state.wclock[sh.id]` を追加
  (del 操作の forward ブランチと対称)。
  **非空虚テスト** (4 assert): addMany → wclock 手動設定 → undo →
  修正前はエントリが残る (テスト失敗)、修正後はエントリが削除される。
- **`replace` op undo が `state.wclock` を復元しない**:
  ファイルインポート / 共有リンクインポート (replace op) を undo すると、
  インポート前のシェイプは戻るが state.wclock は空 `{}` のままになるバグ。
  修正: `importBoard` と `importFromHash` でインポート前に `const beforeWc=clone(state.wclock)` を
  スナップショット、`Store._recordCommitted` に `wc:beforeWc` を追加。
  `_apply` replace reverse で `if(!forward&&op.wc)state.wclock=clone(op.wc)` を実行。
  **非空虚テスト** (3 assert): replace → undo →
  修正前は wclock 空のまま (テスト失敗)、修正後は元の wclock が復元される。

## [1.7.08] - 2026-06-30

### Fixed
- **`doClearAll` undo が `state.wclock` を復元しない (LWW 競合解決の破損)**:
  「全消去」後に Ctrl+Z でシェイプは戻るが `state.wclock` が空 `{}` のままになるバグ。
  undo 後に同一シェイプへの remote op が届くと clock 比較ができず無条件に適用されてしまい、
  LWW (Last-Write-Wins) による競合解決が機能しなくなっていた。
  修正: `doClearAll` が `Store.commit({op:'clear', ..., wc:clone(state.wclock)})` で
  wclock スナップショットを op に保持。`_apply` clear reverse で `op.wc` があれば
  `state.wclock=clone(op.wc)` で復元。
  **非空虚テスト** (3 assert): シェイプ追加 → wclock に id あり → clear →
  wclock 空 → undo → 修正前は wclock 空のまま (テスト失敗)、修正後は id が復元される。

## [1.7.07] - 2026-06-30

### Fixed
- **`doDelete` undo で元の選択を復元 (doDuplicate との整合 / Figma・Excalidraw 同等動作)**:
  Del/Backspace で削除後に Ctrl+Z を実行すると、シェイプは復元されるが選択状態が失われるバグ。
  `_apply(del, false)` はシェイプをキャンバスに戻すが、selection を復元しなかった。
  修正: `doDelete` が `Store.commit` 呼び出し後に `state.history[state.histIdx].origSel`
  へ元の選択をスナップショット。`_apply` del reverse で `op.origSel` があれば
  `state.selection` を復元 (byId でキャンバス上に存在するシェイプのみ)。
  v1.7.04 の doDuplicate undo origSel と同じパターン。
  **非空虚テスト** (5 assert): A + B を選択して削除 → undo →
  修正前は selection が空 (テスト失敗)、修正後は {A.id, B.id} が復元される。

## [1.7.06] - 2026-06-30

### Fixed
- **`doCopy` がロックシェイプをクリップボードから除外 (doDelete/doMove との整合)**:
  Ctrl+C / Ctrl+X でロックされたシェイプが含まれている場合、クリップボードにコピーされていた。
  Ctrl+X (cut) では doDelete がロックシェイプをスキップして削除しないため、クリップボードには
  ロックシェイプが残るが board には存在し続けるという不一致が発生。Ctrl+V 後は
  ロックシェイプが二重になっていた。
  修正: `doCopy` の filter を `.filter(Boolean)` から `.filter(s=>s&&!s.locked)` へ変更。
  他の選択ベース操作 (doDelete/doMove/doRotate/doFlip/doAlign) と完全に整合。
  **非空虚テスト** (2 assert): A (解除) + B (ロック) を選択して doCopy →
  修正前は `clipboard.shapes.length === 2` (テスト失敗)、修正後は 1 (B 除外)。

## [1.7.05] - 2026-06-30

### Fixed
- **Tab キー巡回がロックされたシェイプを除外 (doMove/doDelete/doRotate/doFlip との整合)**:
  Tab/Shift+Tab でシェイプを巡回する際、ロックされたシェイプが選択候補に含まれていた。
  ロックシェイプは移動・リサイズ・削除が不可なため、Tab で選択できても操作できない。
  修正: Tab ハンドラの `ids` 構築を `state.shapes.map(s=>s.id)` から
  `state.shapes.filter(s=>!s.locked).map(s=>s.id)` へ変更。
  ロックシェイプが 0 の場合も含め既存の `cycleSel` ロジック全体が正常に動作する。
  **非空虚テスト** (4 assert): A (解除) + B (ロック) + C (解除) で A から Tab →
  修正前は `cycleSel(allIds, A, +1) === B` (ロックに着地)、
  修正後は `cycleSel(filteredIds, A, +1) === C` (B をスキップして C へ)。

## [1.7.04] - 2026-06-30

### Fixed
- **`doDuplicate` undo で元の選択を復元 (Figma/Excalidraw 同等動作)**:
  Ctrl+D で複製後に Ctrl+Z を実行すると、コピーが削除されるが元のシェイプの選択状態が
  失われるバグ。`_apply(addMany, false)` はコピーの ID を selection から削除するだけで、
  元の selection を復元しなかった。修正: `doDuplicate` が `_placeCopies` 呼び出し前に
  `origSel=[...state.selection]` をスナップショットし、commitした `addMany` op に
  `op.origSel` として付加。`_apply` addMany reverse で `op.origSel` があれば
  `state.selection` を復元 (byId でキャンバス上に存在するシェイプのみ)。
  **非空虚テスト** (5 assert): A + B を選択して duplicate → undo →
  修正前は selection が空 (テスト失敗)、修正後は {A.id, B.id} が復元される。

## [1.7.03] - 2026-06-30

### Fixed
- **`_sfbCapture` 冪等性バグ修正 — スライダー undo の before-state が上書きされる問題**:
  `_sfbCapture(p)` は `pointerdown`/`focus` でシェイプの元の値を `_sbf` に記録し、
  `_sfbFlush(p,v)` が差分を `style` op として push する設計。しかし再呼び出し時に
  既存エントリを無条件で上書きするため、変異後に再度 `_sfbCapture` が呼ばれると
  before-state が現在値 (= after値) に上書きされ `before===after` となり op が記録されない。
  修正: `!(id+p in _sbf)` ガードを追加し冪等にした (削除後の再キャプチャは従来通り動作)。
  **非空虚テスト** (2 assert): A.opacity=0.5 でキャプチャ → 0.3 に変異 →
  再度キャプチャ → flush(0.3) → 修正前は op なし (テスト失敗)、修正後は op 記録。
  undo で 0.5 に戻ることも確認。

## [1.7.02] - 2026-06-30

### Fixed
- **`doDelete` がフレームの子シェイプも一緒に削除 (doDuplicate との整合)**:
  フレームを選択して削除 (Del/Backspace) すると、フレーム内のシェイプが
  キャンバス上に孤立して残るバグ。`doDuplicate` は `withFrameChildren` で子を展開するが、
  `doDelete` に同等の処理がなかった。修正: doAlign/doFlip/doRotate と同じ `frameOf`
  拡張ロジックを `doDelete` に追加。`delIds` セットも拡張後の `sel` から再構築するため、
  コネクタ結合解除ロジックもフレーム子シェイプを自動的にカバーする。
  `op.shapes` に子シェイプが含まれるため undo で子シェイプも正しく復元される。
  **非空虚テスト** (4 assert): フレーム + 内部子シェイプ + 外部シェイプを作成し、
  フレームのみ選択して削除 → 修正前は子シェイプが残存 (テスト失敗)、修正後は削除される。
  undo で両方が復元されることも確認。

## [1.7.01] - 2026-06-30

### Fixed
- **`doFlip` / `doRotate` がフレームの子シェイプも一緒に変換 (doAlign との整合)**:
  フレームを選択して左右/上下反転 (`doFlip`) または回転 (`doRotate`) を実行すると、
  フレーム自体は変換されるが内部のシェイプが取り残されるバグ。v1.7.00 で `doAlign` に
  適用したフレーム子シェイプ拡張ロジックを `doFlip`・`doRotate` にも適用。`doRotate` は
  ボックス型シェイプ (w!=null) の子のみを対象 (pen/line/arrow は点座標のため除外、既存の
  `s.w!=null` フィルタと整合)。before/after スナップショットが子シェイプを含むため
  undo/redo も正しく動作。
  **非空虚テスト** (5 assert):
  - `doFlip('h')`: フレーム+参照シェイプ選択、反転後に子シェイプが期待座標に移動すること確認
    (修正前: 子 x=50 のまま、修正後: x=250 = 2×170−90)
  - `doRotate(90)`: フレーム+参照シェイプ選択、回転後に子シェイプの rotate が 90 になること確認
    (修正前: rotate=undefined/0 のまま)

## [1.7.00] - 2026-06-30

### Fixed
- **`doAlign` がフレームの子シェイプも一緒に整列移動 (ドラッグ/ナッジとの挙動統一)**:
  フレームと別シェイプを選択して整列 (左揃え等) を実行すると、フレーム自体は移動するが、
  フレーム内に含まれる子シェイプが置き去りになるバグ。`doMove`・`nudgeSelection` では
  `withFrameChildren` が自動的に子を追従させるが、`doAlign` にはその処理がなかった。
  修正: `doAlign` 内で `frameOf` マップを構築し、選択フレームの bbox に完全に含まれる
  シェイプを同一ユニットとして `unitMap` にまとめる。これにより、フレームと子シェイプが
  同じ平行移動量で移動し、undo/redo も子シェイプの位置を正しく復元する。
  **非空虚テスト** (4 assert): フレーム (x=100) + 子シェイプ (x=120) + 参照シェイプ (x=0) で
  左揃え → フレームが x=0 へ移動し子シェイプも x=20 へ追従。修正前は子シェイプが x=120 のまま
  (追従せず、テストが失敗) であることを確認。undo で両方が元位置に復元されることも検証。

## [1.6.99] - 2026-06-30

### Fixed
- **`doAlign` がグループ単位で整列 (内部スペーシングを維持)**:
  グループ化された複数シェイプを選択して整列 (左揃え等) を実行すると、グループ内の各シェイプが
  個別に整列軸へスナップされ、グループ内の相対スペーシングが 0 に潰れるバグ。修正: `doAlign`
  内で `unitMap` を構築し、同じ `groupId` を持つシェイプを 1 ユニットとして扱う。各ユニットの
  combined bbox (`G.bboxAll`) を基準に平行移動量を決定し、ユニット内全シェイプを同量移動。
  `hspace` / `vspace` の均等配置も同様にユニット単位で計算。
  **非空虚テスト** (6 assert): 2 グループ (各 2 シェイプ、グループ内 50px 間隔) を左揃え →
  各グループ内スペーシングが維持されること、undo で元位置に戻ることを確認。

## [1.6.98] - 2026-06-30

### Fixed
- **`Presentation.leave()` がフォーカスを元の要素に戻す (WCAG SC 2.4.3)**:
  Shift+P または「プレゼン」ボタンでプレゼンテーションモードに入ると、オーバーレイが表示され
  フォーカスが失われる。Esc / ボタンで退出しても `document.activeElement` が復元されなかった
  (WCAG SC 2.4.3「Focus Order」違反)。修正: `enter()` で `_focusTrigger=document.activeElement`
  を保存し、`leave()` で `_focusTrigger?.focus()` を呼び出して復元。
  `_setTestState(active,trigger)` をテスト用フックとして export。
  **非空虚テスト** (3 assert): `_setTestState(true, mockTrigger)` → `leave()` →
  `mockTrigger.focus()` が呼ばれることを確認。非アクティブ時 (`_active=false`) は早期リターンで
  `focus()` が呼ばれないことも確認。

## [1.6.97] - 2026-06-30

### Fixed
- **`doPaste` がビューポート中央に貼り付け (遠くにスクロール後も見える)**:
  コピー元から遠くにパンした後 Ctrl+V すると、貼り付けたシェイプがオリジン付近 (元座標 +20px)
  に現れ、画面外に不可視になるバグ。Figma / Excalidraw に倣い、貼り付け位置をビューポート中央に
  変更。連続貼り付け (Ctrl+V × N) はカスケードカウンタ `_pasteCount` で中央から 20px ずつ
  ずらす。以前はクリップボード内シェイプを 20px 移動する副作用でカスケードしていたため、これを
  削除して `_pasteCount/_lastClipboard` に置き換え。`doDuplicate` は引き続き
  `_placeCopies(sel)` を「オフセットなし引数」で呼び出すため影響なし。
  **非空虚テスト** (4 assert): ビューポート x=5000,y=5000 でペースト → 貼り付けシェイプ中心が
  ビューポート中心に近い確認 + `_pasteCount` インクリメント確認。

- **`wrapText` が `\\r\\n` / `\\r` 改行を正規化 (Windows クリップボード互換)**:
  Windows のクリップボード等から貼り付けたテキストが `\\r\\n` 改行を含む場合、`split('\\n')` で
  各行末に `\\r` が残り `measureText` が誤った幅を返し、意図より早く折り返されるバグ。
  修正: `wrapText` 内で `.replace(/\\r\\n/g,'\\n').replace(/\\r/g,'\\n')` を前処理として追加。
  **非空虚テスト** (2 assert): `"line1\\r\\nline2"` → `['line1','line2']`、
  `"a\\rb\\r\\nc"` → `['a','b','c']` を各々修正前失敗・修正後成功で確認。

## [1.6.96] - 2026-06-30

### Fixed
- **Tab キーでコンテキストメニューを閉じる (ARIA APG Tab 動作)**:
  ARIA APG「Menu Button」パターン: "Tab: closes the menu and moves focus to the next
  element in the tab sequence." `_ctxMenuKeyNav` は Escape / ArrowDown 等を処理していたが
  Tab を無視していたため、メニュー項目にフォーカスがある状態で Tab を押すとメニューが開いたまま
  フォーカスが DOM 内の次要素に抜けていた。
  修正: `e.key==='Escape'||e.key==='Tab'` で閉じる。Shift+Tab も同じ `e.key==='Tab'` で
  捕捉されるため同時に修正される。
  **非空虚テスト** (2 assert): Tab → closeCtxMenu 呼び出し確認、Shift+Tab → 同上。

- **テキストシェイプのリサイズハンドルを非表示 (コンテンツ駆動サイズとの競合解消)**:
  `getHandles` は `text` 型に 8 つのリサイズハンドルを返していたが、`resizeAfterTextEdit` が
  編集後にテキスト量に基づいて `w` と `h` を上書きするため、手動リサイズが次の編集で失われる
  バグがあった (中程度の深刻度: 編集しなければリサイズは残るが、したら消える)。
  `text` シェイプは内容でサイズが決まるため、リサイズハンドルに UX 価値がない。
  修正: `getHandles` 内に `if(s.type==='text')return []` を追加。
  回転ノブ (`getRotHandle`) は別関数のため影響なし — テキストの回転は引き続き動作する。
  **非空虚テスト** (2 assert): text shape → `[]`、rect shape → 8 handles を確認。

## [1.6.95] - 2026-06-30

### Fixed
- **Context menu arrow-key navigation (ARIA APG menu pattern) — WCAG キーボードアクセシビリティ**:
  w3.org/WAI/ARIA/apg/patterns/menu-button/「Menu Button」パターン。
  `#ctx` は `role="menu"` + 各項目 `role="menuitem"` を持ち、開時に最初の項目へフォーカスするが、
  ArrowDown / ArrowUp / Home / End キーによるナビゲーションがなかった。ARIA APG は
  `role="menu"` にこれらを必須としており、スクリーンリーダーユーザーがメニュー内を移動できない
  WCAG 2.1 SC 4.1.2 違反だった。
  修正: `_ctxMenuKeyNav(m, e)` を名前付き関数として切り出し `wire()` 内で `#ctx` の `keydown`
  に接続。ArrowDown: 次の項目へ(最後→最初にラップ)、ArrowUp: 前の項目へ(最初→最後にラップ)、
  Home: 最初へ、End: 最後へ、Escape: メニューを閉じる。
  `_ctxMenuKeyNav` をテストハーネスにエクスポートし `fakeDoc.activeElement` を使って純粋関数
  として検証。**非空虚テスト** (7 assert): ArrowDown × 3 (前進 × 2 + ラップ)、
  ArrowUp × 2 (前退 + ラップ)、Home × 1、End × 1。修正前失敗、修正後全通過。

## [1.6.94] - 2026-06-30

### Fixed
- **IME composition guard in text editor — CJK 入力中のサイズちらつき修正**:
  Zenn「入力中の文字が確定されるまでリサイズしない」パターン。
  `openTextEditor` の `auto()` (textarea 自動リサイズ) が IME の変換中 (`compositionstart`〜
  `compositionend` 区間) にも毎回 `input` イベントで発火し、日本語・中国語・韓国語の入力中に
  textarea のサイズが激しくちらついていた。
  修正: `_textComposing` フラグで compositionstart/end を追跡し、確定前は `auto()` を抑制。
  `compositionend` 発火時に一度 `auto()` を呼んで最終サイズに確定させる。
  docName エディタ (v1.6.22, `imeShouldCommit()` パターン) と同じ設計に揃えた。

### Security
- **`_esc()` にシングルクォートエスケープを追加 (SVG 属性の多重デリミタ防御)**:
  `_esc` は `& < > "` をエスケープしていたが `'` (シングルクォート) を変換しなかった。
  現在 Board の SVG 出力は全属性をダブルクォートで囲むため実害はないが、将来のコード変更や
  コピーミスで属性区切りが `'` になった場合に `stroke="' onmouseover='xss()"` 等の
  ブレイクアウトが成立する。Defense-in-depth として `'` → `&#39;` の変換を追加。
  **非空虚テスト** (2 assert): `buildSVG` にシングルクォート入りの `stroke` を渡し、
  出力に `' onmouseover=` が現れないこと、`&#39;` が含まれることを修正前失敗/修正後成功で確認。

## [1.6.93] - 2026-06-30

### Added
- **Service Worker 更新通知 (controllerchange) — SW ライフサイクルのフィードバック**:
  web.dev「Service Worker のライフサイクル」/ Zenn「SW 更新時にリロードを促す」パターン。
  Board の SW は `skipWaiting()` + `clients.claim()` で即時活性化するが、ページには何の
  フィードバックもなかった。修正: `navigator.serviceWorker` に `controllerchange` リスナーを
  登録し、新 SW が引き継いだ瞬間に「アプリが更新されました — 再読み込みで最新版に」トーストを
  表示。ユーザーはトーストを見て任意のタイミングでリロードできる。
  実装は `_onSwUpdate()` 名前付き関数として切り出しテストハーネスからエクスポート。
  **非空虚テスト** (3 assert): リスナー登録確認、`_onSwUpdate` エクスポート確認、
  呼び出し時の `ok` トースト確認を失敗→成功で検証。

## [1.6.92] - 2026-06-30

### Added
- **PWA install button (beforeinstallprompt) — ユーザー起動のインストール UI**:
  Zenn/Qiita「beforeinstallprompt を使って PWA のインストールボタンを実装する」パターン。
  Board は PWA マニフェスト + Service Worker を備えているが、ブラウザが表示する ambient
  mini-infobar に頼るだけで、ユーザーが意図的にインストールできる UI がなかった。
  修正: `beforeinstallprompt` イベントを `e.preventDefault()` で横取りし `_installPrompt`
  に保存。トップバーに install ボタン(`btnInstall`)を追加しデフォルト `hidden`。ブラウザが
  インストール可能と判断したときのみボタンが現れ、クリックすると `prompt()` + `userChoice`
  で完全ユーザー起動のインストールフローを起動。`appinstalled` で自動非表示。
  `navigator.wakeLock` と同じく **プログレッシブエンハンスメント**: Safari / Firefox など
  `beforeinstallprompt` 非対応ブラウザではボタンが出ないだけ (エラーなし)。
  **非空虚テスト** (5 assert): null スタート、イベント保存、`prompt()` 呼び出し、
  userChoice 後クリア、null 時 no-op を各々失敗→成功で確認。

## [Unreleased]

### Security
- **リモート `del` op の `connClears` を検証(upd/style とのセキュリティパリティ)**:
  ソクラテス式問答「そのクリーンアップはネットワーク境界を越えても安全か?」で発見。
  v1.6.78 で追加した `connClears`(バインドクリーンアップ差分)は `_apply case 'del'` 内で
  `Object.assign(sh, p.after)` により生きたコネクタに適用される。しかし `validRemotePayload`
  の `del` ケースは `op.shapes` のみを検証し `connClears` を素通ししていた。悪意ある peer は
  `del` op に `connClears:[{id, after:{x1:NaN, __proto__:…}}]` を載せ、他の全リモート write を
  守る `validPatch` ゲートを迂回してコネクタに NaN 座標(図形消失)・プロトタイプ汚染・
  関数を注入できた。修正: `del` バリデータは各 `connClears` の before/after を `validPatch`
  (NaN/Infinity/関数/`__proto__`/過剰ネストを再帰的に拒否)に通す。`connClears` 不在の
  レガシー del は後方互換で許可。**非空虚テスト** (11 assert、修正前は NaN 拒否で失敗):
  整形式 connClears の受理、NaN/Infinity/`__proto__`/id 欠落/非配列の拒否、および
  エンドツーエンドで悪意ある del がコネクタを汚染も victim を削除もしないことを検証。

### Performance
- **RAF idle-stop: アイドル時にレンダーループを止めてバッテリー消耗を防止**:
  Qiita/Zenn「requestAnimationFrame で常にループするとバッテリーが消耗する」パターン。
  従来の実装: `requestAnimationFrame(frame)` を unconditionally にループさせており、
  ボードに何も変化がなくても 60fps × draw call が走り続けていた。
  修正: `_rafId` で RAF のペンディング状態を管理。`invalidate()` は `_rafId===0` のときのみ
  新しい RAF を登録し、`frame()` は自身の冒頭で `_rafId=0` にリセットしてから描画 → 次が
  必要なときのみ再登録する。結果: **完全なアイドル時は 0fps** (イベントで `invalidate()` が
  呼ばれるまで RAF は止まる)。描画品質・反応速度は変わらない。

### Added
- **プレゼンテーションモードでディスプレイがスリープしない (Screen Wake Lock API)**:
  Zenn「プレゼンテーション中に画面がオフになる問題」パターン。発表中にスライドから手を離すと
  OS のスクリーンセーバー / 自動ロックが発動し、聴衆の前で画面が暗転する。Screen Wake Lock API
  (`navigator.wakeLock.request('screen')`) を `Presentation.enter()` 時に取得し、
  `Presentation.leave()` で解放。ブラウザは `visibilitychange→hidden` 時にロックを自動解放
  するので、タブが前面に戻ったときに再取得する。非対応ブラウザ(Safari < 16.4 等)は
  サイレントに無視(try/catch + `navigator.wakeLock` ガード)。テスト: 3 assert で
  "screen" リクエスト・sentinel.release() 呼び出し・未対応時のセーフティガードを検証。

### Fixed
- **ブラウザタブタイトルがボード名を反映しない (WCAG 2.4.2 Page Titled)**:
  Qiita 「`document.title` を更新しないとブラウザタブに反映されない」パターン。ユーザーが
  ドキュメント名を付けてもタブは常に "index.html" のまま — スクリーンリーダーは間違った
  タイトルを読み上げ(WCAG 2.4.2 違反)、ブックマーク/履歴にも意味のある名前が入らない。
  `_syncDocTitle()` ヘルパを新設し、`input`/`compositionend`/`change`(docName フィールド)、
  `Persist.load()`(IDB から復元)、`importFromJSON`(JSON 読み込み) の全ての
  `state.docName` 書き換えパスで呼び出す。空名は "Untitled" にフォールバック。
  **非空虚テスト** 2 assert: 通常名・空名フォールバック、修正前失敗・修正後通過を確認。
- **`pointercancel` でスナップガイド線が残留 + 消しゴムストローク途中でキャンセルするとシェイプが消える(データロストバグ)**:
  GitHub canvas-apps Issue / Qiita「Android タッチ横取り後にガイド線が残る」「スタイラスが範囲外へ出ると消しゴムで消したはずのない図形が消える」パターンで発見。
  `pointercancel`(Android システムジェスチャ横取り・スタイラス out-of-range・指の追加 etc.) が発生した際、
  `pointerup` は呼ばれないため `_eraseBatch`(消しゴムが途中で `state.shapes` から取り除いた図形の一時バッファ)が
  `state.shapes` へ戻されず **永久消失** していた。また `state.guides`(スマート整列ガイド線)が `null` にリセット
  されないため、キャンセル後もキャンバスにガイド線の残像が描き続けられた。
  修正: 匿名ハンドラを `_cancelPointerGesture()` に抽出。(1) `_eraseBatch` を `state.shapes` へ戻す(undo不要; cancel = 操作そのものをなかったことに) (2) `state.guides=null` を追加。
  **非空虚テスト** 4 assert: guides 残留(1)・eraseBatch データロスト(3)、修正前に失敗・修正後に全通過を確認。
- **共有 URL の「コピー」が file:// で無反応(navigator.clipboard 非対応コンテキスト)**:
  Qiita / Zenn の「http / file:// 環境で navigator.clipboard が動かない」記事を調査して発見。
  Clipboard API はセキュアコンテキスト(HTTPS / localhost)限定で、`file://` や平文 `http://`
  では `navigator.clipboard` が undefined。Board は README で「`open index.html` で file:// 起動」を
  謳う核心ユースケースなのに、共有 URL コピーボタンは `navigator.clipboard.writeText` を
  try/catch で呼ぶだけで、file:// では例外が握り潰されて**何もコピーされず無反応**だった。
  `copyText(text)` ヘルパを新設: セキュアコンテキストでは Clipboard API、それ以外(file:// /
  http://)では一時 textarea + `execCommand('copy')` にフォールバックし、`Promise<boolean>` を返す。
  成功 / 失敗で `shareUrlCopied` / `copyFailed` トーストを出し分け(従来の無言失敗を解消)。
  i18n に `copyFailed`(ja: コピーできませんでした / en: Copy failed)を追加。**非空虚テスト**
  (6 assert + presence 3 件): セキュアコンテキストでの Clipboard API 使用、file:// での execCommand
  フォールバック成功、両方不可時の false、writeText 拒否時のフォールバックを検証。

- **モニター間移動で devicePixelRatio が変わってもキャンバスが再解像度化されずぼやける**:
  Qiita / Zenn の Canvas Retina / devicePixelRatio 対応記事(「本当は怖い HTML5 Canvas の
  Retina対応」等)を調査して発見。`resize()` は DPR を再計算してバッキングストアを
  `width*DPR` に拡大する正しい実装だが、`resize` / `orientationchange` イベントにしか
  バインドされていなかった。ウィンドウを Retina ↔ 外部 1× モニター間でドラッグ移動したり
  OS の表示スケーリングが変わると、`devicePixelRatio` は変化するのに resize イベントが
  発火せず、キャンバスが古い DPR のままぼやける。MDN / Qiita 推奨の
  `(resolution: Xdppx)` メディアクエリ監視 `_watchDPR` を追加(現在の比率にマッチする
  クエリが変化時に一度だけ発火 → `resize()` 後に新しい比率で再アーム)。**非空虚テスト**
  (5 assert + presence 1 件): 現在比率でのアーム・変化時の新比率への再アーム・単一発火・
  matchMedia 非対応環境での安全な no-op を検証。

- **モーダル(ヘルプ / 共有)を開いている間も背後のキャンバスショートカットが発火 + フォーカストラップ欠如 (WCAG 2.4.3 / 2.1.2)**:
  Qiita / Zenn のアクセシブルなモーダル / フォーカストラップ記事を調査して発見。モーダルは
  `role="dialog" aria-modal="true"` を持ち、開いたときにフォーカス移動・Escape で閉じる処理は
  あったが、(1) `aria-modal` はブラウザの Tab を実際にはトラップしないため Tab が背後の
  キャンバス図形巡回に流れ、(2) モーダルを開いたままツールキー(`r`/`e` 等)や Delete を
  押すと背後のボードが操作されてしまった。keydown ハンドラに「開いているダイアログ」検出
  (`_openDialog`)を追加し、ダイアログが開いている間は Escape 以外のグローバルショートカットを
  抑制、Tab/Shift+Tab は純粋関数 `_trapStep` でダイアログ内に閉じ込め(端で巡回、中間はネイティブ
  Tab に委譲、外部フォーカスは引き戻す)。**非空虚テスト** (11 assert + presence 2 件):
  `_trapStep` の端での巡回・中間での null・外部フォーカスの引き戻し・空集合・単一要素を検証。

- **`<html lang>` が検出ロケールと一致せずスクリーンリーダーの発音が崩れる (WCAG 3.1.1)**:
  Qiita / Zenn の Canvas 日本語フォント・CJK han unification(「日本語が中国語っぽい字形に
  化ける」)記事の調査から派生して発見。`<html lang="ja">` がハードコードされている一方、
  i18n は `navigator.language` で ja/en を自動検出する。英語ブラウザのユーザーは UI が英語に
  なるのに `lang` は `ja` のままで、スクリーンリーダーが英語テキストを日本語音声エンジンで
  読み上げてしまう(WCAG 3.1.1 Language of Page 違反)。さらに CJK 共有コードポイントの
  字形選択(han unification)で誤った字形が選ばれる懸念もある。`applyI18n` で
  `document.documentElement.lang=LANG` を設定し、検出ロケールに同期(`ja` は一次読者向けの
  正しい既定値として HTML に残し、実行時に非 ja ユーザー向けへ補正)。**非空虚テスト**
  (1 assert、harness は navigator.language='en' → LANG='en'、修正前は lang='ja' のままで失敗):
  applyI18n 後に `documentElement.lang==='en'` を検証。

- **iOS ノッチ / ホームインジケータのセーフエリアに固定 UI が隠れる**:
  Qiita / Zenn の iOS Safari セーフエリア記事(`viewport-fit=cover` + `env(safe-area-inset-*)`、
  PWA standalone でのホームバー重なり)を調査して発見。`<meta viewport>` に
  `viewport-fit=cover` を指定済みでページをノッチ領域まで広げているのに、固定クロム
  (`.topbar` 上端・`.toolbar` 左端・`.statusbar` 下端・`.minimap-wrap`) が
  `env(safe-area-inset-*)` で退避していなかったため、ノッチ付き iPhone でツールバーや
  ステータスバーがノッチ / ホームインジケータに隠れていた。各固定要素のパディング /
  位置を `max(既存値, env(safe-area-inset-*))` で補正(`env` が 0 の非ノッチ端末では
  描画不変)。`@media (max-width:720px)` のモバイル上書きがパディングをリセットして
  セーフエリアを打ち消していた点も修正(最も影響の大きいモバイルで効くように)。
  **presence テスト 4 件**(`env(safe-area-inset-` が修正前は皆無のため非空虚): viewport-fit
  オプトイン、3 クロムバーへの適用、`max()` ラップ、モバイル media query での保持を検証。

### Added
- **付箋・テキストの日本語折り返しに禁則処理 (kinsoku shori) を実装**:
  Qiita / Zenn の日本語テキスト折り返し記事(HTML5 Canvas 縦書き・形態素解析ベースの
  禁則処理)を調査して反映。日本語は単語間に空白がないため `wrapText` は CJK 文字列を
  1 文字ずつ折る (char-break) が、素朴な折り返しでは行頭に句読点・閉じ括弧 (。、」』）)、
  行末に開き括弧 (「『（) が来てしまい、日本語読者には組版崩れに見える。JIS X 4051 準拠の
  行頭禁則・行末禁則文字集合 (`KINSOKU_START` / `KINSOKU_END`) を追加し、char-break ループで
  行頭禁則文字は前行にぶら下げ (ぶら下げ組)、行末の開き括弧は次行へ追い出すよう修正。
  付箋のライブ描画・自動高さ計算・SVG エクスポートの 3 経路すべてに適用される。英語の
  単語折り返しパスは不変。**非空虚テスト** (7 assert、修正前は「行頭が禁則文字で始まらない」で
  失敗): 行頭禁則のぶら下げ・行末禁則の追い出し・ASCII 閉じ括弧・英語不変・ぶら下げ
  オーバーフローの有界性を検証。

### Fixed
- **リモート peer がバインド先図形を削除したとき受信側ローカルコネクタが片付かない**:
  ソクラテス式問答「そのクリーンアップはネットワーク境界を越えても安全か?」の続き。
  v1.6.78 の `connClears` は送信側が知るコネクタ(=同期済み)のみカバーする。受信側に
  しか存在しないコネクタ(ローカルで描いてまだブロードキャストしていない、または並行
  編集レース)が削除対象図形に束縛されていると、リモート del 適用後にダングリングし、
  `connEnds` が描画時の古い座標へスナップバックする。修正: `applyRemote` は del 適用の
  **前**に(`connEnds` は図形の bbox が生きている間でないと解決できないため)`_remoteDelConnFix`
  で受信側ローカルコネクタの端点を解決し、`_apply` 後にバインドを切る。送信側 `connClears`
  に含まれるコネクタはスキップ(送信側の after が優先、二重適用を回避)。リモート専用の
  ビュー整合修正のためローカル undo 履歴には記録しない。**非空虚テスト** (7 assert、
  修正前は `liveC().a === null` で失敗): connClears なしリモート del で受信側コネクタが
  解決された端点で切断されること、共有コネクタは送信側 after が適用されることを検証。

- **消しゴムもコネクタバインドをクリアするよう修正(doDelete との一貫性)**:
  ソクラテス式問答「修正はすべての削除パスで一貫しているか?」。v1.6.78 で `doDelete`
  のバインドクリアを修正したが、消しゴム (`eraseAt`/`flushErase`) は別コードパスで
  同じバグを持っていた。`flushErase` は `eraseAt` が先取り除去した図形を一旦
  `state.shapes` に戻してから `Store.commit` を呼ぶため、`connEnds` が解決可能。
  修正: `flushErase` も `doDelete` と同様に `connClears` を計算・同梱する。
  **非空虚テスト** (5 behavioral assert、修正前は `liveArr2().a !== null` で失敗):
  `_eraseBatch` への直接プッシュ → `flushErase()` → バインドクリア + undo 復元 を検証。

- **コネクタのバインド先図形を削除すると座標がスナップバックする**:
  ソクラテス式問答「関係の一方が消えたとき何が起きるか?」で発見。バインドされた図形
  (rect A) を移動後に削除すると、コネクタはそのまま描画時の静的座標 (x1, y1) へ戻り、
  図形が最後に存在した位置ではなくなる。原因: `doDelete` は `state.shapes` をスプライス
  するだけで、バインドを参照するコネクタの `a`/`b` を一切更新しなかった。
  修正: `doDelete` はスプライス前に `connEnds()` で現在のエッジ交点を解決し、
  `{connClears:[{id, before:{a,x1,y1}, after:{a:null,x1:resolved,y1:resolved}},...]}` を
  `del` op に同梱して単一コミットにまとめる。`_apply case 'del'` の forward では
  shapes をスプライス後にコネクタを更新し、reverse (undo) では shapes を復元後に
  バインドを元に戻す。1 回の Ctrl+Z で図形復元とバインド復元が両方起きる。
  **非空虚テスト** (6 behavioral assert、修正前は `assert.strictEqual(liveArr().a, null)` で失敗):
  rA を (200,200) に置き、描画時座標 x1=140 のコネクタをバインド → rA 削除 →
  `a===null` かつ `x1 !== 140` を検証 → undo で rA と `a===rA.id` と `x1===140` が復元。

- **ペースト / 複製の N 図形が N 回の Undo を要していた(原子性の欠落)**:
  ソクラテス式問答「1 つのユーザー操作は 1 回の Ctrl+Z に対応するか?」で発見。
  `_placeCopies` は図形ごとに `Store.commit({op:'add'})` を呼んでいたため、3 図形を
  ペーストすると履歴に 3 エントリが積まれ、元に戻すのに 3 回の Ctrl+Z が必要だった。
  v1.6.75 のフレーム子図形複製対応以降、フレーム+子の複製が暗黙に 2 回 Undo を要して
  いた点が特に問題。原子的な単一 `{op:'addMany',shapes:[...]}` op を新設し、forward は
  `add` を、reverse は `del` を踏襲(id 冪等・選択クリア)。`_placeCopies` は全コピーを
  先に構築してから 1 度だけ commit する。遅延 commit でも z が衝突しないよう、捕捉した
  `nextZ()` を基点に z をインクリメント割り当て(実際の描画順キー `frac` は sortZ が
  null-frac コピーを上に積層して一意化)。sync 対応として `REMOTE_OPS` と
  `validRemotePayload` に `addMany` を追加。**非空虚テスト**(8 behavioral assert +
  4 presence check、修正前は 5 失敗を確認): 3 図形複製が履歴 1 エントリ・addMany 型・
  単一 Undo で全 3 コピー消去・単一 Redo で全復元・全 6 図形が一意 frac を持つことを担保。

### Added
- **シェイプロックのキーボードショートカット `⌘⇧L` (Ctrl+Shift+L)**:
  README は「全機能キーボード操作可能」と謳っているが、`doLock` は右クリック
  コンテキストメニューからのみアクセス可能だった。ソクラテス式問答「アプリ自身の
  アクセシビリティ約束を履行しているか?」により発見。`⌘⇧L` → `doLock()` の
  キーバインドを追加し、i18n キー `lockToggle` (ja: ロック切り替え / en: Toggle lock)
  とヘルプグリッド行 `['⌘⇧L', t('lockToggle')]` も追加。
  **非空虚テスト**: 3 presence check (ショートカット存在・i18n・ヘルプグリッド) が
  修正前に失敗することを確認。6 behavioral assert でロック/アンロックのトグルと
  undo/redo の対称性を担保。

### Fixed
- **`doDuplicate` がフレームの子図形を無視していた(drag/nudge との動作不一致)**:
  `withFrameChildren` はドラッグ移動・キーボードナッジで使われており、フレームを選択して移動すると
  内部の子図形も一緒に動く。しかし `doDuplicate` (Ctrl+D) は `state.selection` の id のみを
  `_placeCopies` に渡していたため、フレームシェルだけが複製されて子図形は元の位置に残った。
  `[...state.selection]` を `[...withFrameChildren(state.selection)]` に差し替え、
  drag/nudge/duplicate の三操作で `withFrameChildren` 展開を統一。
  **非空虚テスト**(6 アサート、修正前は 1 形状増加 → 失敗を確認、修正後は 2 形状増加):
  フレーム + 内部子 + 外部 shape のシナリオで、複製後の選択がフレームコピー + 子コピーの
  2 形状であること、外部 shape が含まれないこと、元の 3 形状が保持されること、
  子コピーが新フレームコピーの bbox 内に収まることを担保。


- **検索ナビゲーションがスクリーンリーダーに「何が見つかったか」を伝えていなかった(a11y / ソクラテス式
  問答 — 新視点「検索機能は他の a11y と同じユーザーに奉仕しているか?」)**: 直前に追加した検索
  ナビゲーション(Enter/Shift+Enter)は、マッチへ移動するたびに `UI.toast` で**裸のカウント
  「2/7」だけ**をアナウンスしていた。晴眼ユーザーはオレンジ枠が特定のラベル付き図形へジャンプするのを
  **見える**が、SR ユーザーには「2/7」しか聞こえず、**何が見つかったのか分からない**。検索は
  **内容(label/text)で**マッチするのに、結果アナウンスがその内容を省いていたのは自己矛盾。さらに
  Tab 巡回は既に `describeShape(sh)` で図形内容を読み上げており(「Arrow "yes" @ 100,40 (2/7)」)、
  検索ナビだけがカウントのみ=**機能間の a11y パリティ違反**だった。`_sqAdvance` のアナウンスを
  `${describeShape(sh)} (${idx+1}/${total})` に変更し Tab 巡回と完全パリティ。**非空虚テスト**
  (6 アサート、修正前は失敗を確認): アナウンスが describeShape を含む、マッチ内容を名指す、位置カウントを
  保持、裸カウント「1/2」より厳密にリッチ、2 番目の前進で別の図形内容をアナウンスすることを担保。

### Added
- **検索ナビゲーション機能のヘルプグリッド登録**:
  Ctrl+F 検索に Enter/Shift+Enter ナビゲーション機能を追加したが、ヘルプグリッド(?)には
  この機能が記載されていなかった。新しい i18n キー `searchNav` を ja/en 両方で追加し、
  fillHelp の shortcut 一覧に `['Enter / ⇧Enter',t('searchNav')]` を追加。
  presence check も更新して、ヘルプグリッドに search nav 行が含まれることを自動検証。

### Added
- **README キーボードショートカット表の完全化**:
  Ctrl+F 検索のナビゲーション機能を追加したことで、README のショートカット表が複数の**実装済み機能**を
  無視していたことが明らかになった。以下のショートカットはコード内で完全実装されていたが、表に掲載されていず
  **ユーザーに発見されていなかった**: (1) `N` = 付箋 (2) `⌘G` / `⌘⇧G` = グループ化 / グループ解除
  (3) `⌘⇧E` = SVG エクスポート (4) `⌥C` / `⌥V` = スタイル複製 / 適用。
  README の表を 16 行→18 行に拡張して全ショートカットをカバー。レイアウトを再調整し、
  関連機能をグループ化(例: N と F を連続行に、ズーム・フィット・エクスポートを並べる)。
  新しい presence check (4 個) で全ショートカットがコード内で正しくワイアリング
  されていることを担保。**ドキュメント完全性の向上 + ユーザーディスカバリ向上**。

### Added
- **検索ナビゲーション(Ctrl+F → Enter/Shift+Enter で次/前のマッチへ移動)**:
  Ctrl+F の検索はマッチ図形をオレンジ枠で一覧ハイライトするが、マッチ間を**ステップ移動**できなかった。
  Enter(次)/ Shift+Enter(前)でマッチを順に選択・ビューポートをセンタリングし、現在マッチを**太い
  オレンジ**(`#EA580C`・5px)、他マッチを通常オレンジ(`#F97316`・3px)で区別。マッチ数は UI.toast
  で「2/7」形式でアナウンス。新クエリ入力時にインデックスを -1 にリセットするので常に最初のマッチから
  開始。実装は `_sqNav`(idx・lastQ)+ `_sqAdvance(dir)` + `_setSq(v)` で完結。
  **非空虚テスト**(9 アサート): 前進・後退・ラップ・空クエリ no-op・マッチなし no-op・クエリ変更リセットを担保。
- **コネクタ(エッジ)ラベル(新機能 / ADR-0003)**: line/arrow をダブルクリックすると結合端点の**中点**に
  インラインラベルエディタが開き、コネクタにテキストを載せられる(判断分岐の "yes"/"no"、関係名など)。
  Board 固有の bound connectors(図形追従)と組み合わせ、**軽量フローチャート/関係図**を実現。実装は既存
  資産の再利用に徹した: インラインラベルエディタを `openLabelEditor()` に抽出して box 図形/コネクタで共有
  (frame の太字スタイルは引数分岐、既存挙動を厳密維持・IME 安全・Enter 確定・Escape 破棄)、コミットは
  汎用 `upd` op(可逆・同期対応)、canvas は `_drawConnLabel`(paper 色の背景ピル付きで線が文字を貫かない、
  ズーム追従)、SVG は `_connLabelSVG`(背景 rect + 中点 `<text>`、全属性 `_esc`)で**表示=出力パリティ**。
  データモデル不変(`label` は既存フィールド)で保存/同期/undo/hit-test/bbox に無影響。**非空虚テスト**
  (6 presence + 8 アサート): ラベル付き line/arrow が SVG 中点に centred `<text>` を出力、x 座標が端点でなく
  中点付近、未ラベルは `<text>` を出さない、敵対的ラベルは `_esc` でエスケープされることを担保。

### Changed
- **共有URL / `.board` エクスポートの座標を丸めてサイズ削減(Zenn 浮動小数点 リサーチ)**: シリアライズ時に
  `JSON.stringify` がフル精度の浮動小数点(`100.00000000000001` や `123.45678901234567`)をそのまま
  出力し、共有URL(長さ上限あり)とファイルを肥大化させていた。`roundShapesForExport(shapes,dp=2)` を
  追加し、シリアライズ境界(共有URL・`.board`)**のみ**で x/y/w/h/x1..y2/rotate を 2dp、ペン筆圧を 3dp に
  丸める(deep copy なので **in-memory モデル・undo 精度・ライブ描画は不変**)。ホワイトボードでは
  サブピクセル精度は知覚不能だが URL 長・ファイルサイズを確実に削減。`_round` は NaN/Inf を素通しして
  下流の検証が引き続き弾く。**非空虚テスト**(4 presence + 17 アサート): 座標フィールドの丸め、非座標
  フィールド(id/stroke/z)の保持、ペン位置 2dp・筆圧 3dp、**入力配列を変更しない**(undo/描画への非影響)、
  丸め後も `validShape` を満たす、シリアライズ後のサイズが実際に縮むことを担保。

### Fixed
- **スクリーンリーダーが図形の内容(テキスト/ラベル)を読み上げていなかった(a11y / 長所短所監査)**:
  `describeShape`(Tab 巡回・キーボード作成・リサイズ/回転の `aria-live` 読み上げ)は型と座標のみを
  読み上げ、**ラベルやテキスト本文を含めていなかった**。SR ユーザーには "Arrow @ 100,40"・"Sticky @ 200,50"
  と聞こえ、各図形が**何を言っているか**が分からなかった(直近追加のコネクタラベルを含め全ラベルが対象)。
  内容(`text||label`、空白畳み込み・30 字で切り詰め・`…`)を型の直後に読み上げるよう変更。未ラベル図形は
  従来通り(後方互換)。**非空虚テスト**(1 presence + 5 アサート): コネクタラベル/付箋テキストの読み上げ、
  text が label に優先・空白畳み込み、長文の切り詰め、未ラベルは引用符を付けないことを担保。
- **太い線幅の図形がビューポート端で誤ってカリングされ、線が消えていた(コード監査)**: `draw()` は
  `inView()` で画面外図形を描画スキップするが、`inView` の余白は固定 4px だった。`G.bbox` は
  rect/ellipse/frame の**ストロークを含まない**(box 図形は x/y/w/h のみ)ため、線幅が太い(最大 32px →
  bbox から 16px はみ出す)図形が端にあると、ストロークがまだ画面に見えているのに bbox が枠外になった
  瞬間にカリングされ、線の端が消えていた。余白を `4+(s.size||0)/2` に変更しストローク半幅を含めた
  (pen/line は G.bbox が既にストロークを含むので過剰側=安全側に倒れるだけ)。**非空虚テスト**(1 presence
  + 5 アサート): 端の太線 rect が保持される、旧 4px 余白なら culling される、遠方図形は依然 culling、
  線幅なし rect は従来通り(後方互換)を担保。
- **カスタムカラーピッカーが 1 回の色選択で undo 履歴と sync を大量生成していた(コード監査)**: ネイティブ
  `<input type=color>` は picker を開いている間 `input` を**連続発火**するが、ハンドラは毎 `input` で
  `applyStyleToSelection`(=`style` op コミット+ブロードキャスト)していた。1 色選ぶだけで undo が数十段
  積まれ、共同編集では同数の op が飛んでいた。サイズ/不透明度スライダーと同じコアレッシングに統一:
  open 時にスナップショット(`_sfbCapture`)、`input` はライブプレビュー(Store 非経由)、`change` で
  **単一の `style` op を flush**(`_sfbFlush`)。**非空虚テスト**(3 presence + 7 アサート): ライブ input が
  undo op を積まないこと、change が**ちょうど 1 op** を flush(3 ではなく)、1 回の undo で元色に戻ること、
  before/after が正しいこと、未変更値の flush は no-op(ガード確認)を担保。
- **矩形/楕円のラベルが canvas に描画されず SVG エクスポートにだけ現れていた(表示=出力パリティ違反)**:
  ダブルクリックハンドラは frame だけでなく rect/ellipse にもラベル付与を許可し、`buildSVG` は
  rect/ellipse のラベルを `<text>` で出力するが、canvas の `drawShape` の rect/ellipse 分岐は
  `s.label` を**全く描画していなかった**。結果、矩形をダブルクリックしてラベルを入力・コミットしても
  **canvas 上では不可視**で、SVG 書き出し時にのみ出現していた。SVG の `<text>`(中央寄せ・14px・
  stroke 色)に合わせた `_drawBoxLabel(s,c)` を追加し rect/ellipse 分岐から呼び出し。回転ラッパー内で
  呼ぶのでラベルも図形と一緒に回転(SVG の rT と一致)。**非空虚テスト**(3 presence + 5 アサート):
  ラベル付き rect/ellipse が SVG に label テキストと `<text>` を出力、ラベル無しは `<text>` を出さない、
  敵対的ラベル(`</text><script>`)が `_esc` でエスケープされる(XSS 安全)ことを担保。
- **共同編集で新規テキスト/付箋の入力内容が他ピアに同期されていなかった(コード監査)**: `beginText` /
  付箋作成は `text:''` で add op を**即コミット=即ブロードキャスト**し、その後エディタで入力する。
  入力確定(blur)の非空文字列分岐はローカルの履歴 op を in-place で書き換えるだけで**入力テキストを
  ブロードキャストしない**。空文字で破棄した場合も `Store.undo()` はローカルのみ。結果、ライブ同期
  (複数タブ BroadcastChannel / WebRTC)では **他ピアに空のテキスト/付箋が表示され**、空破棄したものは
  不可視のヒットボックスとして残留していた。`_syncTextFinalize(s,before,deleted)` を追加し、確定時に
  delta を**ブロードキャスト専用 op**(LWW 用に `_stampWrites` するがローカル履歴には積まない=単独
  ユーザーの undo は 1 ステップのまま)として送出: 非空は `upd`(text/w/h)、空破棄は `del`。**非空虚
  二者ハーネステスト**(3 presence + 8 アサート): B が空 add を受信 → A 入力確定 → B に入力内容が反映、
  空破棄 → B から図形が消えることを担保。
- **複数画像を同時ドロップすると全部が同じ位置に重なっていた(コード監査)**: ドロップハンドラは
  画像をカスケード配置するため `let ox=0` をループ内で `ox+=20` していたが、`reader.onload` は
  **非同期**のため、どの onload が発火する頃にはループが完了し `ox` は最終値(20×N)に達していた
  (共有変数のクロージャ捕捉)。結果、全画像が `wp.x + 20×N` に**重なって配置**されカスケードが機能
  していなかった。`files.forEach((f,i)=>…)` でイテレーションごとの `i` を捕捉し `x:wp.x+i*20` に変更。
  **非空虚テスト**(2 presence + 3 アサート): バグパターン(共有 ox)が `[60,60,60]` を生むこと、
  修正パターン(per-iteration 捕捉)が `[0,20,40]` を生むこと、両者が実際に異なることを担保。
- **WebRTC 接続中の相手が 15 秒でプレゼンス表示から消えていた(コード監査)**: WebRTC ピアは
  BroadcastChannel の heartbeat(`{k:'ping'}` は `this.bc` のみに送信)に乗らず、`dc.onopen` で合成 id
  `rtc:XXXX` を 1 度だけ `_touchPeer` するだけだった。`_onRecv` の `case 'op'` はピアを touch しない
  ため `lastSeen` が更新されず、`_reapPeers` が 15 秒(`NET_PRESENCE_TIMEOUT`)で削除 → 接続が生きていて
  op が流れていてもアバター/ピア数が消えていた。WebRTC ピアを **DataChannel ライフサイクル管理**に変更:
  `dc.onopen` で `_rtcPeerId` を保存して追加、`dc.onclose` で削除、`_reapPeers` は `rtc:` 接頭辞のピアを
  タイムアウト reap から除外。BroadcastChannel ピアは従来通り heartbeat でタイムアウト reap。**非空虚
  テスト**(3 presence + 4 アサート): 古い BC ピアは reap・新しい BC ピアは保持・古い(が接続中の)rtc
  ピアは保持、そして rtc ピアが reap された BC ピアと**同じだけ古い**(=`rtc:` 除外だけが生存理由)ことを担保。
- **`Net.init` の再呼び出しでプレゼンス heartbeat がリークしていた(コード監査)**: `init(roomId)` は
  ルーム切替のための再呼び出しを想定して旧 `BroadcastChannel` を `close()` するが、5 秒ごとの
  プレゼンス heartbeat (`_presenceTimer`) を `clearInterval` していなかった。再呼び出しすると旧
  interval が残存し、新チャンネル上で**二重に ping/reap** が走る。現状 `init()` は起動時 1 回のみ
  呼ばれるため潜在バグだが、`roomId` 引数と既存の `bc.close()` が再呼び出し設計を明示しているため、
  対になる `clearInterval(this._presenceTimer)` を追加。**非空虚テスト**(1 presence + 5 アサート):
  再 init で旧チャンネルが close、旧タイマーが破棄(Node の `_destroyed`)、新タイマーに差替、roomId 更新、
  破棄フラグがリークガードであることを担保。
- **`docName` の IME 変換中の文字列が IDB/sync に漏れていた(Qiita Rapls / Zenn spacemarket リサーチ)**:
  ドキュメント名 input の `input` ハンドラが `isComposing` を見ずに発火していたため、日本語入力で
  変換中の未確定文字列が逐次 `state.docName` に書き込まれ、`Persist.schedule()` → IDB 保存 +
  BroadcastChannel/WebRTC 経由 sync まで届いていた。Safari は確定時に input を**2 回**発火する
  既知バグもあり(spacemarket 記事)、同じ更新が二重実行されていた。`imeShouldCommit(e)` を純粋
  関数として抽出(`!(e&&e.isComposing)`)し、`input` でゲート、`compositionend` で最終確定を拾う
  二段構え(Qiita Rapls 推奨パターン)。最終的な値は `change`(blur/Enter で発火)が引き続き拾うので
  Safari の二重 input は片方が isComposing=true で skip され重複しない。**非空虚テスト**(3 presence
  + 6 アサート): isComposing=true で skip、false で commit、欠損 isComposing(マウス/paste 等)も
  commit、null/undefined event は防御的に commit(teardown 時の安全)、旧挙動(常に commit)との差分
  を担保。
- **Firefox のマウスホイールでパン/ズームがほぼ効かなかった(MDN/Zenn ホイール リサーチ)**: wheel
  ハンドラが `e.deltaX/deltaY` を生のまま使っていたが、`deltaMode` は **pixel(0)/line(1)/page(2)** と
  単位が異なる。Firefox のマウスホイールは line モード(`deltaY≈±3`)で報告するのに対し Chrome は
  pixel モード(`±100`)のため、Firefox ではパン/ズームが ~16× 弱く、ほとんど動かなかった。
  `wheelPx(e)`(line=×16 / page=×400 / pixel=×1、欠損値は 0 で NaN 防止)でピクセルに正規化。Chrome の
  pixel 経路は不変(×1)なので既存の操作感を保つ。**非空虚テスト**(2 presence + 6 アサート): pixel
  そのまま通過、line ×16、page ×400、欠損 deltaY→0、line 正規化(48)が生値(3)と異なることを担保。
- **ピンチズーム中に単一ポインタのジェスチャが暴走していた(Qiita/Zenn マルチタッチ リサーチ)**:
  ピンチ追跡リスナー(capture フェーズ)は `_pointers` を管理するが、メインの描画ハンドラ
  (bubble フェーズ)は `_pointers.size` を見ていなかった。そのため描画/移動の最中に 2 本目の指で
  ピンチを始めると、ピンチハンドラがズームする裏でメインの `pointermove` が `contPen`/`doMove`/
  `eraseAt` を走らせ続け、ズーム中に不要なストローク・移動・消去が発生していた(Qiita: mikecat 等が
  指摘する典型的なマルチタッチ競合)。`pointerdown` で 2 本目の指(`_pointers.size>=2`)を検知したら
  `abortGesture()` で進行中ジェスチャを取り消し、`pointermove` も `_pointers.size>=2` で早期 return。
  `abortGesture` は pointerdown 時のスナップショットから move/resize/rotate を**巻き戻し**、楽観的に
  消した消しゴム対象を**復元**、未確定 draft を破棄、`ptr.down=false` で残った指の pointerup を無効化
  (=非可逆な中途半端変更を残さない)。**非空虚テスト**(3 presence + 9 アサート): draft 破棄、move/resize
  の原状復帰、op を記録しない(clean cancel)こと、巻き戻した x が drag 中の x と異なることを担保。
- **モバイルでタブを閉じる際にデータが失われ得た(Zenn/PWA リサーチ)**: 既存の durability フックは
  `beforeunload` のみだったが、Zenn の PWA 系記事と web.dev が一致して指摘する通り、`beforeunload` は
  **モバイルで信頼できない** — iOS Safari はスワイプアウト時に発火しないことが多く、Chrome Android も
  バックグラウンド退避で発火を落とす。ペアになる正解は **`visibilitychange→hidden`** で、ここでは
  ほぼ確実にタブが消える前に通知が来る。`Persist.flushIfHidden(vis)`(`vis==='hidden' && state.dirty`
  で防御的にゲート)を抽出し、500ms デバウンスタイマーをキャンセルしてから `save()` を即時実行。
  `document` の `visibilitychange` で `flushIfHidden(document.visibilityState)` を呼ぶ。既存 `beforeunload`
  はデスクトップ向けの belt-and-suspenders として残す。**非空虚テスト**(3 presence + 6 アサート):
  hidden+clean / visible+dirty / prerender / 'Hidden' (大文字) で発火しないこと、hidden+dirty で
  ちょうど 1 回 `save` を呼ぶこと、stub カウンタが直接 `save()` 呼び出しを正しく数えることを担保。
- **高頻度スタイラスでペンのサンプルを取りこぼしていた(Qiita リサーチ)**: ペンの `pointermove` は
  `e.offsetX/Y` を 1 点だけ取り込んでいた。ブラウザは Apple Pencil(~240Hz)や 120Hz+ ディスプレイの
  複数の物理サンプルを 1 つの 60Hz `pointermove` に**合体(coalesce)**するため、合体された 3/4 の点と
  その筆圧が失われ、ストロークが粗くなっていた。Qiita(sen-ltd)/MDN が指摘する通り
  `getCoalescedEvents()` で全サブサンプルを回収する `coalescedSamples(e)`(未対応ブラウザは `[e]` に
  フォールバック)を追加し、ペン分岐で各サブサンプルを `contPen` に投入。データモデル(`pts`)は不変で
  既存の距離デシメーション・RDP・可変線幅・保存/同期に影響なし。**非空虚テスト**(2 presence + 8 アサート):
  合体リストの回収とフォールバック、4 サブサンプルが 5 点を生む(単一サンプルの 2 点より多い)こと、
  中間サンプルの筆圧が保持されることを担保。
- **IndexedDB の `QuotaExceededError` がユーザに伝わらず救済策も示されなかった(Zenn / PWA リサーチ)**:
  `Persist.save` の catch は generic で `t('saveFailed')+': '+err.message` を出すのみ。Zenn の PWA データ
  永続化記事(`tosa`/`peter_norio`/`tm35` ほか)が一致して指摘する通り、IDB は容量超過時に固有名
  `QuotaExceededError` を投げるが、これを区別しないと「保存失敗: DOMException: …」とだけ表示され、
  ユーザは(a) 何が起きたか分からず(b) 取れる手(ローカル書き出し)も知らない。`Persist._saveErrMsg(err)`
  を純粋関数として抽出、`err.name==='QuotaExceededError'` で専用 i18n キー `quotaExceeded`
  (`保存容量が逼迫しています — ⌘E/⌘⇧E で書き出しを推奨` / `Storage quota exceeded — export locally
  with ⌘E/⌘⇧E`)へ。`role="alert"` トーストで SR にも即時伝達。**非空虚テスト**(8 アサート): quota と
  非 quota 入力で**出力が異なる**こと、quota は ⌘E/export を含み saveFailed 接頭辞を持たないこと、
  非 quota は元の `err.message` を含み saveFailed 接頭辞を保つこと、null/undefined err も非空文字列に
  安全に落ちることを担保。
- **回転描画が box 以外の図形で NaN 中心になっていた(表示=出力パリティ違反)**: `drawShape` の回転ラッパは
  全種別に適用され、中心を `s.x+(s.w||0)/2` で計算していた。line/arrow/pen は `s.x`/`s.w` が undefined のため
  中心が **NaN**(canvas は原点周りで誤回転)。一方 SVG エクスポートは line/arrow/pen に `rT` を付けないため
  **回転を無視** — 同一図形が canvas と SVG で食い違う。回転は box 図形(x/y/w/h)のみ意味を持つ(doRotate も
  box 限定)ため、共有ヘルパー `shapeRot(s)`(`s.rotate&&s.w!=null?s.rotate:0`)を導入し canvas/SVG 双方で使用。
  point 幾何への stray な `rotate`(remote `upd` でのみ到達可能)は両経路で無視され一致。`shapeRot` の box/point
  判定と、回転 rect は SVG transform を出すが回転 line は出さないことをテストで担保(非空虚: line.rotate=45 を確認)。
- **キーボード矢印ナッジが frame 子要素を追従せず・ロック図形も動かしていた**: ポインタドラッグは
  frame を動かすと内包図形が追従し、ロック図形はスキップする(`doMove`/`endSelect` が `!locked`)。
  しかし矢印ナッジは (a) frame 子要素を放置し、(b) ロック図形をそのまま移動させる二重のパリティ欠落が
  あった。frame 子要素展開を `withFrameChildren(ids)` ヘルパーに共通化し(ドラッグ経路も同ヘルパーへ)、
  新設の `nudgeSelection(dx,dy)` が「frame 子要素追従 + ロックスキップ」でドラッグと完全パリティに。
  矢印キーハンドラはこれに委譲。非空虚テスト(15 アサート)で「子追従/ロック子は不動/外部図形は不動/
  move op にロック子が不在」を担保(旧インラインコードでは子が動かないことをインライン確認)。
- **コピー/複製時のコネクタ結合先が元図形のままになっていた**: `_placeCopies` が `groupId` の
  再マッピング (`gidMap`) は行うが、コネクタの結合先 (`sh.a`/`sh.b`) は再マッピングしていなかった。
  複数の図形とコネクタをまとめて複製すると、複製コネクタは**コピー先**ではなく**元図形**に結合したまま
  となり、コピー群を移動してもコネクタが元図形から伸び続けるバグ。二段階処理 (`idMap` で全 id を先行
  生成 → 各 `sh.a`/`sh.b` を新 id に差し替え) に変更。非空虚テストで修正前は `cC.a === A.id`(元図形)、
  修正後は `cC.a ∈ copyIds`(コピー群) であることを担保。
- **`doAlign` がロック図形を移動していた**: `doDelete`/`doRotate`/`doFlip`/`doMove` はすべて
  `!s.locked` でロック図形をスキップするが、`doAlign` だけが `filter(Boolean)` のまま漏れており、
  コンテキストメニューの "Align left/right/top…" / "Distribute" がロック図形を無断移動していた。
  `filter(s=>s&&!s.locked)` に変更し、ロック図形は align 対象から除外 (整列の参照計算からも除外)。
  ロック図形の位置不変と undo op へのロック図形の不在をテストで担保 (非空虚)。
- **付箋ダブルクリック編集後に幅が崩れていた**: `openTextEditor` の blur ハンドラが `text` /
  `sticky` を区別せず `ctx.measureText`(改行分割のみ) で `s.w` を上書きしていた。ユーザが
  リサイズハンドルで設定した付箋幅(例: 160px)が、折り返し前の全文幅(例: 690px)に**無条件で
  置き換わる**バグ。`resizeAfterTextEdit(s,text,c)` ヘルパーを抽出し型で分岐: `text` 型は従来通り
  w/h を自動サイズ化、`sticky` 型は `s.w` を保持して `wrapText` による折り返し後の行数から `s.h`
  だけ更新。単体テストで sticky の `s.w` 保持と `text` の auto-size を担保 (非空虚: 旧コードでは
  `s.w = 690` になることをインライン計算で確認)。

### Added
- **並行編集の収束: プロパティ単位 LWW (ADR-0002 / research §3.15–3.16, 項目 D/K)**: 二者が同じ図形の
  同じプロパティを同時編集すると、従来は**発散**していた(受信順 `Object.assign`、タイブレーク無し。
  §3.15 で二者ハーネスにより実測)。`(ts,peer,seq)` の全順序 `clockNewer()` と書き込みクロック
  `state.wclock`(`shapeId→{prop:clock}`、**図形オブジェクトには載せない**ので clone/snapshot/persist/
  validate を汚さない)を導入し、受信 op の各プロパティを記録済みクロックと比較して**古い書き込みを
  落とす**(`_lwwDrop`)、勝った書き込みを記録(`_stampWrites`)。`upd`/`style`(最小パッチ op)に適用。
  同一プロパティ衝突は**決定的に収束**(新しい方が勝つ。ts 同値は peer-id でタイブレーク)、互いに素な
  プロパティは**双方生存**。二者ハーネスで A新/B新/ts同値/互いに素の収束をテスト担保(`_lwwDrop` を無効化
  すると収束テストが落ちることを確認 = 非空虚)。単独 peer の挙動は不変。
  - **変更キー検出で `resize`/`align` も対応**: これらは after に**全図形スナップショット**(`clone(s)`)を
    持つため、素朴な per-property LWW では geometry 変更が stroke 等も「書いた」と過剰主張する。
    `_chg(before,after,key)`(JSON 差分、pen `pts` も深く比較)で**実際に変わったキーだけ**を gate/stamp し、
    未変更キーは適用前に落とす(スナップショット op が触っていないプロパティの並行編集を潰さない)。
    二者ハーネスで「同時 resize の収束」「resize×recolor の双方生存」を担保(変更キー gating を外すと
    clobber して落ちる = 非空虚)。これで undo×sync を除く絶対パッチ op が全て収束。
- **データ耐久性 / Longevity (research §3.7)**: 自動保存(IndexedDB)を `navigator.storage.persist()` で
  **耐久(非退避)バケットへ昇格**する `Persist.requestDurable()` を追加。既定の best-effort バケットは
  ディスク逼迫やサイトデータ消去で eviction されうるため、local-first の Longevity 原則に沿って
  ユーザのボードが既定で失われないようにする。依存ゼロ・ネットワーク不要・UIなし。空白の初回ロードでは
  要求せず、**実際に内容を保存した時に一度だけ**要求して第一体験を汚さない。falsifiable ガードを追加。

### Fixed (sync)
- **WebRTC スナップショットに `ops` が欠落していた同期バグ**: `_onRecv` の `snapshot` 受信は、受信側が
  **既に shape を持つ場合 `msg.ops` を使ってマージ**する (空の場合のみ全置換)。しかし WebRTC の
  `dc.onopen` は `_sendSnapshot` を使わず `{k:'snapshot',shapes,peer}` を**手組みで `ops` 抜き**送信して
  いたため、双方が接続前に描いていると **接続後も互いの既存 shape がマージされなかった** (BroadcastChannel
  経由は `_sendSnapshot` が `ops` を含むので正常)。スナップショット構築を `_snapshotMsg()` に抽出し
  両経路で共有。`ops` を含む snapshot をテストで担保 (distinct clock キーで dedup 衝突も回避)。

### Security
- **受信 op の値検証 (research §3-2)**: `validRemotePayload` を全 op 型に拡張。新しい `validPatch()` が
  `upd`/`style`/`resize`/`align` の patch 値から **NaN/Infinity 注入**(描画で shape が消える事故)と
  **`__proto__`/`constructor` 等のプロトタイプ汚染**を拒否。`del`/`clear` は各 shape を `validShape` で
  検証。悪意ある peer が遠隔 op で shape を破壊/汚染する経路を塞いだ。NaN/Infinity/__proto__ の
  拒否と正常 op の適用をテストで担保。
  - 注: SVG エクスポートの座標注入 (research §3-1) は `buildSVG` の `_num()`/`_esc()` で対策済を確認。
- **`validPatch` を再帰化 (受信検証の深さギャップを修正)**: `validPatch` は**トップレベルのキーしか
  見ておらず**、`upd` は `validShape` ではなく `validPatch` 単独で検証されるため、`{pts:[[1,NaN]]}` の
  ような**ネストした配列に埋め込まれた NaN/Infinity** が素通りしていた (注入された NaN 座標は
  `drawPen`/`penWidths` で `Math.hypot(NaN)` を生み描画を破壊)。任意の深さで非有限数・関数・
  プロトタイプ汚染キー (`__proto__` 等) を拒否するよう再帰化。敵対的な深いネスト (スタック溢れ DoS)
  に備え深さ上限 (8) を設けた — 正当な shape はこの深さに達しない。ネスト NaN/Infinity/__proto__/
  関数/過剰ネストの全拒否と正当なネスト pts の受理をテストで担保。

### Fixed
- **共有リンク import の取り消し可能化 (research §3.9/§3.11 self-overwrite 対策)**: `Share.importFromHash`
  はこれまで `state.shapes` を**直接置換**しており、`confirm()` を通すと現在のボードが**取り消し不能**で
  失われた (Store 経由でないため in-session undo も効かなかった)。新たに可逆な `replace` op を `Store._apply`
  に追加し、import を `Store._recordCommitted({op:'replace',before,after})` 経由に変更。誤 import は
  **Ctrl+Z で元のボードに復帰**できる。`replace` は `REMOTE_OPS` allow-list に**含めない**ことで、
  悪意ある peer が遠隔から盤面を全消去する経路を構造的に排除 (テストで担保: import→undo→redo の
  往復、および remote `replace` の拒否)。
  - 残課題 (今後): リロードで in-session undo 履歴が消える (§3.11) ため、リロードを跨ぐ復旧には
    `DOC_KEY:prev` バックアップスロット (§3.9) が別途必要。本修正は in-session の安全網を提供する。
- **z-order 堅牢化 (ADR-0001 後の精査)**: `keyBetween` の無限ループを修正 — `b` が全ゼロキー
  (例 `"0"`) だと無限ループしタブをフリーズし得た (任意文字列 frac を許す `validRemotePayload`
  経由で悪意ある peer が誘発可能な DoS)。両系列が尽きてなお等しい場合に打ち切るガードを追加し、
  アルファベット外文字は 0 とみなして throw を防止。fuzz テストで担保。
- **複製がクリップボードを破壊していた (UX)**: `doDuplicate` は `state.clipboard` を選択図形で
  **上書き**してから `doPaste` を呼んでいたため、Copy A → 別図形 B を選択 → Ctrl+D (B を複製) →
  Ctrl+V が **A ではなく B を貼り付け**ていた。複製は本来コピー/ペーストのバッファから独立すべき
  (Figma 等の標準挙動)。クローン配置ロジックを `_placeCopies(srcShapes)` に抽出し、複製は
  `state.clipboard` を経由しないようにした。複製がクリップボード保持を壊さないことをテストで担保 (非空虚)。
- **ボード import が選択 / wclock を残置していた**: `importBoard` / `importFromHash` は `state.shapes` を
  直接置換して `replace` op を `_recordCommitted` で記録するが、`replace` の `_apply` が行う
  `state.selection.clear()` / `state.wclock={}` は undo/redo 時しか走らない。結果、import 直後に
  **旧ボードの選択 id が残り**、**wclock が旧 id 分リーク**(同一 id を再 import した図形が古い LWW
  クロックを継承し並行編集判定を誤る恐れ)。両 import 箇所で `_apply` と同じクリアを行うよう修正。
- **プレゼン中に編集ショートカットが効いていた**: keydown ハンドラが `Ctrl+Z`/`Ctrl+Y`/`Ctrl+A` を
  `Presentation.isActive()` ガードの**前**に処理していたため、ガードの early-return より先に編集が
  走り、スライドショー中の不意の Ctrl+Z が盤面を書き換えられた (「プレゼン中は編集不可」不変条件に
  違反)。ガードを編集ショートカットの前に移動し、プレゼン中はナビゲーションキーのみ受け付ける。
- **画像読み込み失敗の無反応**: ドラッグ&ドロップ / クリップボード貼り付けの画像 import に
  `img.onerror` / `reader.onerror` が無く、壊れた画像が**無言で失敗**していた。`imgErr` トーストを
  ja/en 両ロケールに追加し両経路で通知。
- **コンテキストメニューの二重セパレータ**: 単一・非グループ図形の選択時、グループ/グループ解除項目
  (複数選択限定) が消えて**セパレータが 2 本連続**で描画されていた。先頭/末尾/連続セパレータを
  除去するフィルタを追加。
- **ミニマップにフレームが描画されていなかった**: ミニマップの図形 switch に `frame` ケースが無く、
  プレゼンの主要ナビ単位であるフレームがミニマップで不可視だった。`rect` ケースへフォールスルー。
- **`exportBoard` の Blob URL リーク**: 他の export 関数と異なり `revokeObjectURL` を呼んでおらず
  メモリリークしていた。ダウンロード後に失効するよう修正。
- **i18n パリティ**: `on`/`off`/`online`/`offline` キーが日本語ロケールにのみ存在し、英語では
  `t()` フォールバックでキー文字列がそのまま表示されていた。英語ロケールに 4 キーを追加。
- **大きいボードの PNG/PDF export が無言で空白になっていた**: `exportPNG` は固定 `scale=2`、
  `exportPDF` は `devicePixelRatio` で raster 化するため、巨大なボードはブラウザの canvas 上限
  (1 辺 ~16384px / 総面積上限) を超え、`toBlob` が null か空白/切れた画像を返していた。幅・高さ・
  面積すべてが上限内に収まる最大スケールを返す純関数 `exportScale(w,h,desired)` を追加し、両 export
  に適用 (失敗ではなく解像度を落とす)。純関数なので単体テストで境界 (辺上限・面積上限・ゼロ寸法) を担保。

### Changed
- **z-order キー churn 抑制**: 既に最前面/最背面に揃っている選択への bring-front / send-back は
  キーを再生成せず**何も記録しない** no-op にした (無駄なキー長の伸びと履歴スパムを防止)。
- **Step 4 (整数 z 廃止) は保留**: `validShape` が `z:number` を必須にしており、`z` はレガシー
  ボードのマイグレーションアンカーでもあるため、完全削除は高リスク・低価値。`z` は frac の
  back-compat フォールバックとして据え置く (詳細は ADR-0001)。

### Added
- **ADR-0001 fractional z-index — Step 3**: 同時並べ替えのキー衝突を **`sortZ` の `(frac, id)` 比較**で
  決定的にタイブレークし、全ピアが同一スタッキング順序に収束するようにした (`shape.id` は複製済み
  globally-unique なので peer 追跡不要)。`validRemotePayload` の `zorder` 検証を強化 (`changes` の各
  要素が `id:string` / `before,after` が string|undefined — 不正キー注入を拒否)。単一ピアの挙動は不変。
  キー衝突の決定的順序・不正ペイロード拒否をテストで担保 (587 pass)。
- **ADR-0001 fractional z-index — Step 2**: z 操作 (前面/背面/前へ/後ろへ) を per-shape の
  キー更新に書き換え、`zorder` op を **`{op:'zorder',changes:[{id,before,after}]}` の最小デルタ**化。
  1 図形の前面化は履歴/ブロードキャストに **1 エントリだけ**載る (旧: 全 shape スナップショット)。
  `_apply` は新形式を主とし旧スナップショット形式も defensive に処理 (混在バージョン/既存履歴)。
  `validRemotePayload` を `changes` 配列に対応。挙動 (前面/背面/前後 1 段) は不変。単一移動 =1 変更・
  複数選択の相対順保持・undo 往復をテストで担保 (587 pass)。sync 衝突解消は Step 3。
- **ADR-0001 fractional z-index — Step 1**: z 順序の正準を整数 `z` から派生キー `frac`
  (base62 between-key) へ移行。`keyBetween` + `reindexFrac` を内蔵し、`sortZ` をキー比較に切替。
  `zorder` op のスナップショットは `{id,z,frac}` を持ち、undo がキーも厳密復元する。旧ボード
  (整数 z のみ) は初回 `sortZ` で自動マイグレート (描画順は不変・冪等)。z 操作 (前面/背面/前へ/
  後ろへ) の挙動は不変、整数 `z` は後方互換フォールバックとして並走。履歴/帯域の最小デルタ化
  (Step 2) と sync 衝突解消 (Step 3) は後続。設計は `docs/ADR-0001-fractional-index-zorder.md`。
  キーの strict-order / dense-insert / prefix-stable と zorder undo のキー往復をテストで担保 (588 pass)。

### Docs
- **`docs/spec.md` を現状(v1.6.70+)へ全面更新**: stale だった記述を是正 — gzip 44KB 予算撤去の反映
  (raw 512KB 緩い上限のみ)、op 表に `style`/`resize`/`replace` 追加・`zorder` 最小デルタ化・幻の `z` op 削除、
  編集機能に回転/反転/ロック/バインド済みコネクタ/キーボードリサイズ/カスタムカラーを追記、§8 に
  プロパティ単位 LWW(ADR-0002)と `replace` の local 専用ガードを明記。新たに **§14 長所・短所・改善点**
  (現状評価 + 優先度付きロードマップ表)を追加。
- ADR-0001 を追加し、Step 1 実装を反映 (Accepted / Step 2〜4 Proposed)。spec §13 /
  research-improvements 項目A / CLAUDE.md MAP から参照。

## [1.6.70] — 2026-06-13

### Added
- **キーボードリサイズ (Alt+矢印)**: ポインタ無しでの図形リサイズを追加 (a11y — Enter作成・
  矢印移動・Tab巡回に続く操作の完結)。左右=幅、上下=高さ、左上アンカー、Shift で ×10。
  box シェイプのみ (ロック除外)。複数選択も**単一 undo** で戻せるよう、汎用バッチパッチの
  新 op `resize` を追加 (`style`/`align` と同じ Object.assign 機構、可逆・sync 対応)。
  単一選択時は新サイズを `aria-live` トーストで読み上げ。help grid に `⌥ ↑↓←→` を追加。

### Tests
- 586 assertions (+6 `resize` バッチ op の apply/undo/redo, +2 presence)。

## [1.6.69] — 2026-06-13

### Added
- **回転シェイプのリサイズ**: 従来 `getHandles` は回転中に `[]` を返し、回転シェイプは一切
  リサイズ不可だった (回転を戻すしかなかった)。8 ハンドルを回転位置に表示し、ドラッグを
  シェイプのローカル (未回転) フレームに変換 → 既存の switch/Shift/Alt ロジックを適用 →
  反対側のアンカー (角/辺中点) を**ワールド座標で固定**するよう平行移動。これで回転シェイプも
  掴んだハンドルから自然に伸縮。選択枠も回転矩形を描くように (包絡矩形でなく実体に密着)。
  共有回転ヘルパ `_rotPt` を追加。Shift (比率) / Alt (中心固定) も回転シェイプで機能。

### Tests
- 578 assertions (+6 ワールドアンカー不変の振る舞い, +3 presence; 既存 3 件を新挙動へ更新)。

## [1.6.68] — 2026-06-13

### Added
- **中心固定リサイズ (Alt)**: リサイズ中に Alt を押すと、ドラッグした辺/角の反対側も対称に
  動き、元の中心を固定したままサイズ変更。Shift+Alt で対称かつ比率保持。Alt 時はオブジェクト
  スナップを抑止 (対称優先)。help grid に `⌥ + ⤡` を追加 (ja: 中心固定リサイズ / en:
  Resize from centre)。

### Tests
- 569 assertions (+9 中心固定リサイズ 振る舞い, +1 presence)。

## [1.6.67] — 2026-06-13

### Added
- **ドラッグ回転ハンドル**: 単一選択した box シェイプ (rect/ellipse/sticky/text/image/frame) の
  上辺中央に回転ノブを表示。ドラッグで自由回転、Shift で 15° スナップ。ノブは回転に追従して
  公転し、回転中のシェイプでも操作可 (resize ハンドルが消える状態でも回転で 0° に戻せる)。
  ピボットはシェイプ中心 (drawShape と一致)、コミットは可逆な `upd` op、確定時に角度を
  `aria-live` トーストで読み上げ。ホバーカーソルは `grab`。これでキーボード (`,`/`.`) と
  ポインタの両方で回転が完結。

## [1.6.66] — 2026-06-13

### Added
- **リサイズ時のオブジェクトスナップ**: リサイズハンドルをドラッグすると、動かしている辺が
  近傍シェイプの辺/中心にスナップ (移動スナップとパリティ)。`resizeSnap` が動かす座標のみを
  スナップし、整列ガイドを表示。グリッドスナップ ON 時は従来通りグリッド優先 (排他)、回転
  シェイプと線端点 (p1/p2) はスキップ。コミット時にガイドをクリア。これで spec §13 の
  「リサイズ時のオブジェクトスナップ」将来課題を解消。
- **比率保持リサイズ (Shift)**: 角ハンドルを Shift 押下でドラッグすると元の縦横比を維持
  (対角のコーナーを固定)。動いた方の軸を基準に他軸を従動。Shift 時はオブジェクトスナップを
  抑止 (比率優先)。辺ハンドルは影響なし。help grid に `⇧ + ⤡` を追加 (ja/en)。

### Tests
- 546 assertions (+6 obj-snap, +9 aspect-lock 振る舞い, +3 presence)。

## [1.6.65] — 2026-06-13

44KB gzip 予算の撤去後、予算の壁で据え置いていた実改善を全実装。

### Added / Fixed
- **回転を全 box 型へ拡張**: rect/ellipse に加え sticky/text/image/frame も回転可能に
  (`doRotate` フィルタを `s.w!=null` に)。pen/line/arrow は点ジオメトリのため引き続き除外。
- **コネクタの実エッジ投影**: `_edgePt` を回転対応に。束縛シェイプが回転していても、
  包絡矩形ではなく**実際の回転エッジ**へ端点を投影 (対象点を逆回転 → エッジ計算 → 順回転)。
- **text の bbox 回転包絡**: text の早期 return を撤去し、回転時に包絡矩形を返すように
  (選択枠・エクスポートクロップが回転 text を正しく含む)。
- **SVG 回転の全型対応**: text/image/sticky/frame に `transform="rotate(...)"` を適用。
- **ミニマップ回転**: ミニマップの各 box シェイプに回転変換を適用 (本体描画と一致)。
- **describeShape の a11y**: Tab 巡回時の SR アナウンスにロック状態 (`ctxLock`) と回転角
  (`45°`) を追加。

### Changed
- gzip サイズ 44,964B → 45,350B (予算撤去済み、raw 153KB は 512KB 上限内)。

### Tests
- 528 assertions。追加: sticky 回転・回転コネクタ実エッジ・describeShape a11y の
  振る舞いテスト + presence 5 件。

## [1.6.64] — 2026-06-13

ソクラテス問答監査の第 4 ラウンド: 回転・ロック(新機能)が、それ以前に書かれた
サブシステムへ波及していない箇所を発見し修正。

### Fixed
- **回転が pen/line/arrow で破綻**: これらは点ジオメトリ(s.x/s.w が無い)のため
  回転中心が NaN になり、描画が原点周りに飛んでいた。回転を**幾何学的に整合する
  rect/ellipse に限定**(draw/hit/bbox/SVG/PNG が全て一致する型のみ)。
- **ロックが削除を防がない**: `doMove` はロックを尊重するのに `doDelete` と消しゴムは
  ロックシェイプを削除できた(半端な保護)。両者ともロックシェイプをスキップし、
  ロックを完全な「保護」に。混在選択では未ロックのみ削除。

### Docs
- `docs/architecture.md` に回転スコープ(rect/ellipse 限定の理由)と、据え置いた
  既知ギャップ(ミニマップは回転非表示・describeShape はロック/回転を未読み上げ・
  マーキーはロックを選択するが移動はしない)を明記。

### Tests
- 520 assertions。追加: 回転スコープ(line no-op)・ロック削除保護の振る舞い
  テスト + presence 3 件。冗長コメント簡潔化で予算確保(44,964B)。

## [1.6.63] — 2026-06-13

ソクラテス問答監査の第 3 ラウンド: 新機能（回転・検索）の内部的一貫性と
アクセシビリティの矛盾を修正。

### Fixed
- **複数選択回転の中心が不統一**: `doRotate` は各シェイプをその場で回転させる一方、
  `doFlip` は選択 bbox 中心でミラーしていた。回転も群中心で公転するよう統一
  (単一選択はその場回転のまま)。位置と角度の両方が undo 可逆。
- **`doFlip` がロックを無視**: `doRotate` はロックシェイプを除外するのに `doFlip` は
  していなかった。`filter(s=>s&&!s.locked)` に統一(ロック中は反転も不可)。
- **検索 Esc でフォーカス喪失** (WCAG): Esc 後に `canvas.focus()` でフォーカスを
  キャンバスへ返す(ヘルプ・共有モーダルと同じ作法)。
- **検索入力に aria-label 欠落** (WCAG): placeholder だけでなく `aria-label` も付与。

### Docs
- `docs/architecture.md` の回転制約を更新(複数選択は群中心で公転)。

### Tests
- 515 assertions。追加: 群中心公転 / 単体その場回転 / ロック反転 no-op の振る舞い
  テスト + presence 4 件。冗長コメント簡潔化で gzip 予算を確保(45,037B)。

## [1.6.62] — 2026-06-13

ソクラテス問答監査の第 2 ラウンド: 新機能（回転・検索）が既存機能を静かに壊している
相互作用の矛盾を発見し修正。

### Fixed
- **反転 + 回転の合成バグ**: `flipShape` が座標のみ反転し `rotate` を補正しないため、
  回転シェイプの反転結果が視覚的に破綻していた。反転は角度の向きを反転させるため
  `s.rotate=(360-s.rotate)%360` を適用(undo 可逆)。
- **回転シェイプの誤解を招くリサイズハンドル**: ハンドルは未回転 bbox 角に描画され、
  視覚的にシェイプから浮いて見えた。`getHandles` で回転中は `[]` を返し非表示に。
- **検索 placeholder の i18n 漏れ**: ハードコードの `'Search / 検索'` を `t('search')` に。
- **新機能の発見性**: 回転 (`,`/`.`) と検索 (Ctrl+F) をヘルプグリッドに追加。

### Added
- i18n キー `rotate` / `search` を ja/en 両方に追加。

### Docs
- `docs/architecture.md` に回転の既知の制約を明記(コネクタは包絡矩形接続・整列は
  包絡矩形基準・回転中リサイズ不可)。予算 44KB 制約下での意図的トレードオフ。

### Tests
- 509 assertions。追加: flip+rotation 合成の振る舞いテスト + presence 6 件。

## [1.6.61] — 2026-06-13

機能ギャップ監査の残り P3 項目: 回転とシェイプ検索を実装。

### Added
- **回転 (rotate)**: `,` / `.` キーで選択シェイプを 15° 単位で反時計回り / 時計回りに回転。
  `shape.rotate` フィールド(度数)。Canvas 描画 / G.hit 逆変換 / G.bbox 包絡矩形 /
  SVG エクスポート `transform="rotate(...)"` 全て対応。完全 undo/redo 可逆。
- **シェイプ検索 (Ctrl+F)**: 検索バー表示、label / text / type にマッチするシェイプを
  オレンジ枠でワールド座標上にハイライト。Esc で閉じる。undo 不要 (表示専用)。

### Changed
- 冗長コメント 9 ブロックを簡潔化して gzip 予算確保 (≈485B 削減)。
- gzip サイズ: ~44,295B → ~45,045B (予算 45,056B 内)。

### Tests
- 503 assertions (presence + behavioural). 追加チェック 11 件:
  doRotate / G.bbox 包絡 / G.hit 逆変換 / SVG transform / 検索 DOM / 検索ハイライト。

## [1.6.60] — 2026-06-11

feat: バインドコネクタ — 機能ギャップ監査の最高価値 P2 項目。矢印 / 直線の端点を
シェイプに束縛し、シェイプ移動・リサイズに追従させる(フロー図作成の定番操作)。

### Added
- 矢印 / 直線の端点をシェイプ上にドロップすると、その端点が `s.a` / `s.b`
  (シェイプ id)として束縛される。両端を同一シェイプには束縛しない。
- `connEnds(s)`: 束縛端点を**描画 / ヒットテスト / bbox / SVG・PNG・minimap 出力時に
  動的計算** — 束縛シェイプの bbox エッジ上に投影。シェイプが動けばコネクタが追従。
  保存座標 `x1/y1/x2/y2` は未束縛端・フォールバック用。
- `_edgePt(box,fx,fy)`: 中心から方向 (fx,fy) への bbox エッジ交点。
- 束縛端点はリサイズハンドルを表示しない(シェイプに追従するため)。

### Changed
- `G.bbox` / `G.hit` の line/arrow、`drawArrow` / line 描画、SVG export、minimap を
  全て `connEnds` 経由に統一(描画と当たり判定の一貫性)。
- 束縛シェイプ削除時は保存座標へグレースフルにフォールバック。undo で復活すれば再束縛。
- gzip 予算確保のため冗長コメント 4 ブロックを簡潔化(spatial index、getCSS、SVG coerce、connEnds)

### Tests
- behavioral 1 ブロック(エッジ投影 / 移動追従 / bbox 追従 / 削除フォールバック)
- presence 7 件 — 492 total
- gzip 44,860B (196B under 45,056B budget)

---

## [1.6.59] — 2026-06-11

feat: レーザーポインタ + シェイプロック — 機能ギャップ監査の P2 項目 2 件。

### Added
- **レーザーポインタ**: プレゼンモード中、ポインタ位置に赤い発光ドットを追従表示
  (`_laser` state、`pointermove` で更新、`draw()` で描画、退出/`pointerleave` でクリア)。
  発表時に図を指し示せる。状態は一切永続化しない(描画のみ)。
- **シェイプロック**: コンテキストメニューで選択シェイプの `locked` をトグル。
  ロック中は移動・リサイズ不可(`getHandles` が空配列、`doMove` がスキップ、
  move op から除外)、ホバー時 `not-allowed` カーソル、選択時は破線アウトライン
  (ハンドル非表示)でロック状態を可視化。**選択は可能**
  (レイヤーパネルが無いため、ロック解除の唯一の手段として選択を許可)。
- `doLock()`: 専用 op を持たず **`align` op を再利用**(`{id,locked}` パッチの
  before/after を記録)するため `_apply` 分岐の追加ゼロで完全可逆。

### Changed
- gzip 予算確保のため冗長なインラインコメント 6 ブロックを簡潔化
  (cycleSel a11y、penWidths、snapBox、_penPr、buildSVG ヘッダ)

### Tests
- behavioral テスト 1 ブロック(ロック toggle / ハンドル無効 / undo・redo / 空選択 no-op)
- presence テスト 11 件 — 484 total
- gzip 44,390B (666B under 45,056B budget)

---

## [1.6.58] — 2026-06-10

feat: rect / ellipse 中央ラベル — 機能ギャップ監査の P1 項目。
ダブルクリックで中央にテキストラベルを追加・編集できる(フローチャートのボックス等に便利)。

### Added
- rect / ellipse をダブルクリックすると inline input が shape 中央付近に表示され、
  `label` フィールドを編集できる
- `drawShape`: `s.label` が存在する場合、rect / ellipse の中央にテキストを描画
  (`textAlign='center'`, `textBaseline='middle'`)
- SVG export: rect / ellipse の `label` を `<text text-anchor="middle">` として出力
- label の変更は `{op:'upd', before:{label:…}, after:{label:…}}` で記録 — **完全可逆**
  (null sentinel でアンドゥ時に確実に消去)

### Changed
- dblclick ハンドラのフレームラベル editor を rect/ellipse にも適用するよう拡張
  (コード共有: `isFrame` フラグで分岐)
- gzip 予算確保のため冗長なインラインコメント 5 ブロックを簡潔化
  (`penWidths` 圧力、`drawPen` 可変幅、`pointercancel`、`applyRemote`、`_num`/`wrapText`)

### Tests
- behavioral テスト 9 件(rect ラベル設定/undo、ellipse ラベル undo/redo、SVG エスケープ)
- presence テスト 3 件 — 472 total
- gzip 44,580B (476B under 45,056B budget)

---

## [1.6.57] — 2026-06-10

feat: シェイプ反転 (flip H/V) — 機能ギャップ監査の P1 項目。選択シェイプを選択 bbox の
中心軸でミラーリング。box は x/y、line/arrow は端点、pen は全点を反転。

### Added
- `doFlip(axis)` / `flipShape(s,axis,c)`: 専用 op を持たず **`align` op を再利用**(変更前後の
  完全クローンを記録)するため、`_apply` 分岐の追加ゼロで完全可逆
- ⇧H(左右反転)/ ⇧V(上下反転)キーボードショートカット(選択時のみ発火)
- コンテキストメニューに「左右反転 / 上下反転」エントリ(ショートカット表示付き)
- i18n: `ctxFlipH` / `ctxFlipV`(ja/en)

### Changed
- gzip 予算確保のため冗長なインラインコメント(`validShape` / `validRemotePayload` /
  Store op リスト / Tab 巡回)を簡潔化。設計根拠は `docs/architecture.md` に集約・保存
  (反転の仕組み・受信 op 検証の節を追記)
- presence テスト `op-log op types`: stale な `op:'z'` を実在の `op:'zorder'` に修正

### Tests
- `doFlip` の behavioral テスト 11 件(box ミラー+undo、pen 垂直反転、line 端点反転、空選択 no-op)
- flip 配線の presence テスト 3 件 — 460 total
- gzip 45,043B (13B under 45,056B budget)

---

## [1.6.56] — 2026-06-10

feat: カスタムカラーピッカー — プリセット 7 色に加え、ネイティブ `<input type="color">` で
ストローク・塗りに任意の 24bit 色を指定可能に。機能ギャップ監査 (`docs/feature-gap-2026-06.md`) で
「プリセット以外の色が選べない」が最頻出の欠落と判明したため最優先で実装。

### Added
- スタイルパネルにストローク用・塗り用のカスタムカラー入力を追加 (`input.cp`)
- 選択中シェイプにも即時反映 (既存の `applyStyleToSelection` 経路を再利用)
- カスタム色選択時はプリセットスウォッチの `aria-pressed` を解除

### Changed
- gzip 予算内に収めるため `zorder` / `validRemotePayload` の冗長コメントを簡潔化
  (設計根拠は `docs/architecture.md` に保持)

### Docs
- `docs/feature-gap-2026-06.md`: 長所・短所・欠落機能の監査と優先度付きロードマップを新規追加

### Tests
- カスタムカラーピッカーの presence テスト 3 件追加 (446 total)
- gzip 45,032B (24B under 45,056B budget)

---

## [1.6.55] — 2026-06-10

tests: doAlign 残り4バリアント (right/bottom/cx/cy)、G.hit 楕円 (filled/unfilled)、remote del op の behavioral テスト追加。

### Tests
- `doAlign('right')`: 右端を最右端に揃える
- `doAlign('bottom')`: 下端を最下端に揃える
- `doAlign('cx')`: 水平中心を union の中心に揃える
- `doAlign('cy')`: 垂直中心を union の中心に揃える
- `G.hit` 楕円 filled (内部ヒット/外側ミス) と unfilled (境界ヒット/内部ミス)
- `Store.applyRemote({op:'del',...})`: リモートの del op でシェイプが削除される
- 443 total; gzip 45,023B (no HTML change)

---

## [1.6.54] — 2026-06-10

tests: del op と clear op の behavioral テスト追加 (シェイプ削除・全消去の可逆性)。

### Tests
- `Store.commit({op:'del',...})`: シェイプが削除され、undo で復元される
- `Store.commit({op:'clear',...})`: 全シェイプが消去され、undo で両方復元される
- 432 total; gzip 45,023B (33B under budget)

---

## [1.6.53] — 2026-06-10

tests: move op と upd op の behavioral テスト追加 (座標移動と任意フィールド更新の可逆性)。

### Tests
- `Store.commit({op:'move',...})`: dx/dy で座標が移動、undo で復元
- `Store.commit({op:'upd',...})`: after パッチでフィールド更新、undo で before に復元
- 424 total; gzip 45,022B (34B under budget)

---

## [1.6.52] — 2026-06-10

a11y: ダイアログ開閉時のフォーカス管理 (WCAG 2.4.3 Focus Order)。

### Fixed
- **ヘルプダイアログ開閉時にフォーカスが移動しない (WCAG 2.4.3)** — `toggleHelp()` を改修。
  - 開くとき: `helpClose` ボタンにフォーカス移動 (SR ユーザーがダイアログ内容にアクセス可)。
  - 閉じるとき: `btnHelp` にフォーカスを戻す (モーダルを開いたボタンに復帰)。
- **共有ダイアログ開閉時にフォーカスが移動しない (WCAG 2.4.3)** — `openShare()`/`closeShare()` を改修。
  - 開くとき: `shareClose` ボタンにフォーカス。
  - 閉じるとき: `btnShare` にフォーカスを戻す。

### Tests
- 3 presence checks 追加 → 418 total; gzip 45,023B (33B under 45,056B budget)

---

## [1.6.51] — 2026-06-10

tests: Shape.translate と G.marqueeHit の behavioral テスト追加。

### Tests
- `Shape.translate`: rect (x/y)、line (x1y1/x2y2)、pen (全 pts) の座標シフト
- `G.marqueeHit`: 完全包含でtrue、部分重複でfalse
- 415 total; gzip 44,987B (69B under budget)

---

## [1.6.50] — 2026-06-10

tests: pickTop と sortZ の behavioral テスト追加。

### Tests
- `pickTop`: 最上位 z シェイプを返す、ミスで null、フレームより非フレーム優先、フレームのみの場合はフレームを返す
- `sortZ`: shapes 配列が z 値の昇順にソートされる
- 備考: 未塗りの rect は内部をヒットしない (境界のみ) — テストで filled rect を使用
- 404 total; gzip 44,987B (69B under budget)

---

## [1.6.49] — 2026-06-10

tests: doGroup/doUngroup の behavioral テスト追加 (グループ化・解除の完全undo/redoサイクル)。

### Tests
- `doGroup`: 2 shapes に同じ groupId が付与される
- `doGroup` undo/redo: groupId が消去・復元される
- `doUngroup`: 選択 1 枚でもグループ全体が解除される
- `doUngroup` undo: before スナップショットから groupId が復元される
- 393 total; gzip 44,986B (70B under budget)

---

## [1.6.48] — 2026-06-10

tests: applyResize, penWidths, _buildGrid/_queryGrid の behavioral テスト追加。

### Tests
- `applyResize`: se/nw ドラッグ展開、最小サイズクランプ(4px)、p1 ライン端点
- `penWidths`: 出力長、単一点=フル幅、遠い間隔でテーパー、筆圧スケール
- `_buildGrid`/`_queryGrid`: 近傍ヒット、遠方除外、空グリッド
- 382 total; gzip 44,986B (70B under budget)

---

## [1.6.47] — 2026-06-10

tests: wrapText (6 cases) と getHandles(ellipse/sticky) の behavioral テスト追加。

### Tests
- `wrapText`: 短文/改行/空文字/null/単語折り返し/文字折り返し の 6 ケース
- `getHandles` ellipse と sticky: 8 ハンドル、各位置の検証
- 363 total; gzip 44,986B (70B under budget)

---

## [1.6.46] — 2026-06-10

tests: G.bbox/bboxAll, cycleSel, describeShape, inView の behavioral テスト追加。

### Tests
- G.bbox (rect/text/line/pen 各形状のバウンディングボックス) + G.bboxAll (ユニオン) 9 件
- cycleSel (前進/後退/折り返し/未知カーソル) 6 件
- describeShape (SR アナウンス形式) 2 件
- inView (視錐台カリング: 可視/不可視) 3 件
- 計 +20 behavioral assertions → 346 total; gzip 44,986B (70B under budget)

---

## [1.6.45] — 2026-06-10

a11y: 接続状態の aria-live アナウンス + ズームバッジのグループ語義。

### Fixed
- **オンライン/オフライン切り替えが SR に伝わらない** — `sConn` span に `aria-live="polite"`
  を追加。`updateOnline()` でテキストが書き換えられるとき、SR が変更を読み上げるように。
- **ズームコントロールに役割がない** — `.zoom-badge` div に `role="group" aria-label="Zoom controls"`
  を追加。ズームアウト / ズームレベル / ズームイン / FIT ボタンが 1 つの制御グループとして SR に認識される。

### Tests
- 2 presence checks 追加 → 327 total; gzip 44,986B (70B under 45,056B budget)

---

## [1.6.44] — 2026-06-10

a11y: minimap canvas に `role="img"` と説明的 `aria-label` を追加; 装飾的 `x,y` ラベルを `aria-hidden` に。

### Fixed
- **minimap canvas のスクリーンリーダー表現** — `aria-label="minimap"` (非説明的) を
  `role="img" aria-label="Board minimap — click to navigate"` に変更。
  画像ロールで SR が「画像」と告知し、ラベルで目的と操作方法を説明。
- **ステータスバー `x,y` ラベルが SR に読まれる** — `<span class="lbl">x,y</span>` は
  隣の座標値 (`id="sXY"`) の装飾的見出し。`aria-hidden="true"` を追加し、SR が
  座標値のみ読み上げるよう修正 (他の `data-t` ラベルと同じ扱い)。

### Tests
- 3 presence checks 追加 (minimap role/label, x,y aria-hidden)
- 2 behavioral tests 追加 (G.hit text/frame shapes) → 325 total; gzip 44,978B (78B under budget)

---

## [1.6.43] — 2026-06-10

a11y: ズーム表示を `<div>` から `<button>` に変換 (WCAG 2.1.1 キーボードアクセス)。

### Fixed
- **ズーム表示がキーボードで操作できない (WCAG 2.1.1)** — `<div class="zoom-val">` を
  `<button class="zoom-val">` に変換。これにより Tab フォーカス・Enter/Space でズームリセット・
  スクリーンリーダーへのインタラクティブ要素告知が可能に。
  `aria-label="Zoom level, click to reset"` を追加し現在値と動作を説明。
  CSS の `cursor:pointer` は削除 (button グローバルリセットで不要)。

### Tests
- 2 presence checks 追加 (320 total); gzip 44,966B (90B under 45,056B budget)

---

## [1.6.42] — 2026-06-10

a11y: canvas `aria-label` をツール切替時に動的更新 (WCAG 2.1.1)。静的な長い説明文を削除し 54B 節約。

### Changed
- **canvas `aria-label` を `pickTool` で動的更新 (WCAG 2.4.6)** — 静的な 244 文字ラベル (全ショートカット列挙) を
  `"Drawing canvas"` プレースホルダーに置き換え、`pickTool` が呼ばれるたびに
  `"${tool} — Drawing canvas. Tab/Shift+Tab cycles shapes, Enter creates, arrows move."` をセット。
  - ユーザーが選択中のツールが `aria-live` 対応 SR でリアルタイムにアナウンスされる
  - ツール名 (e.g. `pen`/`rect`/`frame`) が含まれ、どのモードにいるかが明確
  - 44 文字に短縮した静的文字列により **gzip 54B 節約** → 44,956B (100B under budget)

### Tests
- 2 presence checks 更新 (canvas aria-label の静的文字列 → 動的パターン); 318 total, 0 fail

---

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
