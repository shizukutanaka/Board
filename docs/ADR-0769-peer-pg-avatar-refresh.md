# ADR-0769: ピアのページ移動でアバターツールチップを再描画

## 状態
採用 — 実装済

## 背景

ADR-0656/0670 でピアアバターは「どのページにいるか」を示す `· ページ名`
ツールチップとクリック追従を持つ — 別ページのピアカーソルを描かない設計
(ADR-0647) の下では**唯一の存在シグナル**。

しかし `UI.refreshPeers()` は join/leave (`_onConnChange`) とページセット
変化 (`_pgBar`, ADR-0686) でしか呼ばれなかった。ピアの `p.pg` は
cursor/selection presence メッセージで更新されるため、**ピアがページを
移動してもツールチップと追従 affordance が次の join/leave まで古いまま**
だった。

## 決定

`'cursor'` / `'selection'` ハンドラで `p.pg` が実際に変化した時だけ
`UI.refreshPeers()` を呼ぶ。変化なしでは DOM を再構築しない
(60ms ごとの presence tick で無駄な再構築を避ける)。

## 影響

- ピアのページ移動が ~presence tick 以内にアバターへ反映
- ページ追従の affordance (pointer カーソル) も即時更新
- cursor/selection 両経路に同型ガード — presence の `pg` 更新サイトはこの2箇所のみ
