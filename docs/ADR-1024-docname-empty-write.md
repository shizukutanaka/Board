# ADR-1024 — docName empty-write convergence

## 実害

docName 入力欄でユーザーが全選択→削除すると:

1. `input` イベント毎に `_commitDocName` が走り、最終的に `{name:''}` が
   `ts=T` で broadcast → 全ピアが `docName=''` を採用・永続化。
2. ローカルの `change` ハンドラは `_setDocName(''||_UT)` で `'Untitled'` に
   正規化するが `_bName()` も `_nameTs` 刻印もしない — **改名が wire に出ない**。
3. 結果: ローカル `docName='Untitled'`、ピア `docName=''`、両者の LWW
   マーカーは同一 `(T, us)` → `clockNewer` が等号で false →
   **相互のスナップショット heal を両側が棄却し、次の改名まで永久に一方発散**
   (ローカルは Untitled 表示、ピアは空タイトル/空入力欄)。

## 修正

`_setDocName` の単一書込サイトで正規化: `state.docName=n||_UT` (+6B)。

- 局所 commit (`input`/`compositionend`/`change`) — `''` が state に
  到達しないため `_bName` が `state.docName` を読んでも `''` は出ない。
- wire intake (`name` / snapshot `name`) — `''` を受信しても `_UT` 表示へ
  正規化しつつ採用時計は記録 (古い改名は以後も負ける)。
- 全 importer / share-link / IDB load — 同じ漏斗を通る。
- `change` ハンドラの `||_UT` は冗長化したため除去 (相殺 +0B)。

## 契約

**`''` は docName の正当な状態ではない** — 空入力は常に `_UT` として
正規化され、wire 上も `_UT` として収束する。新たな docName 書込経路は
必ず `_setDocName` を通すこと。

テスト: `Net._onRecv` 実経路で `name:''` → `_UT` 正規化 + 採用時計保持
(より古い改名が負ける) + `_setDocName('')` → `_UT` + 非空 pass-through +
ソースピン2件 (test.mjs)。
