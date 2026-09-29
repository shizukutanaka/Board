# ADR-0703 — remote pageDel の <2 ガードをローカル限定に (ページ集合の発散修正)

## 状態
採用 (v1.7.729)

## 文脈
`pageDel` の forward 適用は `state.pages.length<2` で全 del を拒否していた。
これはローカル UI ガード (最終ページを消させない) として正しいが、
**remote op にも効いていた**: 受信側が送信側の未見の並行 del を先に適用して
1ページだけ残った状態では、送信側の del を棄却 → 以後の union-heal でも
ページは減らないため**ページ集合が永続発散**する。

## 変更
- forward ゲートを `(!op.clock||op.clock.peer===_pi())` のローカル限定に。
  remote del は最終ページでも適用し、空になったら `state.pages=null` +
  `_pgHealS()` でページモード終了 (backward 経路と同じ整合)
- 空集合化時はメンバー wclock パージ + メンバー図形除去 + `curPg=null` を
  `_pgDel2` に準じて実行 (従来 `find(...).id` で undefined クラッシュする
  経路でもあった)
- `firstId` を `find` の null 安全化 (最終ページ del で undefined.id 例外)

## 検証
- remote 最終ページ del で pages=null / curPg=null / メンバー除去
- local commit は従来どおり拒否
