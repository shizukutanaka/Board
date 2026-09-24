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
