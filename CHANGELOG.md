# Changelog

All notable changes to Board follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/shizukutanaka/Board/releases/tag/v1.0.0
