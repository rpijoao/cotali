import { AudioBars, AudioIcon, CheckIcon } from './primitives';

const tinyLabel = 'text-[9px] font-bold uppercase tracking-[0.1em]';

export function QuotePreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-[18px] bg-cotali-cloud text-cotali-blue shadow-cotali-card ring-1 ring-cotali-ink/5 ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-center justify-between border-b border-cotali-blue/10 pb-3">
        <span className={`${tinyLabel} text-cotali-blue/55`}>proposta / exemplo</span>
        <span className="rounded-full bg-cotali-blue/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-cotali-blue">revisar</span>
      </div>
      <h3 className={`font-cotali-display font-semibold tracking-[-0.07em] leading-[0.95] ${compact ? 'mt-5 text-[21px]' : 'mt-7 text-[27px]'}`}>Troca de tomadas<br />e luminárias</h3>
      <div className={`mt-6 space-y-2 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        <div className="flex justify-between gap-3 border-t border-cotali-blue/10 pt-2"><span>2 tomadas</span><b>R$ 180,00</b></div>
        <div className="flex justify-between gap-3 border-t border-cotali-blue/10 pt-2"><span>2 luminárias</span><b>R$ 460,00</b></div>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-cotali-blue/15 pt-3">
        <span className={`${tinyLabel} text-cotali-blue/55`}>total</span>
        <strong className="font-cotali-display text-[24px] font-semibold tracking-[-0.07em]">R$ 640,00</strong>
      </div>
      <div className="mt-5 flex items-center gap-2 border-t border-cotali-blue/10 pt-3 text-[9px] font-bold uppercase tracking-[0.08em] text-cotali-blue/60"><span className="size-1.5 rounded-full bg-cotali-blue" /> confira o prazo antes de enviar</div>
    </div>
  );
}

export function VoiceCapture({ compact = false, animated = false }: { compact?: boolean; animated?: boolean }) {
  return (
    <div className={`rounded-[18px] border border-cotali-white/15 bg-cotali-ink text-cotali-white shadow-cotali-card ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-center justify-between">
        <span className={`${tinyLabel} text-cotali-white/60`}>sua explicação</span>
        <span className={`${tinyLabel} text-cotali-white/60`}>0:42</span>
      </div>
      <div className="mt-7 flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-cotali-white text-cotali-blue"><AudioIcon /></div>
        <div className="min-w-0 flex-1">
          <strong className="block truncate font-cotali-display text-[17px] font-medium tracking-[-0.05em]">Faço a troca e levo o material...</strong>
          <span className="mt-1 block text-[10px] text-cotali-white/60">toque para ouvir o exemplo</span>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-cotali-white/15 pt-4">
        <AudioBars animated={animated} />
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-cotali-white/60">voz natural</span>
      </div>
    </div>
  );
}

function VoiceCaptureMini() {
  return (
    <div className="mt-6 flex items-center gap-3 rounded-[18px] border border-cotali-white/15 bg-cotali-ink px-3 py-3 text-cotali-white">
      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-cotali-white text-cotali-blue"><AudioIcon /></div>
      <div className="min-w-0 flex-1">
        <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-cotali-white/60">sua explicação</span>
        <strong className="mt-1 block truncate font-cotali-display text-[13px] font-medium tracking-[-0.05em]">0:42 · voz natural</strong>
      </div>
      <span className="text-[11px] text-cotali-white/60" aria-hidden="true">▶</span>
    </div>
  );
}

export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[390px] rotate-[2deg] rounded-[34px] border-[7px] border-cotali-white/25 bg-cotali-cloud p-2 shadow-cotali-phone motion-safe:animate-cotali-float transition-transform duration-500 hover:rotate-0 hover:shadow-cotali-card motion-reduce:animate-none motion-reduce:transition-none">
      <div className="overflow-hidden rounded-[25px] bg-cotali-blue text-cotali-white">
        <div className="flex items-center justify-between px-5 pb-3 pt-4 text-[9px] font-bold uppercase tracking-[0.1em] text-cotali-white/60"><span>09:41</span><span>cotali</span><span>● ●</span></div>
        <div className="border-t border-cotali-white/15 px-5 pb-6 pt-5">
          <span className={`${tinyLabel} text-cotali-white/60`}>novo orçamento</span>
          <h2 className="mt-3 font-cotali-display text-[30px] font-semibold tracking-[-0.08em] leading-[0.95]">Fale o que<br />precisa ser feito.</h2>
          <p className="mt-4 max-w-[245px] text-[11px] leading-[1.45] text-cotali-white/65">Explique o serviço com naturalidade. Depois, confira o que ficou claro.</p>
          <VoiceCaptureMini />
          <div className="mt-3 flex items-center justify-between rounded-[18px] bg-cotali-white px-4 py-3 text-cotali-blue">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em]">ver proposta</span>
            <CheckIcon />
          </div>
        </div>
      </div>
      <span className="absolute -right-8 top-16 rounded-full bg-cotali-white px-3 py-2 text-[9px] font-bold uppercase tracking-[0.08em] text-cotali-blue shadow-lg max-phone:right-2 max-phone:text-[8px]">tela de exemplo</span>
    </div>
  );
}

export function ReviewPreview() {
  return (
    <div className="relative rounded-[22px] bg-cotali-white p-5 text-cotali-blue shadow-cotali-card ring-1 ring-cotali-ink/5">
      <div className="flex items-center justify-between border-b border-cotali-blue/10 pb-4"><span className={`${tinyLabel} text-cotali-blue/55`}>revisão / exemplo</span><span className="rounded-full bg-cotali-blue/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-cotali-blue">2 pendências</span></div>
      <div className="mt-5 space-y-3">
        <div className="rounded-xl border border-cotali-blue/10 p-3"><span className={`${tinyLabel} text-cotali-blue/50`}>cliente</span><p className="mt-2 text-sm font-semibold">Mariana Alves</p></div>
        <div className="rounded-xl border border-cotali-blue/10 p-3"><span className={`${tinyLabel} text-cotali-blue/50`}>serviço identificado</span><p className="mt-2 text-sm font-semibold">Troca de tomadas e luminárias</p></div>
        <div className="rounded-xl border border-cotali-blue/25 bg-cotali-blue/5 p-3"><span className={`${tinyLabel} text-cotali-blue/55`}>falta confirmar</span><p className="mt-2 text-sm font-semibold">Prazo de execução</p></div>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-cotali-blue/10 pt-4"><span className="text-[10px] text-cotali-blue/60">Você decide o que vai para o cliente.</span><div className="grid size-8 place-items-center rounded-full bg-cotali-blue text-cotali-white"><CheckIcon /></div></div>
    </div>
  );
}

export function WhatsappPreview() {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[#075e54]/15 bg-[#eef7f1] text-[#173b36] shadow-cotali-card">
      <div className="flex items-center gap-3 bg-[#075e54] px-5 py-4 text-cotali-white">
        <div className="grid size-9 place-items-center rounded-full bg-cotali-white/20 text-xs font-bold">MA</div>
        <div className="min-w-0"><p className="text-sm font-bold">Mariana Alves</p><span className="text-[10px] text-cotali-white/70">online</span></div>
        <div className="ml-auto flex items-center gap-4 text-lg leading-none text-cotali-white/75" aria-hidden="true"><span>⌕</span><span>⋮</span></div>
      </div>
      <div className="bg-[#edf7f0] px-4 py-5">
        <div className="mx-auto mb-5 w-fit rounded-full bg-cotali-white/75 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#53736a]">hoje</div>
        <div className="max-w-[270px] rounded-2xl rounded-tl-sm bg-cotali-white px-3 py-2.5 text-[11px] leading-[1.45] shadow-sm">Oi! Você consegue me enviar o orçamento do serviço?<span className="mt-1 block text-right text-[9px] text-[#557268]">10:40</span></div>
        <div className="ml-auto mt-3 max-w-[250px] rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2.5 text-[11px] leading-[1.45] shadow-sm">Claro, Mariana. Segue a proposta para o serviço combinado.<span className="mt-1 block text-right text-[9px] text-[#557268]">10:41 ✓✓</span></div>
        <div className="ml-auto mt-3 flex max-w-[270px] items-center gap-3 rounded-xl rounded-tr-sm bg-[#d9fdd3] p-3 shadow-sm"><div className="grid size-9 place-items-center rounded-lg bg-cotali-white/70 text-[10px] font-bold text-[#075e54]">PDF</div><div><p className="text-xs font-bold">proposta-cotali.pdf</p><span className="text-[10px] text-[#53736a]">pronta para compartilhar</span></div></div>
      </div>
      <div className="flex items-center gap-2 bg-[#f0f4f2] px-3 py-3"><div className="flex-1 rounded-full bg-cotali-white px-4 py-2 text-[10px] text-[#6d8980]">Mensagem</div><span className="grid size-8 place-items-center rounded-full bg-[#075e54] text-xs text-cotali-white" aria-hidden="true">➤</span></div>
    </div>
  );
}
