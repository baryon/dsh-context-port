// Adapted from dsh-context 0.74.0 makeContextView: keep the composition/card + donut
// presentation, replace projection/Slots/ViewKit and omit unsupported text/editing surfaces.
import { useState } from 'react';
import type { DiagnosticView } from './diagnostics.ts';
import { Donut } from './vendor/components/donut';
import { makeCurrentComposition } from './vendor/components/currentComposition';
import { makeStackedBar, makeLegend } from './vendor/components/stackedBar';
import { fmt, cacheHitPercent } from './vendor/format';
import type { ViewKit } from './vendor/viewkit';

const labels: Record<string, string> = { instructions: '系统说明', tools: '工具定义', skills: '技能（包含在系统说明中）', template: '模板（包含在系统说明中）', user: '用户消息', assistant: '助手消息', toolResult: '工具结果', reasoning: '推理内容', nativeContext: '服务商内部上下文' };
const words: Record<string, string> = { 'overview.title': '最近一次请求的上下文', 'overview.estimate': '已知部分估算', 'overview.used': '已使用', 'overview.free': '剩余空间', 'overview.ofUsed': '占已知估算', 'overview.ofWindow': '占上下文窗口' };
const colors = ['#6366f1', '#d97706', '#16a34a', '#2563eb', '#0d9488'];
const categories = ['instructions', 'tools', 'user', 'assistant', 'toolResult'];
const kit: ViewKit = { t: (key) => words[key] ?? key, fmt, catLabel: (key) => labels[key] ?? key };
const CurrentComposition = makeCurrentComposition(kit, makeStackedBar(kit), makeLegend(kit));

export function ContextView({ data, status, refresh }: { data: DiagnosticView | null; status: 'loading' | 'ready' | 'failed'; refresh(): void }) {
  const [hoverCat, setHoverCat] = useState<string | null>(null);
  const latest = data?.requests.at(-1);
  const largest = Math.max(1, ...data?.requests.map((request) => request.estimate ?? 0) ?? []);
  const parts = latest?.sections.filter((part) => categories.includes(part.part) && part.basis === 'estimated' && part.tokens !== null)
    .map((part) => ({ key: part.part, value: part.tokens ?? 0, color: colors[categories.indexOf(part.part)] })) ?? [];
  const hit = data?.cacheRead !== null && data?.input !== null && data ? cacheHitPercent(data.cacheRead, data.input) : null;
  return <main>
    <header><div><h1>上下文</h1><p>dsh-context · Otoha 移植版</p></div><button onClick={refresh} disabled={status === 'loading'}>刷新</button></header>
    <p className="note">当前对话的只读统计。最近 64 条事件保留在本次内核运行中，重启前的数据不回填。</p>
    {status === 'loading' && <p role="status">正在读取统计。首次读取需同意共享当前对话的统计数据。</p>}
    {status === 'failed' && <p role="alert">未能读取统计。连接中断或读取未获同意，可刷新重试。</p>}
    {data && <>
      {!latest ? <section className="lc-card"><h2>尚无请求统计</h2><p>本次内核启动后，此对话还没有记录模型请求。</p></section> : <>
        {data.knownEstimate !== null ? <CurrentComposition head={{ tokens: data.knownEstimate, pct: null, parts }} subtitle={latest.model} hoverKey={hoverCat} onHoverKey={setHoverCat} /> : <section className="lc-card"><h2>最近一次请求的上下文</h2><p>尚未提供可显示的组成估算。</p></section>}
        <p className="note">图中为已知部分的估算，不代表服务商实测或完整上下文。上下文窗口：{fmt(latest.window)}；预留输出：{fmt(latest.reserved)}。</p>
        <section className="lc-card composition"><Donut segments={parts} centerTop={data.knownEstimate === null ? '—' : '≈' + fmt(data.knownEstimate)} centerSub="已知估算" hoverKey={hoverCat} onHoverKey={setHoverCat} /><dl>{latest.sections.map((part) => <div key={part.part}><dt>{labels[part.part] ?? part.part}</dt><dd>{part.basis === 'invisible' ? '服务商内部不可见' : part.tokens === null ? '未提供' : `${part.basis === 'estimated' ? '≈' : ''}${fmt(part.tokens)}`}</dd></div>)}</dl></section>
      </>}
      <section className="lc-card"><h2>服务商报告的累计用量</h2><dl>{[['输入', data.input], ['输出', data.output], ['合计', data.total], ['缓存读取（输入中）', data.cacheRead], ['缓存写入（输入中）', data.cacheWrite]].map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{fmt(typeof value === 'number' ? value : null)}</dd></div>)}<div><dt>缓存命中比例</dt><dd>{hit === null ? '未提供' : `${hit}%`}</dd></div></dl><p className="note">仅统计当前保留范围；缺失值显示「—」。缓存读写已包含在输入中，不重复相加。费用：{data.cost === null ? '未提供完整报价' : `${data.cost.toFixed(4)}（币种未提供）`}。</p></section>
      <section className="lc-card"><h2>请求变化</h2>{data.requests.length ? <div className="trend">{data.requests.map((request) => {
        const known = request.sections.filter((part) => categories.includes(part.part) && part.basis === 'estimated' && part.tokens !== null);
        return <div className="trend-row" key={request.sequence}><span>#{request.sequence}</span><div className="trend-track"><div className="trend-parts" style={{ width: `${(request.estimate ?? 0) / largest * 100}%` }}>{known.map((part) => <span key={part.part} title={`${labels[part.part]} ≈${fmt(part.tokens)}`} style={{ flex: part.tokens ?? 0, background: colors[categories.indexOf(part.part)] }} />)}</div></div><small>{request.estimate === null ? '—' : '≈' + fmt(request.estimate)} · {request.model}</small></div>;
      })}</div> : <p>尚无记录</p>}</section>
      <section className="lc-card"><h2>压缩记录</h2>{data.compactions.length ? data.compactions.map((row, index) => <p key={index}>第 {row.turn} 轮：{fmt(row.before)} → {fmt(row.after)} token；{row.summary === 'none' ? '没有摘要' : row.summary === 'invisible' ? '摘要由服务商内部保留' : '摘要正文未开放'}。</p>) : <p>当前保留范围内没有压缩记录。</p>}</section>
    </>}
    <details className="lc-card"><summary>当前可用范围</summary><p>支持当前对话的请求组成估算、服务商用量、缓存读写和压缩统计。</p><p>余额、凭据、提示词及工具结果原文、附件、跨对话历史、子代理全景、提示词修改暂未开放。</p></details>
  </main>;
}
