# CLAUDE.md — Board

このファイルは Claude (および人間の協力者) が Board プロジェクトで迷わないための索引。

## WHY — 目的

既存のホワイトボードはサインアップ / 重量 / 有料 / プライバシーのいずれかを要求する。  
Board は 4 つ全部を否定する: **単一HTML、ゼロ登録、完全無料、E2E 対応予定**。

勝利条件: 「使い始めるのに 0 秒」「オフラインで等価に動く」「単一HTMLで小さく保つ」。  
破れたらプロダクト価値は消える。

> **サイズ予算について (2026-06-13 変更)**: かつて「gzip 44KB 未満」を厳格な不変条件として
> CI / test.mjs で強制していたが、予算の壁が実改善 (回転の全型対応・コネクタ実エッジ投影・
> a11y) の据え置きを繰り返し招いたため**撤去**した。サイズは依然として価値 (単一ファイル・
> 高速ロード) だが、ハードな上限ではなく**指針**として扱う。暴走防止に raw 512KB の緩い上限
> のみ残す。新機能は「小さく保つ」意識を持ちつつ、整合性・正しさを優先してよい。

## MAP — 構造

```
Board/
├── index.html             # 本体 (単一ファイル、~349KB raw / ~113KB gzip / ~93KB brotli)
│   ├── <style>            # デザイントークン + レイアウト + モーション
│   └── <script>
│       ├── CONSTANTS      # atomic config
│       ├── I18N           # ja / en
│       ├── STATE          # single source of truth
│       ├── GEOM           # pure geometry, hit test
│       ├── Store          # op-log, undo/redo (Command)
│       ├── Shape          # shape factories, translate
│       ├── RENDER         # RAF loop, drawShape, draw (シーン) / drawOverlay (クローム、ADR-0024), 局所再描画 (ADR-0026)
│       ├── INPUT          # pointer + keyboard + wheel
│       ├── tool handlers  # beginPen / beginRectLike / ...
│       ├── Persist        # IndexedDB
│       ├── UI             # DOM side-effects
│       ├── wire()         # event binding
│       ├── main()         # bootstrap
│       └── Service Worker # inline blob, offline cache
├── README.md              # 公開用
├── CHANGELOG.md           # セマンティックバージョニング
├── CLAUDE.md              # この文書
├── LICENSE                # MIT
├── docs/
│   ├── architecture.md    # 詳細設計
│   ├── spec.md            # 仕様書 + 適合ギャップ追跡
│   ├── audit-2026-06.md   # カテゴリ別改善監査
│   ├── feature-triage-2026-07.md  # 機能過不足トリアージ (ソクラテス式問答。主要な負債はタッチ到達不能性)
│   ├── feature-backlog.md  # 上記の実行可能チケット化 (Opus/Sonnet が文脈なしで着手できる形式)
│   ├── instructions-opus-sonnet.md  # 文脈ゼロで着手する統合指示書 (長所短所改善+作業規律+モデル使い分け, v1.7.69)
│   ├── research-improvements.md  # 改善案調査
│   ├── ADR-0001-fractional-index-zorder.md  # z順序の分数インデックス化 (Step1-3実装済/Step4 見送り確定)
│   ├── ADR-0002-per-property-lww.md  # 並行編集の収束: プロパティ単位 LWW (upd/style 実装済)
│   ├── ADR-0003-connector-labels.md  # コネクタ(エッジ)ラベル — フロー図向け (実装済)
│   ├── ADR-0004-self-overwrite-protection.md  # 全消去/インポート直前のボードを自動バックアップ (実装済)
│   ├── ADR-0005-sketch-beautification.md  # ペンストロークの図形認識 (line/rect/ellipse, 幾何ヒューリスティック, 実装済)
│   ├── ADR-0006-touch-long-press.md  # タッチ long-press でコンテキストメニュー (FT-06, 実装済)
│   ├── ADR-0007-export-menu-import-picker.md  # エクスポートメニュー + .board ファイルピッカー (FT-07, 実装済)
│   ├── ADR-0008-share-modal-clarity.md  # Share モーダルの役割明示化 + コピーボタン (FT-05, 実装済)
│   ├── ADR-0009-id-index.md  # byId O(1)化 + グリッドキャッシュ無効化の一本化 (実装済)
│   ├── a11y-audit-2026-07.md  # a11y監査 (依存ゼロ静的検証、フォーカスリングのコントラスト不備を発見・修正)
│   ├── ADR-0010-peer-cursor-presence.md  # ピアカーソル表示 (spec.md P1「プレゼンス」、実装済)
│   ├── ADR-0011-peer-selection-highlight.md  # ピア選択ハイライト (FT-12、frame() 変化検出で送信、実装済)
│   ├── ADR-0012-theme-toggle.md  # テーマ手動トグル (FT-18、言語トグルは FT-18b に分離・見送り、実装済)
│   ├── ADR-0013-keyboard-label-edit.md  # Enter でラベル/テキスト再編集 (FT-19、_openLabelEditorFor共有、実装済)
│   └── ADR-0014-language-toggle.md  # 言語手動トグル (FT-18b、LANG/T を let 化、実装済)
│   ├── ADR-0015-share-link-e2e-encryption.md  # 共有リンクの AES-256-GCM E2E 暗号化 (FT-21)
│   ├── ADR-0016-spatial-index-draw-culling.md  # draw() の可視判定を空間索引化 (FT-14)
│   ├── ADR-0017-webrtc-failure-feedback.md  # WebRTC 接続失敗のトースト通知 (FT-20)
│   ├── ADR-0018-pen-bitmap-cache.md  # ペン stroke のオフスクリーン rasterize キャッシュ
│   ├── ADR-0019-pen-bbox-memoization.md  # G.bbox ペン包絡の O(1) シグネチャメモ化
│   ├── ADR-0020-snap-edge-index.md  # オブジェクトスナップのソート済みエッジ索引
│   ├── ADR-0021-image-cache-key.md  # 画像キャッシュの O(1) フィンガープリントキー
│   ├── ADR-0022-image-import-downscale.md  # 2048px 超過画像の WebP 縮退 (ドロップ/ペースト統合)
│   ├── ADR-0023-predicted-ink-tail.md  # ペン入力の getPredictedEvents 先行インク
│   ├── ADR-0024-layered-overlay-canvas.md  # シーン/オーバーレイの 2 層キャンバス分離
│   ├── ADR-0025-minimap-content-cache.md  # ミニマップの _gridVer 連動ビットマップキャッシュ
│   ├── ADR-0026-drag-damage-rect.md  # ドラッグ系ジェスチャの局所再描画 (accumulated world damage rect)
│   ├── ADR-0027-op-level-damage.md  # _apply/applyRemote の op 単位ダメージ伝播
│   ├── ADR-0028-pan-pixel-blit.md  # パンの自己 drawImage blit + 露出帯のみ再描画
│   ├── ADR-0029-draft-ink-stamp.md  # 下書きペンの増分インクスタンプ (確定セグメント bitmap + 生きた末尾ベクトル)
│   ├── ADR-0030-pinch-zoom-preview.md  # ピンチズームのスナップショット・スケールプレビュー
│   ├── ADR-0031-image-blob-separation.md  # 画像 dataUrl を content-hash の imgs ストアへ分離 (FT-15 stage1、IDB v2)
│   ├── ADR-0032-grid-accelerated-hit-testing.md  # マーキー選択・pickTop の空間索引流用 (per-pointermove 全走査の解消)
│   ├── ADR-0033-wheel-zoom-preview.md  # ctrl+wheel (トラックパッドピンチ) ズームのスナップショットプレビュー
│   ├── ADR-0034-pen-rdp-zoom.md  # ペン RDP 反復化 + ズーム適応 eps (精密筆跡の保持)
│   ├── ADR-0035-img-ref-hygiene.md  # 画像参照ハイジーン (_imgKey 3点指紋, img 輸出遮断, 欠落画像クラッシュ防止)
│   ├── ADR-0036-minimap-drag-scrub.md  # ミニマップ押下ドラッグで連続ナビゲート
│   ├── ADR-0037-sr-selection-announce.md  # ポインタ選択の SR アナウンス (クリック/マーキー/⌘A/Esc)
│   ├── ADR-0038-share-link-reject-feedback.md  # 共有リンク拒否経路を toast+ハッシュクリアで統一
│   ├── ADR-0039-share-payload-ceiling.md  # 共有リンクの展開後サイズ/形状数の上限 (deflate ボム対策)
│   ├── ADR-0040-share-url-length-feedback.md  # 長い共有リンクの警告 + 生成失敗の可視化
│   ├── ADR-0041-dom-mirror-a11y.md  # 図形の DOM ミラー (SR ナビゲーション、spec P1)
│   ├── ADR-0042-svg-import.md  # SVG → Board 図形 (貼付/ドロップ/ピッカー、spec P2)
│   ├── ADR-0043-excalidraw-import.md  # .excalidraw → Board 図形 (拡張子+内容検出、spec P2)
│   ├── ADR-0044-text-paste.md  # OS テキストペースト → text shape (Markdown 平文取込)
│   ├── ADR-0045-invite-link.md  # 招待コードを #s=<offer> URL 化 (受け手の貼り付けを省略)
│   ├── ADR-0046-pen-outline-fill.md  # ペンの union-of-primitives アウトライン塗り (テーパー端)
│   ├── ADR-0047-group-halo-index.md  # グループハロー Map の _gridVer キャッシュ (overlay 全走査解消)
│   ├── ADR-0048-search-match-index.md  # 検索マッチリストの {_gridVer, _sq} キャッシュ
│   ├── ADR-0049-zoom-to-selection.md  # ⇧2 選択ズーム + _fitViewport 共通化
│   ├── ADR-0050-copy-png-clipboard.md  # PNG のクリップボードコピー (_renderPngBlob 共有)
│   ├── ADR-0051-pen-resize.md  # ペンの真のリサイズ (pts アフィン写像、仮想ボックス経由)
│   ├── ADR-0052-export-selection.md  # 選択図形のみのエクスポート (shapes 引数で共有レンダラ)
│   ├── ADR-0053-text-editor-follows-viewport.md  # テキスト編集中の pan/zoom 追従 (frame 境界 _teFollow)
│   ├── ADR-0054-zoom-bound-noop.md  # ズーム境界での純粋 no-op (micro-pan 解消)
│   ├── ADR-0055-rotate-point-geometry.md  # pen/line/arrow の回転 (点剛体回転、群中心)
│   ├── ADR-0056-multi-selection-resize.md  # 複数選択の8ハンドル群リサイズ (align op)
│   └── ADR-0057-rotation-knob-point-geometry.md  # 回転ノブを pen/群選択にも (デルタ角 grot)
- [ADR-0058](docs/ADR-0058-snapshot-lww-merge.md) スナップショットマージを per-property LWW で収束 (snapshot op に wclock 同梱、既存図形のプロパティ単位マージ)
- [ADR-0059](docs/ADR-0059-style-panel-selection-sync.md) スタイルパネルを選択図形に同期 (選択署名で per-property 同期、混在 prop は据置)
- [ADR-0060](docs/ADR-0060-alt-drag-duplicate.md) Alt+ドラッグ複製 (_placeCopies 再利用、selection→コピーで move-drag)
- [ADR-0061](docs/ADR-0061-diamond-shape.md) diamond シェイプ (Excalidraw-parity、ボックス型で全既存経路対応)
- [ADR-0062](docs/ADR-0062-elbow-connector.md) エルボー (直角) コネクタ (スタブ+中間点の Manhattan 経路、ctx トグル=style op)
- [ADR-0063](docs/ADR-0063-bidirectional-arrow.md) 双方向矢印 (`start` prop、ctx トグル=style op、elbow 合成可)
- [ADR-0064](docs/ADR-0064-gesture-readout.md) 変換中ライブ寸法ピル (state.readout、applyResize/moveDelta/rotate で設定、ptr.down でゲート)
- [ADR-0065](docs/ADR-0065-connector-rebind.md) 端点の再結合/解除 (p1/p2 常時ハンドル、bindPreview、_endPointBind)
- [ADR-0066](docs/ADR-0066-shift-axis-move.md) Shift+drag 軸拘束移動 (moveDelta 支配軸ゼロ化、objectSnap スキップ)
- [ADR-0067](docs/ADR-0067-shape-edge-projection.md) 結合点の輪郭投影 (diamond/ellipse コンター式、_edgePt)
- [ADR-0068](docs/ADR-0068-curved-connector.md) 曲線コネクタ (s.curve 排他フラグ、二次ベジエ、_curveCtrl/Segs)
- [ADR-0069](docs/ADR-0069-wire-image-refs.md) ワイヤー画像参照 (_imgSlim を op/snapshot に適用、k:'img' 64KB チャンク)
- [ADR-0070](docs/ADR-0070-quick-connect.md) quick-connect (hover 図形の4辺中点ドット、qline→endLineLike)
- [ADR-0071](docs/ADR-0071-equal-gap-snap.md) 等間隔スナップ (同一行連続ペアの間隔 g へ吸着、エッジ優先)
- [ADR-0072](docs/ADR-0072-elbow-bend-drag.md) elbow trunk ドラッグ (s.bend 絶対座標、ebend→style op)
- [ADR-0073](docs/ADR-0073-text-align.md) テキスト揃え (s.align、ctx メニュー巡回、canvas/SVG/editor 一致)
- [ADR-0074](docs/ADR-0074-box-label-wrap.md) ボックスラベル折返し (wrapTextCached、SVG tspan 複数行)
- [ADR-0075](docs/ADR-0075-font-size-keys.md) フォントサイズキー (⌘⇧,/.、fontSizeStep ±2 clamp)
- [ADR-0076](docs/ADR-0076-connector-waypoint.md) 直線ウェイポイント (s.way、_linePts、中点ドラッグ)
- [ADR-0077](docs/ADR-0077-hatch-fill.md) ハッチ/斜格子フィル (s.fstyle、_hatchSegs、ctx巡回)
- [ADR-0078](docs/ADR-0078-text-bold-italic.md) 太字/斜体 (⌘B/⌘I、s.bold/italic、_fontStr)
- [ADR-0079](docs/ADR-0079-match-size.md) 幅/高さ揃え (doMatchSize、align op、ctx3項目)
- [ADR-0080](docs/ADR-0080-smart-duplicate.md) スマート複製 (dupIds/dupDelta、反復ベクトル)
- [ADR-0081](docs/ADR-0081-label-editor-position.md) ラベル編集位置 (_connLabelXY、diamond/経路対応)
- [ADR-0082](docs/ADR-0082-sticky-recolor.md) 付箋色変更 (fill→color マップ、undo 堅牢化)
- [ADR-0083](docs/ADR-0083-image-caption.md) 画像キャプション (paper 帯+クリップ、SVG 対応)
- [ADR-0084](docs/ADR-0084-route-reset.md) ルートリセット (Clear Waypoints、style op)
- [ADR-0085](docs/ADR-0085-frame-fit-contents.md) フレームをコンテンツに合わせる (union bbox+pad、align op)
- [ADR-0086](docs/ADR-0086-click-stamp-shapes.md) クリック単発で box 図形をスタンプ (既定 120x80)
- [ADR-0087](docs/ADR-0087-copy-svg-clipboard.md) 選択 SVG のクリップボードコピー (copyText 経由)
- [ADR-0088](docs/ADR-0088-snap-waypoint-bend.md) waypoint/ebend ドラッグのグリッドスナップ統一
- [ADR-0089](docs/ADR-0089-replace-image.md) 画像差替え (位置/幅保持、style op)
- [ADR-0090](docs/ADR-0090-multi-waypoints.md) 複数ウェイポイント (s.way 配列化、_wayArr 後方互換)
- [ADR-0091](docs/ADR-0091-search-select-all.md) 検索結果の全選択 (⌘Enter)
- [ADR-0092](docs/ADR-0092-rounded-rect.md) 矩形角丸/直角トグル (s.r)
- [ADR-0093](docs/ADR-0093-shift-wheel-pan.md) ⇧+ホイール水平パン
- [ADR-0094](docs/ADR-0094-escape-cancel-gesture.md) Esc でジェスチャキャンセル
- [ADR-0095](docs/ADR-0095-text-underline.md) テキスト/付箋下線 (⌘U)
- [ADR-0096](docs/ADR-0096-equal-size-snap.md) リサイズ等サイズスナップ
- [ADR-0097](docs/ADR-0097-excalidraw-multi-segment.md) excalidraw 多点コネクタ→way
- [ADR-0098](docs/ADR-0098-excalidraw-export.md) .excalidraw エクスポート (双方向)
- [ADR-0099](docs/ADR-0099-paste-excalidraw.md) クリップボード excalidraw ペースト
- [ADR-0100](docs/ADR-0100-strikethrough.md) 取り消し線 (⌘⇧X)
- [ADR-0101](docs/ADR-0101-sticky-color-cycle.md) 付箋色クイックサイクル
- [ADR-0102](docs/ADR-0102-wrap-in-frame.md) 選択をフレームで包む (⌘⌥G)
- [ADR-0103](docs/ADR-0103-paste-at-cursor.md) カーソル位置に貼り付け
- [ADR-0104](docs/ADR-0104-select-same-paint.md) 同色を選択
- [ADR-0105](docs/ADR-0105-sticky-chain.md) 付箋 ⌘Enter 連鎖
- [ADR-0106](docs/ADR-0106-boot-empty-view-fit.md) 起動時の空ビュー自動フィット
- [ADR-0107](docs/ADR-0107-tidy-grid.md) グリッドに整列
- [ADR-0108](docs/ADR-0108-swap-positions.md) 位置を入れ替え
- [ADR-0109](docs/ADR-0109-line-arrow-convert.md) 直線↔矢印の型変換
- [ADR-0110](docs/ADR-0110-sticky-text-convert.md) 付箋↔テキスト変換
- [ADR-0111](docs/ADR-0111-select-frame-contents.md) フレームの内容を選択
- [ADR-0112](docs/ADR-0112-share-viewport.md) 共有リンクのビューポート同梱
- [ADR-0113](docs/ADR-0113-paste-in-place.md) 同じ位置に貼り付け (⌘⇧V)
- [ADR-0114](docs/ADR-0114-selection-board-export.md) 選択を .board 書き出し
- [ADR-0115](docs/ADR-0115-clipboard-board-transfer.md) クリップボード .board 転送
- [ADR-0116](docs/ADR-0116-snap-to-grid.md) 選択をグリッドに吸着
- [ADR-0117](docs/ADR-0117-label-position.md) コネクタラベル位置ドラッグ
- [ADR-0118](docs/ADR-0118-png-export-scale.md) PNG 書き出しスケール選択
- [ADR-0119](docs/ADR-0119-arrowhead-styles.md) 矢印ヘッドスタイル
- [ADR-0120](docs/ADR-0120-select-same-type.md) 同じ種類を選択
- [ADR-0121](docs/ADR-0121-export-viewport-png.md) 表示範囲を PNG 書き出し
- [ADR-0122](docs/ADR-0122-dblclick-create-text.md) 空キャンバス dblclick でテキスト作成
- [ADR-0123](docs/ADR-0123-unlock-all.md) 全てロック解除
- [ADR-0124](docs/ADR-0124-directional-marquee.md) 方向付きマーキー
- [ADR-0125](docs/ADR-0125-marker-tool.md) マーカーツール
- [ADR-0126](docs/ADR-0126-click-click-line.md) クリック-クリック式線/矢印
- [ADR-0127](docs/ADR-0127-marquee-skips-locked.md) マーキーはロック形状を除外
- [ADR-0128](docs/ADR-0128-alt-disables-snap.md) ドラッグ中 Alt で全スナップ抑制
- [ADR-0129](docs/ADR-0129-shift-click-deselect.md) ⇧click で選択解除
- [ADR-0130](docs/ADR-0130-shift-marquee-add.md) ⇧マーキーで加算選択
- [ADR-0131](docs/ADR-0131-rotate-90.md) 90°回転
- [ADR-0132](docs/ADR-0132-curve-bend-drag.md) 曲線ベンドドラッグ
- [ADR-0133](docs/ADR-0133-elbow-bend-flip.md) elbow bend のフリップ鏡像化
- [ADR-0134](docs/ADR-0134-search-ctx-item.md) 検索の ctx 項目
- [ADR-0135](docs/ADR-0135-view-toggles-ctx.md) ビュー系トグルの ctx 項目
- [ADR-0136](docs/ADR-0136-corner-radius-cycle.md) 矩形の角丸サイクル
- [ADR-0137](docs/ADR-0137-hide-show-shapes.md) 図形の非表示/すべて表示
- [ADR-0138](docs/ADR-0138-style-copy-widened.md) スタイルコピーの対象拡大
- [ADR-0139](docs/ADR-0139-select-inverse.md) 選択の反転
- [ADR-0140](docs/ADR-0140-connect-two-shapes.md) 選択2図形のコネクタ接続
- [ADR-0141](docs/ADR-0141-waypoint-alt-delete.md) Alt+click でウェイポイント削除
- [ADR-0142](docs/ADR-0142-flip-rotation-per-axis.md) フリップ回転角の軸別修正
- [ADR-0143](docs/ADR-0143-elbow-bend-alt-reset.md) Alt+click でエルボー trunk リセット
- [ADR-0144](docs/ADR-0144-curve-bend-alt-reset.md) Alt+click でカーブ自動ボウ
- [ADR-0145](docs/ADR-0145-label-pos-alt-reset.md) Alt+click でラベル位置リセット
- [ADR-0146](docs/ADR-0146-rotate-elbow-bend.md) 回転時のエルボー trunk 追従
- [ADR-0147](docs/ADR-0147-translate-elbow-bend.md) 移動時のエルボー trunk 追従
- [ADR-0148](docs/ADR-0148-gresize-elbow-bend.md) グループリサイズ時の trunk 追従
- [ADR-0149](docs/ADR-0149-image-flip-pixels.md) 画像フリップのピクセル反転
- [ADR-0150](docs/ADR-0150-hidden-consistency.md) 非表示図形の検索/バインド除外
- [ADR-0151](docs/ADR-0151-alt-hover-measure.md) Alt+hover 距離ガイド
- [ADR-0152](docs/ADR-0152-cbend-gresize.md) gresize で cbend をアフィン再計算
- [ADR-0153](docs/ADR-0153-snap-hidden.md) スナップ索引から非表示を除外
- [ADR-0154](docs/ADR-0154-mirror-hidden-tag.md) DOM ミラーの非表示タグ
- [ADR-0155](docs/ADR-0155-fit-visible.md) fitToContent は可視のみ
- [ADR-0156](docs/ADR-0156-diamond-corners.md) ダイヤの角丸
- [ADR-0157](docs/ADR-0157-unbind-selection.md) コネクタ結合一括解除
- [ADR-0158](docs/ADR-0158-lasso-select.md) ⌥drag ラッソ選択
- [ADR-0159](docs/ADR-0159-label-valign.md) ボックスラベル縦揃え
- [ADR-0160](docs/ADR-0160-rtc-token-modern.md) RTC 招待トークン近代化
- [ADR-0161](docs/ADR-0161-eyedropper.md) スポイトツール (I)
- [ADR-0162](docs/ADR-0162-dblclick-group-descend.md) dblclick でグループ潜り
- [ADR-0163](docs/ADR-0163-tab-skip-hidden.md) Tab で非表示を飛ばす
- [ADR-0164](docs/ADR-0164-statusbar-sel-dims.md) 選択寸法の常時表示
- [ADR-0165](docs/ADR-0165-arrow-pan-empty.md) 非選択時の矢印パン
- [ADR-0166](docs/ADR-0166-swap-fill-stroke.md) ⇧X 塗り↔線スワップ
- [ADR-0167](docs/ADR-0167-digit-opacity.md) 数字キー不透明度
- [ADR-0168](docs/ADR-0168-image-corner-radius.md) 画像の角丸
- [ADR-0169](docs/ADR-0169-label-fontsize.md) ラベル fontSize
- [ADR-0170](docs/ADR-0170-label-typography.md) ラベル太字斜体下線取消線
- [ADR-0171](docs/ADR-0171-label-align.md) ラベル水平揃え
- [ADR-0172](docs/ADR-0172-lock-badge.md) ロック選択の鍵バッジ
- [ADR-0173](docs/ADR-0173-font-family.md) 書体ファミリ巡回
- [ADR-0174](docs/ADR-0174-ctx-opacity.md) ctx 不透明度巡回
- [ADR-0175](docs/ADR-0175-frame-fill.md) フレームの塗り色
- [ADR-0176](docs/ADR-0176-image-border.md) 画像のボーダー
- [ADR-0177](docs/ADR-0177-eraser-hover.md) 消しゴムホバー
- [ADR-0178](docs/ADR-0178-frame-image-dash.md) フレーム/画像ボーダー破線
- [ADR-0179](docs/ADR-0179-img-caption-valign.md) 画像キャプション上下
- [ADR-0180](docs/ADR-0180-fontsize-persistence.md) fontSize 継承
- [ADR-0181](docs/ADR-0181-style-persistence-2.md) head/font 継承
- [ADR-0182](docs/ADR-0182-label-editor-follow.md) ラベルエディタ追従
- [ADR-0183](docs/ADR-0183-route-persistence.md) コネクタルート継承
- [ADR-0184](docs/ADR-0184-style-persistence-3.md) 角丸/ハッチ/揃え継承
- [ADR-0185](docs/ADR-0185-eyedropper-style.md) スポイト全吸収
- [ADR-0186](docs/ADR-0186-frame-label-font.md) フレームラベル書体
- [ADR-0187](docs/ADR-0187-sticky-valign.md) 付箋本文縦揃え
- [ADR-0188](docs/ADR-0188-frame-font.md) フレーム書体巡回
- [ADR-0189](docs/ADR-0189-line-height.md) 行間巡回
- [ADR-0190](docs/ADR-0190-sticky-chain-typography.md) チェーン書式継承
- [ADR-0191](docs/ADR-0191-text-bg-fill.md) テキスト背景塗り
- [ADR-0192](docs/ADR-0192-sticky-text-color.md) 付箋文字色
- [ADR-0193](docs/ADR-0193-conn-label-fill.md) ラベルpill背景
- [ADR-0194](docs/ADR-0194-drop-shadow.md) ドロップシャドウ
- [ADR-0195](docs/ADR-0195-img-label-fill.md) キャプション帯色
- [ADR-0196](docs/ADR-0196-label-tab-chain.md) ラベルTab巡回
- [ADR-0197](docs/ADR-0197-frame-label-align.md) フレームラベル揃え
- [ADR-0198](docs/ADR-0198-conn-reverse.md) コネクタ方向反転
- [ADR-0199](docs/ADR-0199-sticky-fit-text.md) 付箋テキストフィット
- [ADR-0200](docs/ADR-0200-pen-shift-straight.md) Shiftペン直線
- [ADR-0201](docs/ADR-0201-move-readout.md) 移動中XY表示
- [ADR-0202](docs/ADR-0202-draft-readout.md) 描画中寸法表示
- [ADR-0203](docs/ADR-0203-drawio-import.md) .drawioインポート
- [ADR-0204](docs/ADR-0204-frame-label-decoration.md) フレームラベル装飾
- [ADR-0205](docs/ADR-0205-letter-spacing.md) 字間
- [ADR-0206](docs/ADR-0206-endpoint-shift-constrain.md) 端点45°拘束+ラベルエディタ一致
- [ADR-0207](docs/ADR-0207-elbow-rounded-corners.md) エルボー角丸
- [ADR-0208](docs/ADR-0208-text-word-wrap.md) テキスト幅折返し
- [ADR-0209](docs/ADR-0209-fixed-edge-anchors.md) 端点固定アンカー
- [ADR-0210](docs/ADR-0210-multiline-conn-label.md) コネクタラベル複数行
- [ADR-0211](docs/ADR-0211-shadow-text-conns.md) 影をtext/connへ
- [ADR-0212](docs/ADR-0212-conn-label-lineheight.md) connラベル行間
- [ADR-0213](docs/ADR-0213-pin-anchor-ctx.md) ctxアンカー固定
- [ADR-0214](docs/ADR-0214-bindat-grid.md) _bindAtグリッド化
- [ADR-0215](docs/ADR-0215-modal-focus-trap.md) モーダルfocus復帰
- [ADR-0216](docs/ADR-0216-labelpos-slots.md) ラベル位置スロット
- [ADR-0217](docs/ADR-0217-route-reset-reach.md) ルートリセット到達性
- [ADR-0218](docs/ADR-0218-conn-hop-arcs.md) コネクタホップ
- [ADR-0219](docs/ADR-0219-center-draw.md) ⌥中心基点描画
- [ADR-0220](docs/ADR-0220-drawio-export.md) .drawioエクスポート
- [ADR-0221](docs/ADR-0221-drawio-anchor-roundtrip.md) drawioアンカー往復
- [ADR-0222](docs/ADR-0222-exc-binding-fix.md) excalidraw結合修復
- [ADR-0223](docs/ADR-0223-exc-roundtrip-fixes.md) exc往復修復
- [ADR-0224](docs/ADR-0224-drawio-import-fidelity.md) drawioインポートfidelity
- [ADR-0225](docs/ADR-0225-exc-sticky-roundtrip.md) exc sticky往復
- [ADR-0226](docs/ADR-0226-drawio-note-swimlane.md) drawio note/swimlane逆マップ
- [ADR-0227](docs/ADR-0227-storage-quota-warn.md) ストレージ残量警告
- [ADR-0228](docs/ADR-0228-drawio-label-style.md) drawioラベル装飾往復
- [ADR-0229](docs/ADR-0229-exc-groupids.md) exc groupIds往復
- [ADR-0230](docs/ADR-0230-exc-style-fidelity.md) exc装飾fidelity
- [ADR-0231](docs/ADR-0231-exc-export-fidelity.md) excエクスポートfidelity+image
- [ADR-0232](docs/ADR-0232-paste-mxfile.md) ペーストmxfile
- [ADR-0233](docs/ADR-0233-arrowhead-none-cycle.md) ヘッドnone巡回
- [ADR-0234](docs/ADR-0234-exc-label-roundtrip.md) excラベル往復
- [ADR-0235](docs/ADR-0235-svg-image-import.md) SVG image+共有化
- [ADR-0236](docs/ADR-0236-editor-type-keys.md) 編集中装飾キー
- [ADR-0237](docs/ADR-0237-label-type-keys.md) ラベル装飾キー
- [ADR-0238](docs/ADR-0238-drawio-valign.md) drawio縦揃え往復
- [ADR-0239](docs/ADR-0239-style-op-dedupe.md) style op共有化
│   ├── ADR-0240-drawio-parent-relative-coords.md  # drawio グループ内の親相対座標解決 + excScene 未閉鎖修復 (実装済)
│   ├── ADR-0241-excalidraw-locked-roundtrip.md  # excalidraw locked 往復 (実装済)
│   ├── ADR-0242-excalidraw-lineheight.md  # excalidraw lineHeight ↔ s.lineH (実装済)
│   ├── ADR-0243-excalidraw-fontfamily.md  # excalidraw fontFamily ↔ s.font (実装済)
│   └── ADR-0244-excalidraw-valign.md  # excalidraw verticalAlign ↔ s.valign (実装済)
│   ├── ADR-0245-drawio-visible-attr.md  # drawio visible="0" ↔ s.visible===0 (実装済)
│   ├── ADR-0246-drawio-shadow.md  # drawio shadow=1 ↔ s.shadow (実装済)
│   └── ADR-0247-drawio-fontcolor.md  # drawio fontColor ↔ text/sticky s.stroke (実装済)
│   ├── ADR-0248-commit-origsel-helpers.md  # commit+origSel イディオムを _rcOp/_cOp 集約 (実装済)
│   ├── ADR-0249-drawio-edge-label-styling.md  # drawio edge ラベルスタイル往復 (実装済)
│   ├── ADR-0250-drawio-compressed-import.md  # 圧縮 .drawio の DecompressionStream インポート (実装済)
│   ├── ADR-0251-visual-viewport-resize.md  # visualViewport.resize でキャンバス再サイズ (実装済)
│   ├── ADR-0252-conn-label-measure-cache.md  # コネクタ/ボックスラベルの measureText メモ化 (実装済)
│   ├── ADR-0253-drawio-fontfamily.md  # drawio fontFamily ↔ s.font カテゴリ (実装済)
│   ├── ADR-0254-drawio-locked.md  # drawio locked ↔ editable/deletable/movable=0 (実装済)
│   ├── ADR-0255-drawio-dotted.md  # drawio dotted ↔ dashPattern (実装済)
│   ├── ADR-0256-drawio-arrowhead-types.md  # drawio endArrow タイプ ↔ s.head (実装済)
│   ├── ADR-0257-exc-export-viewport.md  # .excalidraw export に viewport 同梱 (実装済)
│   ├── ADR-0258-dio-sty-apply.md  # drawio 共通 sty 適用の _dioStyApply 集約 (実装済)
│   ├── ADR-0259-drawio-image.md  # drawio shape=image ↔ 画像シェイプ往復 (実装済)
│   ├── ADR-0260-drawio-flip.md  # drawio flipH/flipV ↔ s.flip (実装済)
│   ├── ADR-0261-drawio-rotation.md  # drawio rotation= ↔ s.rotate (実装済)
│   ├── ADR-0262-drawio-edge-opacity.md  # drawio edge opacity export 対称化 (実装済)
│   ├── ADR-0263-dio-sty-emit.md  # drawio 共通 sty 出力の _dioStyEmit 集約 (実装済)
│   ├── ADR-0264-drawio-edge-labelpos.md  # drawio edge mxGeometry@x ↔ s.labelPos (実装済)
│   ├── ADR-0265-exc-elbowed.md  # excalidraw elbowed ↔ s.elbow (実装済)
│   ├── ADR-0266-exc-conn-label.md  # excalidraw conn ラベル ↔ s.label (実装済)
│   ├── ADR-0267-exc-strokesharpness.md  # excalidraw strokeSharpness ↔ s.r (実装済)
│   ├── ADR-0268-exc-fidelity-tail.md  # excalidraw pressures/zigzag 受容 (実装済)
│   ├── ADR-0269-drawio-edge-rounded.md  # drawio edge rounded=1 → s.r (実装済)
│   ├── ADR-0270-svg-conn-emit-dedupe.md  # SVG conn パス/ラベル集約 _sp/_po/_cL (実装済)
│   ├── ADR-0271-drawio-split-opacity.md  # drawio 分割 opacity → s.opacity 近似 (実装済)
│   ├── ADR-0272-paste-svg-mime.md  # clipboard image/svg+xml → vector import (実装済)
│   ├── ADR-0273-paste-tsv-grid.md  # TSV ペースト → 付箋グリッド (実装済)
│   ├── ADR-0274-drawio-shape-approx.md  # drawio cylinder/cloud → ellipse 近似 (実装済)
│   ├── ADR-0275-drawio-compressed-flag.md  # drawio export compressed=false 明記 (実装済)
│   ├── ADR-0276-exc-scale-flip.md  # excalidraw scale 反転を全要素へ (実装済)
│   ├── ADR-0277-exc-fillstyle-dots.md  # excalidraw fillStyle dots → hatch (実装済)
│   ├── ADR-0278-svg-shadow-parity.md  # SVG rect/ellipse/pen/sticky 影 parity (実装済)
│   ├── ADR-0279-drawio-sticky-fillcolor.md  # drawio sticky fillColor ↔ s.color (実装済)
│   ├── ADR-0280-exc-boundelements.md  # excalidraw boundElements 逆リンク export (実装済)
│   ├── ADR-0281-drawio-label-fontcolor.md  # drawio labeled box fontColor ↔ s.stroke (実装済)
│   ├── ADR-0282-dio-emit-fold.md  # _dioStyEmit に fontStyle/locked 畳み込み (実装済)
│   ├── ADR-0283-svg-gradient-stop.md  # SVG gradient → 先頭 stop-color 近似 (実装済)
│   ├── ADR-0284-drawio-letterspacing.md  # drawio letterSpacing ↔ s.spacing (実装済)
│   ├── ADR-0285-icon-sprite.md  # toolbar icon を SVG sprite 化 (実装済)
│   ├── ADR-0286-start-head-style.md  # 開始ヘッド s.startHead 独立 (実装済)
│   ├── ADR-0287-drawio-open-head-fill.md  # endFill=0 → open head (実装済)
│   ├── ADR-0288-transparent-fill.md  # fillColor=none → 透過塗り (実装済)
│   ├── ADR-0289-getel-shorthand.md  # getElementById → _g() 集約 (実装済)
│   ├── ADR-0290-transparent-stroke.md  # strokeColor/fillColor=none 往復 (実装済)
│   ├── ADR-0291-start-head-ui.md  # 開始ヘッド ctx 巡回 (実装済)
│   ├── ADR-0292-css-token-shorthand.md  # getCSS トークン短縮 (実装済)
│   ├── ADR-0293-starthead-persistence.md  # startHead スタイル永続化 (実装済)
│   ├── ADR-0294-bar-head.md  # 'bar' (T字) ヘッド (実装済)
│   ├── ADR-0295-clamp01-helper.md  # _c01 clamp01 helper (実装済)
│   ├── ADR-0296-binding-focus.md  # exc binding.focus → aF/bF (実装済)
│   ├── ADR-0297-conn-type-shorthand.md  # conn 型判定 `_conn(t)` 集約 (実装済)
│   ├── ADR-0298-frame-label-fontsize.md  # frame ラベル fontSize (実装済)
│   ├── ADR-0299-excalidraw-autoresize.md  # exc autoResize emit (実装済)
│   ├── ADR-0300-exc-conn-angle.md  # exc conn angle → 端点回転 (実装済)
│   ├── ADR-0301-exc-link.md  # exc link 往復 (実装済)
│   ├── ADR-0302-selany-helper.md  # ctx ゲート `_selAny` 集約 (実装済)
│   ├── ADR-0303-forsel-helper.md  # apply ループ `_forSel` 集約 (実装済)
│   ├── ADR-0304-link-ui.md  # s.link ctx UI (実装済)
│   ├── ADR-0305-svg-frame-weight.md  # SVG frame ラベル weight parity (実装済)
│   ├── ADR-0306-csh-helper.md  # canvas shadow `_csh` 集約 (実装済)
│   ├── ADR-0307-so-helper.md  # style op コミット `_so` 集約 (実装済)
│   ├── ADR-0308-sell-helper.md  # `_selL` selection リスト集約 (実装済)
│   ├── ADR-0309-selr-helper.md  # origSel 復元 `_selR` 集約 (実装済)
│   ├── ADR-0310-link-badge.md  # リンク 🔗 バッジ (実装済)
│   ├── ADR-0311-dio-multipage.md  # drawio 複数ページ横並び輸入 (実装済)
│   ├── ADR-0312-keepsel-helper.md  # origSel 書き戻し `_keepSel` 集約 (実装済)
│   ├── ADR-0313-dio-link-attr.md  # drawio link 属性往復 (実装済)
│   ├── ADR-0314-modclick-link.md  # ⌘/Ctrl+click でリンク直接オープン (実装済)
│   ├── ADR-0315-sr-link-announce.md  # 🔗 バッジの SR 通知 (実装済)
│   ├── ADR-0316-svg-link-badge.md  # SVG 書き出しの 🔗 バッジ (実装済)
│   ├── ADR-0317-exc-conn-roundness.md  # exc コネクタ roundness→curve (実装済)
│   ├── ADR-0318-ctx-copy-link.md  # ctx リンクコピー (実装済)
│   ├── ADR-0319-popup-blocked.md  # リンクオープンの popup ブロック通知 (実装済)
│   ├── ADR-0320-dio-labelposition.md  # drawio ラベルスロット往復 (実装済)
│   ├── ADR-0321-dio-whitespace-nowrap.md  # drawio nowrap→s.wrap 往復 (実装済)
│   ├── ADR-0322-dio-html-flag.md  # drawio 書出 html=1 修正 (実装済)
│   ├── ADR-0323-exc-conn-label-lineheight.md  # exc conn ラベル行間復元 (実装済)
│   ├── ADR-0324-dio-compressed-multipage.md  # 圧縮 drawio 全ページ展開 (実装済)
│   ├── ADR-0325-dio-inflate-cap.md  # drawio 展開 8MB ガード (実装済)
│   ├── ADR-0326-pd-shorthand.md  # preventDefault 短縮 (実装済)
│   ├── ADR-0327-link-scheme-gate.md  # s.link http(s) 限定 (XSS 経路閉塞, 実装済)
│   ├── ADR-0328-userobject-label-link.md  # UserObject label/link 復元 (実装済)
│   ├── ADR-0329-ce-shorthand.md  # createElement 短縮 (実装済)
│   ├── ADR-0330-selids-shorthand.md  # selection ids 短縮 (実装済)
│   ├── ADR-0331-dio-hatch-fillstyle.md  # drawio ハッチ往復 (実装済)
│   ├── ADR-0332-dio-diamond-image-rounded-emit.md  # diamond/image rounded emit (実装済)
│   ├── ADR-0333-conn-link-badge.md  # conn リンクバッジ (実装済)
│   ├── ADR-0334-seln-fin-shorthand.md  # _selN/_fin 短縮 (実装済)
│   ├── ADR-0335-i18n-key-coverage.md  # t() キー網羅ガード (実装済)
│   ├── ADR-0336-drawio-group-roundtrip.md  # drawio グループ往復 (実装済)
│   ├── ADR-0337-minmax-abs-shorthand.md  # _min/_max/_abs (実装済)
│   ├── ADR-0338-excalidraw-arrowhead-map.md  # exc head 列挙マップ (実装済)
│   ├── ADR-0339-svg-clickable-link-badge.md  # SVG リンクバッジ a 化 (実装済)
│   ├── ADR-0340-getattribute-shorthand.md  # _ga() (実装済)
│   ├── ADR-0341-rotated-resize-cursor.md  # 回転カーソル追従 (実装済)
│   ├── ADR-0342-canvas-rect-shorthand.md  # _cbr() (実装済)
│   ├── ADR-0343-drawio-lineheight-roundtrip.md  # lineHeight 往復 (実装済)
│   ├── ADR-0344-exc-image-roundness.md  # exc 画像 roundness (実装済)
│   ├── ADR-0345-drawio-frame-containment.md  # drawio frame 内包 emit (実装済)
│   ├── ADR-0346-search-more-fields.md        # ⌘F 検索拡大 (実装済)
│   ├── ADR-0347-drawio-edge-group-parent.md  # drawio edge group parent (実装済)
│   ├── ADR-0348-qs-rnd-shorthand.md          # _rnd/_qs shorthand ~650B (実装済)
│   ├── ADR-0349-exc-route-bake.md            # exc elbow/curve ルート焼込み (実装済)
│   ├── ADR-0350-qsa-json-shorthand.md        # _qsa/_JS/_JP ~400B (実装済)
│   ├── ADR-0351-exc-image-caption.md         # exc 画像キャプション往復 (実装済)
│   ├── ADR-0352-drawio-image-caption.md      # drawio 画像キャプション往復 (実装済)
│   ├── ADR-0353-image-caption-prop-corr.md   # caption prop 訂正 s.cap→s.label (実装済)
│   ├── ADR-0354-drawio-pen-polyline.md       # drawio ペン polyline emit (実装済)
│   ├── ADR-0355-math-shorthand.md            # Math shorthand ~900B (実装済)
│   ├── ADR-0356-on-shorthand.md              # _on addEventListener ~750B (実装済)
│   ├── ADR-0357-drawio-parent-cycle-guard.md # drawio parent cycle 耐性 (実装済)
│   ├── ADR-0358-drawio-elbow-waypoints.md    # drawio elbow waypoint emit (実装済)
│   ├── ADR-0359-drawio-viewport-roundtrip.md # drawio viewport 往復 (実装済)
│   ├── ADR-0360-drawio-curve-cbend-roundtrip.md # drawio curve 制御点往復 (実装済)
│   ├── ADR-0361-drawio-waypoint-object-form.md  # drawio waypoint 形式修正 (実装済)
│   ├── ADR-0362-vp-live-read-shorthand.md    # _vp() live-read shorthand (実装済)
│   ├── ADR-0363-excalidraw-textalign-fold.md  # exc textAlign → s.align 復元 (実装済)
│   ├── ADR-0364-sh-live-read-shorthand.md    # _sh() live-read shorthand (実装済)
│   ├── ADR-0365-state-field-shorthands.md    # state.X 全フィールド shorthand 一括化 (実装済)
│   ├── ADR-0366-fn-shorthands.md             # 関数 shorthand 一括化 (実装済)
│   ├── ADR-0367-validpatch-numeric-whitelist.md  # validPatch 数値網羅+aF/bF構造 (実装済)
│   ├── ADR-0368-validpatch-array-props.md    # validPatch pts/way 配列構造 (実装済)
│   ├── ADR-0369-validpatch-string-props.md   # validPatch 文字列型/長さ+数値フラグ (実装済)
│   ├── ADR-0370-schedule-refreshundo-shorthands.md  # _ps/_ms/_ru shorthand (実装済)
│   ├── ADR-0371-describeshape-hidden.md   # describeShape hidden アナウンス (実装済)
│   ├── ADR-0372-snapshot-merge-value-gate.md   # snapshot merge 値ゲート (実装済)
│   ├── ADR-0373-patch-structural-keys.md   # patch 構造キー剥がし+_u 防御 (実装済)
│   ├── ADR-0374-img-channel-bounds.md   # img チャンク経路の容量上限 (実装済)
│   ├── ADR-0375-text-editor-tab-chain.md   # テキストエディタ Tab 連鎖 (実装済)
│   ├── ADR-0376-conn-bbox-offbox-routes.md   # コネクタbboxがcurve制御点/elbow trunkを包含 (実装済)
│   ├── ADR-0377-connclears-whitelist.md   # del connClears を8propホワイトリスト化 (実装済)
│   ├── ADR-0378-more-shorthands.md   # _pi/_ro/_gd/_cl/_bb/_oa shorthand (実装済)
│   ├── ADR-0379-img-channel-length-caps.md   # imgチャンク96KB + dataUrl 16M 上限 (実装済)
│   ├── ADR-0380-sr-group-bound-announce.md   # describeShape グループ/結合先アナウンス (実装済)
│   ├── ADR-0381-search-bound-endpoints.md   # ⌘F で結合先名検索 (実装済)
│   ├── ADR-0382-more-state-fn-shorthands.md  # seenOps/lasso/marquee/dupDelta/w2s/s2w/connEnds shorthand (実装済)
│   ├── ADR-0383-chunked-snapshot.md   # RTC snapshot 64KB チャンク化 (実装済)
│   ├── ADR-0384-isarray-shorthand.md   # Array.isArray→_iA (~500B 回収、実装済)
│   ├── ADR-0385-snapin-reset.md   # 切断時 _snapIn 破棄 (実装済)
│   ├── ADR-0386-ok-on-sites.md   # _ok + _on サイト拡大 (実装済)
│   ├── ADR-0387-shape-type-whitelist.md   # validShape 型ホワイトリスト (実装済)
│   ├── ADR-0388-shape-id-type.md   # shape id string/長さ検査 (実装済)
│   ├── ADR-0389-toast-dedupe.md   # 同一トースト再付け替え (実装済)
│   ├── ADR-0390-exc-frameid-emit.md   # exc frameId 空間内包 emit (実装済)
│   ├── ADR-0391-more-literal-shorthands.md   # _TR/_ud/_now (実装済)
│   ├── ADR-0392-sa-al-ap-shorthands.md   # _sa/_AL/_AP (実装済)
│   ├── ADR-0393-board-viewport-roundtrip.md   # .board viewport 往復 (実装済)
│   ├── ADR-0394-more-dom-shorthands.md   # DOM shorthand 追加 (実装済)
│   ├── ADR-0395-toast-key-consts.md   # トーストキー定数化 (実装済)
│   ├── ADR-0396-locked-delete-toast.md   # ロック済削除トースト (実装済)
│   ├── ADR-0397-st-pd-consts.md   # _St/_PD + 残トーストキー (実装済)
│   ├── ADR-0398-file-import-32mb-guard.md   # 全取込 32MB ガード (実装済)
│   ├── ADR-0399-ap-sto-kd-ch-ck-shorthands.md   # _ap/_stO/_KD/_CH/_CK/_vpS (実装済)
│   ├── ADR-0400-snap-sender-chunks.md   # RTC snapshot 送信側チャンク化 (実装済)
│   ├── ADR-0401-dual-send-bcast-helper.md   # _bcast/_setDocName/_dpr/_PM/_PU/_PC/_lc (実装済)
│   ├── ADR-0402-docname-sync.md   # ドキュメント名ピア同期 (実装済)
│   ├── ADR-0403-snap-size-cap.md   # snapshot 送信側 24MB fail-fast (実装済)
│   ├── ADR-0404-map-set-uri-shorthands.md   # _mP/_sT/_eU/_dU + wire メタガード (実装済)
│   ├── ADR-0405-drawio-docname-roundtrip.md   # .drawio diagram name ↔ docName (実装済)
│   ├── ADR-0406-keyname-color-consts.md   # _ES/_EN/_TB/_IK/_YW + !==_un (実装済)
│   ├── ADR-0407-drawio-strike-sel-export.md   # strikeThrough 往復 + 選択 .drawio 書き出し (実装済)
│   ├── ADR-0408-toast-kind-shorthands.md   # _w/_o/_e + _trimSeen (実装済)
│   ├── ADR-0409-file-viewport-grid-restore.md   # exc appState + drawio grid 往復 (実装済)
│   ├── ADR-0410-bboxall-getcss-shorthands.md   # _bA + _gC shorthand (実装済)
│   ├── ADR-0411-wrap-flag-validation.md   # s.wrap=0 正規化 + フラグ prop 検証 (実装済)
│   ├── ADR-0412-wrap-autoresize-roundtrip.md   # text wrap の drawio/exc 完全往復 (実装済)
│   ├── ADR-0413-shadow-flag-validation.md   # s.shadow フラグ検証化 + _db/_de/_wO (実装済)
│   ├── ADR-0414-describe-visual-props.md   # describeShape flip/shadow/route announce (実装済)
│   ├── ADR-0415-sel-write-shorthands.md   # _sel*/_ss/_md fold + fstyle/hop 完結 (実装済)
│   ├── ADR-0416-dead-code-sweep.md   # SNAP_THRESHOLD 除去 + _setSq/_ss 活性化 (実装済)
│   ├── ADR-0417-valign-persistence.md   # _st().valign last-used 永続化 (実装済)
│   ├── ADR-0418-sb-hass-shorthands.md   # _sb/_hasS fold (実装済)
│   ├── ADR-0419-selection-mutation-shorthands.md   # _scl/_sad/_sdl (実装済)
│   ├── ADR-0420-image-i18n-key.md   # image を T.k に追加 (実装済)
│   ├── ADR-0421-sel0-ivp-shorthands.md   # _sel0/_ivp fold + _selAny 重複解消 (実装済)
│   ├── ADR-0422-framezoom-clamp.md   # _zoomToFrame zoom clamp + 退化 frame ガード (実装済)
│   ├── ADR-0423-frameexpansion-dedupe.md   # _frameOf/_xFS/_grpOf fold + map(clone) (実装済)
│   ├── ADR-0424-cache-purge-on-delete.md   # per-shape キャッシュの削除時パージ (実装済)
│   ├── ADR-0425-locked-visible-len-folds.md   # _nS/_sv/_lk shorthand fold (実装済)
│   ├── ADR-0426-penrender-failure-accounting.md   # _penRender 失敗時の px 会計/再試行制御 (実装済)
│   ├── ADR-0427-cache-purge-complete.md   # per-shape キャッシュパージの網羅化 (実装済)
│   ├── ADR-0428-seenops-trim-consistency.md   # _trimSeen 統一 + _ck helper (実装済)
│   ├── ADR-0429-marker-sr-announce.md   # marker ストロークの SR announce (実装済)
│   ├── ADR-0430-hl-flag-validation.md   # hl フラグの validPatch 網羅 (実装済)
│   ├── ADR-0431-chunked-ops.md          # 上限超過 op のチャンク送信 (実装済)
│   ├── ADR-0432-senddc-backpressure.md  # dc.send バックプレッシャ再キュー (実装済)
│   ├── ADR-0433-prop-read-folds.md      # _sk/_fi/_lb prop read 一括 fold (実装済)
│   ├── ADR-0434-more-prop-folds.md      # _rt/_du/_gi prop read fold 第2弾 (実装済)
│   ├── ADR-0435-psc-img-pending.md      # _psc が _imgPending もパージ (実装済)
│   ├── ADR-0436-ptsok-unify.md          # pen pts 検証の統一 (実装済)
│   ├── ADR-0437-wrapcache-spacing.md    # _wrapCache キーに spacing (実装済)
│   ├── ADR-0438-senddc-size-cap.md      # _sendDC SCTP 上限ガード (実装済)
│   ├── ADR-0439-op-cv-folds.md          # _oP/_cv フォールド (実装済)
│   ├── ADR-0440-g2-fold-opacity-announce.md # _g2 fold + 透明シェイプの SR announce (実装済)
│   ├── ADR-0441-wire-guard-tests.md     # wire ガード行動テスト + architecture.md 同期 (実装済)
│   ├── ADR-0442-pp-fold.md              # _pp before/after push 集約 (実装済)
│   ├── ADR-0443-undo-wire.md            # undo/redo 逆 op wire 伝搬 (実装済)
│   ├── ADR-0444-undo-wire-group-zorder.md  # group/ungroup/zorder 逆写像追加 (実装済)
│   ├── ADR-0445-slim-del-pending-purge.md  # del/clear スリム化 + _imgPending パージ (実装済)
│   ├── ADR-0446-dcq-onclose.md             # dc.onclose の _dcQ リセット (実装済)
│   ├── ADR-0447-ln-fold.md                 # X.length → _ln(X) 一括 fold (実装済)
│   ├── ADR-0448-fragin-restart.md          # _fragIn n-mismatch 再起動 + onclose リセット (実装済)
│   ├── ADR-0449-img-intake-bounds.md       # _imgIn/_imgChunks 上限化 (実装済)
│   ├── ADR-0450-ln-fold-memberexpr.md      # X.Y.length も _ln fold (実装済)
│   ├── ADR-0451-mp-st-argfold.md           # _mP/_sT 引数取り化 + new Map/Set(a) fold (実装済)
│   ├── ADR-0452-snapshot-throttle-resend.md # _sendSnapshot throttle 超過の deferred resend (実装済)
│   ├── ADR-0453-type-sets-pagehide-flush.md # 図形型メンバーシップSet化 + pagehide flush (実装済)
│   ├── ADR-0454-imgchunk-restart-selunl.md # _imgChunks n-mismatch 再スタート + _selUnl 畳み込み (実装済)
│   ├── ADR-0455-lowest-peer-snapshot.md # snapshot応答を最小idピアのみへ + prop畳み込み (実装済)
│   ├── ADR-0456-typeof-shorthands.md    # _iS/_iN/_iO で typeof ガード畳み込み (実装済)
│   ├── ADR-0457-peer-bye-message.md     # pagehide で bye を配信、離脱ピア即時除去 (実装済)
│   ├── ADR-0458-room-switch-presence.md # ルーム切替で bye 送信 + BC ピア掃除 (実装済)
│   ├── ADR-0459-peer-incarnation.md     # 起動毎 peerId nonce — seq/dedup 衝突 + タブ間同期解消 (実装済)
│   ├── ADR-0460-wclock-persist.md       # LWW 仲裁テーブルを IDB 永続化 (実装済)
│   ├── ADR-0461-toast-fold-consts.md    # _oT/_wT/_eT fold + 文字列 consts (実装済)
│   ├── ADR-0462-type-check-shorthands.md # 図形型判定 shorthand (_stk/_frm/_pn/_txt/_im/_arw) (実装済)
│   ├── ADR-0463-peer-announce.md          # ピア出入りの SR announce (実装済)
│   ├── ADR-0464-img-state-room-switch.md   # ルーム切替で画像転送状態をリセット (実装済)
│   ├── ADR-0465-snapshot-responder-election.md # snapshot 応答者=最小 non-asker (starvation 修正、実装済)
│   ├── ADR-0466-assembly-room-switch.md    # ルーム切替で受信再組立スロットもリセット (実装済)
│   ├── ADR-0467-pct-rebaseline.md          # _pCt をルーム切替で再ベースライン (実装済)
│   ├── ADR-0468-architecture-wire-lifecycle.md # architecture.md の wire ライフサイクル節 (実装済)
│   ├── ADR-0469-frag-sender-tagging.md    # _fragIn を送信者タグ付け (並行ストリーム継ぎ接ぎ防止、実装済)
│   ├── ADR-0470-frag-sender-test.md       # _fragIn sender タグの実動作テスト (実装済)
│   ├── ADR-0471-frac-key-compaction.md    # frac キー >48 で canonical 再採番 (キー増大・発散防止、実装済)
│   ├── ADR-0472-zstep-fold-undo-correctness.md  # _zStep 統合 + compaction undo の before 正確性 (実装済)
│   ├── ADR-0473-wire-cap-parity.md    # zorder frac/gid 長の wire キャップ整合 (実装済)
│   ├── ADR-0474-snapshot-size-cap.md  # スナップショット全盤面キャップを SHARE_MAX_SHAPES へ (切捨て修正、実装済)
│   ├── ADR-0475-sync-req-retry.md     # join 時 sync-req の有界再送 (応答喪失時の空盤面待機解消、実装済)
│   ├── ADR-0476-slice0-fold.md        # _s0 slice(0,n) shorthand 化 (実装済)
│   ├── ADR-0477-indexof-trim-fold.md  # _ix/_trm shorthand 化 (実装済)
│   ├── ADR-0478-dragkind-fold.md      # _dk dragKind 判定 shorthand 化 (実装済)
│   ├── ADR-0479-zorder-legacy-cap.md  # zorder legacy after の frac/id 長さキャップ (実装済)
│   ├── ADR-0480-zorder-cap-tests.md   # ADR-0479 境界テスト (実装済)
│   ├── ADR-0481-selul-fold.md         # _selUL unlocked-selection shorthand (実装済)
│   ├── ADR-0482-ctrat-fold.md         # _ctrAt import 中央配置の集約 (実装済)
│   ├── ADR-0483-repc-fold.md          # _repC replace-op commit 集約 (実装済)
│   ├── ADR-0484-arch-wire-sync.md     # architecture.md wire 節を最新化 (実装済)
│   ├── ADR-0485-wire-id-len-caps.md   # wire の op レベル id ≤64 キャップ網羅 (実装済)
│   ├── ADR-0486-selection-ids-cap.md  # presence selection の ids ≤64 完結 (実装済)
│   ├── ADR-0487-guide-fold.md         # _gV/_gH スナップガイド push fold (実装済)
│   ├── ADR-0488-snapbest-fold.md      # _snapBest snap 最近傍ループ集約 (実装済)
│   ├── ADR-0489-rcop-fold.md          # _rcOp 残直書きサイト集約 (実装済)
│   ├── ADR-0490-ss-single-fold.md     # _ss([id]) 単一 selection 置換集約 (実装済)
│   ├── ADR-0491-mid-fold.md           # _mid(pts) 中間 waypoint 集約 (実装済)
│   ├── ADR-0492-pl-fold.md            # _pL(pts) 末尾点集約 (実装済)
│   ├── ADR-0493-rs-fold.md            # _rs 盤面総取替え集約 (実装済)
│   ├── ADR-0494-shv-fold.md           # _shV 可視図形 subset 集約 (実装済)
│   ├── ADR-0495-selshapes-reuse.md    # _selShapes 再利用漏れ (実装済)
│   ├── ADR-0496-ulv-fold.md           # _ulv unlocked+visible 判定集約 (実装済)
│   ├── ADR-0497-ididx-fold.md         # _idIdx id での index 検索集約 (実装済)
│   ├── ADR-0498-pk-fold.md            # _pk ピアキー振分け集約 (実装済)
│   ├── ADR-0499-mk-fold.md            # _mk wire メッセージ組立て集約 (実装済)
│   ├── ADR-0500-mk-op-envelope.md     # op メッセージを _mk envelope へ統一 (実装済)
│   ├── ADR-0501-hb-fold.md            # _hb box-shape 判定 shorthand (実装済)
│   ├── ADR-0502-idok-fold.md          # _idOK wire id キャップ shorthand (実装済)
│   ├── ADR-0503-pointfree-every.md    # .every(id=>X) を point-free 化 (実装済)
│   ├── ADR-0504-pointfree-map.md      # .map(x=>X(x)) を point-free 化 (実装済)
│   ├── ADR-0505-pointfree-bulk.md     # filter/some/find/every/map arrow 包み一括 point-free 化 (実装済)
│   ├── ADR-0506-ul-fold.md            # _ul unlocked 判定 shorthand (実装済)
│   ├── ADR-0507-cpt-fold.md           # _cpT copyText+toast shorthand (実装済)
│   ├── ADR-0508-trm-fold.md           # .trim() を _trm shorthand 化 (実装済)
│   ├── ADR-0509-gesture-reset-fold.md # _zR/_zG gesture reset shorthand (実装済)
│   ├── ADR-0510-canvas-path-fold.md   # _bp/_st2/_fil canvas path shorthand (実装済)
│   ├── ADR-0511-mt-lt-fold.md         # _mT/_lT canvas moveTo/lineTo shorthand (実装済)
│   ├── ADR-0512-canvas-state-fold.md  # _sv2/_rs2/_cP/_qC canvas state/curve shorthand (実装済)
│   ├── ADR-0513-bulk-shorthand.md     # canvas/Store/UI/Persist 一括 shorthand (実装済)
│   ├── ADR-0514-second-bulk-fold.md   # make/translate/push/refreshZoom/transaction/fillText shorthand (実装済)
│   ├── ADR-0515-modifier-key-fold.md  # shiftKey/altKey/metaKey||ctrlKey shorthand (実装済)
│   ├── ADR-0516-os-clipboard-bridge.md # ⌘C/⌘X → OS clipboard .board JSON、⌘V を paste イベント経由化 (実装済)
│   ├── ADR-0517-safari-gesture-pinch.md # Safari GestureEvent pinch-zoom (実装済)
│   ├── ADR-0518-text-drop-cascade.md # 非ファイル drop を共有テキストカスケードへ (実装済)
│   ├── ADR-0519-edge-auto-pan.md # ドラッグ中のエッジオートパン + _o2w 集約 (実装済)
│   ├── ADR-0520-canvas-prop-setters.md # canvas prop 代入 shorthand (_fsS/_ssS/_lnW/_gaS/_taS/_tbS) (実装済)
│   ├── ADR-0521-lost-pointer-capture.md # lostpointercapture でジェスチャキャンセル (実装済)
│   ├── ADR-0522-input-coord-folds.md # _cPt/_nP/_osp/_rm/_nc shorthand (実装済)
│   ├── ADR-0523-textcontent-fold.md # _tC textContent setter shorthand (実装済)
│   ├── ADR-0524-contextmenu-drag-guard.md # ドラッグ中 contextmenu でジェスチャキャンセル (実装済)
│   ├── ADR-0525-split-lines-fold.md # _spL split('\n') 活性化 (実装済)
│   ├── ADR-0526-pointerleave-hover-clear.md # pointerleave で state.hover クリア (実装済)
│   ├── ADR-0527-image-import-cap-16mb.md # 画像取込事前キャップ 4MB→16MB (実装済)
│   ├── ADR-0528-dom-method-folds.md # _fc/_clk/_aE/_csr shorthand + dead isPan 節除去 (実装済)
│   ├── ADR-0529-sw-cache-ok-only.md # SW c.put を n.ok でゲート (実装済)
│   ├── ADR-0530-sw-ok-gate-pin.md # SW ok ゲートの test.mjs ピン (実装済)
│   ├── ADR-0531-spec-roadmap-sync.md # spec.md ロードマップ現況同期 (実装済)
│   ├── ADR-0532-right-down-no-arm.md # 右 down は ptr.down 不立て — macOS ctx menu 回帰修正 (実装済)
│   ├── ADR-0533-text-editor-live-binding.md # openTextEditor が byId で live 図形に bind (実装済)
│   ├── ADR-0534-blur-gesture-reset.md # window blur でジェスチャ/ポインタ状態を再ベースライン化 (実装済)
│   ├── ADR-0535-tc-fc-fold-completion.md # _tC/_fc 畳み込み完結 + ミニマップ blur リセット (実装済)
│   ├── ADR-0536-trm-method-call-misuse.md # _trm メソッド誤用修正 — RTC 接続/応答ボタンの TypeError 回帰 (実装済)
│   ├── ADR-0537-dom-prop-stragglers.md # _sw/_ew/_dsp/_hdn + _ix 残サイト畳み込み ~85B (実装済)
│   ├── ADR-0538-helper-method-misuse-sweep.md # _helper のメソッド形誤呼び総当たりガード (test.mjs) + コメント刈り ~350B (実装済)
│   ├── ADR-0539-onclick-fold.md # .onclick= を _oC へ畳み込み ~55B + プレゼン leave() null トリガーガード (実装済)
│   ├── ADR-0540-global-escape-ime.md # グローバル input Escape の IME 合成ガード (docName/RTC 欄) (実装済)
│   ├── ADR-0541-ctx-menu-unhandled-keys.md # ctx メニュー未処理キーでメニューを閉じる (実装済)
│   ├── ADR-0542-placeholder-i18n.md # data-t-ph placeholder 翻訳機構 + RTC ペースト欄ヒント (実装済)
│   ├── ADR-0543-export-coverage-sweep.md # export 済み未テスト関数のカバレッジ一掃 (実装済)
│   ├── ADR-0544-import-coverage-sweep.md # import/paste/conn-path/rot-handle/fit のカバレッジ第二弾 (実装済)
│   ├── ADR-0545-pen-primitive-coverage.md # ペン内部プリミティブ + _svgBoxLabel のカバレッジ (実装済)
│   ├── ADR-0546-style-panel-resync.md # prop 変化 op で選択中図形のパネル再同期 (実装済)
│   ├── ADR-0547-del-undo-locked-dedup.md # del undo で locked 図形の二重登録を防止 (実装済)
│   ├── ADR-0548-move-undo-moved-set.md # move undo で locked 図形の逆移動を防止 (実装済)
│   ├── ADR-0549-locked-parity-audit.md # locked parity undo 監査の結論ピン (実装済)
│   ├── ADR-0550-architecture-undo-parity-sync.md # architecture.md の locked parity 同期 (実装済)
│   ├── ADR-0551-img-ref-undo-restore.md # del undo の img 参照再解決 (実装済)
    │   ├── ADR-0552-ctx-menu-key-swallow.md # ctx メニュー未処理キーを呑み込み (実装済)
    │   ├── ADR-0553-ctx-menu-max-height.md # ctx メニューの max-height+scroll (実装済)
    │   ├── ADR-0554-pres-frames-stale.md # プレゼン中のフレーム削除で stale 参照 (実装済)
    │   ├── ADR-0555-ctx-pres-pins.md # 0552-0554 ピン + architecture.md img 参照節 (実装済)
    │   ├── ADR-0556-text-edit-remote-del.md # 編集中図形のリモート削除で phantom op 防止 (実装済)
    │   ├── ADR-0557-label-edit-remote-del.md # ラベル編集の remote-del orphan ガード (実装済)
    │   ├── ADR-0558-sticky-chain-remote-del.md # ⌘Enter 連鎖の remote-del orphan ガード (実装済)
    │   ├── ADR-0559-editor-follow-remote-del.md # 編集 overlay の削除時 proactive close (実装済)
    │   ├── ADR-0560-editor-double-open.md # editor 二重オープンの editing clobber 修正 (実装済)
    │   ├── ADR-0561-overlay-resize-follow.md # resize で overlay follow sig リセット (実装済)
    │   ├── ADR-0562-architecture-editor-lifecycle.md # architecture.md 編集 overlay 節同期 (実装済)
    │   ├── ADR-0563-fragin-seq0-restart.md  # _fragIn seq0 での同 src ストリーム再起動 (実装済)
    │   ├── ADR-0564-spec-wire-sync.md      # spec.md §8 へ wire 収束保証の同期 (実装済)
    │   ├── ADR-0565-frame-throw-resilience.md # frame() の draw throw で rAF を殺さない (実装済)
    │   ├── ADR-0566-select-frame-contents-visible.md # フレーム内容選択は可視のみ (実装済)
    │   ├── ADR-0567-spec-hidden-invariant.md # spec へ非表示の選択不変条件 (実装済)
    │   ├── ADR-0568-remote-hide-deselect.md  # 非表示化された図形を選択から落とす (実装済)
    │   ├── ADR-0569-hide-folds-editor.md     # hide 時に編集 overlay を畳む (実装済)
    │   ├── ADR-0570-locked-hide-toast.md     # 全ロック選択の hide で lockedNoop トースト (実装済)
    │   ├── ADR-0571-hidden-parity-doc.md     # architecture.md に hidden parity 節 (実装済)
    │   ├── ADR-0572-lock-folds-editor.md     # lock 時に編集 overlay を畳む (実装済)
    │   ├── ADR-0573-spec-overlay-fold.md     # spec.md に overlay 非到達化規則 (実装済)
    │   ├── ADR-0574-undo-cancels-gesture.md  # ドラッグ中の ⌘Z/⌘Y はジェスチャを先キャンセル (実装済)
    │   ├── ADR-0575-overlay-close-repaint.md # overlay 畳み後に _iv() で再描画 (実装済)
    │   ├── ADR-0576-peer-sel-hidden-skip.md  # ピア選択アウトラインが hidden を描かない (実装済)
    │   ├── ADR-0577-presence-hidden-parity-doc.md # architecture/spec へ presence hidden parity 同期 (実装済)
    │   ├── ADR-0578-wire-guard-pins.md          # _fragIn dup スロット + _dcQ cap のピン (実装済)
    │   ├── ADR-0579-research-doc-sync.md        # research-improvements.md の stale 未実装3件を同期 (実装済)
    │   ├── ADR-0580-comment-tail-reclaim.md     # コメント尾一括刈り ~17.9KB 回収 (実装済)
    │   ├── ADR-0581-docname-lww.md              # ドキュメント名の改名を ts ベース LWW で収束 (実装済)
    │   ├── ADR-0582-pres-enter-folds-editor.md  # プレゼン開始で編集 overlay を畳む (実装済)
    │   ├── ADR-0583-flip-mirrors-labelpos.md    # コネクタ反転で labelPos を 1-t へミラー (実装済)
    │   ├── ADR-0584-flip-mirrors-bound-anchor.md# 結合先同時反転で aF/bF を 1-f へミラー (実装済)
    │   ├── ADR-0585-reverse-negates-cbend.md    # reverseConn で cbend 符号反転 (実装済)
    │   ├── ADR-0586-rotate-remaps-bound-anchor.md# 結合先回転で aF/bF を extent へ再正規化 (実装済)
    │   ├── ADR-0587-grot-remaps-bound-anchor.md # 回転ノブでも aF/bF を extent へ再正規化 (実装済)
    │   ├── ADR-0588-flip-mirrors-unselected-anchor.md# 選択外コネクタの結合先反転でも aF/bF をミラー (実装済)
    │   ├── ADR-0589-anchor-transform-matrix.md  # コネクタ束縛×変換の不変条件文書化+ピン (実装済)
    │   ├── ADR-0590-exportscale-behavioral-pin.md# exportScale のクランプ実動作テスト (実装済)
    │   ├── ADR-0591-unbind-freezes-endpoint.md  # 結合解除で端点を解決済み位置へ凍結 (実装済)
    │   ├── ADR-0592-group-halo-visible-only.md  # 非表示メンバーをグループハローから除外 (実装済)
    │   ├── ADR-0593-export-bbox-visible-only.md # PNG/SVG エクスポートの bbox を可視図形のみに (実装済)
    │   ├── ADR-0594-excalidraw-export-visible-only.md  # .excalidraw エクスポートから非表示図形を除外 (実装済)
    │   ├── ADR-0595-minimap-visible-only.md     # ミニマップから非表示図形を除外 (実装済)
    │   ├── ADR-0596-hidden-parity-docs.md       # hidden parity 派生面規則の文書同期+ピン (実装済)
    │   ├── ADR-0597-drag-damage-bound-conn.md   # ドラッグのダメージ矩形に束縛コネクタの掃引領域を含める (実装済)
    │   ├── ADR-0598-apply-damage-bound-conn.md  # _apply のダメージ収穫に束縛コネクタの掃引領域を含める (実装済)
    │   ├── ADR-0599-resize-rotate-damage-conn.md # 単一リサイズ/回転ドラッグにも束縛コネクタ掃引を含める (実装済)
    │   ├── ADR-0600-damage-conn-invariant-docs.md # 束縛コネクタ×ダメージ矩形の不変条件を文書化 (実装済)
    │   ├── ADR-0601-per-shape-draw-isolation.md  # 1図形の描画例外が後続全図形を殺さない per-shape 隔離 (実装済)
    │   ├── ADR-0602-op-array-cap-board-ceiling.md # wire op の図形/id 配列上限を盤面上限へ (501+ 一括 op の無通知棄却→分岐を解消) (実装済)
    │   ├── ADR-0603-frag-undeliverable-stream.md  # 24MB 結合上限超のフラグメントストリーム: 送信側 toast 警告 + 受信側明示棄却 (実装済)
    │   ├── ADR-0604-hidden-gesture-cancel.md      # visibilitychange→hidden / pagehide でのジェスチャ取消 (stuck ptr.down 解消) (実装済)
    │   ├── ADR-0605-wire-bound-docs-sync.md       # ワイヤ境界・ジェスチャライフサイクルの文書同期 (0602/0603/0604) (実装済)
    │   ├── ADR-0606-present-resize-refit.md       # プレゼン中のビューポートリサイズで現在フレームを再フィット (実装済)
    │   ├── ADR-0607-longpress-ghost-click.md      # 長押し ctx メニューのゴースト click/mousedown 抑止 (実装済)
    │   ├── ADR-0608-touchstate-hidden-cleanup.md  # hidden/pagehide でタッチ状態 (_pointers/pinch) も掃除 (実装済)
    │   ├── ADR-0609-docname-focus-clobber.md      # フォーカス中の docName input をリモート改名が上書きしない (実装済)
    │   ├── ADR-0610-pts-round-dedup.md            # roundShapesForExport の pts 丸め二重処理を除去 (実装済)
    │   ├── ADR-0611-cursor-hide-on-leave.md       # pointerleave でピアカーソルを隠す (凍結残存の解消) (実装済)
    │   ├── ADR-0612-cursor-hide-blur-hidden.md    # blur/hidden でもピアカーソルを隠す (実装済)
    │   ├── ADR-0613-remote-replace-converge.md    # 'replace' op を wire 収束 (全置換のピア同期 + 同数 stale-index 修正) (実装済)
    │   ├── ADR-0614-concurrent-replace-lww.md     # 並行 'replace' の勝者を clockNewer 全順序で一意化 (実装済)
    │   ├── ADR-0615-replace-undo-wire.md          # 'replace' の undo を wire へ (pre-swap 盤面の復元をピア同期) (実装済)
    │   ├── ADR-0616-replace-commit-marker.md      # ローカル 'replace' commit で _lastRep marker を記録 (古いリモート swap の棄却) (実装済)
    │   ├── ADR-0617-snapshot-rep-marker.md        # スナップショットに swap marker 同梱 (古い世代の再混入を因果順序で棄却) (実装済)
    │   ├── ADR-0618-snapshot-name-lww.md          # スナップショットの docName を nameTs で LWW 化 (古い世代の上書き防止) (実装済)
    │   ├── ADR-0619-room-switch-marker-reset.md   # ルーム切替で因果 marker をリセット (新ルームの収束阻害を解消) (実装済)
    │   ├── ADR-0620-architecture-replace-convergence-sync.md   # architecture.md の wire 節へ 'replace' 収束系を同期 (実装済)
    │   ├── ADR-0621-move-commit-dead-ids.md   # move コミットからジェスチャ中に消えた図形を除外 (実装済)
    │   ├── ADR-0622-spec-replace-wire-sync.md   # spec.md の 'replace' wire 化を同期 (実装済)
    │   ├── ADR-0623-selection-dead-id-hygiene.md   # 選択由来 id リストの dead-id 衛生 (実装済)
    │   ├── ADR-0624-architecture-dead-id-parity-sync.md   # architecture.md へ dead-id parity 不変条件を同期 (実装済)
    │   ├── ADR-0625-slim-op-undo-field-strip.md   # _slimOp が wire op から undo 専用フィールドを剥がす (実装済)
    │   ├── ADR-0626-clear-wire-as-replace.md   # 'clear' op を wire 上 'replace'(after:[]) へ翻訳し全消去の収束 (実装済)
    │   ├── ADR-0627-canvas-context-restore.md   # contextlost/restored で GPU キャッシュをパージ+再描画 (実装済)
    │   ├── ADR-0628-architecture-context-restore-sync.md   # architecture.md へ GPU キャッシュ不変条件を同期 (実装済)
    │   ├── ADR-0629-img-blob-stragglers.md   # 追い出された parked 図形も blob 到着時に解決 (実装済)
    │   ├── ADR-0630-img-stragglers-test.md   # ADR-0629 の実動作ピン (evicted+pending 両経路) (実装済)
    │   ├── ADR-0631-resize-debounce.md   # resize を trailing-edge debounce 化 (canvas 再確保の嵐解消) (実装済)
    │   ├── ADR-0632-minimap-nav-cancel.md   # _mmNav を hidden/pagehide でもクリア (bfcache 復帰ジャンプ解消) (実装済)
    │   ├── ADR-0633-architecture-lifecycle-sync.md   # architecture.md へ resize debounce + cancelNav を同期 (実装済)
    │   ├── ADR-0634-present-cancels-gesture.md   # プレゼン突入で進行中ジェスチャをキャンセル (実装済)
    │   ├── ADR-0635-gesture-target-byid.md   # resize/rotate の対象を _sel0→byId(orig.id) (mid-gesture 選択変更で誤対象) (実装済)
    │   ├── ADR-0636-cancel-clears-pinch.md   # _cancelPointerGesture が _pointers/ピンチ状態も掃除 (実装済)
    │   ├── ADR-0637-kbd-editor-cancels-gesture.md   # Enter 編集オープンも mid-gesture キャンセル (実装済)
    │   ├── ADR-0638-architecture-gesture-sync.md   # architecture.md へジェスチャ×外部変化の不変条件を同期 (実装済)
    │   ├── ADR-0639-presentation-sr-announce.md   # プレゼン突入/遷移/終了を SR announce (実装済)
    │   ├── ADR-0640-presentation-input-gates.md   # プレゼン中の dblclick/contextmenu/wheel/pinch を _pA ゲート (実装済)
    │   ├── ADR-0641-pointer-sequence-testing.md   # 合成 PD/PM/PU を canvas 実リスナへ dispatch (spec P3 前進) (実装済)
    │   ├── ADR-0643-qconn-ptrdown-gate.md         # quick-connect の ptr.down ゲート共有を解消 — 導入時から死んでいた実害を復旧 (実装済)
    │   ├── ADR-0644-sequence-harness-rules.md       # イベント系列 harness 運用規約 (fire1/stale混入/reset境界) (実装済)
    │   ├── ADR-0645-sequence-verification-complete.md  # 系列検証の完走状態 — 全リスナ型網羅、残: レンダリング実体+FileReader (実装済)
│   ├── ADR-0646-multi-page.md                      # 多ページ — pages/curPg + s.pg 帰属、ページバー、ワイヤ収束 (実装済)
│   ├── ADR-0647-page-scoped-presence.md            # ページ別プレゼンス — presence msg に pg 同梱、別ページピア非描画 (実装済)
│   ├── ADR-0648-page-nav-keys.md                   # PgUp/PgDn ページ巡回 — キーボード/SR 到達経路 (実装済)
│   ├── ADR-0649-pagedel-lands-via-switchpage.md    # 閲覧ページ削除の着地点を switchPage 化 (実装済)
│   ├── ADR-0650-drawio-real-pages.md               # .drawio 複数ページ ↔ Board 真のページ — pageAdd+shapes op (実装済)
│   ├── ADR-0651-page-duplicate.md                  # ページ複製 (⧉) — pageAdd+shapes で一括コピー (実装済)
│   ├── ADR-0652-undo-page-follow.md                # undo/redo のページ追従 + pageAdd backward heal (実装済)
│   ├── ADR-0653-zorder-frac-lww.md
│   ├── ADR-0654-adaptive-grid-cell.md
│   ├── ADR-0655-seenops-eviction-safety.md
│   ├── ADR-0656-peer-avatar-page.md
│   ├── ADR-0657-page-ops-reapply-safety.md                 # zorder frac の per-shape LWW 収束 (実装済)
│   ├── ADR-0658-page-scoped-exports.md  # 単一シーンエクスポートをカレントページ限定 (PNG/SVG/PDF/excalidraw の全ページ重畳修正)
│   ├── ADR-0659-equal-gap-snap-page-scope.md  # 等間隔スナップを可視・現ページ図形に限定 (実装済)
│   ├── ADR-0660-show-all-page-scope.md  # 「すべて表示」を現ページに限定 (実装済)
│   ├── ADR-0661-unlock-fit-page-scope.md  # 「すべて解除」/フレームフィットを現ページに限定 (実装済)
│   ├── ADR-0662-tab-chain-page-scope.md  # Tab 連鎖を現ページに限定 (実装済)
│   ├── ADR-0663-last-page-undo-heal.md  # 最終ページ undo で帰属掃除 (実装済)
│   ├── ADR-0664-page-switch-cancels-gesture.md  # ページ遷移でジェスチャキャンセル (実装済)
│   ├── ADR-0665-page-scoped-selection-bulk.md  # 一括選択系のページスコープ (実装済)
│   ├── ADR-0666-ctx-png-page-scope.md  # ctx PNG 固定倍率のページスコープ (実装済)
│   ├── ADR-0667-hop-frame-naming-page-scope.md  # ホップ/フレーム採番のページスコープ (実装済)
│   ├── ADR-0668-minimap-nav-empty-hint.md  # ミニマップナビ/空ヒントのページスコープ (実装済)
│   ├── ADR-0669-status-count-page-scope.md  # ステータスバー図形数のページスコープ (実装済)
│   ├── ADR-0670-peer-avatar-follow.md  # ピアアバターでページ追従 (実装済)
│   ├── ADR-0671-page-scope-invariant.md  # ページスコープ不変条件の文書化
│   ├── ADR-0672-snapshot-local-view.md  # snapshot 取込でビュー維持 (実装済)
│   ├── ADR-0673-page-tab-strip.md  # ページタブストリップ (実装済)
│   ├── ADR-0674-curpg-persist-on-switch.md  # ページ切替で persist (実装済)
│   ├── ADR-0675-tab-rebuild-signature.md  # タブ sig キャッシュ + aria-current (実装済)
│   ├── ADR-0676-stale-research-sync.md  # stale 調査記述の同期 (実装済)
│   ├── ADR-0677-pres-page-switch-frames.md  # プレゼン中ページ切替の幻影フレーム (実装済)
│   ├── ADR-0678-drawio-hidden-parity.md  # .drawio エクスポートの hidden parity (実装済)
│   ├── ADR-0679-pagedel-wclock-purge.md  # pageDel の member wclock purge (実装済)
│   ├── ADR-0680-sel-presence-page-key.md  # 選択プレゼンス dedup キーに curPg (実装済)
│   ├── ADR-0681-snapshot-page-name-lww.md  # snapshot の同 id ページ名 LWW マージ (実装済)
│   ├── ADR-0682-tab-full-name-aria.md  # ページタブ完全名 aria-label (実装済)
│   ├── ADR-0683-pgbar-sig-focus.md  # pgBar sig セパレータ+フォーカス復元 (実装済)
│   ├── ADR-0684-adopt-editor-fold.md  # adopt ページ交代でエディタ畳む (実装済)
│   ├── ADR-0685-live-tab-into-view.md  # アクティブタブを scrollIntoView 追従 (実装済)
│   ├── ADR-0686-avatar-page-refresh.md  # ページ変化でアバターツールチップ更新 (実装済)
│   ├── ADR-0687-arch-multi-page-sync.md  # architecture.md マルチページ節同期 (ドキュメント)
│   ├── ADR-0688-local-page-cap.md  # ローカル pageAdd/Dup の 64 cap (実装済)
│   ├── ADR-0689-switchpage-pg-order.md  # cursorHide を curPg 移動後に (実装済)
│   ├── ADR-0690-adopt-cursor-hide.md  # _pgAdopt のページ交代でも cursorHide (実装済)
│   ├── ADR-0691-sendorder-invariant.md  # presence送出順の文書同期 (実装済)
│   ├── ADR-0692-adopt-unknown-pg-heal.md  # _pgAdopt の未知 pg ヒール (実装済)
│   ├── ADR-0693-union-heal-pg.md  # union-heal 側も未知 pg を拾う (実装済)
│   ├── ADR-0694-null-pages-scrub.md  # ページ集合 null 移行の s.pg scrub (実装済)
│   ├── ADR-0695-causal-marker-persistence.md  # _lastRep/_nameTs の IDB 永続化 (実装済)
│   ├── ADR-0696-swap-name-broadcast.md  # swap 経路の name 即時 broadcast (実装済)
│   ├── ADR-0697-pgbar-aria-labels.md  # ページバーボタンの aria-label (実装済)
│   ├── ADR-0698-pagename-tie-order.md  # pageName の (ts,peer) 総順序化 (実装済)
│   ├── ADR-0699-docname-tie-order.md  # docName の (ts,writer) 総順序化 (実装済)
│   ├── ADR-0700-vpages-finite.md  # _vPages が nts/ntp を厳格検証 (実装済)
│   ├── ADR-0701-rename-finite-ts.md  # 改名 ts の非有限値を棄却 (実装済)
│   ├── ADR-0702-pagename-undo.md  # pageName undo がローカル no-op だった実害 (実装済)
│   ├── ADR-0703-remotedel-lastpage.md  # remote 最終ページ del の収束 (実装済)
│   ├── ADR-0704-pageadd-wire-index.md  # wire pageAdd の位置復元 (実装済)
│   ├── ADR-0705-pagewire-slim.md  # wire pageDel/pageName の適用フィールドのみ化 (実装済)
│   ├── ADR-0706-arch-sync-pagewire.md  # architecture.md へ改名/削除収束規則を同期 (実装済)
│   ├── ADR-0707-pagedel-del-parity.md  # pageDel の locked 生存 + connClears 束縛解除 (実装済)
│   ├── ADR-0708-pageadd-member-pg.md  # remote pageAdd メンバーの pg を op.id へ正規化 (実装済)
│   ├── ADR-0709-editor-fold-offpage.md  # 編集中図形の off-page 化で overlay を畳む (実装済)
│   ├── ADR-0710-arch-sync-pgparity.md  # architecture.md へ pageDel parity/member-pg/fold 規則を同期 (実装済)
│   ├── ADR-0711-pagedel-connclock.md  # pageDel backward connClears 復元の locked skip (実装済)
│   ├── ADR-0712-locked-backward-parity.md  # upd/style 系 undo も locked skip (wire 収束) (実装済)
│   ├── ADR-0713-add-locked-backward.md  # add/addMany undo も locked skip (存在収束) (実装済)
│   ├── ADR-0714-pageadd-locked-backward.md  # pageAdd undo も locked member を残す (実装済)
│   ├── ADR-0715-clear-undo-idempotent.md  # clear undo の idempotent 化 (重複登録防止) (実装済)
│   └── ADR-0716-allops-locked-backward.md  # move/group/ungroup/zorder undo も locked skip (実装済)
│   └── ADR-0717-undo-fresh-clock.md  # undo は fresh clock で仲裁 (旧 clock の発散解消) + style系 undo-wire の before 同梱 + patch locked 除去 (実装済)
│   └── ADR-0718-redo-stamp-before-apply.md  # redo も stamp-once 不変条件へ統一 (実装済)
│   └── ADR-0719-move-undo-moved-ids.md  # move undo-wire は op.moved 集合を送る (phantom 逆移動解消) (実装済)
│   └── ADR-0720-replace-wire-curpg.md  # 'replace' ワイヤに着陸ページを同梱 (受信側 page1 固定化を解消) (実装済)
│   └── ADR-0721-undo-wire-wclock.md  # del/clear undo-wire に wclock スナップを同梱 (LWW 仲裁発散を解消) (実装済)
│   └── ADR-0722-pagedel-wclock.md  # pageDel も member wclock を記録+復元 (del parity) (実装済)
│   └── ADR-0723-clear-wc-merge.md  # clear undo の wclock を全置換→マージへ (行き違い時計の消失を解消) (実装済)
│   └── ADR-0724-pageadd-undo-unpage.md  # pageAdd undo を _pgDel2 現メンバー基準へ + 最終ページ undo は 'unpage' wire で op由来のみ死/残り un-page (実装済)
│   └── ADR-0725-pagedel-wire-firstid.md  # pageDel の rehome 先を wire で送側の firstId に統一 (ページ順発散時のメンバー帰属分裂を解消) (実装済)
│   └── ADR-0726-addmany-wc-validate.md  # addMany.wc (undo-wire の wclock スナップ) を validRemotePayload で検証 (NaN 時計の仲裁汚染を閉塞) (実装済)
│   └── ADR-0727-pagename-undo-nts.md  # pageName undo-wire に復元 nts/ntp を同梱 (undo clock を受側が刻んで次の改名 LWW が分裂するのを解消) (実装済)
│   └── ADR-0728-arch-sync-undowire.md  # architecture.md の undo×sync に 0717–0727 の7規則を文書化 (実装済)
│   └── ADR-0729-move-absolute-wire.md  # wire move に絶対 after/before を同梱し LWW 化 (delta×absolute 競合の発散解消) (実装済)
│   └── ADR-0730-beautify-wire.md  # 'beautify' を wire op 化 (REMOTE_OPS+validator+LWW — 送側のみ retype の発散解消) (実装済)
│   └── ADR-0731-beautify-undo-wire.md  # 'beautify' undo-wire を patch-swap 化 (ADR-0730 の発散が undo で再燃していた) (実装済)
│   ├── ADR-0732-move-undo-absolute.md  # move undo-wire を絶対値化 + backward 絶対復元 (ADR-0729 残 delta の発散解消) (実装済)
│   └── ADR-0733-move-delta-undo-axis-arbitration.md  # delta backward を _lwwSkip で軸毎仲裁 (racing write 保有軸の発散解消) (実装済)
│   └── ADR-0734-wclock-delete-tombstones.md  # 存在仲裁: del/addMany 逆写/pageDel が wclock に {_del:clock} 墓標を残し add 系 push が墓標下位の遅延 add を棄却 (実装済)
│   └── ADR-0735-snapshot-adopt-tomb-filter.md  # 残存墓標穴: 空盤面の snapshot 一括採用も墓標フィルタ (del 前 snapshot の復活閉塞) + pageAdd tomb クリア parity (実装済)
│   └── ADR-0736-clear-replace-tombstones.md  # clear/'replace' が wclock 全消去で墓標を喪失 → swap 除去 id を tomb 化 + 上位 tomb 生存 (実装済)
│   └── ADR-0737-import-swap-tombstones.md  # ローカル import 3経路 (_recordCommitted 経由) の wclock wipe にも墓標書込み (実装済)
│   └── ADR-0738-wclock-cap-keeps-tombs.md  # 8192 flood cap が墓標ごと wipe → 墓標のみ保持 (存在状態は自己修復しない) (実装済)
│   └── ADR-0739-hlc-floor-everywhere.md  # 生 Date.now() で stamp されていた 3 サイトを HLC floor (nowTs) へ統一 (実装済)
│   └── ADR-0740-dead-wire-fields.md  # 受信側が読まない wire フィールド3件 (hello/ping seq・snapshot curPg) 削除 (実装済)
│   └── ADR-0741-remote-move-absolute-required.md  # remote move の bare delta 形式を拒絶 (旧版ピアの raced-base 発散+clock poison 封鎖) (実装済)
│   └── ADR-0742-legacy-zorder-rejected.md  # remote zorder の legacy wholesale form を拒絶 (LWW/stamp 無しの raced clobber 封鎖) (実装済)
│   └── ADR-0743-wire-format-doc-sync.md  # architecture.md の wire 節を 0739-0742 契約へ同期 (実装済)
│   └── ADR-0744-legacy-zorder-apply-removed.md  # 到達不能な legacy zorder 適用経路を削除 (実装済)
│   └── ADR-0745-snapshot-img-merge-pending.md  # snapshot merge で負けた img 参照の _imgPending 残留を除去 (実装済)
│   └── ADR-0746-dataurl-merge-drops-stale-img.md  # dataUrl merge 勝利で parked img 参照を除去 (実装済)
│   └── ADR-0747-img-resolve-live-ref-gate.md  # img blob 解決を live ref 一致でゲート (実装済)
│   └── ADR-0748-pgadopt-grid-invalidate.md  # _pgAdopt で _gridVer キャッシュを無効化 (実装済)
│   └── ADR-0749-pgadopt-sel-revalidate.md  # _pgAdopt で選択を _pgOk 再検証 (実装済)
│   └── ADR-0750-pgadopt-sr-announce.md  # _pgAdopt でページ切替を SR アナウンス (実装済)
│   └── ADR-0751-page-transition-audit.md  # ページ遷移不変条件の監査完走 (ドキュメント化)
│   └── ADR-0752-pageadd-member-attach.md  # リモート pageAdd のメンバー図形は _attachShape 経由 (ピン)
│   └── ADR-0753-pagedel-pending-wipe.md  # pageDel の _pcC は駐車 img 参照を全域 wipe → straggler が解決 (ピン)
│   └── ADR-0754-img-lifecycle-sync.md  # architecture.md の img 参照ライフサイクル節へ 0752/0753 同期 (docs)
│   └── ADR-0755-pageop-wire-fields.md  # validRemotePayload が pageAdd.i / pageDel.firstId / pageName.nts を検証
│   └── ADR-0756-wire-convergence-sync.md  # architecture.md の undo-wire 収束節を 0729-0755 へ同期 (docs)
│   └── ADR-0757-persist-causal-markers-sync.md  # architecture.md §6 へ causal marker 永続化規則を同期 (docs)
│   └── ADR-0758-del-redo-connclears.md  # del redo のギャップ結合コネクタ dangling を _remoteDelConnFix で解消
│   └── ADR-0759-add-undo-connclears.md  # add/addMany undo が生存期間の結合を残す非対称を同機構で解消
│   └── ADR-0760-connclears-locked-survivor.md  # del の connClears が locked 生存図形の結合を剥がさないよう端点毎に判定
│   └── ADR-0761-connclears-lifecycle-sync.md  # architecture.md へ connClears ライフサイクル規則を同期 (docs)
│   └── ADR-0762-connclears-gap-pins.md  # connClears ギャップ/生存期間結合の behavioural ピン (tests)
│   └── ADR-0763-spec-wire-contract-sync.md  # spec.md §8 の wire 契約を現行コードへ同期 (docs)
│   └── ADR-0764-gesture-cancel-terminal-state.md  # 両キャンセル経路の終端 ptr 状態を _ptrReset 統一 (dataset.panning 残留 fix)
│   └── ADR-0765-presentation-frame-reresolve.md  # プレゼン _goto が死んだ clone 参照へ zoom していた — _frames を id 再解決 (stale rect/pg fix)
│   └── ADR-0766-gesture-geometry-restore.md  # ジェスチャ orig 復元を幾何限定 _geoR へ — mid-drag リモート書込みの沈黙消失を解消 (16サイト)
│   └── ADR-0767-nested-frame-membership.md  # 入れ子フレームも外枠のメンバー (withFrameChildren/_frameOf の _frm 除外解除 + outer-keyed ガード)
│   └── ADR-0768-presentation-page-nav.md  # プレゼン中 PgDn/PgUp をスライドナビへ (deck-tool parity)
│   └── ADR-0769-peer-pg-avatar-refresh.md  # ピアの pg 変化で _refreshPeers 即時再描画 (ツールチップページ名の遅延解消)
│   └── ADR-0770-architecture-sync-round519.md  # architecture.md へ 0764-0769 期の規則を同期 (docs)
│   └── ADR-0771-pgdup-insert-index.md  # ページ複製を元の直後へ挿入 (op.i 同梱)
│   └── ADR-0772-pageadd-name-cap.md  # pageAdd 生成側も 80 字へ clamp (wire 発散防止)
│   └── ADR-0773-snapshot-page-order-heal.md  # スナップショット heal がページ順序も採用 (タブ順発散の解消)
│   └── ADR-0774-page-order-heal-pin.md  # ページ順序 heal の behavioural ピン
│   └── ADR-0775-page-stub-upgrade.md  # '?'スタブ恒久化の解消 — nts:-1 で全 LWW に負ける + pageAdd がスタブを昇格
│   └── ADR-0776-pagedel-unpage-killset.md  # pageDel 'unpage' はワイヤーの kill 集合を必須に (un-page≠kill の発散閉塞)
│   └── ADR-0777-wire-intake-audit-complete.md  # wire intake 検証監査の完走記録 (16 op 網羅 + wc ライフサイクル)
│   └── ADR-0778-op-pg-stub-heal.md  # 個別 op の未知 s.pg を '?' スタブへ即時 heal (永久不可視 orphan の閉塞)
│   └── ADR-0779-validclock-length-caps.md  # validClock に peer/seq 文字列長上限 (seenOps+wclock 肥大閉塞)
│   └── ADR-0780-snapshot-namepeer-cap.md  # スナップショット namePeer/復元 ntp に 64 キャップ (永続化肥大閉塞)
│   └── ADR-0781-img-reassembly-byte-cap.md  # img 再組立て中間バイト 12MB 早期中断
│   └── ADR-0782-fragin-reassembly-byte-cap.md  # snap/opc 再組立て中間バイト 24MB 早期中断
│   └── ADR-0783-dcq-byte-cap.md  # _dcQ 送信キューに 32MB バイト上限
│   └── ADR-0784-imgin-byte-cap.md  # _imgIn 受信 blob ストアに 64MB バイト上限
│   └── ADR-0785-imgchunks-aggregate-cap.md  # _imgChunks 集計バイト予算 24MB
│   └── ADR-0786-reassembly-ttl.md  # 再組立てスロットに 60s アイドル TTL
│   └── ADR-0787-wire-bounds-docs-sync.md  # architecture.md へ 0775-0786 期規則を同期
│   └── ADR-0788-wclock-null-proto.md  # wclock の null-proto 化 — __proto__ 汚染による盤面凍結を解消
│   └── ADR-0789-wclock-fold.md  # wclock write/merge 全サイトを _wD/_wR/_wTb へ集約
│   └── ADR-0790-dup-id-intake.md  # wholesale 取込の dup id dedupe (keep-last/byId parity)
│   └── ADR-0791-future-ts-bound.md  # 全 LWW clock ts の壁時計+5分上限 (_tsOK)
│   └── ADR-0792-coord-magnitude-bound.md  # 座標 magnitude 上限 |coord|≤1e7 (view-poison DoS 解消)
│   └── ADR-0793-bbox-prop-bound.md  # 幾何到達 prop の magnitude 検証 (size/bend/aF/bF)
│   └── ADR-0794-wire-bounds-docs-sync2.md  # architecture.md へ 0788-0793 期規則を同期
│   └── ADR-0795-viewport-bound.md  # 採用ビューポート中心を _xyOK へ (細工リンクのブランク着陸閉塞)
│   └── ADR-0796-importer-intake-parity.md  # パーサ出力を validShape 通過へ (wire parity 発散解消)
│   └── ADR-0797-text-editor-wire-cap.md  # テキストエディタ maxLength=5000 (wire text 上限 parity)
│   └── ADR-0798-viewport-center-clamp.md  # ライブ viewport 中心を _xC で ±1e7 にクランプ (パン由来の発散解消)
│   └── ADR-0799-viewport-center-clamp-follow.md  # fit/centerOn の派生書き込みも _xC へ (不変完結)
│   └── ADR-0800-viewport-bounds-docs-sync.md  # architecture.md へ 0795-0799 期規則を同期
│   └── ADR-0801-equal-ts-test-determinism.md  # equal-ts 仲裁テストの時計を単一採取化 (フレーク解消)
│   └── ADR-0802-viewport-clamp-pin.md  # _xC クランプの実キー経路 behavioural ピン
│   └── ADR-0803-viewport-clamp-zoomtoframe.md  # プレゼン _zoomToFrame の中心も _xC へ (全書き込み完結)
│   └── ADR-0804-viewport-write-audit-complete.md  # viewport 書き込み監査完走 — 全経路 bounded
│   └── ADR-0805-wheel-clamp-pin.md  # wheel パン/ctrl+wheel ズームの _xC ピン
│   └── ADR-0806-edge-pan-clamp.md  # エッジオートパンの保存参照経由書き込みを _xC へ (監査見落とし解消)
│   └── ADR-0807-comment-reclaim.md  # コメント尾刈り込み ~870B 回収
│   └── ADR-0808-edge-pan-clamp-pin.md  # エッジオートパン _xC を _edgePanTick 直叩きで behavioural ピン (全書き込み経路網羅)
│   └── ADR-0809-pan-drag-clamp-pin.md  # hand ツールドラッグパンの _xC を実ポインタ経路でピン (累積経路全網羅)
│   └── ADR-0810-architecture-sync-pin-layer.md  # architecture.md をピン完走 + BC/RTC 単一受信経路へ同期
│   └── ADR-0811-presence-audit-complete.md  # presence 取込監査完走 — 全フィールド intake bounded
│   └── ADR-0812-presence-gate-pins.md  # presence ゲートを Net._onRecv 直叩きで behavioural ピン
│   └── ADR-0813-sw-blob-url-revoke.md  # SW 登録の blob URL を登録完了後に解放 (_oURL 全サイト parity)
│   └── ADR-0814-rejection-audit-complete.md  # 非同期 rejection 監査完走 — 全 promise 経路 catch 済み
│   └── ADR-0815-hash-decode-guard.md  # #b= ハッシュの decodeURIComponent を try 内へ (malformed % の pinned URL 解消)
│   └── ADR-0816-send-lifecycle-audit.md  # 送信ファネル・キューライフサイクル監査完走 — 全経路 clean
│   └── ADR-0817-timer-lifecycle-audit.md  # タイマー・インターバルのライフサイクル監査完走 — 全クリア/再アーム/単一スロット
│   └── ADR-0818-listener-raf-audit.md  # リスナ・rAF スロット監査完走 — 一回性/GC/once 再アーム/代入差し替え/単一アーム
│   └── ADR-0819-storage-quota-audit.md  # storage・quota・img 送信キュー監査完走 — drain/room 切替/quota toast/estimate catch
│   └── ADR-0820-misc-lifecycle-audit.md  # RTC/history/img queue/pinch/fonts 残余監査完走 + spec backlog 空を確認
│   └── ADR-0821-rtc-presence-pin.md  # Net.init の rtc: presence 維持不変を behavioural pin で固定
│   └── ADR-0822-superseded-channel-guard.md  # RTC 再接続の stale-channel race — per-channel _pid + superseded ガード
│   └── ADR-0823-invite-hash-decode-guard.md  # #s= 招待リンクの malformed % も _eT(_IB) へ (#b= parity)
│   └── ADR-0824-transport-matrix-sync.md  # architecture.md の transport×kind 表を dual-transport 実態へ同期
│   └── ADR-0825-rtc-peerkey-pin.md  # _pk viaRtc 振分け + rtc bye の _rtcPeerId クリアを behavioural pin で固定
│   └── ADR-0826-loresp-election-pin.md  # _loResp snapshot 応答選出 (最小id・asker/rtc 除外) を behavioural pin で固定
│   └── ADR-0827-forged-rtc-peerid.md  # BC 経路の偽装 rtc: peer id 棄却 (reaper 免除悪用の幽霊行を閉塞)
│   └── ADR-0828-rtc-provenance-rule.md  # rtc: 行の provenance 規則を architecture.md へ同期
│   └── ADR-0829-comment-tail-sweep2.md  # 未完括弧コメント残滓の第2刈り込み (~1.3KB)
│   └── ADR-0830-eraser-frame-cascade.md  # eraser のフレーム cascade — withFrameChildren で Delete と parity
│   └── ADR-0831-eraser-hover-pagescope.md  # 別ページ eraser hover の赤破線ゴーストを _pgOk で解消
│   └── ADR-0832-hover-hit-pagescope-audit.md  # hover/hit 系のページスコープ監査完走 (未ゲートは _ehov のみ)
│   └── ADR-0833-placecopies-page-pin.md  # _placeCopies の閲覧ページ着地 behavioural pin
│   └── ADR-0834-pageadd-member-gate.md  # 上限棄却 pageAdd の member をページ存在にゲート
│   └── ADR-0835-imgq-re-request.md  # parked img 参照の imgq 再要求 (heartbeat sweep + 60s 解放)
│   └── ADR-0836-imgq-answer-throttle.md  # imgq 応答の per-key 10s スロットル (再送増幅の抑止)
│   └── ADR-0837-imgq-broadcast.md  # imgq を _bcast 化 (RTC-only ピアへも到達)
│   └── ADR-0838-send-transport-audit.md  # wire 送出トランスポート監査完走 (imgq のみ誤配)
│   └── ADR-0839-room-switch-rtc-close.md  # 部屋切替で RTC リンクを閉じる (cross-room op 混入の防止)
│   └── ADR-0840-idb-imgref-park.md  # IDB 復元のぶら下がり img 参照を _imgPending へ駐車
│   └── ADR-0841-patch-imgref-park.md  # パッチ適用経由の img 参照を _oa 単一ゲートで駐車
│   └── ADR-0842-imgsent-byte-bound.md  # _imgSent を 64MB バイト上限化 + 駐車イディオム _park 集約
│   └── ADR-0843-rtc-snapbig-close.md  # snapBig 時に RTC リンクを閉じて joiner へ可視通知
│   └── ADR-0844-img-wire-audit-complete.md  # img/wire サブシステム監査完走の記録
│   └── ADR-0845-imgsent-evict-pin.md  # _imgSent バイト上限の最古 evict を behavioural ピン
│   └── ADR-0846-snapshot-addonly-pin.md  # _mergeSnapshotOp の 'add'-only ゲートを behavioural ピン
│   └── ADR-0847-comment-fragment-repair.md  # 切断コメント残片5箇所の文法修復
│   └── ADR-0848-tool-children-aria-hidden.md  # ツールボタンの装飾子要素を a11y ツリーから除外 (1 ツール=1 VO 項目、FT-11 実機検証で検出)
│   └── ADR-0849-comment-fragment-repair-2.md  # 切断コメント残片の第二スイープ (~55箇所修復 + 26 ブロック圧縮で相殺)
│   └── ADR-0850-conn-label-measure-spacing.md  # _connLabelMeasure のメモ化キーへ s.spacing 追加 (ctx.letterSpacing → measureText 幅)
│   └── ADR-0851-comment-fragment-repair-3.md  # 切断コメント残片の第三スイープ (~80箇所修復 + 長ブロック圧縮で帳尻)
│   └── ADR-0852-minimap-theme-token-stale.md  # OS テーマ/コントラスト切替でミニマップシーン未無効化 → _tTk で統一 + 残片6箇所修復
│   └── ADR-0853-drawio-inflate-page-cap.md  # 圧縮 <diagram> 展開の件数無制限 → 非圧縮パスと同じ 64 頁上限へ (並行 DecompressionStream の無制限生成を阻止)
│   └── ADR-0854-insession-growth-audit.md  # セッション内蓄積監査完走 (undo/seenOps/pages/peers/caches 全て bounded) + 切断コメント修復スイープ#4
│   └── ADR-0855-invalidation-funnel-audit.md  # 無効化網羅性監査完走 (全変更経路が _iG/_iv/_ivO/_ms/_ps/_pgBar 到達)
│   └── ADR-0856-dead-code-selection-error-audit.md  # dead-code/選択 repaint/エラーパス 3 軸監査完走 (shorthand 全 live、選択 55 サイト repaint、catch partial-mutation なし)
│   └── ADR-0857-stroke-less-pen-fallback.md  # stroke 未設定 pen の描画色を --brand へ解決 + _tTk が pen ビットマップもパージ (テーマ反転で焼き付け色が残留しない)
│   └── ADR-0858-bounded-prop-keys.md  # wire patch/shape のキー数上限 64 (未知キーの図形+wclock 着地・snapshot 伝播の閉塞)
│   └── ADR-0859-ctx-state-restore.md  # 描画ステートリーク監査完走 (drawShape の ctx 復元をピン、動的 innerHTML ゼロ/XSS clean、_imgIn ルーム跨ぎ by-design)
│   └── ADR-0860-injective-sig-keys.md  # id/name 集合 sig キーの _JS 化 — ','/'\x1f' 含有リモート値が join キーを衝突させる実害を5サイトで解消
│   └── ADR-0861-drawio-gid-escape.md  # drawio emit の groupId を _dioEsc 化 — '"' 含有リモート gid の XML 属性注入 (エクスポート artifact 経由) を閉塞
│   └── ADR-0862-label-editor-csstext-injection.md  # label エディタの cssText からリモート stroke を排除 — ';' による CSS 宣言注入 (外部 url() フェッチ含む) を value-typed property 代入で閉塞
│   └── ADR-0863-remote-dom-sink-audit.md  # リモート文字列→DOM シンク監査完走 (eval/innerHTML/cssText/href/src/title/dataset/location/storage 全 clean) + dialog/focus/pointer-capture 対称性検証
│   └── ADR-0864-img-blob-content-verify.md  # img 受信 blob の content-address 検証 — 被害者キー名乗りで _imgIn 上書き→parked/imgq フォージ供給の恒久発散を閉塞
│   └── ADR-0865-prop-weight-bound.md  # validPatch に全 prop の serialize 重量 ≤6KB — 64鍵上限は件数のみで未知キーの MB 級ペイロードが形状へ着地し snapshot 増殖していた実害を閉塞
│   └── ADR-0866-local-input-wire-caps.md  # ローカル入力も wire 上限を共有 — pen pts>50000 / waypoint>200 がローカル commit・全ピア棄却で発散していた実害を閉塞
│   └── ADR-0867-dataurl-wire-bound-parity.md  # dataUrl 取込上限を wire 境界へ一致 — 16*1024*1024 vs 16_000_000 の ~777KB 窓でローカル受理・全ピア棄却の発散を閉塞
│   └── ADR-0868-numeric-range-bounds.md  # opacity/size/fontSize の値域ゲート — 範囲外代入を無視する canvas 仕様で前 shape の描画状態が漏れる非決定描画を閉塞
│   └── ADR-0869-session-accumulation-audit.md  # セッション内蓄積監査完走 — 全キュー/マップ bounded;総図形数ゲートは到着順序依存で恒久発散のため非採用
│   └── ADR-0870-color-prop-format.md  # stroke/fill/color の書式検証 — 無効 CSS 色は canvas が代入無視し前 shape の色漏れ;CSS.supports+非DOMフォールバック、fill:'none' 保護
│   └── ADR-0871-render-prop-format-audit.md  # 描画消費 prop の書式監査完走 — 全 sink がゲート/whitelist写像/ローカル定数で決定的;enum gate は後方互換で非採用
│   └── ADR-0872-intake-parity-audit.md  # wire 取込 parity 監査完走 — op whitelist・aux・構造鍵・wholesale・生産者全網羅;「intake検証or消費安全」が全フィールドの規則に
│   └── ADR-0873-editor-typography-parity.md  # テキスト編集 overlay に letterSpacing/lineHeight を適用 — canvas 描画との WYSIWYG 乖離を解消
│   └── ADR-0874-label-editor-typography.md  # ラベルエディタ cssText に letter-spacing/text-decoration 追加 — 0873 同型のラベル側 WYSIWYG 乖離を解消
│   └── ADR-0875-producer-parity-audit.md  # ローカル生産者 bound 監査完走 — 全入力が wire 上限以下 (0872 intake と対の producer 側)
│   └── ADR-0876-paste-producer-pins.md  # ペースト生産者 bound の behavioural ピン — >4000 平文・>2000 TSV セル・生成図形の validShape 受理を実経路で固定
│   └── ADR-0877-img-import-pre-read-guard.md  # 画像取込に _bigFile 事前ガード — 巨大ファイルを全読みしてから棄却していたメモリスパイクを閉塞 + FileReader ピン
│   └── ADR-0878-degenerate-image-guard.md  # 0×0 デジェネレート画像の棄却 — 不可視図形着地 / NaN 高さ書込み発散を img.onload ゲートで閉塞
│   └── ADR-0879-toast-stack-bound.md  # トーストスタック上限4枚 — バースト時の無制限 DOM 積算を最古落としで閉塞
│   └── ADR-0880-toast-stack-cap-pins.md  # トースト上限の behavioural ピン — 実スタブ DOM で上限4・最古優先・dedup 非双出を固定
│   └── ADR-0881-storage-cache-dialog-audit.md  # ホストAPI エラーパス監査完走 — localStorage/IDB/crypto/encoding/window/dialog 全経路 fail-closed 確認
│   └── ADR-0882-sr-style-identity-announce.md  # SR アナウンスに dash/align/valign/bold 系を追加 — スタイル身分 prop の読み上げ非対称を解消
│   └── ADR-0883-i18n-label-surface-audit.md  # i18n/ラベル面監査完走 — callsite 両ロケール網羅・4系 data-t 機構・動的ラベル全経路 t() 化確認
│   └── ADR-0884-idb-blocked-yield.md  # IDB blocked-open → in-memory 継続 + versionchange で接続譲渡 — タブ間デッドロック/boot ハング解消
│   └── ADR-0885-idb-open-lifecycle-pin.md  # Persist.open blocked/yield を behavioural ピン化 + IDB tx エラー面監査完走 (txDone/reqDone 完備・onmessageerror 到達不能)
│   └── ADR-0886-arch-sync-0877-0885.md  # architecture.md を 0877–0885 群へ同期 — Persist open ライフサイクル・画像取込ガード・SR/トースト/i18n 節
│   └── ADR-0887-minimap-scene-isolation.md  # ミニマップシーンを per-shape try で隔離 + _sceneVer を成功時のみ更新 — 1図形 throw で半描画シーンが残存する実害を解消
│   └── ADR-0888-gresize-zero-extent.md  # 群リサイズ gBox 0 幅/高さで _mapToBox が Infinity 化 → メンバー NaN 破壊を ||1 ガードで閉塞
│   └── ADR-0889-svg-export-esc-scope.md  # SVG エクスポートの `<a href>` が未定義 esc() 呼出でリンク付き盤面全滅 → _esc 化で閉塞
│   └── ADR-0890-gresize-zero-extent-pins.md  # 0888 の behavioural ピン (0 幅 gBox で NaN 非発生) + 群ジェスチャ/overlay/キャッシュ監査 clean
│   └── ADR-0891-extent-division-audit.md  # extent 除算・数値ドメイン監査完走 — 全除算サイトの `||1`/`1e-6`/early-return/`>0` ガードと `_log`/`_sqr` のクランプ着地を確認
│   └── ADR-0892-overlay-shape-follow.md  # 編集 overlay の follow sig に _gridVer を追加 — 他ピア upd で shape が移動/再スタイルされても旧位置・旧スタイルに留まる実害を解消
│   └── ADR-0893-lblfollow-zoom-sig.md  # _lblFollow の `v.z` (未定義→zoom 非追従) を `v.zoom` へ修正 + viewport 別名プロパティ名タイポ sweep clean
│   └── ADR-0894-overlay-lifecycle-audit.md  # 編集 overlay ライフサイクル監査完走 — open/close/forced-fold/sig-reset 全経路網羅、実害なし
│   └── ADR-0895-follow-shape-pins.md  # _teFollow の _gridVer 追従を実経路ピン — viewport 不変でも shape upd で overlay 再配置+再スタイルを固定
│   └── ADR-0896-non-primary-buttons.md  # サイドボタン (X1/X2) ・スタイラスバレルがジェスチャをアームする実害を `e.button>1` で一括閉塞 (0532 の右ボタン限定を拡張)
│   └── ADR-0897-button-pins.md  # 0896 の実イベント経路ピン (button 3/4 がアームしない) + 周辺入力経路監査 clean
│   └── ADR-0898-minimap-button-gate.md  # minimap PD にも `e.button>1` — サイド/バレルボタンのスクラブアームを閉塞 (0896 parity)
│   └── ADR-0899-input-path-audit.md  # 入力経路監査完走 — dblclick→エディタ/ジェスチャ終端/eraser/cancel/hidden 系全軸 clean
│   └── ADR-0900-intake-path-audit.md  # 取込経路監査完走 — hash/ファイル/drop/paste 全インポータのゲート網羅を記録
│   └── ADR-0901-ui-wiring-audit.md  # UI 配線監査完走 — ボタン/メニュー/入力/i18n の宣言→参照→ハンドラ網羅
│   └── ADR-0902-sr-mirror-search-announce-audit.md  # SR ミラー/検索/announce/status 監査完走 — ページ帰属+キャップ+sig ゲートの不変条件を記録
│   └── ADR-0903-search-nav-and-mirror-lang-resync.md  # 検索逆ナビ初手修正 + toggleLang でミラー再構築 — 0902 監査面の実害2件を閉塞
│   └── ADR-0904-persisted-boot-value-gates.md  # localStorage ブート値の検証 — board.peer を bounded 形式へ、board.theme を enum へ制限
│   └── ADR-0905-idb-intake-audit.md  # IndexedDB 取込監査完走 — load/restore/checkBackup 全読込のゲート網羅を記録
│   └── ADR-0906-pointer-capture-guards.md  # setPointerCapture の try/catch 化 — 実行時 API 機能検出監査完走
│   └── ADR-0907-export-render-isolation.md  # エクスポート描画ループの per-shape 隔離 (_dS) — fail-fast 監査完走
│   └── ADR-0908-event-gesture-gates-audit.md  # passive/preventDefault/touch-action 監査完走 — 全入力リスナで3条件網羅を記録
│   └── ADR-0909-event-target-guards.md  # paste/keydown の e.target.matches() を `?.` ガード — Image ライフサイクル監査完走
│   └── ADR-0910-lifecycle-rearm-clipboard-audit.md  # wake lock 再取得・clipboard 経路監査完走 — 実害なし
│   └── ADR-0911-architecture-sync-runtime-input.md  # architecture.md を ADR-0887–0910 クラスタへ同期 — 入力面・隔離・boot 検証の規則を記録
│   └── ADR-0912-pg-structural-strip.md  # pg を patch 適用から構造除去 — 鍛造 upd/style による図形のページ追放を閉塞 (0373 の未実装意図を修復)
│   └── ADR-0913-frac-structural-strip.md  # frac を patch 適用から構造除去 — 鍛造 patch の z-order 攪乱を閉塞 (0912 同型)
│   └── ADR-0914-stampwrites-structural-keys.md  # 構造キーに wclock を刻まない — 鍛造 frac 刻印による正規 zorder 棄却を閉塞
│   └── ADR-0915-wire-aux-clock-audit.md  # wire 補助データ取込監査完走 — clock マップ・ページ集合・presence 全経路 gated
│   └── ADR-0916-groupid-structural.md  # groupId を patch 適用から構造除去 — undo-wire は専用 group/ungroup op emit へ移行 (0912/0913 同型、0373 防衛対象の完結)
│   └── ADR-0917-beautify-structural.md  # beautify の構造除去免除を閉塞 — type は _TYPES enum ゲートで保持 (0912-0916 strip 迂回の同族穴)
│   └── ADR-0918-wire-apply-audit.md  # wire op 適用側監査完走 — 全配列 bounded・clock スナップショット復元専用・`_attachOp` img parking 全経路 clean、構造キー cluster 完結
│   └── ADR-0919-snapshot-merge-pg.md  # snapshot LWW merge の pg スキップ欠落を閉塞 — 鍛造 wc:{pg} による既存図形のページ追放 (0912 同族の merge 経路版)
│   └── ADR-0920-connClears-after-null.md  # connClears after:null 鍛造を閉塞 — mid-apply TypeError による墓碑+部分適用、rescan 抑止による束縛残存を2点ガードで解消
│   └── ADR-0921-connclears-backward-lww.md  # del/pageDel 逆方向 connClears 復元の _lwwSkip 欠落 — 他逆適用経路と非対称で skew 下の束縛発散、_ccRest helper で per-key LWW ゲート化
│   └── ADR-0922-backward-tomb-gate.md  # del/clear/pageDel/replace 逆適用 shape 復元の _del 墓標未検査 — wire 側 addMany/replace との非対称で skew 下の存在発散、_tmb helper で墓標ゲート化
│   └── ADR-0923-group-ungroup-backward-locked.md  # group/ungroup 逆適用の sh.locked 未検査 — 前進+undo-wire は locked skip、ローカルだけ帰属変更で発散。到達不能の gids fallback も除去
│   └── ADR-0924-backward-apply-audit.md  # backward-apply 収束監査完走 — 全17 op の _undoWire 網羅・redo・connClears 再束縛・_stampWrites/_selR/_pgFollow/_opIds 対称を検証、実害なし
│   └── ADR-0925-persist-broadcast-reach.md  # 永続化・broadcast 到達監査完走 — 全 mutation 経路が _ps+wire 送信へ到達、リロード消失/ピア発散なし
│   └── ADR-0926-existence-clock.md  # 存在クロック — kill 経路の無条件墓標で到着順が存在を決めた非対称を _born+_bN (OR-set add-wins) で閉塞、nowTs strict HLC 化
│   └── ADR-0927-born-parity.md    # born parity — snapshot 採用/merge/ローカル全置換の _born 未刻印3系統を _wAdopt+tomb supersession+wire 同等刻印で閉塞
│   └── ADR-0928-replace-backward-born.md  # replace backward の _bT 未刻印で復元図形 born が pre-swap のまま (remote は U) — 狭間 del の一方向発散を両方向刻印で閉塞
│   └── ADR-0929-undo-wire-audit.md        # undo-wire×backward 収束監査 — 全14 op+redo の対称表・発散なし完走
│   └── ADR-0930-undo-wire-pins.md         # 対称契約ピン — born=B0両側一致/_lwwSkip⇔_lwwDrop/_slimOp収束フィールド
│   └── ADR-0931-clock-peer-binding.md     # clock.peer→エンベロープpeer拘束 — seq-squat/impersonation閉塞
│   └── ADR-0932-snapshot-peer-binding.md  # snapshot内蔵op.clock.peer→エンベロープpeer拘束 — 内蔵seq-squat閉塞
│   └── ADR-0933-peer-binding-coverage.md  # clock↔envelope binding監査完走 — 全applyRemote入口拘束、frag再投入迂回なし
│   └── ADR-0934-op-aux-bounds.md          # 補助フィールドbounds監査 — 全aux MAX_OP_SHAPES bounded、move delta不可達
│   └── ADR-0935-coord-producer-bound.md     # 座標産出側を wire bound ±1e7 へ拘束 (translate+s2w、発散遮断)
│   └── ADR-0936-absolute-writer-bound.md    # 絶対書込み系も ±1e7 へ (applyResize/_mapToBox/_rotPtsAbout、0935残留閉塞)
│   └── ADR-0937-hot-path-work-bounds.md     # ホットパス仕事量監査完走 — memo/throttle/dedup/bound 網羅、実害なし
│   └── ADR-0938-docname-writer-stamp.md    # docName 自側 writer 刻印 — 同 ts 改名の双方向採用発散を閉塞
│   └── ADR-0939-hatch-segment-bound.md     # hatch gap 下限クランプ — 巨大 extent のセグメント爆発/描画凍結を閉塞
│   └── ADR-0940-merge-hide-selection.md    # snapshot merge hide で選択 id 残留 — _sdl 落とし (0568 parity)
│   └── ADR-0941-clock-envelope-pins.md     # 0931/0932 clock↔envelope binding の behavioural ピン (両到達経路)
│   └── ADR-0942-mid-gesture-tool-lock.md   # ジェスチャ中のツール切替無効化 (move/up が live tool で dispatch されるため)
│   └── ADR-0943-second-pointer-abort.md    # 2本目 PD → abortGesture の behavioural ピン (draft 破棄+_geoR 復元+非再開)
│   └── ADR-0944-derived-state-lifecycle.md  # 派生/参照状態ライフサイクル監査完走 — 9不変条件 (hover/選択/reset/type/幾何)
│   └── ADR-0945-mid-gesture-overlay-open.md  # overlay 開放でライブジェスチャをキャンセル (?/⌘F が ptr.down 未処理→overlay 下不可視 commit を閉塞)
│   └── ADR-0946-negative-extent-intake.md    # 負 w/h extent を validPatch で棄却 (hit-test 空区間+frame 誤帰属の poison 図形を閉塞)
│   └── ADR-0947-numeric-prop-domain-audit.md # 数値 prop ドメイン監査完走 — 18 prop が intake-bound か消費側 clamp のいずれかを満たす規則
│   └── ADR-0948-mid-gesture-button-paths.md  # mid-gesture 到達コマンド経路の取消内蔵 (openShare/openCtxMenu/undo/redo — 第2指ボタン到達残穴を閉塞)
│   └── ADR-0949-send-funnel-exception-safety.md # 送信 funnel 例外安全監査完走+ピン (_send/_sendDC/_bcast/fragSend は transport throw を伝播しない)
│   └── ADR-0950-pointer-bookkeeping-leak.md  # _pointers ghost エントリ閉塞 (window-level 削除+hover 非記録で phantom pinch 解消)
│   └── ADR-0951-lblpos-cancel-restore.md  # lblpos cancel 復元欠落閉塞 (labelPos を orig から save-set 復元、mid-gesture cancel 半mutation 解消)
│   └── ADR-0952-erase-batch-remote-window.md  # 消しゴム窓のリモート op 収束 (byId に batch フォールバック + cancel-restore へ _tmb 墓標ゲート、ghost 復活と stale clone 復元を閉塞)
│   └── ADR-0953-erase-batch-wholesale-ops.md  # 消しゴム窓 × wholesale op 収束 (_unB で clear/replace/pageDel 走査前にバッチをシーンへ戻す + _rs 採用でバッチ破棄)
│   └── ADR-0954-pagedel-selection-drop.md  # _pgDel2 メンバー kill が選択 id を残す非対称を閉塞 ('del' parity — kill ループへ _sdl、集合空化 remote pageDel で残存し得た ghost id 解消)
│   └── ADR-0955-wholesale-swap-id-resolution.md  # 派生参照 id キー化契約の監査完走+ピン (全置換オブジェクト差替え後も connEnds 等が id 再解決、stale-clone 不発)
│   └── ADR-0956-mirror-focus-restore.md  # SR ミラー再構築のフォーカス保存 (focused button index を save/restore、縮小時末尾クランプ — 0675 ページタブ parity のミラー側残穴)
│   └── ADR-0957-nudge-coalescing.md  # 矢印長押しナッジの共合体 (_nugPush/_nugEnd trailing-edge 400ms、キー=op+id 集合 — キーリピート毎の commit 溢流を閉塞、v1.6.29 スライダー共合体 parity)
│   └── ADR-0958-commit-order-flush.md  # `_recordCommitted` 先頭の `_nugEnd()` — `_rcOp` 迂回経路でも pending nudge が常に先に着地する時系列不変条件
│   └── ADR-0959-nudge-lifecycle-flush.md  # hidden/pagehide/beforeunload でも `_nugEnd()` — タブ終了で永続化だけ先行し op が broadcast されない一方向発散を閉塞
│   └── ADR-0960-zorder-style-coalescing.md  # `[ ]`/`⌘⇧,/.` 長押しを `_nugPush` 共合へ拡張 (zorder/style マージ、prop 認識キー) + `Store.commit` 先頭 `_nugEnd()` — 押下毎 commit 溢流と del 跨ぎ時系列反転 (seed-7) を閉塞
│   └── ADR-0961-held-key-wave2.md  # 残存6経路 (rotate/flip/lock/group/text-flags/swap) を `_nug` へ — `dir` キー接尾辞で異種マージ防止、net-zero 破棄 (toggle×2 は op 0 件)、`applyStyleToSelection` no-change フィルタで数字長押しが op を産まない産出側閉塞
│   └── ADR-0962-sfb-lifecycle.md  # スライダー `_sbf` のジェスチャ境界 — blur でドリフトを1 op 化して全消去 (stale-before undo + cp プレビュー未 commit を閉塞) + `_sfbFlush` の選択外プルーン
│   └── ADR-0963-lifecycle-bounds-audit.md  # ライフサイクル×有界性監査 — MAX_HISTORY+histIdx、`_nug.sel` スナップショット、docName keystroke-LWW、dupDelta チェーン、テキスト blur commit、presence TTL/cap 全 clean、5ピン化
│   └── ADR-0964-mid-gesture-lock.md  # ジェスチャ中 remote lock の収束 — `_gRst()` 共有復元行列 + PU commit 6サイトの locked ゲート + gresize/grot/flushErase のメンバー仕分け (一方向発散を閉塞)
│   └── ADR-0965-mid-run-lock.md  # pending op 中の mid-run lock/missing — `_nugLock` で消滅メンバー除外 + locked メンバー run-start 復元 (自己 lock は exempt) + `endSelect` move の `_gRL` 先置き (一方向発散を閉塞)
│   └── ADR-0966-pending-op-mid-run-audit.md  # pending op × mid-run 監査完走 — `_rs` 全5サイト commit-head flush、own-lock exemption の方向検証 (live 値判定で unlock は存続)、4ピン化
│   └── ADR-0967-mid-edit-lock-fold.md  # mid-edit remote lock — text/label の blur/commit が `!byId` のみで fold+commit が同フレーム競合 (locked gate drop で一方向発散)、`_lk` ゲート拡張で全 commit 経路を省略
│   └── ADR-0968-remote-killed-selection-actions.md  # ctx/キーアクション×remote 消滅監査完走 — 全ハンドラが act 時に live 再解決 (stale メニューは cosmetic)、dead/空集合で op を産まない契約をピン化
│   └── ADR-0969-gesture-orig-remote-write.md  # mid-gesture remote 書込が orig-restore に巻き戻される発散 — `_gTouch` で touched-key live 値を gesture orig へマージ、remote 再誕生は `_rb` で復元スキップ
│   └── ADR-0970-reborn-arrival-order.md  # `_rb` の clock 比較を skew-免疫の到着順マーキング (`ptr.reborn`) へ置換 — 前進 skew の誤スキップ発散・後進 skew の clobber を閉塞
│   └── ADR-0971-pending-nug-remote-write.md  # pending `_nug` op の復元ドメインが remote 書込を巻き戻す発散 — `_gTouch` を nug 復元域へ拡張、remote 再誕生は `_nug.reborn` で復元スキップ
│   └── ADR-0972-seenops-dedup-convergence-audit.md  # seenOps dedup×収束監査完走 — 3チョークポイント (commit/applyRemote/_recordCommitted)・eviction 後再適用・全 intake の clock キー dedup が clean。envelope/fragment/commit 実経路ピン追加
│   └── ADR-0973-schedule-marks-dirty.md  # `_ps()` のみの変異が hidden/unload フラッシュをすり抜ける実害 — `Persist.schedule()` が dirty を刻み全サイト一括閉塞 + 'snapshot' union-heal/rep 採用に `_ps()` 追加
│   └── ADR-0974-wholesale-swap-backup-audit.md  # 全置換スワップ監査完走 — ローカル `_repC`/`_recordCommitted` と remote `_apply` の wclock 再刻印が対称、saveBackup 入口5系統カバー、keep/tomb/born ピン2件
│   └── ADR-0975-builtin-key-null-proto-stores.md  # JS 予約名キーによる素 {} 汚染 — excScene gids クラッシュ / _dioCells _gbx が Object.prototype.x 書込 / _undoWire reg クラッシュを _wM() null-proto で閉塞 (+zorder バケット整合)
│   └── ADR-0976-conn-bound-cycle-recursion.md  # connEnds の conn↔conn 結合循環/自己結合が _bb→_cE 無限再帰で stack overflow → _ceD 深度キャップ (15) + self-id スキップで raw 端点へ縮退 (canvas 数値ドメイン監査併走 clean)
│   └── ADR-0977-proto-key-pollution-gate.md  # proto-key 汚染監査完走 — JSON.parse の `__proto__` own-key が Object.assign/for..in で setter を叩く全経路が `_cleanVal`/`validPatch`+null-proto store で gated。ピン6 assert
│   └── ADR-0978-sortz-total-order-audit.md  # sortZ 全順序性監査完走 — frac (base62 lexicographic)→id tie-break の strict total order、keyless stamp 前置、NaN z は _cleanVal 拒否。ピン4 assert
│   └── ADR-0979-arbitration-comparator-uniformity.md  # 全 LWW 仲裁ドメインが clockNewer (ts,peer,seq) 全順序を共有する監査完走 — docName/page 名は両側 seq:0、生 ts 比較残存なし。ピン9 assert
│   └── ADR-0980-mousedown-target-closest-guard.md  # ctx 外クリックの `e.target.closest` を `?.` 化 — 非 Element ターゲットで TypeError 貫通する 0909 同型。raw `e.target`/`currentTarget` 全サイト走査で唯一の残穴
│   └── ADR-0981-listener-registration-lifecycle.md  # リスナ登録の重複/累積監査 clean — `_on` 全サイトは init 一回 or 要素同寿命、`_oC` id 一意、`Net.init` は旧チャネル/timer 解放。ピン8 assert
│   └── ADR-0982-detached-focus-restore-fallback.md  # detached 化したフォーカス復帰先 (再構築チップ/ミラー) は `isConnected===false` で canvas へ退避 — dialog `_restoreFocus` + presentation `leave()` の2経路。ピン6 assert
│   └── ADR-0983-wakelock-stale-sentinel.md  # wake-lock sentinel リーク閉塞 — pending 中 leave()・supersede で release 不能なハンドルが残り画面点灯し続ける2経路を `_active` ゲート+両 sentinel 解放で閉塞。ピン3 assert
│   └── ADR-0984-reborn-mark-stamp-gate.md  # `ptr.reborn`/`_nug.reborn` 過剰マーク閉塞 — remote 'replace' の `_bT` 一括刻印が keep 存続図形まで reborn 扱いし cancel の orig-restore をスキップさせた一方向発散。マークを born スタンプ実適用時に限定。ピン5 assert
│   └── ADR-0985-imgpending-repark-on-purge.md  # `_pcC` 全置換パージが生き残り parked img 参照の imgq 再送ループを殺す実害 — `_pcR()` で swap 確定点の再 park (replace/clear/pageDel/_rs 4サイト)。0753 ピン更新+5 assert
│   └── ADR-0986-rtc-intake-kind-gate.md  # RTC intake の BC-only 種棄却 + presence 蘇生 — 偽造 hello/ping/sync-req の任意 id 行生成を棄却、bye viaRtc の _rtcPeerId null 化削除、cursor/selection で行蘇生 (BC enrich-only 維持)。0825 ピン更新
│   └── ADR-0987-frag-stream-dc-gate.md  # frag ストリームの DC 限定化 — 単一 reassembly slot を BC 偽造断片が実 RTC ストリームと相互奪い合う wedge DoS を閉塞 (src→'rtc' 定数化、0987 ピン + frag 系ピンを viaRtc 形式へ)
│   └── ADR-0988-kind-transport-matrix.md  # kind×transport 行列監査完走 — 全 kind の正当トランスポートを列挙 (BC-only/DC-only/dual-legit/等価許容)、受理側契約をピン化
│   └── ADR-0989-kind-coverage-symmetry.md  # kind-coverage 対称監査完走 — op 語彙17種が validRemotePayload/_apply/_undoWire/REMOTE_OPS で一致、undo-wire 出力の remote-legality を56 assert でピン化
│   └── ADR-0990-type-conversions-wire.md  # 型変換のワイヤ収束 — _typOK ゲートで「適用キー==刻印キー」を担保 (style 系の type を _apply/stamp/snapshot-merge で採用、upd strip 維持、偽造 pen/未知型拒否)
│   └── ADR-0991-finalize-bridge-tomb.md  # finalize ブリッジ tomb parity — broadcast-only del がローカル tomb を broadcast 時計へ再刻印 (undo-clock vs broadcast-clock の非対称解消、_bN ゲートで reborn 存続)
│   └── ADR-0992-stale-reference-removal-audit.md  # stale 参照×除去経路監査 — 図形を見続ける参照は全て id live 再解決か除去サイト purge (_psc/_pcC) で完備、_apply 時計保証も全入口 gated (8軸 clean)
│   └── ADR-0993-undo-remote-removal-audit.md  # undo×remote 除去の仲裁対称性監査 — backward ゲート全てがピア forward ゲートと等効、undo の新 HLC 時計が観測済み remote 時計を常に上回り対称な復活/復元へ収束
│   └── ADR-0994-undo-wire-peer-apply-audit.md  # undo-wire×ピア forward 適用の対称性監査 — locked ゲート両側同一・unpage kill-set parity・wc/connClears/afterWc/nts carry 全網羅、_slimOp は undo 専用フィールドのみ剥離
│   └── ADR-0995-stale-swap-editor-closures.md  # 全置換スワップ後の stale editor クロージャ re-bind — open 時捕獲の shape 参照へ blur commit したが dead オブジェクトへ書込み wire upd だけがピアへ届く一方向発散を !(s=byId(s.id)) 再束縛で閉塞 (text/label/_stickyChain)
│   └── ADR-0996-wholesale-swap-derived-state.md  # 全置換スワップ×派生状態監査 — 7系統全 clean (_idIndex/_grpMap 等は _iG チョークポイント、pen 系は e.pts===p 参照 sig、_wrapCache は WeakMap、_imgPending は _pcR 再パーク、エディタは per-frame live 再解決)
│   └── ADR-0997-live-op-aliasing.md  # live↔stored-op 参照エイリアシング監査 — 8系統全 clean (_apply 全 push clone、producer は clone/リテラル、_attachShape 読み取り専用、_undoWire 共有は send のみ)
│   └── ADR-0998-peer-clock-uniqueness.md  # ピア時計一意性監査 — (peer,seq) dedup 衝突 clean: peerId は per-boot suffix 付きで seq 巻き戻り衝突なし、wire op は全 ++state.seq、seq:0 は仲裁専用オブジェクト
│   └── ADR-0999-reborn-mark-lifecycle.md  # reborn マークのライフサイクル監査 — _ptrReset/_nugEnd で終了時クリア、後続ジェスチャへの漏洩なし + dead snapBox 除去 ~150B
│   └── ADR-1000-letterspacing-measure-parity.md  # measure 経路の ctx.letterSpacing 設定 — spacing>0 で s.w/s.h under-fit + wrapCache 毒入れを閉塞
│   └── ADR-1001-throw-ctx-state-restore.md  # 0601 隔離の catch で ctx 全状態リセット (unbalanced save/rot/clip/props の後続図形漏洩を閉塞)
│   └── ADR-1002-raf-loop-exception-safety.md  # rAF/描画ループ例外安全監査 clean — 全スロット clear-before-work で throw は ≤1フレーム穴+自己治癒
│   └── ADR-1003-canvas-backing-dpr-lifecycle.md  # canvas バッキング×DPR ライフサイクル監査 clean — 全経路が両層同期再割当+キャッシュ無効化+再描画
│   └── ADR-1004-sr-announce-channel.md  # SR アナウンスチャネル監査 clean — 単一 funnel+末尾スペースリピート+t() キー全解決 (undefined 不達)
│   └── ADR-1005-no-store-warning.md  # Persist db 喪失 (open hard-error/versionchange) で save() が沈黙 no-op — warn-once noStore toast で閉塞
│   └── ADR-1006-timer-lifecycle-audit.md  # 遅延コールバック (setTimeout/interval/Promise) 全サイト監査 clean — fire 時 self-guard または cancel 漏斗網羅を規則化
│   └── ADR-1007-key-repeat-gate.md  # e.repeat ゲート — discrete (トグル/エクスポート/スタンプ) 遮断、continuous (undo/nudge/zoom/rotate/cascade) 通過
│   └── ADR-1008-transient-input-state-blur.md  # transient 入力由来状態 (measure/hover/_ehov) の blur 喪失 — _clearTouchState 漏斗で閉塞
│   └── ADR-1009-measure-swap-invalidation.md  # 全置換スワップで stale measure 幾何が残存 — _rs+_apply 3サイトでクリア (armed 状態監査完走)
│   └── ADR-1010-snapshot-selection-drop.md  # Net._applySnapshot の _scl 欠落で旧盤面の選択 id 幽霊化 — _rs 直後に _scl ('replace' parity)
│   └── ADR-1011-cache-invalidation-audit.md  # 派生キャッシュ監査 clean — キー完全性×有界性×purge サイト全網羅 (wrap キーの spacing 依存をピン化)
│   └── ADR-1012-id-index-integrity.md  # byId 索引×変異監査 clean — 同件数入替パターン不存在・size 自己修復で構造的安全 (同件数 swap ピン)
│   └── ADR-1013-pending-op-swap-invalidation.md  # armed pending-op × swap 監査 clean — _nugLock gone-filter/._sbf byId ゲート/_eraseBatch 生涯で全パス死 id 安全
│   └── ADR-1014-id-collision-audit.md  # id 衝突×取込冪等監査 clean — wire dedup/idMap remap/原子 swap の3型で全表面網羅
│   └── ADR-1015-history-trim-boundary.md  # history トリム境界監査 clean — tip-only-trim 不変条件で histIdx 常に len-1
│   └── ADR-1016-wire-intake-attach.md  # wire intake `_attachOp` 網羅監査 clean — attach→dedup→apply 順で parked img 常に武装
│   └── ADR-1017-backup-lifecycle.md  # `saveBackup`/`:prev` 監査 clean — 全 overwrite 経路がスワップ前退避・remote 'replace' も網羅
│   └── ADR-1018-dcq-lifecycle.md  # `_dcQ` 順序性監査 clean — FIFO・4096/32MiB キャップ・low-water drain・dead-link リセット
│   └── ADR-1019-mutation-repaint-chain.md  # 変異→再描画チェーン監査 clean — `_apply` 末尾 `_iv`/`_iD` 全網羅・`_ms` 同調・ジェスチャ `need` 補償
│   └── ADR-1020-viewport-persist.md  # viewport 変異の永続化 — pan/zoom/fit 全9経路が `_ps()` 到達・プレゼン `leave()` は復元後 vp を保存
│   └── ADR-1021-erase-batch-serialization.md  # erase-batch シリアライズ — `_shWB()` union で save/snapshot/export 全経路が mid-erase メンバーを含む
│   └── ADR-1022-editor-fold-flush.md  # ライフサイクル flush のエディタ畳み込み — hidden/pagehide/beforeunload が `_cxO()` で blur commit を先に走らせ未コミット編集の喪失を閉塞
│   └── ADR-1023-wire-buffer-lifecycle.md  # wire バッファの room-vs-doc ライフサイクル完備性監査 — room-scoped は init で reset、doc/content-scoped は survive (clean 完走)
│   └── ADR-1024-docname-empty-write.md  # docName 空書込の収束 — `_setDocName` 単一サイトで `n\|\|_UT` 正規化、'' の wire 送出/ピア空白表示/等時計永久発散を閉塞
│   └── ADR-1025-real-service-worker.md  # SW blob-URL 登録は spec 上 reject (scriptURL は http/https 必須) — v1.6.5 以来オフライン層は dead code。実ファイル sw.js + `register('sw.js')` で修理
│   └── ADR-1026-apply-failure-dedup-evict.md  # applyRemote は適用前に dedup 刻印 → 途中例外で op 永久 wedge。失敗時 `_sO().delete(k)` で heal 再適用化 + BC onmessage ガード (DC parity)
│   └── ADR-1027-wire-mutation-invalidation-lifecycle.md  # `_oa`×`_iG` 到達性・boot 順序・broadcast 時計・presence 寿命の監査完走 (clean)。契約: live 図形への `_oa` 変異は同一ターン内の `_iG()` 前提
│   └── ADR-1028-savebackup-failure-surfacing.md  # saveBackup の silent catch を `_saveErrMsg` 経路へ統一 — 全置換直前の退避書込が quota/abort で沈黙失敗していた非対称を閉塞
│   └── ADR-1029-stamp-drop-coverage-symmetry.md  # per-prop LWW の stamp×drop 網羅対称性監査 (clean) — 契約: 新 LWW op は `_lwwOp` 加入+`_chg` ゲート刻印+`_undoWire` inverse 必須
│   └── ADR-1030-join-room-switch-lifecycle.md  # join ハンドシェイク×ルーム切替 + restore 経路ライフサイクル監査 (clean) — 契約: room スコープ状態は Net.init でリセット、doc 採用は `_repC` 経由、op 送出は `Net.broadcast` 漏斗
│   └── ADR-1031-presence-signature-lifecycle.md  # presence 送出署名×ライフサイクル監査 (clean) — 契約: 新 dedup キーは init リセットかピア集合変化での自己修復必須、ページ名前付き署名は curPg 同梱
│   └── ADR-1032-rtc-room-presence-merge.md  # リンクパートナー×ルームピアの presence 二重計上を `_pk` 集約で解消 — viaRtc presence は実在行に着地し合成 rtc: 行を畳む
│   └── ADR-1033-foreign-img-ref-marking.md  # `:`-連鎖 img キーはストア相対序数 — 外来 parked 参照を persist 時 '@' マークし _imgAttach はローカル解決せず imgq 修復のみへ
│   └── ADR-1034-wholesale-intake-bounds.md  # snapshot/`replace` aux 面の intake 境界監査 (clean) — 契約: 配列は slice 上限、時計 map は個数 cap+個別 validClock+構造キー skip、同梱 op は envelope-peer 結合+applyRemote 漏斗
│   └── ADR-1035-dc-queue-frag-interleave.md  # `_dcQ` × frag interleave 監査 (clean) — frag は DC 限定、同送信者重なりは seq0/n/src で slot 再起動、img は content-hash 検証
│   └── ADR-1036-existence-clock-merge.md  # snapshot merge の `_born`/`_del` pairwise 採用監査 (clean) — 送信者 live なら受信側は必ず born>del、偽造 del-only wc の tomb 混入は受容残存
│   └── ADR-1037-idb-wc-intake-parity.md  # IDB `d.wc` intake を `_wAdopt` ゲートへ統一 — 構造キー印字による zorder/group veto 発散を閉塞
│   └── ADR-1038-img-slot-sender-tag.md  # img 再組立スロットを (key,sender) 単位化 — 複数回答者の混線で parked 画像が永久未解決だった実害を閉塞
│   └── ADR-1039-wclock-restore-sanitize.md  # `op.wc`/`afterWc` 復元を `_wK` フィルタ付き `_wR` へ統一 — 構造キー時計による zorder/group veto 発散を閉塞
│   └── ADR-1040-img-fingerprint-verify.md  # `_imgKey` 指紋ヒットの `_ik` バイト検証 — 衝突 dataUrl の誤画像描画を解消
│   └── ADR-1041-import-attach-parity.md  # importBoard/importFromHash の `_rs` スワップを `_attachShape` 経由へ — parked img 参照の dead ref を解消
│   └── ADR-1042-export-parked-img-ref.md  # export の無条件 `delete o.img` を条件化 — parked ref を搬出し import 側 imgq heal へ接続
│   └── ADR-1043-local-add-img-attach.md  # 局所 add/addMany の push を `_attachShape` 経由へ — 貼付コピーの parked img 参照が imgq 未登録で空白のまま残る実害を解消
│   └── ADR-1044-pending-nudge-remote-lifecycle.md  # `_nug` coalescer の flush 網羅監査 — 全ローカル変異は `_recordCommitted` で flush、remote は `_gTouch` fold + `n.reborn` で整合、clean 完走
│   └── ADR-1045-snapshot-img-answer-store.md  # snapshot の `sent` 使い捨てマップで img 参照キーが `_imgSent` 不達 → imgq 応答不能の実害を解消 (snapshot puts も応答ストアへ登録)
│   └── ADR-1046-img-pending-waitlist-bound.md  # `_park` 待機リスト 256上限+FIFO 監査 — 追い出しでも straggler スキャンで自己治癒、再 park は挿入位置維持、clean 完走
│   └── ADR-1047-minimap-img-ik-verify.md  # minimap 描画の `_ik` バイト検証 — getImg parity で指紋衝突の誤ビットマップを解消
│   └── ADR-1048-5050-audit.md  # 長所50/短所50 + ソクラテス式仮定監査 + P0–P4 改善候補リスト
│   └── ADR-1049-img-rescan-repark.md  # presence sweep 内の 5分 `_imgRescan` — 60s 期限切れ parked ref の永久プレースホルダー化を解消
│   └── ADR-1053-peer-display-names.md  # presence (`ping`/`cursor`/`selection`) に `n` フィールドでピア表示名 — カーソルマーカー+アバター tooltip に表示
│   └── ADR-1054-merge-mode-import.md  # 非空ボードでの .board/共有リンク取込にマージor置換の選択 — `_placeCopies` 経由で 1 回の undoable addMany (round823 でスタック再構築ロスから復元)
│   └── ADR-1074-zero-delta-dup-chain.md  # ゼロデルタ dup シードをチェーンなし扱い — ⌘D の不可視スタック解消
│   └── ADR-1075-img-heal-backup-parity.md  # img heal ページ横断 + :prev ペイロード parity 監査 (clean、契約ピン化)
│   └── ADR-1076-read-only-funnel.md  # ro 変異漏斗網羅性監査 — 全漏斗 state.ro ゲート済み + 採用順契約 (clean、ピン化)
│   └── ADR-1077-imgq-key-gate.md  # imgq の msg.key を _idOK ゲート — junk key のスロットルマップ占有を閉塞
│   └── ADR-1078-park-intake-bounds.md  # _park チョークポイントで id/ref を _idOK ゲート — 巨大id占有+応答不能refスパム閉塞
│   └── ADR-1079-incremental-add-ceiling.md  # 逐次 add/addMany/pageAdd op に総図形数天井 — _shCap で一括経路と同じ 200K 上限を共有
│   └── ADR-1080-peer-selection-dead-id-filter.md  # peer sel を存在フィルタ+4096cap — dead id の毎フレーム byId 走査を閉塞
│   └── ADR-1081-presence-intake-contract.md  # presence intake 監査完走 — _touchPeer/cursor/name/bye の契約を8挙動ピンで固定
│   └── ADR-1082-session-accumulation-bounds.md  # セッション蓄積面監査完走 — history cap/pointers/IDB GC 等を5挙動ピンで固定
│   └── ADR-1083-pwa-storage-lifecycle.md  # PWA/ストレージ監査完走 — sw network-first・activate 清掃・スカラーキーを5ピンで固定
│   └── ADR-1084-emit-intake-symmetry.md  # op emit×intake 対称監査完走 — 全emit経路のwire化opがintake契約を通過を4ピンで固定
│   └── ADR-1085-wire-before-baseline.md  # wire `before` 監査 — undo専用ではなく変更検出ベースライン (P4-b圧縮案棄却) を7ピンで固定
│   ├── ADR-1086-move-requires-before.md  # remote move の `before` 必須化 — before-less 絶対座標は両軸適用で並行単軸 move を破壊
│   ├── ADR-1087-complete-before-baseline.md  # パッチ系 op の `before` 完全カバレッジ — 欠落キーは _chg で changed 扱い (upd/beautify は設計上 exempt)
│   ├── ADR-1088-ungroup-before-contract.md  # ungroup の `before` 契約 — 非 iterable/null 要素は例外 drop → intake で棄却 + groupId を wire id bound
│   ├── ADR-1089-wire-wc-carriage.md  # wire `wc` 搬送監査 — 全 consumer が intake 検証・自己消毒・未読の3態に帰着 (clean)
│   ├── ADR-1090-cache-purge-parity.md  # shape-id キャッシュ×除去経路監査 — _psc/_pcC が全除去経路をカバー、pending 消失は _imgRescan+到着掃引で治癒 (clean)
│   ├── ADR-1091-merge-path-docname-parity.md  # delta-sync vs full-snapshot 監査 — docName LWW が空ボード経路限定で非空 joiner の改名を永久不収束 → merge 経路にも strict _nameWin 仲裁適用
│   ├── ADR-1092-rep-independent-docname-arbitration.md  # 名前仲裁を rep ゲート前へ (stale-rep で改名不収束の残穴) + writer 時計を正規化ペアで採用 (旧 writer 残留による equal-ts 誤帰属)
│   ├── ADR-1093-page-id-tombstones.md  # pageDel がメンバーしか tomb 化しない Gap B — ページ id を shape tomb 機構に載せ dels 経路で輸送、union-heal のゾンビ残存を閉塞 (wire 新規フィールドなし)
│   ├── ADR-1094-page-tomb-born-parity.md  # ページ id 側に欠けていた del parity — stale pageDel が born-newer ページを splice し _wD が _born 毎消す残穴を _bN ゲートで閉塞 (replace は pre-wipe wc0 を読む)
│   ├── ADR-1095-pageadd-tomb-parity.md  # pageAdd fwd に add parity 欠落 — ページ id の _tmb ゲートなし (stale add がゾンビ復活) + メンバーループが _born エスケープ欠落の手書きチェック → _tmb に統一
│   ├── ADR-1096-replace-member-born-escape.md  # replace fwd メンバー install が _born エスケープ欠落 + _wTb が _born を clobber — _tmE (entry 渡し _tmb) で統一し _wTb は _born 保持
│   ├── ADR-1097-wclock-trim-born.md  # wclock flood trim が _born を落とす (outranking born を tomb-dead 化 + born-only 生レコード全落とし) — 存在時計 (_del + outranking _born) のみ保持へ
│   ├── ADR-1098-mac-egress-dels-parity.md  # egress MAC 網羅性 × dels 存在時計 parity 監査 clean 完走 — 14 挙動ピン (tag 全輸送両端 / dels 送受 _bN・locked・LWW tomb)
│   ├── ADR-1099-name-channel-clock.md  # case 'name' の clockless 採用を _tsOK+_nameWin 必須化 (偽造改名窓口) + change 経路を _commitDocName 統一 (スタンプ/送出欠落)
│   ├── ADR-1100-two-world-egress-restore.md  # two-world ハーネス teardown が Net.broadcast/_send を dead-B 中継のまま残す汚染 — 正規 egress を救出して終端で復元、3 挙動ピン
│   ├── ADR-1101-export-pipeline-completeness.md  # エクスポート面監査完走記録 (hidden parity・page scope・escaping・bounds・parked-img・born-clock 全 clean) + exportPDF 空ページ `_wT(_EM)` toast parity
│   └── ADR-1102-ro-paste-import-gates.md  # 貼付/ドロップ取込カスケードの ro ゲート — 3穴 (drawio multi-page broadcast 漏洩・成功 toast・live shape 変異) を5入口ゲートで閉塞 + 7挙動ピン
│   └── ADR-1103-ro-adoption-folds-open-editors.md  # ro 採用時に開いた text/label エディタを畳む
│   └── ADR-1104-ro-live-write-revert.md  # ro 棄却 op の live 書き込みを `_roRe` で復元 (orig/before/changes ベースライン) + スライダ早期 return
│   └── ADR-1105-ro-page-dup-broadcast-leak.md  # _pgDup が ro 下で addMany を無条件 broadcast — 入口ゲートで閉塞 (ADR-1102 同型)
│   └── ADR-1106-ro-success-feedback-gates.md  # ro 棄却後の成功トースト/ダイアログを入口ゲートで閉塞 (18サイト)
│   └── ADR-1107-os-menu-clipboard.md  # OS メニュー Copy/Cut を `_osCopy` のイベント駆動 capture+delete で閉塞 (ctxCopy `_cpNow` リーク解消)
│   └── ADR-1108-ctx-menu-cut.md  # ctx メニューに Cut 項目追加 (キー/OS 専用クリップボード op のメニュー到達性 — ADR-0135 系の残穴)
│   └── ADR-1109-page-tomb-member-parity.md  # ローカル replace のページ tomb + _pgDel2 の pg0 (削除前先頭ページでの暗黙メンバー解決)
│   └── ADR-1110-page-birth-clock.md  # ページレコードの誕生時計 bts/btp 搬送 (tomb 仲裁は受信側時計でなく搬送 birth で)
│   └── ADR-1111-doc-switch-tomb-separation.md  # doc 切替で tomb map を adopt 前にリセット + sender 側の採用ページ _born スタンプ対称化
│   └── ADR-1112-undo-tomb-parity.md  # replace undo も forward と同じ tomb parity (old0/pg0 tomb + _wTb interim 保持) を実行
│   └── ADR-1113-undo-wire-parity.md  # undo-wire × backward parity 監査 clean — inverse は全て wire-legal (delta move は _slimOp 救済)、_lwwSkip は HLC dead-gate
│   └── ADR-1114-hlc-floor-foreign-clock.md  # 外部時計の全受容経路が `_fTs` で HLC floor を進める — snapshot 系埋込時計 (dels/wc/pages/rep/nameTs) が envelope を迂回していた残穴閉塞
│   └── ADR-1115-hlc-floor-rehydration.md  # 永続化因果マーカー (d.rep/d.nts) も復元時に `_fTs` で floor fold — pages:null 復元で rep が迂回し自書込みが stale 棄却される残穴閉塞
│   └── ADR-1116-backward-born-restamp-parity.md  # del/clear/pageDel backward が `_bT` を `!byId` 内でのみスタンプ — undo 時点で alive のメンバーが旧 born を保持し窓内 del で片側発散 → addMany fwd と同じ無条件スタンプに統一
│   └── ADR-1117-pagename-carried-ntp-bound.md  # wire `pageName` の `ntp` が無検証着地 — 巨大/非文字列の ntp が改名 LWW の tie-break を腐敗 → `_vPages` 同型の ≤64 文字列束で閉塞 (validator + apply 二層)
│   └── ADR-1118-op-clock-seq-contract.md  # op 採番 `{peer:_pi(),seq:++state.seq,ts:nowTs()}` の一カウンタ契約 — seq 非永続は incarnation-suffix peerId で dedup キーを launch-unique に (監査 clean、docs+pin)
│   └── ADR-1119-doc-switch-idb-page-clocks.md  # clk-less `_pgAdopt` (import/共有リンク/バックアップ復元) は `_wM()` 清掃 + `_repC` で `_bT` 送信側パリティ、IDB v1→v2 は contains() 冪等 (監査 clean、docs+pin)
│   └── ADR-1120-stored-op-aliasing.md  # 履歴 op と live 状態の参照共有監査 — wclock/pages/shapes は全経路で `clone` 切断、verbatim 代入なし (監査 clean、docs+pin)
│   └── ADR-1121-global-op-log-history.md  # 履歴境界監査 — 単一 op-log (ローカル+リモート同一 push)、redo chop、MAX_HISTORY=500、undo/redo 全 restamp、echo なし (監査 clean、docs+pin)
│   └── ADR-1122-nolock-baseline-coverage.md  # `locked` を全 patch ベースラインでゲート — 偽造 `upd` before.locked が undo でローカルのみ着地 (inverse は peers 棄却)、偽造 `move` after.locked が _stampWrites 経由で仲裁時計汚染 → `noLock` ホイスト + before/after 両側ゲートで閉塞
│   └── ADR-1123-text-3way-merge.md  # remote-wins text/label を `_mT3` 3-way マージ — disjoint hunk は union 保持 (両編集生存、時計は remote 勝ちで決定性)、union emit を `_txFlush` で収束
│   └── ADR-1124-snapshot-merge-emit.md  # snapshot merge が joiner-newer 発散 prop を伝搬 — 一方向チャネルで永久 stale 化していた残穴を、remote 値を `before` とする収束 `upd` emit (`_emOK` + lw-sweep) で閉塞
│   └── ADR-1125-op-drop-emit.md  # op 経路の同型残穴 — `_lwwDrop` がローカル勝ち prop を黙って drop し送信側が永久 stale 化 → drop 枝から `_txE`/`_txFlush` 収束 `upd` emit (全 prop 全滅の早期 return でも flush)、emit が prop 時計を正当再スタンプする双方向収束契約
│   └── ADR-1126-structural-drop-emit.md  # 構造 prop 側の同型残穴 — group/ungroup (`groupId`)・zorder (`frac`) の drop を専用 op チャネルで emit (upd 不可)。emit は undo 外 headless commit `_txC` (⌘Z が収束値を stale 値へ戻す実害を解消)
│   └── ADR-1127-proto-key-keyed-map.md  # proto キー監査 clean 完走 — 全 intake で __proto__/constructor/prototype 拒否 (validPatch・merge ゲート・_wK・_emOK)、全 id キー化 store は Map/null-proto なので JS 予約 id は不活性データ。契約をピン固定
│   └── ADR-1128-commit-dedup-eviction.md  # commit/_txC の例外境界 — apply/broadcast 失敗で dedup key が滞留し同一 op の再試行を永久棄却 (_txFlush 経由なら排出キューごと消失) → ADR-1026 parity の catch→delete→rethrow で閉塞
│   └── ADR-1129-recordcommit-eviction-undo-redo-atomicity.md  # _recordCommitted 最後の dedup 無防備サイト (pre-record throw でキー滞留→再配送を永久棄却) を catch→delete→rethrow で閉塞 + undo/redo の histIdx を apply 成功後へ移動 (undo は _pgFollow throw で二重 revert、redo は apply throw で op スキップの非対称を対称化)
│   └── ADR-1130-best-effort-flush-drain.md  # _txFlush の drain 中 _txC throw が残収束キューを静黙放棄 (one-shot・再試行なし→発散 prop が永久 stale) → best-effort drain + 先頭エラー再throw (ADR-1128 個別 evict 契約は維持)
│   └── ADR-1131-dropped-key-before-parity.md  # _lwwDrop が after のみフィルタで before を不対称残留 → drop キーの before も除去 (op は適用差分のみを記述; group/ungroup parity) + remote op は history 非登録・_vPages が [null] 拒否の契約ピン
│   └── ADR-1132-existence-clock-helper-equivalence.md  # tomb3系統 (_tmE/_tmb・_bN・_tAlive) 監査 clean 完走 — 同一支配関係 (_born>_del で全経路 alive、_del>到着時計で gate、_bT は単調 upgrade) を12ピンで固定。併せて _attachOp 網羅・_placeCopies 全 remap・MAC peer 束縛・origSel 非搬送・_shCap 網羅も検証済み
│   └── ADR-1133-room-secret-reseed.md  # doc 復元の `rs` 採用が `_ls` しない揮発性代入 — ls 消去 (IDB 残存) の唯一の復元窓で doc 鍵が後続タブの mint に origin-clobber される残穴 → ls 死時のみ `_ls('board.rs',d.rs)` 再シード (ls 生存時は絶対に上書きしない)
│   └── ADR-1134-live-read-convergence-flush.md  # `_txE` 滞留エントリ (push→flush 間の throw) が queue 時点の古値を新時計で emit し新しいローカル書込みを上書き収束して発散 → flush 時に `byId` で live 値を再読出し + dead id/収束済みは emit しない
│   └── ADR-1135-undo-wire-send-exception-tolerance.md  # undo/redo の `_pgFollow` が wire 送出前で follow throw → op は適用済みなのに未送出発散 + undo wire ループの bare broadcast で途中 throw → 残 op 未送出 (部分送出発散) → follow は送出後へ移動、ループは best-effort + 先頭エラー rethrow (ADR-1130 同型)
│   └── ADR-1136-flush-funnel-coverage-audit.md  # 収束emit完全監査が clean 完走: `_txE` 武装は6サイトのみ・全 `_apply` チェーン尾が `_txFlush`・`_nugEnd` が全 commit 漏斗を先行・`_roRe` 復元域完備・`state.ro` 採用/永続/解除が閉域・`_slimOp` フィールド行列全 undo-wire 網羅
│   └── ADR-1137-stub-heal-tomb-gate.md  # op-intake heal `f()` が tomb-dead ページ id を無ゲートで '?' スタブ化→zombie 復活していた残穴を、共有述語 `_stubOk` 抽出で `_pgHealS` と同じ tomb ゲートへ統一 (unknown/born-newer は従来通り heal)
│   └── ADR-1138-peer-name-staleness.md  # `_nIn` が `p.n` を設定のみで消去できず、ピアの名前消去が他盤面へ永続・改名が avatar tooltip に届かなかった残穴を、無条件再導出 + 変更時 `UI.refreshPeers()` で閉塞
│   └── ADR-1139-dup-chain-arming-gate.md  # `_placeCopies` が全呼出で `dupIds`/`dupDelta` を再シードし、ペースト/インポートの任意センタリングベクトルがスマート複製チェーンを武装→⌘V→⌘D で遥か画面外に不可視複製を commit/broadcast していた残穴を、第4引数 `dup` で ⌘D 経路のみ武装するよう閉塞 (ADR-0080「harmless」推定を撤回)
│   └── ADR-1140-line-granularity-text-merge.md  # `_mT3` の文字ハンク交差判定が「別行への disjoint 編集」まで真の衝突と誤認しローカル全文を消失していた残穴を、LCS アライメント+行ハンク二ポインタマージ `_mL3` で閉塞 (同行交差は従来どおり remote 勝ち、400 行境界) — ADR-1048 P2-a 完走
│   └── ADR-1141-text-merge-emit-cap.md  # `_mT3` 合成結果が prop wire 上限 (text 5000 / label 600) を超えると収束 emit が全受信側で棄却→永久発散する残穴を、第4引数キャップ越時 remote 値フォールバックで閉塞
│   └── ADR-1142-cursor-intake-bound.md  # presence cursor x/y が有限性のみ検証で唯一の unbounded remote 座標だった残穴を `_xyOK` (≤1e7) parity で閉塞
│   ├── ADR-1143-presentation-hidden-frames.md  # _getFrames/_goto が `_hd` 未フィルタで最後の non-hidden-aware 列挙だった残穴を閉塞 — hidden フレームが空スライド化・mid-pres hide が枠を残留させない
│   ├── ADR-1144-bound-connector-hidden-parity.md  # connEnds が hidden 結合先を unbound 解決へ — 矢印が hidden 図形のライブ輪郭位置をリークしない (バインドは保持・復帰可)、_bt 検索名も parity
│   ├── ADR-1145-bound-connector-page-parity.md  # ADR-1144 のページ拡張 — off-page 結合先も unbound 解決 (`_pgEq` 実効ページ一致)、別ページ図形のライブ位置・検索名・SR 型名をリークしない
│   ├── ADR-1146-frame-membership-page-parity.md  # フレーム子・グループメンバー列挙の page parity 監査完走 — withFrameChildren/_frameOf/_ss/_grpMapGet/_snapIndex 全て `_pgOk` 閉域、契約を8ピンで固定
│   ├── ADR-1147-keyboard-only-ops-reachability.md  # 最後のキーボード専用 op (⌘B/I/U/⇧X テキスト修飾 + ⇧2 zoom-to-selection) を ctx メニューへ — ADR-0135 罠の残存面を閉塞、apply は同一 fn へ委譲
│   ├── ADR-1148-help-grid-keymap-parity.md  # ? ヘルプグリッド × 実キーマップ parity — 未掲載の live バインド10件を行追加 (⌘⇧G/⌘⇧I/⌘Y/⌘Enter/⇧wheel/⇧click/⌥drag二重意味/⌥hover計測/⌥click経路/long-press) + 新 i18n キー7件 (ja+en)、片方向に過剰記載しない契約を12ピンで固定
│   ├── ADR-1149-ctx-menu-keyboard-reach.md  # ctx メニューへのキーボード経路 — ContextMenu(≣)/⇧F10 で開放 (右クリ/long-press のみだった残穴)、選択 union bbox 中心 or キャンバス中心にアンカー、ヘルプ行3経路集約、10ピンで固定
│   ├── ADR-1150-ctx-menu-focus-contract.md  # ctx メニューのフォーカス契約 — closed→open で呼出元捕捉、contains ゲートでメニュー保持時のみ復元 (fn が別要素へ移す ctxSearch は据置)、7ピンで固定
│   ├── ADR-1151-find-box-focus-contract.md  # 検索ボックスのフォーカス契約 — Esc は blur ではなく畳む (ゴースト overlay 解消)、専用 `_sqPrev` スロットで invoker 復元、6ピンで固定
│   ├── ADR-1152-find-box-esc-single-owner.md  # 検索ボックス Esc fold の単一 owner 化 — element 側 fold と window 側 toggleSq の競合 (閉じて即再オープンする回帰) を解消、close で `sq.value` クリア + ⌘Enter 経路 `_sqPrev=null`、4ピンで固定
│   ├── ADR-1153-editor-fold-focus-contract.md  # text/label エディタのフォーカス契約加入 — 全7 fold 経路が `_foldOv` 経由で invoker へフォーカス返却 (<body> 落下を解消)、実要素への blur は奪わない、7ピンで固定
│   ├── ADR-1154-invoker-capture-skips-closing-menu.md  # invoker 捕捉が ctx メニュー内要素を記録しない — ctxSearch で `_sqPrev` が死にゆく `.ctx-item` を捕捉して <body> 落下していた欠陥を `UI._prevFocus` 代替で閉塞 (全3スロット監査で唯一の ctx→overlay 遷移)、5ピンで固定
│   ├── ADR-1155-dying-overlay-invoker-never-recorded.md  # 死にゆく overlay 内部の要素は invoker に記録しない — `_dyingH` 判定で `_captureFocus`/`_sqPrev` を一般化し、`openCtxMenu` を modal 中拒否。共有 `_prevFocus` の両方向 clobber を chokepoint 閉塞、10ピンで固定
│   ├── ADR-1156-closed-details-focus-trap.md  # 閉じた `<details>` の子はフォーカストラップに列挙しない — `_focusables` が `#share` の閉 `.share-details` 内 RTC 全10要素をタブ対象化し Tab 脱出/⇧Tab 呪縛していた残穴を `details:not([open])` 祖先除外で閉塞 (summary は残す)、8ピンで固定
│   ├── ADR-1157-find-box-folds-on-modal-open.md  # find box は modal/プレゼン開始前に畳む — sqinput (z999) が help/share (z100) の上に描画され leave() で中画面に復活していた残穴を `_foldSq` 単一シームで閉塞 (invoker capture 前に畳み真の呼出元を記録)、7ピンで固定
│   ├── ADR-1158-presentation-folds-remaining-chrome.md  # プレゼンは残存インタラクティブ chrome を畳む — stylePanel/zoom-badge/shapeMirror/ctx が canvas 被覆下も tabbable で Space/Enter 活性化がスライド中に変異 op を撃っていた残穴を enter 一括 `_dsp` で閉塞 (leave で復元)、10ピンで固定
│   ├── ADR-1159-button-owns-activation.md  # フォーカス中コントロールは活性化キーを所有する — focused `<button>` の Enter/Space がネイティブ click とキャンバス shortcut を二重発火していた残穴を dialog trap 直後の `button` ガードで閉塞、6ピンで固定
│   ├── ADR-1160-pres-activation-keys.md  # 活性化キー契約はプレゼンにも適用 — pres 内で Space が nav key のため focused exit button の Space が `_pd`+`next()` でハイジャックされていた残穴を、ガードを `_pA()` 直上へホイストして閉塞、5ピンで固定
│   ├── ADR-1161-window-drop-target.md  # ドロップ標的は window 全体 — toolbar/stylePanel 等 chrome へのファイルドロップがブラウザ既定でアプリからナビゲーション離脱していた残穴を canvas→window ホイストで閉塞 (input へのテキストドロップは native 維持・pres は view-only)、4ピンで固定
│   ├── ADR-1162-ro-swap-gate.md  # 総入替 import の ro 契約 — `state.ro=d.ro===1` の repC 前採用が全 ro:1 payload の swap を「op なし」で着地させていた残穴を、入口ゲート (ro→ro 拒否) + 採用順序反転 (writable commit → ro 採用) で閉塞、28+7ピンで固定
│   ├── ADR-1163-replace-undo-restores-ro.md  # `replace` op が doc 状態のうち `state.ro` だけを記録していなかった残穴 (ro→editable import の undo で unlock が漏洩) を、`bro`/`aro` の op 記録 + backward 復元/own-redo 再再採用で閉塞、34+9ピンで固定
│   ├── ADR-1164-replace-undo-restores-viewport.md  # `replace` op が doc スカラーのうち `state.viewport` を記録していなかった残穴 (import undo で旧盤に戻ってもカメラが採用 doc のビューに留まる) を、`bvp`/`avp` 記録 + backward 復元/own-redo 再着地で閉塞、38+11ピンで固定
│   ├── ADR-1165-delta-snapshot-intake-contract.md  # 'snap:' delta チャネルの dels/ops/rep 受入契約 — dels bounded-id+validClock+_tAlive/locked skip+_pgDel2 parity、ops 'add' 限定+envelope peer 結合+per-prop LWW、_wAdopt existence スタンプ、stale-rep wholesale 棄却、sender は生きた tomb のみ広告 (監査 clean、13+3ピン)
│   ├── ADR-1166-dup-chain-delta-lifecycle.md  # smart-duplicate チェーンのデルタ・ライフサイクル — ro-revert された nudge が座標を戻しつつ dupDelta だけ増やす幻影ベクトル (両 feed サイトを !state.ro ゲート化) + armed-set move の undo が delta を戻さない非対称 (op.dd snapshot で backward 復元/own-redo 再 feed、dd は _slimOp で wire から剥がす undo-domain) を閉塞、8+3ピンで固定
│   ├── ADR-1167-docname-swap-restore.md  # docName を swap の復元領域へ — インポート undo が採用名を残す局所不整合 + 静黙復元なら LWW チャネル発散のため、3サイトが bvp 同様に採用前 bnm 捕捉・_repC が anm 記録、backward は _setDocName(bnm)+_bName() で復元名を再送出、own-redo のみ anm 再適用 (wire は _slimOp で自動 strip)、5+2ピン
│   ├── ADR-1168-swap-page-set-restore.md  # swap undo/redo で bts-less ページが消滅する実害 — keep フィルタが carried-birth×tomb のみ仲裁で swap 自身の tomb T1 に全敗 → pages=null (undo-wire で全ピア同損失)。形状側 _tmE (tomb が op 時計より新しいときのみ dead) と同規則を _pgAdopt の und フラグで導入: 'replace' 両方向 + backup restore は op-clock parity、snapshot union-heal は strict 維持、17+4ピン
│   ├── ADR-1169-gesture-wholesale-swap-contract.md  # ジェスチャ×全置換の2条件契約ピン — 着地ページ変化のみ _pgAdopt が cancel (同頁/pages-null は生存: ptr.reborn が swapped-in id を復元から除外する ADR-0984 設計)、commit 経路は emit 時の live-id フィルタで dead-id を除去、4+2ピン
│   └── ADR-1055-delta-snapshot.md  # sync-req に因果ホライズン (per-id 最新時計) を同梱 — 再 join で delta ops + `dels` tomb のみ送出 (ADR-1048 P1-b)
│   └── ADR-1056-wire-auth.md  # wire メッセージ認証 — doc スコープ秘密 (localStorage `board.rs` + IDB `rs`) で全 kind に HMAC タグ、RTC は SDP token `k` で link 鍵共有 (ADR-1048 P1-c)
│   └── ADR-1057-read-only-share.md  # 閲覧のみ共有リンク — `ro:1` フラグが変異漏斗 + 入力経路をゲート (🔒 バッジで解除、UX ゲート=認可ではない) (ADR-1048 P3-a)
│   └── ADR-1058-pen-skeleton-smoothing.md  # ペン描画のスケルトン平滑化 — `_penSm` (1,2,1)/4 加重で描画/スタンプ/SVG の3面を統一、端点保持・圧力 index 維持 (ADR-1048 W37)
│   └── ADR-1059-superseded-link-backlog-reset.md  # 差替リンクの滞留送信キューを新チャンネル生成前にリセット — `_dcQ`/`_dcQB` 未クリアで新リンクが永久 wedge + 旧キューのクロスリンク注入を閉塞
│   └── ADR-1060-deferred-img-chunk-outflow.md  # 滞留キュー超過で img chunk が途中ドロップ→再送増幅ループ — flush をキュー admission に同期させ残りを drain 再開へ延期 (blob 単位で seq:0 全量再送)
│   └── ADR-1061-deferred-frag-stream-outflow.md  # 同型残穴の snap/opc フラグメント版 — `_fragOuts` ステージ + drain で causal データ優先再開 (joiner 飢餓・巨大 op 消失を閉塞)
│   └── ADR-1062-staged-outflow-byte-bound.md  # ステージング蓄積の無制限成長を閉塞 — `_stgOK` が frag/img 両ステージを `_imgSent` と同じ 64MiB byte bound で shed (新規 stream 優先破棄、imgq rescan で自己治癒)
│   └── ADR-1063-imgq-durable-fallback.md  # imgq 応答を耐久ストアへ拡張 — リロード後の空 `_imgSent` で自 blob に応答不能→相手方飢餓を閉塞 (miss も throttle で `_imgqT`/IDB 読みレートを有界化)
│   └── ADR-1064-imgq-per-key-dedup.md  # imgq 再要求をスイープ内キー単位で dedup — 同一コンテンツ参照の N 図形が N 本の同一 imgq を送出していた増幅を 1 本へ (応答はキー単位のため)
│   └── ADR-1065-img-dataurl-coexistence.md  # img ref × dataUrl 同居の不変条件 — パッチ/マージが書いた prop が意図 (dataUrl 書込→ref 削除、img 書込→stale dataUrl 越しでも park→blob 到達で収束)。stale ref の偶発 blob 到着による新 dataUrl の旧画像への巻き戻りを閉塞
│   └── ADR-1066-attach-path-coexistence.md  # 同居規則の install 面完結 — _attachShape が同居 shape を素通ししてた残穴を install 時 bytes-win strip で閉塞 (op/インポート/undo 全 attach 経路)。merge は raw=1 で時計仲裁を維持
│   └── ADR-1067-export-unresolved-img-placeholder.md  # 未解決 img ref のエクスポート面完結 — .excalidraw の _du().match() TypeError を dangling fileId+_imgIn materialize で解消、.drawio は shape=image 無条件 (image= は bytes ゲート)、SVG は canvas の #CBD5E1 グレー枠に parity
│   └── ADR-1068-img-payload-intake-domain.md  # dataUrl のモデル領域守備 — drawio image= が https?: を dataUrl に誤植 (peer の validShape 拒否→静黙発散)、_imgSlim が非 image dataUrl を blob 化 (imgq 経由で全 peer 感染)、chunk intake が hash のみ検証 — 3面を data:image/ ゲートで閉塞
│   └── ADR-1069-doc-switch-ro-adoption.md  # doc-switch の ro 採用順序 — ro セッションで editable ドキュメントを開くと swap はローカル適用されるが _repC が旧 ro で drop → undo 不能+peer 非収束。採用→記録へ全3面統一 (.board/:prev に ro 同梱)
│   └── ADR-1070-wire-secret-lifecycle.md  # wire 秘密ライフサイクル監査 — SDP トークン codec が Share 専有の _b64u* を this. で呼び手動シグナリング全滅 (ADR-0160 由来) + `k` intake に rs parity ≤64 bound を新設。mint/persist/adopt/reset/propagate 全面の契約を文書化
│   └── ADR-1071-doc-switch-gesture-cancel.md  # `_rs` スワップのジェスチャ取消 — doc-switch 全面 (snapshot/import/load/backup) で live ジェスチャをキャンセル (0664 class)。remote 'replace' は keep survivor が同一 live オブジェクトのため意図的に維持 (0984) — 非対称契約をピン化
│   └── ADR-1072-pageless-paste-pg.md  # ページなし doc へのペーストで外部 `s.pg` を落とす — `_placeCopies` が dest にページがある時だけ pg を再割当し、single-page doc への multi-page .board ペースト/merge がソース pg を残して _pgOk 不可視 (addMany commit で peer にも伝播)
│   └── ADR-1073-ro-paste-gate.md  # ro (閲覧のみ) doc へのペースト系共有ゲート — `_placeCopies`/`importBoardText` が早期 `readOnlyMode` トーストで _cmt 手前で確実に拒否し、dup チェインの残存 id 汚染と「貼り付け 0」成功トーストを抑止
    └── .github/workflows/ci.yml  # CI: test.mjs・構文チェック・innerHTML/外部リソース禁止・サイズガード
    # ⚠️ .gitignore が .github/ を意図的に除外 (push に workflows スコープが要る)。
    # ファイル自体は作成済み (v1.7.58) だが未コミット — 適切な権限を持つ人が手動で
    # 追加する必要がある。内容は git 履歴でなくローカル/セッション成果物として存在。
```

**重要な不変条件**:
- `index.html` は単一ファイル。外部 `<script src>` / `<link href>` を絶対に追加しない。
- サイズはハード上限なし (2026-06-13 に gzip 44KB 予算を撤去)。指針として小さく保つが、
  整合性・正しさを優先してよい。暴走防止に raw 512KB の緩い上限のみ `test.mjs` で残す。
- `state` は Store 経由でしか書き換えない (undo の完全性のため)。
- Render は副作用を最小化する: `state` を読むのみが原則。
  - 例外: `getImg()` は `_imgCache` (LRU) を書き換え + `img.onload` コールバックを登録する。
    これは意図的な設計（非同期イメージロード + キャッシュ）であり、`state` は変更しない。
  - 例外: `wrapTextCached()` は `_wrapCache` (shape → 折り返し結果, WeakMap) を書き換える。
    付箋テキストの毎フレーム再計算 (measureText) を避けるための純粋なメモ化キャッシュで、
    `state` は変更しない。shape オブジェクト参照は Store が in-place で mutate するため
    キー (text/maxWidth/fontSize) が変わらない限りキャッシュは有効なまま安全。
  - 例外: `drawPenMaybeCached()` / `_penCached()` は `_penCache` (id → オフスクリーン
    canvas + シグネチャ, LRU, ピクセル予算 12M px) を書き換える。コミット済みペン
    ストロークの毎フレーム再ラスタライズ (ADR-0018) を避けるためのキャッシュで、
    `state` は変更しない。有効性は O(1) シグネチャ (pts 参照 + 長さ + 先頭/中央/
    末尾の絶対座標 + stroke + size) で判定し、in-place 変異 (translate / flip) も
    検知される。ミス時はそのフレームはベクトル描画にフォールバックする。
  - 例外: `G.bbox()` はペンシェイプで `_penBboxCache` (id → 包絡 + シグネチャ,
    FIFO 8,192) を書き換える (ADR-0019)。O(pts) 包絡走査の毎フレーム再計算を避ける
    観測上純粋なメモ化で、`state` は変更しない。シグネチャ構成は ADR-0018 と同一。
  - `drawShape()` に新たな副作用を追加する前に、この例外リストを更新すること。
  - ADR-0024: 描画は draw() (シーン, #c) / drawOverlay() (chrome, #ov) の 2 層。
    `invalidate()` は両層、`invalidateOverlay()` は上層のみ再描画 — シーン変更に
    後者を使うと選択枠等がズレる。プレゼン時は #ov も #c と一緒に fixed 昇格する。
  - ADR-0026: `_damage` はドラッグ系ジェスチャの world 空間の汚れ矩形 (累積union)。
    ジェスチャ系ハンドラのみ `invalidateDamage(r)` を呼び、draw() はその union に
    clip+局部再描画。それ以外の全経路は `invalidate()` (=_damage リセット+全面再描画)
    を必ず使うこと — `invalidateDamage` 化の判断は「ジンペル・ナン・ピクセルが
    変わる範囲を厳密に列挙できるか」のみに依存する。

## RULES — やっていいこと / ダメなこと

### やる
- op 追加時は必ず `_apply(op, false)` で逆操作できるか確認
- DOM を触るのは `UI.*` 内のみ
- 新機能追加前に `docs/ADR-NNNN-*.md` を書く
- WCAG AAA コントラストを維持 (`#0F172A` on `#FFF` = 18:1)
- ブランド色 `#00C4CC` に意味を統一 (選択・フォーカス・アクションのみ)

### やらない
- 外部 CDN (fonts, icons, libs) 追加
- `innerHTML =` で user input を流す (XSS)
- history に非可逆 op を push
- モーダル内に `animation` (reduce-motion の人向け)
- 「それっぽい AI」色 (紫グラデ、Inter、Space Grotesk)
- 量子・ブロックチェーン等の非現実機能

## WORKFLOWS — 進め方

### 機能追加
1. `docs/ADR-NNNN-*.md` を作成 (なぜ / 代替案 / 決定)
2. op 型を `Store._apply` に追加 (可逆性を担保)
3. tool handler を追加 (`beginX / contX / endX`)
4. `KEYMAP` と help grid を更新
5. `i18n` に対応する文字列を ja/en 両方で追加
6. README の Features を更新
7. CHANGELOG に記載

### バグ修正
1. 再現手順をまず書き出す
2. 最小修正。周辺をリファクタしない
3. `docs/architecture.md` に学びがあれば追記

### リリース
1. `CHANGELOG.md` 更新 (Keep a Changelog フォーマット)
2. `index.html` 冒頭と README の version バッジ更新
3. タグ `git tag v1.0.1 && git push --tags`
4. GitHub Releases にリリースノート + `index.html` 添付

### デバッグの優先順位 (Carmack 流)
1. Render に出ていない → State を疑う (console.log state.shapes)
2. 動作が重い → frame() 内の描画回数を疑う
3. Undo が壊れた → history の最新 op を疑う
4. 座標がズレる → DPR / zoom / viewport の順で疑う

## 100点への距離

Phase 1.0 = 70点 (MVP 完成、商用配布可能)

> **製品判断確定 (2026-07-01)**: `docs/research-improvements.md` §3.9「アーキテクチャは既に
> 投票を終えている」が問うた「scratchpad か workspace か」に対し、**scratchpad(速い・私的・
> 使い捨ての単独スケッチ)を選択**。Multi-page/複数ボード・スレッドコメント・identity 前提の
> コラボ機能は、この選択と構造的に衝突するため **100点の対象から除外**する(着手しない。
> 将来 workspace へ舵を切る場合は、この判断自体を明示的に覆す製品判断が改めて必要)。

残り 30点 (旧配点) の再定義:
- P2P sync (10) — ほぼ達成。WebRTC/BroadcastChannel + CRDT clock (ADR-0001 frac z-order,
  ADR-0002 per-property LWW) は「自分の複数デバイス間・信頼できる相手との私的共有」という
  scratchpad の延長として実装済み(README v1.7 時点 95点の主要因)。identity 前提の
  「ワークスペースとしてのコラボ」(5点分)とは別物として整理し、後者は上記の理由で対象外。
- Multi-page/複数ボード (7) — **対象外**(scratchpad の正体と衝突、§3.9)。
- コラボ (5) — **対象外**(identity 前提、§3.8/3.9 と衝突)。
- 単独体験の研磨 (§3.9(a) が示す代替投資先, 目安 12点): パフォーマンス
  (`byId` O(n) 線形探索の解消 — 実装済 ADR-0009。dirty-rect は未着手のまま残る)、
  a11y 外部監査通過(依存ゼロの静的検証で実施済み — `docs/a11y-audit-2026-07.md`。
  フォーカスリングのコントラスト不備を発見・修正。axe-core/Playwright での本格自動監査は
  npm install の許可待ちで未着手)、スケッチ認識/beautification
  ($1/$Q unistroke recognizer、依存ゼロで実装可能 — `docs/research-improvements.md` item M、
  実装済 ADR-0005)、タッチ到達性 (`docs/feature-triage-2026-07.md` §4、long-press でメニュー
  を開く ADR-0006 + ファイルピッカー/エクスポートメニュー ADR-0007、実装済で解消)、
  `docs/feature-backlog.md` の全項目完了(FT-05 Share モーダル明確化 ADR-0008 含む)、
  自己上書き保護
  (ADR-0004) の発展形。CI ワークフロー (`.github/workflows/ci.yml`) を v1.7.58 で
  作成 — 以前は MAP に記載のみで実体が無かった。ただし `.gitignore` が `.github/` を
  意図的に除外しており(push に workflows スコープが要るため)、コミットは未完了。
  適切な権限を持つ人が手動で追加する必要がある(上記 MAP の注記参照)。
- AI & i18n 1000 (4) — スケッチ認識(上記)は AI 項目の現実的な着地点として整理。i18n 1000言語
  は MT インフラを要し scratchpad 単体では優先度低(保留)。
- plugin/audit (4) — a11y 外部監査は上記に統合。Plugin API は multipage 同様アーキテクチャ
  拡張が要るため保留。

各 Phase は別 ADR + 独立リリース。一気に全部は作らない。
