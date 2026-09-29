# ADR-0773 — スナップショット union-heal はページの順序も採用する

## Status
Accepted (v1.7.799)

## Context
`pageAdd` は `op.i` で挿入位置を共有する (ADR-0704) が、**同一インデックスへの
同時挿入**は到着順に依存する:

```js
// 両ピアが [p1,p2] の同時刻に i=1 で追加
A: [p1,pA,p2] + recv pB@i=1 → [p1,pB,pA,p2]
B: [p1,pB,p2] + recv pA@i=1 → [p1,pA,pB,p2]   // 逆順 — 恒久発散
```

集合は収束するが**順序は収束しない**。ページに並べ替え op は存在せず、
union-heal (0698) も「欠落ページの追加 + 同名 LWW」だけで順序を直さなかった
ため、タブ順は永遠にピア間で異なり続けた。

## Decision
union-heal がスナップショットの **配列順を権威**として採用する:

```js
const lm=_mP(state.pages.map(p=>[p.id,p])),np=[];
for(const p of v){const l=lm.get(p.id);lm.delete(p.id);
  if(l&&clockNewer(...nts...))   // name LWW は従来どおり
  if(_ln(np)<64)_pu(np,l||clone(p))}
for(const p of lm.values())if(_ln(np)<64)_pu(np,p);   // ローカル専有は末尾へ
state.pages=np;
```

全ピアが最終的に最新スナップショットの順序へ一致 → **eventual convergence**。
ローカル専有ページ (スナップショット生成後の並行追加) は末尾に揃う —
全ピアで同じ結果。同一指標への同時挿入そのものの順序仲裁 (追加時クロック等)
は行わない — 構造メタを増やすほどの実害ではなく、heal が吸収する。

## Consequences
- タブ順の恒久発散が解消 — 次の sync で全ピアが同一順序へ。
- ローカル専有ページは heal 時に末尾へ移動 (収束と引き換えのコスト、64 cap
  超過時に落ちるのは従来の missing-add cap と同一セマンティクス)。
- curPg 保持・name LWW・64 上限は従来どおり。
