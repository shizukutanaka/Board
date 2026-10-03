# ADR-1028 — saveBackup の失敗を save() と同じく可視化する

## 状態
実装済み (v1.8.054)

## 監査軸: Persist トランザクション・ライフサイクル

IndexedDB 層の save/saveBackup/checkBackup/discardBackup/restoreBackup を、
失敗時の可視性・tx 健全性・dirty フラグ整合の3面で走査した。

### 健全と確認した面

| 面 | 根拠 |
|---|---|
| `save()` の tx 寿命 | 各 `await reqDone(rq)` の継続内で次リクエストを**同期発行** → イベントループに制御が戻る前に新リクエストが並ぶため auto-commit しない |
| tx 順序 | 同一接続・同一スコープの `_RW` tx は**作成順に直列化** → 後から作られた tx は必ず先行 tx コミット済みの世界を読む (画像 GC と `:prev` の読み書きが交差しない) |
| dirty フラグ | `_md(!1)` は `txDone` 成功**後**のみ — 失敗時 dirty が残り、次の `_ps()` デバウンス/`flushIfHidden`/`beforeunload` で再試行される |
| `flushIfHidden` | `_cT(_saveT)` で保留分を畳んで直行 `save()` — 同一接続なので直列化、重複書込は発生しない |
| `versionchange`/`!db` | `db` 喪失で save() は `noStore` 1回警告 (ADR-1005)、blocked-open は in-memory 継続 (ADR-0884) |
| 画像 GC × バックアップ | GC の `live` 集合は「現スリム + `:prev` 参照」— backup tx は必ず後続 save tx より先にコミットされるため、入れ替え直前のバックアップが参照する blob が GC で孤児化しない |

### 発見した実害 — `saveBackup` の silent catch

```js
// 旧: }catch(_){}
// 新:
}catch(err){_e(this._saveErrMsg(err))}
```

- `saveBackup` は clear×2・importBoard・share-import の4サイトから **fire-and-forget** で呼ばれる
- 内部の `try{}catch{}` が quota 超過・tx abort・TransactionInactiveError を**握り潰す**
- 失敗しても破壊的スワップは実行済み → `:prev` に復元盤面がなく、起動時の復元プロンプトも出ない
- `save()` は `_saveErrMsg` で err toast を出す (v1.6.77) のに対し、
  「これから消す盤面の退避先」だけが沈黙失敗だった — **一番失われてはいけない書込が一番静かに失敗していた**

修正は `save()` と同一の `_saveErrMsg` 経路へ統一しただけ — 新しい分岐や toast キーは増やさない
(quota ならエクスポート誘導、一般失敗なら `saveFailed: msg` と既存の文言でそのまま可視化される)。

### restoreBackup は既に可視化済み

`catch(_){_eT('backupRestoreFailed');return false}` — ユーザー起点の復元失敗は従来通り
err toast + false 返却。このラウンドでは非対称として文書化するに留める。

### 受容した残差 (仕様として文書化)

- `checkBackup` の catch→false: 起動プローブで「読めない」を「無い」と誤判定し得るが、
  IDB が壊れている状況では `load()`/`noStore` が既に警告するため二重通知にしない
- `discardBackup` の catch→無視: 消し残しは次回起動で復元プロンプトが1回出るだけの cosmetic
- `save()` の失敗は toast のみで自動リトライなし: dirty 維持のため次の変更/flush で
  再試行される設計 — 変更不能な永続エラー (quota) は通知してユーザーに委ねる方針

### ピン (test.mjs)

1. `}catch(err){_e(this._saveErrMsg(err))}` — saveBackup が save() と同一の失敗通知経路を持つ
2. `_eT('backupRestoreFailed');return false` — restoreBackup の失敗も可視化されている (parity)
3. `Persist.db={transaction(){throw}}` スタブで `saveBackup()` を実行 → `UI.toast` が kind `err` を1回受ける
4. 同実行が1呼出しにつき1回だけ toast を出す (嵐にならない)
