# ADR-1071 — ドキュメント切替の `_rs` スワップで live ジェスチャをキャンセル

## 状態

採用 — v1.8.094 で実装済み (round820)。挙動テスト + ソースピンで固定。

## 背景

`_rs` (ADR-0493) は図形配列の wholesale 置換ポイント — `_applySnapshot`
(8482)、`importBoard` (7654)、`importFromHash` (8756)、`loadDoc` (8898)、
`restoreBackup` (8967) の全 doc-switch 経路が通る。監査の発見: `_rs` は
`_eraseBatch` と `state.measure` をクリアするが **live ポインタジェスチャを
キャンセルしない**。比較対象の遷移は全てキャンセルする: `switchPage`
(2151)、`_pgAdopt` のページ変更 (2149)、undo/redo (1628/1646/5906)、
プレゼン突入 (4598)、エディタ open (6003)、visibilitychange/pagehide。

実害: mid-drag の `dragStartShapes`/`orig` は旧 doc のオブジェクトを参照する。
`_rs` は `_attachShape` クローンで新オブジェクトに置き換えるため、ジェスチャの
arm-time orig は detached オブジェクトへ書き込まれ、pointerup の commit が
`byId` で解決した **新しい同 id オブジェクト** に旧ドラッジオメトリを書き込む
か、消えた id に対する op を broadcast する → ローカル/ピアの静黙な発散。

## 設計 — なぜ `_rs` の先頭か

`_cancelPointerGesture` → `_gRst()` は gesture の orig を **旧 doc の
オブジェクトへ** restore する。cancel が swap より後だと `byId(id)` が新しい
同 id クローンを返し、restore が受信側が権威を持つ値を上書きする。よって
cancel は `_rs` 先頭 (swap 前) で実行する必要がある。

`if(ptr.down)_cancelPointerGesture();` の1行で `_rs` の全呼出し経路
(doc-switch 5面 + スナップショット採用) を網羅する。

## 意図的な非対称: remote 'replace' はジェスチャを維持する

ワイヤー経由の `case 'replace'` は同じ wholesale スワップに見えるが、
**cancel を加えない**。理由は ADR-0926/0984 の存続者設計: remote 'replace' は
keep-survivor (born clock が swap より新しい図形) を**同一 live オブジェクト**
として保持する — そのジェスチャは意味を持ち続ける (mid-gesture remote
書き込みの存続ドメイン, 0969/0971)。swap される id は `ptr.reborn` マークで
後続の `_gRst` restore から除外される (0984)。remote 'replace' ごとに
ジェスチャを殺すと、ノイズの多いピアが他者のドラッグを妨害できてしまう。

対して `_rs` 経路は survivor 保存の概念を持たない全置換 — 全オブジェクトが
クローンに差し替わるため、旧 doc に arm されたジェスチャには続行可能な意味が
ない。`_applySnapshot` も同様: join 時の再ベースラインであり、ジェスチャが
存在しないのが典型で、あっても置換前の doc に帰属する。

| 経路 | オブジェクト存続 | ジェスチャ |
|------|------------------|-----------|
| `_rs` (doc-switch/snapshot) | 全置換 (clone) | キャンセル (0664 class) |
| remote 'replace' | keep survivor は live 維持 | 維持 (0984 reborn) |
| remote 'del'/'clear' | survivor 維持 | 維持 (0964) |

## 検証

- `_applySnapshot` 中に `ptr.down`+`dragKind='move'` を arm → apply 後
  `ptr.down===false` (実動作)。
- remote 'replace' 同条件 → `ptr.down===true` (0984 設計の明示ピン)。
- ソースピン: `_rs` が `_eraseBatch=[]` の前に `_cancelPointerGesture()` を
  含むこと。
