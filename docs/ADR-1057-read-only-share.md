# ADR-1057: 閲覧のみ共有リンク (read-only share links)

## 状態
実装済 (v1.8.080)

## 背景
ADR-1048 (50/50 監査) の P3-a: 「ビュー専用の共有リンクがない」— 現状の共有リンク
(`#b=` / `e:` 暗号化) は受け手に完全な編集権を与える。手元の資料を「見せるだけ」
で共有したい場合、リンクを受け取った側の誤操作 (選択ドラッグ・Delete・ペン)
がそのまま盤面を改変し、送り手の次回読み込みに残る。

## 決定
`ro` (read-only) を共有ペイロード内部のフラグとして実装した:

- **送出**: `exportToUrl(enc,ro)` が `data.ro=1` をペイロードに付けてから
  暗号化/エンコードする。`e:` (AES-GCM) と平文 `z:`/`b:` の両経路で動く。
  Share モーダルに `👁 閲覧のみリンク` チェックボックス (`#shareRo`) を追加。
- **取込**: `importFromHash` が `state.ro=data.ro===1` を `_repC` の**後**に
  セットする (インポート自身の replace コミットがゲートに引っかからないよう)。
  `ro` は IDB doc レコード (`ro:1|0`) に永続化 — リロード後も閲覧のみを維持。
- **ゲート**: `state.ro` はローカル変異漏斗と入力経路を塞ぐ —
  `Store.commit` / `_recordCommitted` / `undo` / `redo` / `_repC`、
  `pickTool` (select/hand のみ通す)、pointerdown の変換系 dragKind・
  quick-connect・Alt 複製アーム、text/label editor オープン、docName input。
  すべて `_roNo()` → `readOnlyMode` トーストで理由を通知。
- **解除**: ヘッダーの `🔒 閲覧のみ` バッジ (`#roBadge`) を1クリックで解除
  (`state.ro=false` + `_ps()`)。バッジは `state.ro` が真の時だけ表示。

## 残るもの (意図的に生かす)
- 選択・マーキー・ラッソ・パン・ズーム・検索・エクスポート・ページ遷移。
- **リモート op は適用される** — これはコンセンサスではなくローカル入力の
  UX ゲート。同じルームで共同編集者がいるなら、その編集は閲覧モードでも
  リアルタイム表示される (むしろ「見せるだけ」用途に適合)。
- 非 ro リンクの取込は `state.ro=false` に戻す (ローカルで明示解除と同義)。

## 境界 (本 ADR が扱わないもの)
- `ro` は**認可ではない**: wire op の受信適用・IDB 直接書き換え・DevTools での
  `state.ro=false` は防げない。真の「閲覧専用参加者」には op を出せない参加者種別
  (wire 署名の role claim 等) が要る — ADR-1056 の HMAC 鍵の延長で将来検討。
- ローカル `commit` 経路以外の変異 (例: `state.shapes.push` 直書き) は漏斗外 —
  実在経路は全て `commit`/`_recordCommitted`/`_repC` 経由であることを
  監査済 (ADR-1019/0963) のため UX ゲートとしては網羅的。

## 実装
- DOM: `#roBadge` (ヘッダー、btnShare と btnExport の間)、`#shareRo`
  (Share モーダルの shareEnc の下)。
- i18n: `shareRoLabel`/`roBadge`/`roUnlock`/`readOnlyMode`/`roUnlocked` (ja+en)。
- ヘルパ: `_roNo()` (トースト)、`_roBadge()` (hidden 同期)。
- ゲート挿入点: `Store.commit` :1465, `_recordCommitted` :1606, `undo`,
  `redo`, `_repC` :805, `pickTool` :6019, pointerdown select-case :4077,
  `pickOrMarquee` :5057, `_openLabelEditorFor`, `beginText`,
  `openTextEditor`, `_commitDocName`/`_CH` handler :9389,
  `importFromHash` :8683, `exportToUrl` :8576, `UI.openShare` :9254,
  `Persist.save`/`load`, `wire()` :9519。

## テスト
14 behavioural asserts (漏斗 drop・history 非記録・tool pick 拒否・hand 通過・
undo/redo ブロック・実 `z:` インポートで `state.ro`・バッジ表示/解除 —
バッジは新規ワールドで検証: 共有 fakeDoc stub は最後に構築された
ワールドの `wire()` が onclick を所有する) +
13 source pins (emit・DOM・persist・import・editor/docName/tool/pointerdown
ゲート・i18n・`_repC` ガード)。
