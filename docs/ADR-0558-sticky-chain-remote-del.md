# ADR-0558: 付箋 ⌘Enter 連鎖の remote-del orphan ガード

## 状態
実装済 (v1.7.586)

## 背景
ADR-0556/0557 の第三の経路。テキスト editor の ⌘Enter は `ta.blur()` の後に
`_stickyChain(s)` を呼ぶ — blur 内の 0556 ガードで editor は畳まれるが、連鎖呼出しは
無条件で残っていた。編集中にピアが付箋を `del` していると、orphan `s` の座標から
**新しい付箋が復活**してしまう (相手が消したはずの場所に空ノートが生える)。

## 決定
`_stickyChain` の入口を `if(s.type!=='sticky'||_lk(s)||!byId(s.id))return` に —
削除済みの発生元からは連鎖しない。`byId` ガードは blur (0556) と chain (この件) の
双方で必要: blur は「確定しない」、chain は「新規を生やさない」と責務が分かれる。

## 影響
- 連鎖の通常挙動は不変。remote-del 直後の ⌘Enter は editor が畳まれて連鎖も発火しない
- 同パターン残件: なし (editor commit 経路の orphan 書込みはこれで網羅)
