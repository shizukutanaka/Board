# ADR-1107 — OS メニュー経路のコピー/カットをイベント駆動で自己キャプチャ

- 日付: 2026-10-01
- ステータス: 実装済 (v1.8.131)

## コンテキスト

OS クリップボードブリッジ `_osCopy` (ADR-0516) は `copy`/`cut` イベントを window で購読し、
選択を `.board` JSON として `e.clipboardData` へ書き込む。実装は `_cpNow` フラグをゲートとし、
「イベント発火の直前に `doCopy()` が実行済みで `state.clipboard` が新鮮」を前提にしていた。

その前提が成り立つ経路はキー経路のみ: ⌘C/⌘X の keydown が `doCopy()` (`_cpNow=true`) →
ブラウザが直後に対応イベントを発火 → `_osCopy` が書き込んでフラグを消費。

## 問題

1. **OS メニュー経路 (Edit→Copy/Cut) が完全に dead**: メニュー選択は keydown を経由しないため
   `_cpNow` が常に false で `if(!_cpNow)return` に到達 — `state.clipboard` も
   `e.clipboardData` も書かれず、Copy が何もコピーしない。
2. **Cut が削除しない**: `_osCopy` は `e.type==='cut'` を一切見ていなかった。OS メニューの
   Cut は copy 相当の書き込み (それすら dead) のみで盤面の図形を消さなかった。
3. **`_cpNow` の stale リーク**: ctx メニューの 'ctxCopy' は `doCopy()` のみを呼ぶ
   (イベントを伴わない) ため `_cpNow` がイベント未消費で残り、次の OS ジェスチャーが
   古いクリップボードを書き込む乖離窓になっていた。

## 決定

`_osCopy` をイベント駆動の capture+write+delete へ変更:

```js
function _osCopy(e){
  if(e.target.matches&&e.target.matches('input,textarea'))return;
  const cut=e.type==='cut';
  if(!_cpNow)doCopy();   // OS-menu copy/cut captures the selection itself
  if(!_cpNow)return;
  _cpNow=false;
  const cl=_cl();if(!cl)return;
  _pd(e);
  e.clipboardData.setData('text/plain',_osClip=_JS({...}));
  if(cut)doDelete();
}
```

- OS メニュー Copy: `!_cpNow` → `doCopy()` が選択を自己キャプチャ (内部クリップボード+
  `copied N` toast も従来挙動へ揃う) → `.board` JSON を clipboardData へ書き込み。
- OS メニュー Cut: 同じキャプチャ→書き込みの後、`doDelete()` が ro/locked ゲート込みで
  削除する — ⌘X parity。
- キー経路 (⌘C/⌘X) は `_cpNow` が既に true なので再キャプチャをスキップし、書き込みのみ
  (cut は `doDelete()` を走らせるが既に選択空で no-op)。
- `ctxCopy` メニュー項目は `doCopy();_cpNow=false` — イベントを持たない経路がフラグを
  残さないようにし、次の OS ジェスチャーが必ず新鮮に再キャプチャする。

## 結果

- Edit→Copy / Edit→Cut が機能するようになり、Cut は削除する。
- ro (閲覧のみ) でも Copy/Cut のコピー側は動作 (read-only で正しい) し、Cut の削除側は
  `doDelete` 内部の `readOnlyMode` ゲートで拒否される。
- input/textarea フォーカス時は従来通り native テキスト操作 (早期 return)。
- `_osClip` エコー (`_textCascade` → `doPaste`) の往復は不変。
- test.mjs 7 挙動ピン: OS-menu copy/cut のキャプチャ・`.board` JSON 書き込み・cut の削除・
  input ターゲット早期 return・ro 下の copy 成功/delete ゲートを `fakeWin._L` 経由で
  実イベント dispatch して固定。
