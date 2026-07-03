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

## FT-05 — Share モーダルの手動 WebRTC シグナリング UI
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

## FT-07 — .board インポートのファイルピッカー + エクスポートのドロップダウン化 (P2)
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

**進捗 (v1.7.55)**: FT-04・FT-06・FT-08 実装済み。残るは **FT-07**(`.board` ファイル
ピッカー + エクスポートのドロップダウン化)と FT-05(Share モーダル UX 簡素化)のみ。
FT-07 が完了すれば `docs/feature-triage-2026-07.md` §4 のタッチ到達不能性はほぼ解消する。
