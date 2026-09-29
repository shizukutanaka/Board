# ADR-0452: throttle された `_sendSnapshot` の deferred resend

## 状態
実装済 (v1.7.487)

## 背景
`_sendSnapshot` の 1s throttle (DoS 抑止) は超過分を**黙って drop**していた。
joiner は `hello`+`sync-req` を join 時に一度しか送らないため、送信側が
throttle window 中なら**その要求は永久に失われる**。3ピア以上では別ピアが
肩代わり送信するので耐えられるが、2ピアの room で直前に snapshot を送った
直後に join されると、**新規ピアに盤面が一切届かない**飢餓バグだった。

## 決定
throttle 超過時は `return` せず `_snapT` フラグ付きの deferred resend を
1件だけ予約 (`_stO(...,w)`)。window 終端で再入すれば throttle を通過して
実送信される。DoS 抑止の効果は維持 (任意短周期の連打でも 1s あたり最大
+1 回に留まる)。

## 影響
- 2ピア join のスナップショット飢餓を解消。DoS throttle は 1s 周期を維持。
