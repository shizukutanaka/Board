# 機能バックログ (実行可能チケット, Opus/Sonnet 向け)

これは `docs/feature-triage-2026-07.md` (ソクラテス式問答による過不足分析、人間向けの
判断記録) の結論をチケット化したものである。**このファイル単独で読んで、前提知識なしに
次の一手が分かる**ことを目的とする。対象コードは `/home/user/Board/index.html` (単一
ファイル、Board — オフライン優先ホワイトボード)。行番号は編集のたびにズレるため使わず、
すべて grep 可能なシンボル名で参照する。判定基準は CLAUDE.md の製品判断: Board は
「速い・私的・使い捨ての単独スケッチ (scratchpad)」— multipage/複数ボード・identity 前提の
コラボは対象外。

各チケットのフィールド: **Verdict** (`KEEP`=変更不要の記録 / `CUT`=削除・簡素化候補 /
`FIX`=実装すべき不足) / **Evidence** (該当シンボル、実在確認済み) / **Action** (次の一手) /
**Effort** (S/M/L) / **Depends on**。

---

## FT-01 — プレゼンモード + レーザーポインタ
- Verdict: `KEEP`
- Evidence: `Presentation` オブジェクト、`btnPresent`
- Action: 変更不要。「観客が必要な機能では」という疑いは検討済みで、自分のフレームを
  見返す・整理する単独用途として正当と判定済み。再検討しない。
- Effort: -
- Depends on: none

## FT-02 — P2P sync 一式 (WebRTC + BroadcastChannel + CRDT clock)
- Verdict: `KEEP`
- Evidence: `Net` オブジェクト、`Share` オブジェクト、`Store._recordCommitted` の
  clock/seenOps 処理
- Action: 変更不要。「使い捨てと同期は力学が逆では」という疑いは検討済みで、自分の
  PC↔スマホ間の私的共有は scratchpad の延長と判定済み。identity 前提のワークスペース的
  コラボとは別物(そちらは対象外、CLAUDE.md 参照)。再検討しない。
- Effort: -
- Depends on: none

## FT-03 — IndexedDB 永久蓄積 (単一 DOC_KEY)
- Verdict: `KEEP`
- Evidence: `Persist` オブジェクト、`Persist.schedule`
- Action: 変更不要。「使い捨てを名乗りながら実質は永続ノートでは」という疑いは検討済みで、
  「使い捨て」は対価(登録・課金・プライバシー)ゼロの気軽さの意味でありデータ寿命の話では
  ないと判定済み。自動保存は「作業を失わない」という別の価値。ADR-0004 がこの立場を補強。
  再検討しない。
- Effort: -
- Depends on: none

## FT-04 — 手動保存 (⌘S) — ✅ 実装済み (v1.7.55)
- Verdict: `CUT`
- Evidence: keydown ハンドラ内の `k==='s'` (⌘S 分岐)、`Persist.schedule` (500ms
  デバウンスの自動保存が既に存在)
- Action: 削除する。⌘S ショートカット・help grid の該当行・README のショートカット表・
  i18n の対応キーを同時に消す。自動保存と完全に重複しており、削除しても機能損失はない。
- Effort: S
- Depends on: none

## FT-05 — Share モーダルの手動 WebRTC シグナリング UI — ✅ 実装済み (v1.7.57, ADR-0008)
- Verdict: `CUT` (機能は残す、UI のみ簡素化— 削除ではない)
- Evidence: Share モーダル DOM (`shareStep2` 等の step 表記)
- Action: Step 1 (offer 生成) → Step 3 (answer 貼付) の間に「相手から answer コードを
  もらう」という中間段階の説明・導線を追加し、視覚的に欠落している流れを補う。機能自体
  (FT-02 で KEEP 判定済み) は変更しない。
- Effort: S
- Depends on: none

## FT-06 — long-press でコンテキストメニューを開く (P1、最優先) — ✅ 実装済み (v1.7.55, ADR-0006)
- Verdict: `FIX`
- Evidence: コンテキストメニューの唯一の開始点は
  `canvas.addEventListener('contextmenu',e=>{e.preventDefault();UI.openCtxMenu(e.clientX,e.clientY)})`。
  メニュー本体は `UI.openCtxMenu(x,y)`。メインの単一ポインタジェスチャーは
  `canvas.addEventListener('pointerdown',e=>{...})` (bubble-phase、`Presentation.isActive()`
  チェックの直後の handler)。タッチ由来かどうかの判定は現状コードに一切存在しない
  (`pointerType` の使用箇所は 0 件)。iOS Safari 等は canvas 上の long-press から
  `contextmenu` を確実に発火しないため、タッチ端末ではメニュー全体が事実上開けない。
- Action: 上記の pointerdown handler 内で `e.pointerType==='touch'` の場合に ~500ms の
  タイマーを開始する。タイマー発火までに一定距離(数px)以上ポインタが動くか、pointerup/
  pointercancel が先に来たらタイマーを cancel する(通常の描画・ドラッグと衝突しないため)。
  タイマー発火時に `UI.openCtxMenu(e.clientX, e.clientY)` を呼び、以降のジェスチャー
  (描画開始等)を抑制する。
- Effort: S — タイマー1本 + キャンセル条件のみ。既存の `UI.openCtxMenu` をそのまま再利用。
- Depends on: none
- 効果: この1件で `ctxAlign*` (整列)、`doClearAll`/`ctxClear` (全消去)、
  `ctxCopyStyle`/`ctxPasteStyle` (スタイル転写)、複製・コピー・ペースト・削除・全選択・
  グループ化・z順序・フリップ・ロックがすべてタッチ到達可能になる。

## FT-07 — .board インポートのファイルピッカー + エクスポートのドロップダウン化 (P2) — ✅ 実装済み (v1.7.56, ADR-0007)
- Verdict: `FIX`
- Evidence: `importBoard` の唯一のトリガーはキャンバスへの drag-drop(`<input type=file>`
  はドキュメント内に存在しない)。エクスポートボタンは `btnExport`
  (`document.getElementById('btnExport').onclick=exportPNG`) のみで PNG 固定。
  `exportSVG`/`buildSVG` (⌘⇧E)、`exportPDF` (⌘P)、`exportBoard` (⌘⇧S) はキーボード限定。
- Action:
  1. 非表示の `<input type="file" accept=".board,application/json">` を追加し、
     ボタン(または既存メニュー)からクリックで開けるようにする。`change` イベントで
     既存の `importBoard` 処理(現在の drag-drop ハンドラが呼ぶ関数)を再利用する。
  2. `btnExport` をドロップダウン(または長押し/クリックでサブメニュー)にし、
     PNG (`exportPNG`) / SVG (`exportSVG`) / PDF (`exportPDF`) / .board
     (`exportBoard`) を選べるようにする。
- Effort: M — DOM 追加 + 既存関数の再配線、新規ロジックはほぼ無い。
- Depends on: none (FT-06 と独立に実装可能)

## FT-08 — ツールバー縦レールのオーバーフロー対応 (P3) — ✅ 実装済み (v1.7.55)
- Verdict: `FIX`
- Evidence: `.toolbar{...}` (CSS)、`@media (max-width:720px){ .toolbar{width:44px;...} }`。
  11 ツールボタンが固定高の縦レールに並び、`overflow` 指定がない。
- Action: `.toolbar` に `overflow-y:auto` を1行追加する(必要なら `-webkit-overflow-scrolling:touch`
  も)。背の低い横持ち画面で下方のツール (frame/eraser) に届かない問題を解消する。
- Effort: S — CSS 1行。
- Depends on: none

---

## 推奨実行順序

**FT-06 → FT-07 → FT-08**(この順で §4 のタッチ到達不能性がほぼ解消する)。
FT-04・FT-05 (CUT 群) はいつ実施してもよく、上記と独立。FT-01〜FT-03 (KEEP) は
アクションなし — 再度「過剰では」と疑って工数を使わないための記録として存在する。

新機能(次の ⌥B のような)を追加する前に FT-06 を先に片付けること — 到達経路を直さずに
機能を増やすと「キーボード限定の新機能」を量産するだけになる(`docs/feature-triage-2026-07.md`
§5 参照)。

**進捗 (v1.7.57)**: FT-04・FT-05・FT-06・FT-07・FT-08 すべて実装済み。本バックログの
FIX/CUT 項目は完了。残るは FT-01〜FT-03(KEEP、変更不要の記録)のみ — 再度「過剰では」
と疑って工数を使わないための記録として存在し続ける。

---

# 第2弾 (v1.7.61 時点、対象: プロダクト全体の過不足)

v1.7.57 以降、`docs/feature-triage-2026-07.md` のスコープ(タッチ到達性)の外側で
大きく進捗した: `byId` O(1)化(ADR-0009、実装中に発見したキャッシュ不整合バグの修正
込み)、CI ワークフロー作成、a11y 静的監査(ADR + フォーカスリング/canvas UI指標の
コントラスト修正)、文書間の矛盾解消(ADR-0001 のステータス表記)、存在しない
URL/ドメイン参照の削除、ピアカーソル表示(ADR-0010)。これらを踏まえ、`docs/spec.md`
§14(長所・短所・改善点)を一次情報として、現時点の過不足を選別し直した。

新たな「過剰」は見つからなかった(直近の追加はいずれも既存 KEEP 判定の自然な延長 —
下記 FT-16 で確認)。「不足」はすべて `docs/spec.md` §14.2/14.3 に既出だが、
Opus/Sonnet が文脈なしで着手できる形式に変換していなかったため、以下にチケット化する。

## FT-09 — CI ワークフローが未コミットのまま(手動対応が必要)
- Verdict: `FIX`(ただし実装側の対応は完了 — 残るのは人間の操作のみ)
- Evidence: `.gitignore` の `.github/` 除外ルール(コメント: 「requires workflows
  permission to push; managed manually」)。`.github/workflows/ci.yml` はファイルとして
  存在し、ローカルで全ゲート(test.mjs・構文チェック・innerHTML禁止・外部リソース禁止・
  512KB上限)を検証済み(v1.7.58)。
- Action: コード側にできることは無い。適切な `workflows` スコープを持つ人が
  `git add -f .github/workflows/ci.yml` でコミット・push する。CLAUDE.md の MAP
  注記と本チケットが唯一のリマインダー。
- Effort: -(人間側のアクションのみ)
- Depends on: none

## FT-10 — axe-core による本格自動 a11y 監査(npm install の許可待ち)
- Verdict: `FIX`
- Evidence: `docs/a11y-audit-2026-07.md`「残作業」。依存ゼロの静的検証(コントラスト比の
  直接計算)は実施済みで実害のあるバグ(フォーカスリング・canvas UI指標のコントラスト
  未達)を発見・修正済みだが、ARIA ロール整合性・DOM構造・実レンダリング後の計算済み
  スタイルは静的検証の対象外。
- Action: scratchpad に一時的な npm プロジェクトを作り
  `npm i playwright @axe-core/playwright`(本番 `index.html` の依存ゼロは不変、
  リポジトリにはコミットしない)。`/opt/pw-browsers/chromium` を `executablePath`
  指定して Playwright でヘッドレス起動し、`file://.../index.html` を最低4状態
  (初期状態・ヘルプモーダル・Share モーダル・コンテキストメニュー展開)で開いて
  `AxeBuilder.analyze()` を実行。結果を `docs/a11y-audit-2026-07.md` に追記。
- Effort: M — 環境構築は小さいが、違反が見つかった場合の修正範囲は不明。
- Depends on: **ユーザーの明示的な npm install 許可**(過去2回、承認確認の
  `AskUserQuestion` がインフラエラーで失敗し、自動モードの分類器がエージェント自己判断
  でのインストールを正しくブロックした。プレーンテキストで直接尋ねる必要がある)。

## FT-11 — 実スクリーンリーダーでの操作確認(NVDA/VoiceOver 等)
- Verdict: `FIX`
- Evidence: `docs/a11y-audit-2026-07.md`「残作業」。README のアクセシビリティ節には
  「canvas 内容はスクリーンリーダーから本質的に不可視」という構造的制約を明記済みだが、
  ツール自体(ボタン・メニュー・ショートカット)がスクリーンリーダー実機で実際に
  破綻なく操作できるかは未検証。
- Action: 実機(NVDA on Windows / VoiceOver on macOS・iOS)でツール切替・図形作成・
  エクスポート・Share モーダルの一連の操作を確認。この環境には実ブラウザ+スクリーン
  リーダーの組み合わせが無いため、**この Claude セッションでは実施不可** — 人間の
  手動確認が必要。
- Effort: -(人間側のアクションのみ)
- Depends on: none(実機環境)

## FT-12 — プレゼンス: 他者の選択状態のハイライト(ADR-0010 の続き) — ✅ 実装済み (v1.7.62, ADR-0011)
- Verdict: `FIX`
- Evidence: ADR-0010 は「他者カーソル」のみを実装しスコープを絞った。`docs/spec.md`
  §14.3 のロードマップでは P2(カーソルは実装済みのため P1 から降格)。
- Action: ADR-0010 と同じ非永続メッセージパターンを踏襲し、`{k:'selection',peer,ids}`
  を追加。受信側は該当 `ids` の図形に、そのピアの `PEER_COLORS` の色で薄い外枠を描画。
  **設計論点**(実装前に解くべき): (a) 自分の選択色 `--accent-contrast` との視覚的な
  区別、(b) 複数ピア・複数選択時の描画量、(c) ロックされた図形も選択表示の対象か。
- Effort: M — ADR-0010 のメッセージ配線パターンを再利用できるが、上記3論点の設計判断が
  必要なため独立 ADR を先に書くこと(CLAUDE.md ワークフロー)。
- Depends on: none(ADR-0010 のパターンを参照するのみ、コード依存はない)
- **解決 (v1.7.62)**: `docs/ADR-0011-peer-selection-highlight.md` で3論点に結論
  ((a) ピア色・破線・ハンドル無しの3点で区別 / (b) bbox 外枠のみ・重複排除なし /
  (c) ロック図形も対象)を出した上で実装。送信は mutation 箇所への配線でなく
  `frame()` での変化検出1箇所に集約した点が設計の要。

## FT-13 — dirty-rect(差分再描画)によるレンダリング最適化
- Verdict: `FIX`(ただし高リスク、実装は慎重に)
- Evidence: `docs/spec.md` §14.2「大規模スケール…quadtree / ダーティ矩形再描画は
  未着手」。CLAUDE.md の「100点への距離」にも byId 解消と対で残存項目として明記。
- Action: レンダーループ(`draw()`)の核心に触れる変更。この Claude セッションでは
  **実ブラウザでの視覚的な動作確認ができない**ため、`node test.mjs` の検証だけでは
  「動いているように見えて実は描画が壊れている」というリスクを十分に検出できない。
  実装する場合は (a) 実ブラウザでの目視確認が可能な環境で行う、または (b) 視覚回帰
  テスト(スクリーンショット比較)の仕組みを先に整えてから着手することを推奨。
- Effort: L — レンダーループの再設計、影響範囲が広い。
- Depends on: 実ブラウザでの検証手段(このセッションには無い)

## FT-14 — 空間索引(quadtree)を pickTop 以外(全描画・bbox再計算)にも拡張
- Verdict: `FIX`
- Evidence: `_buildGrid`/`_queryGrid`(`pickTop` のヒットテスト高速化)は実装済みだが、
  `draw()` の `for(const s of state.shapes)` は依然として全図形を毎フレーム走査する
  線形処理。2000図形超の盤面で顕在化。
- Action: FT-13(dirty-rect)と組み合わせるとより効果的だが、独立に着手も可能
  (viewport 外の図形をそもそも走査しない、という形で `_buildGrid` を描画パスにも
  再利用する)。既存の `inView(s,_view)` フィルタが O(n) 走査自体は避けられていない点が
  ボトルネック。
- Effort: M
- Depends on: none(FT-13 と独立に実装可能、ただし FT-13 をやるなら先にこちらを
  済ませた方が設計がシンプルになる)

## FT-15 — 画像 dataURL の参照分離(state 肥大化の緩和)
- Verdict: `FIX`
- Evidence: `docs/spec.md` §14.2「画像の肥大: dataURL を state にインライン保持 →
  大画像で盤面 JSON / IDB が膨張。参照分離・再圧縮は無い」。
- Action: dataURL を content-addressable(ハッシュキー)な別ストア
  (IndexedDB の別 object store)に分離し、`shape.image` は参照キーのみを持つ設計に
  変更。**永続化フォーマットの変更を伴うため、既存ボードの読み込み後方互換が最重要
  リスク**(ADR-0001 の「マイグレーション必須」と同じ教訓)。
- Effort: L — データモデル変更、マイグレーション、sync(参照キーを他ピアが解決できる
  保証)まで含めると設計論点が多い。
- Depends on: none だが、着手前に必ず ADR を書くこと(CLAUDE.md ワークフロー、
  永続化フォーマット変更は back-compat リスクが最も高いクラスの変更)。
- 設計メモ (2026-07-11 Web調査): 分離先ストアの候補として IndexedDB の別 object store
  に加え **OPFS (Origin Private File System)** も比較すること — 大きい blob の書き込みで
  IndexedDB より大幅に速い(structured clone を回避できる)という報告がある。

## FT-16 — 直近の追加(ADR-0009/0010)は過剰か? — 検討済み、`KEEP`
- Verdict: `KEEP`
- Evidence: ADR-0009(`byId` キャッシュ)、ADR-0010(ピアカーソル)。
- Action: 変更不要。ADR-0009 はパフォーマンスの内部実装詳細で UI/UX に一切影響しない
  (74箇所の呼び出し元は無変更)。ADR-0010 は FT-02 で既に KEEP 判定済みの P2P sync
  機能の自然な延長(「自分の端末間・信頼できる相手との私的共有」という既存の枠組みを
  出ない)。いずれも scratchpad の自己像と衝突しない。再検討しない。
- Effort: -
- Depends on: none

---

### 第2弾の推奨実行順序

依存関係の無い FT-09〜FT-16 のうち、コードで前に進められるのは **FT-12(選択ハイライト)**
と **FT-14(空間索引の描画パスへの拡張)** の2つのみ — どちらも ADR を書いてから着手。
**FT-10(axe-core)** はユーザーの明示的な npm install 許可を待つ。**FT-09・FT-11** は
そもそも人間側のアクション(コミット権限・実機確認)でありコードでは解決しない。
**FT-13(dirty-rect)・FT-15(画像参照分離)** は影響範囲が大きく高リスクなため、
着手前にユーザーとスコープ・検証手段を確認すること — 特に FT-13 はこのセッションに
実ブラウザでの視覚確認手段が無いという明確な制約がある。

**進捗 (v1.7.62)**: FT-12 実装済み(ADR-0011)。**FT-14 は見送りを決定** —
`_queryGrid` は単一点クエリ専用で viewport 矩形クエリへの転用には非自明な拡張が要り、
かつ「描画が重い」という実測の証拠が無い(CLAUDE.md デバッグ優先順位は実測が前提)。
実ブラウザでの FPS 計測手段が確保できたら再検討する(FT-13 と同じ前提条件)。
残る未着手はブロック中の FT-09/10/11/13/15 のみで、いずれも人間側のアクション
(権限・実機・npm 許可・検証手段)を待つ。
