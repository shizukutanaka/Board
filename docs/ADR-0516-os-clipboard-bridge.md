# ADR-0516: OS クリップボード橋渡し (⌘C/⌘X/⌘V)

## 状態

実装済み

## 背景

ADR-0115 は「クリップボード .board 転送」を導入したが、outbound は ctx メニューの
`ctxCopyBoard` (明示的な「.board JSON をコピー」項目) のみだった。通常の ⌘C/⌘X は
`doCopy()` が内部 `state.clipboard` に書くだけで **OS クリップボードを一切触れず**、
さらに ⌘V の keydown が `_pd(e)` するため window の `paste` イベント自体が抑止されていた。

結果として実害:

1. Board A で ⌘C → 別タブ/別アプリで ⌘V → **何も貼れない** (OS クリップボードが空のまま)
2. 別ソース (ctxCopyBoard / 外部エディタ) が OS クリップボードに書いた .board JSON や
   テキスト/画像を、**キーボードの ⌘V では取り込めない** — paste イベントが suppress
   されて `doPaste()` (内部 clipboard) のみが走る。外部ペーストはメニュー (Edit→Paste /
   右クリック) 経由でのみ到達していた
3. 内部 clipboard が残っている間、外部アプリで新しくコピーした内容より
   **stale な内部 clipboard が常に優先** される

## 決定

ClipboardEvent の `clipboardData.setData` は `copy`/`cut` イベント内でのみ書き込み可能
(keydown では書けない) ため、keydown の `_pd` を外してネイティブイベントを発火させ、
イベント側で clipboard 書き込みを行う:

- `doCopy()` は内部 clipboard への保存に加え `_cpNow=true` を立てる (フラグ方式:
  `cut` では keydown の doDelete が先に走り選択が既に空のため、イベント時点では
  `_sl()` を信用できない)
- `window` の `copy`/`cut` ハンドラ `_osCopy` — `_cpNow` を消費し、`_pd(e)` で
  ネイティブ書き込みを止めてから `text/plain` に `.board` JSON
  (`{v,docName,shapes:roundShapesForExport(...)}`) を書き込む。書いた JSON を
  `_osClip` に保持
- ペースト側: `text/plain` が `.board` JSON を含むとき、**`_osClip` と完全一致すれば
  自分のエコー** → `doPaste()` (内部パス、`_pasteCount` カスケード維持)。
  異なる JSON (別インスタンス/別バージョン) → `importBoardText`
- OS クリップボードに使える内容がないとき (`text/plain` なし、または空白のみ) は
  `doPaste()` へフォールバック — 内部 clipboard のみ残る局面 (例: 外部コピー失敗) も
  キーボードで動作する

⌘⇧V (`doPasteInPlace`) は従来通り `_pd` + 内部パス。

## 影響

- ⌘C → 他タブ ⌘V、Board → エディタ (JSON テキスト) が動作
- 外部からの ⌘V ペーストが初めてキーボードで到達可能に
- test.mjs 2075 全緑 (ピン 1 件追加: copy/cut リスナ + setData + echo 判定 +
  旧 `meta&&k==='v'` 抑止の不存在を担保)
- ファイルサイズ +約 700B (net) — 許容内 (raw 521.5KB < 524288)
