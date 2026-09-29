# ADR-0675: タブ strip の sig キャッシュ再構築 + aria-current

## Status
Accepted — round425

## Context
ADR-0673 の chip は `_pgBar` が毎回全ボタンを再生成 — ページ op (remote rename/switch/add) のたびにフォーカスが破棄され、キーボード/SR ユーザが chip に居ると強制リセット。無関係のページ名変更でも chip が全再生成されていた。

## Decision
ページ集合のシグネチャ (`id+' '+name` 連結) `_pgSig` で**集合が変わった時のみ** chip を再構築、`.on`/`aria-current` は chip を再利用したまま classList.toggle で更新:

- リモートの pageName/pageAdd が別ページを触ってもフォーカス存続
- `aria-current="page"` をアクティブ chip に付与 (APG tabs 規約)
- chip は `c._pgid` を保持 (クロージャではなく live 参照で rename 判定)

## Tests
ピン: `_pgSig` + `aria-current` の存在
