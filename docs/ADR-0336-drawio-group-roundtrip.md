# ADR-0336: .drawio グループ往復 (Board groupId ↔ mxCell parent)

## 状態
承認 — round66

## 背景
Board の `s.groupId` (⌘G グループ) が drawio export で `parent="1"`
に平坦化され、import 側も `parent` を座標解決 (ADR-0240) にのみ
使いグループ復元していなかった — 往復でグループが消える。

## 決定
- **Emit**: `s.groupId` ごとに `style="group;"` のラッパー vertex
  `id="g_<gid>"` を生成 (ジオメトリ = メンバー union bbox)。メンバー
  cell は `parent="g_<gid>"` + グループ原点相対の x/y (drawio の
  本来の表現)。コネクタは `relative=1` ジオメトリのため parent="1"
  のまま (受忍ギャップ)。
- **Import**: `style` に `group;` を持つ cell を `_grpIds` に収集し
  vertex/edge ループでスキップ + `parent` がそれを指す形状に
  `s.groupId=<pid>` を付与。座標は既存 `off()` チェーンで解決済み。

## 断念した代替案
- groupId を style 属性に逃がす方式 — drawio 本来のグループ表現と
  乖離し draw.io 上でグループとして操作できない。
- コネクタの parent 化 — edge geometry は relative で子相対座標系が
  異なり、変換複雑に見合わない。

## 影響
index.html ~+1.1KB (523,710B)。テスト +1 (wrapper/相対座標 assert)。
往復でグループ構成が保存される。
