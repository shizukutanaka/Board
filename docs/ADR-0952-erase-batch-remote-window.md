# ADR-0952 — erase ジェスチャ窓のリモート op 収束 (byId batch フォールバック + 墓標ゲート)

- Status: accepted
- Date: 2026-10-01
- Related: ADR-0009 (id index), ADR-0547/0712 (locked parity), ADR-0922 (tomb gate on restore), ADR-0951 (lblpos cancel-restore)

## Context

消しゴムジェスチャ (`_eraseBatch` ライフサイクル) は「消す対象を先にシーンリストから外し、
ドラッグ確定時に一括 `del` commit する」設計:

- `eraseAt(wp)` — `pickTop` → `_sh()` から `_idIdx` splice → `clone(s)` を `_eraseBatch` へ push
- `flushErase()` — バッチを戻しつつ `computeConnClears` → `{op:'del',shapes:batch}` commit
- cancel (blur/hidden/⌘Z/第2ポインタ) — `_cancelPointerGesture`/`abortGesture` がバッチを `_sh()` へ無条件 push-back

ジェスチャ中は図形が `_sh()` (=`state.shapes`) に居ない時間窓がある。この窓に届いた
リモート op の扱いが 2 系統で欠陥を持っていた:

### 実害 1 — リモート del の墓標を無視した復活 (ghost divergence)

リモート `del` forward-apply (applyRemote 'del') は byId 不在でも `_wc()[id]={_del:clock}`
の墓標を刻印する (ADR-0734)。一方 cancel-restore は墓標を見ずにバッチを全 push-back:

- peer: del forward → 図形は削除済 + 墓標 D
- ローカル: cancel → 墓標 D を知らず図形を復活

→ 片側だけ図形が居る = union-heal snapshot でも「ローカル側だけ余分な図形」を永続的に保持する
一方向発散 (snapshot merge は union 取りで remove しない)。ADR-0922 が backward-apply
復元に導入した `_tmb` 墓標ゲートの未適用経路。

### 実害 2 — リモート prop patch の無刻印 drop (stale clone 復元)

`upd`/`style`/`move`/`resize`/`align`/`beautify` 等の prop 系 op は、対象 id が `byId` で
解決しないと apply 本体で早期 break、`after` キーの wclock も未刻印 (`_stampWrites` は
_apply 後に残ったキーのみ刻む) — 完全に消える。

- ローカル: 窓内に届いた `stroke` 変更を喪失 → cancel が窓前 clone をそのまま復元 → 古い値で再着地

byId の口が「シーン外の id = 存在しない」と扱うため、生存期間中の窓に誤判定していた。

## Decision

### byId に `_eraseBatch` フォールバック

```js
return _idIndex.get(id)||_eraseBatch.find(s=>s.id===id);   // バッチ中の id はアドレス可能 — リモート書込は復元対象の clone に着地
```

- prop patch: 窓内に届くと batch clone 自体へ `_oa` 適用 → cancel 復元が「最新値を持つ clone」を push → ピアと一致
- remote del: `byId(sh.id)?.locked` が clone を解決 → `_idIdx` は `_sh()` 走査のため -1 → splice なしで墓標のみ刻印 (従来通り正しい)
- `wclock` 刻印も正常化 (パッチキーがドロップでなく着地する)

### 両 cancel-restore サイトに `_tmb` ゲート

```js
for(const s of _eraseBatch)if(!_tmb(s.id,{}))_sh().push(s);
```

`_tmb(id,{})` は「`{}` clock より新しい `_del` 墓標があり、新しい `_born` で上書きされない」判定。
墓標済みメンバーは復元しない → リモート del と収束。ADR-0922 backward-apply と同規則。

### 旧契約ピンの更新 (v1.7.58e / ADR-0009)

「eraseAt 直後に `byId(es.id)` が `undefined`」を検証していたピンを、新旧約を表現し直す
検証に更新: 「`_sh()` (=state.shapes) から外れている」+「`byId` が batch clone を解決する」。
これはテスト改ざんではなく、本 ADR が変更する契約そのものの再表明 (before: byId が
シーン外を解決しない → after: シーン外でも batch clone を解決する)。

## 残余 (edge-of-edge, 文書化・未対応)

backward-apply の `!byId&&!_tmb` 復元ゲート (del/pageDel/replace backward) は、batch clone
が「存在する」と判定して `_bT` を刻まず復元を skip する — この間に第三者 del が差し込むと
born 時計が古いまま残る一方向発散の窓がある。ただし発生には「del undo 適用と同一 id の
erase 窓 + 第三者 del の3重競合」が要り、cancel/flush が窓を閉じるため実害時間はジェスチャ
長に限定される。対応は `_bT` 刻印の batch 対応を別途検討。

## Consequences

- 消しゴム + リモート編集の同時利用で発生し得た発散 (ghost 復活・stale clone 復元) を閉塞
- `byId` の意味が「id でシーン or 消去バッチに居るオブジェクト」へ拡張 — 全読者に影響。
  危険面 (選択ハロー・hit-test がバッチ中図形を拾う) は `_sh()` 列挙ベースの経路では発生しない;
  byId 単発解決の消費者は「batch clone は live 図形」を扱うようになった。
- 4 ピン追加 (batch splice 検証・remote del 墓標で cancel 非復活・patch が clone へ着地・ジェスチャ終端一致) — v1.7.58e ピンも新契約へ更新
