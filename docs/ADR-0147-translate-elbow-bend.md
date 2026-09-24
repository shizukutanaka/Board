# ADR-0147: 移動時のエルボー trunk 追従 (バグ修正)

## 状態

実装済み (v1.7.204)。

## 背景

ADR-0146 と同種: `Shape.translate` が `s.bend` (trunk の
ワールド座標) を動かさなかったため、elbow コネクタを
ドラッグ/ナッジ/整列/Tidy/複製で移すと trunk だけが旧位置に
残った。

## 決定

- `Shape.translate` の line/arrow 分岐で、変異前に
  `_elbowTrunk` で trunk 方向を評価し、平行移動で不変なので
  対象座標に dx/dy を加算 (縦 trunk → x、横 trunk → y)。
- translate を通る全経路 (doMove/nudge/align/tidy/gsnap/
  smartDuplicate/Alt-drag 複製) が自動的に修正される。

## 断念した代替案

- **呼出側で個別対応**: translate が唯一の移動プリミティブ —
  そこで直すのが局所かつ網羅的。

## 影響

- bend 未設定 (自動中央) の elbow や他型には無影響。
- 結合先図形の移動によるコネクタ追従は connEnds 経由で別系 —
  従来どおり trunk がその場に残る挙動 (draw.io 準拠)。
