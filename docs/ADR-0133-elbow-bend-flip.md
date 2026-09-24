# ADR-0133: elbow `s.bend` のフリップ鏡像化 (バグ修正)

## 状態

実装済み (v1.7.190)。

## 背景

`flipShape` は x1/x2/way/rotate を鏡像化するが、elbow の trunk
座標 `s.bend` (ワールド座標) を残していた — フリップした elbow の
trunk がボードの反対側ではなくミラー前の位置に残り、経路が
元の場所を横断する見た目バグ (ADR-0132 の cbend 対応で発見)。

## 決定

- `flipShape` で `_elbowTrunk` をミラー**前**に計算し、trunk の
  走行軸 (vertical→x / horizontal→y) とフリップ軸が一致するとき
  `s.bend=m(s.bend)`。trunk の向きはミラーで不変なので元の向きで
  判定してよい。

## 断念した代替案

- **pts の再生成**: `_elbowPts` は終端 stub を終端辺法線から組む —
  bend だけ鏡像すれば幾何は自動的に合う (stub は a/b バインドと
  端点に追従)。

## 影響

- 曲線 `s.cbend` は符号のみ (ADR-0132 で対応済) — 両者とも
  style/align op で undo・同期済み。
