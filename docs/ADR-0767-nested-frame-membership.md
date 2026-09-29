# ADR-0767: 入れ子フレームの member 化

## 状態
Accepted (v1.7.793)

## 文脈
フレーム内包規則 (`withFrameChildren` / `_frameOf` / excalidraw `frameId` emit) は
member 判定で `_frm(s)` を除外していた。「フレームは member にならない」という
暗黙前提だったが、Board ではフレームをフレームの中に描ける。結果として:

- 外枠 A を move/nudge → 内枠 B の中身だけ動き、B 自身が取り残される (detach)
- 外枠を delete/duplicate → B の中身だけ消えて空の B が残る
- `.excalidraw` エクスポートで B の `frameId` が出ない (unframed として重畳)

## 決定
member 判定から `_frm(s)` 除外を除去し、**幾何内包 = member** に統一
(fitFrames は既にフレームを内包数に含めていたので parity)。

- `withFrameChildren` — Set add のため冪等、除外解除のみ
- `_frameOf` — outer-keyed が必要: A,B 両方選択時に B の子が B キーだと
  doAlign の unitMap で別ユニットになり align が detach を起こす。
  選択内の他フレームに完全内包されるフレームは自身の scan を skip し、
  外側 scan が全 member (B 自身 + B の子) を outer-keyed で claim する。
  等 bbox の同位内包は sel 順で早い方が勝つ (完全対称なため決定論的)
- excalidraw emit — `frameId` も emit (ネストした frame も member)

併せて `_inR` 内包判定 helper を抽出し 4 サイトの畳み込み (~165B)。

## 影響
- 移動/削除/複製/align/flip/rotate/select-frame-contents で入れ子フレームが
  外枠に従う (Figma/tldraw のネストセマンティクスと同型)
- locked の内枠は `_lk` skip で既存 parity を維持
