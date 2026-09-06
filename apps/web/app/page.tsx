import type { ReactNode } from 'react';

import { ArrowUpRight, AudioIcon, CheckIcon, Logo } from '../components/landing/primitives';
import { FlowVisual } from '../components/landing/flow-visual';
import { ReviewVisual } from '../components/landing/review-visual';
import { RevealObserver } from '../components/landing/reveal-observer';
import { ShareVisual } from '../components/landing/share-visual';
import {
  PhoneMockup,
  QuotePreview,
} from '../components/landing/product-visuals';

const container = 'mx-auto w-full max-w-[1304px] px-8 max-phone:px-5';
const eyebrow =
  'flex items-center gap-[9px] text-[11px] font-bold uppercase tracking-[0.12em] leading-[1.3]';
const editorialHeading =
  'font-cotali-display font-semibold tracking-cotali-display leading-cotali-display';

function SectionTag({
  number,
  label,
  inverse = false,
}: {
  number: string;
  label: string;
  inverse?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.1em] ${inverse ? 'text-cotali-white/65' : 'text-cotali-blue/60'}`}
    >
      <span
        className={`grid size-7 place-items-center rounded-full border text-[11px] ${inverse ? 'border-cotali-white/25' : 'border-cotali-blue/20'}`}
      >
        {number}
      </span>
      <span>{label}</span>
    </div>
  );
}

function Eyebrow({
  children,
  inverse = false,
}: {
  children: ReactNode;
  inverse?: boolean;
}) {
  return (
    <p
      className={`${eyebrow} ${inverse ? 'text-cotali-white/75' : 'text-cotali-blue'}`}
    >
      <span className="block size-[7px] rounded-full bg-current" />
      {children}
    </p>
  );
}

function ArrowLink({
  children,
  href,
  inverse = false,
}: {
  children: ReactNode;
  href: string;
  inverse?: boolean;
}) {
  return (
    <a
      className={`group inline-flex items-center gap-2 border-b border-current pb-[7px] text-[13px] font-bold transition-[gap] duration-200 hover:gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 ${inverse ? 'focus-visible:outline-cotali-white' : 'focus-visible:outline-cotali-blue'}`}
      href={href}
    >
      {children} <ArrowUpRight />
    </a>
  );
}

function FeatureIcon({ kind }: { kind: 'voice' | 'review' | 'pdf' }) {
  if (kind === 'voice') {
    return (
      <span className="grid size-11 place-items-center rounded-full bg-cotali-blue text-cotali-white">
        <AudioIcon />
      </span>
    );
  }

  if (kind === 'review') {
    return (
      <span className="grid size-11 place-items-center rounded-full bg-cotali-sky text-cotali-blue">
        <CheckIcon />
      </span>
    );
  }

  return (
    <span className="grid size-11 place-items-center rounded-xl bg-cotali-ink text-[10px] font-bold tracking-[-0.02em] text-cotali-white">
      PDF
    </span>
  );
}

function AppleIcon() {
  return (
    <svg aria-hidden="true" className="size-6 fill-current" viewBox="0 0 24 24">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.32 2.99-2.54 4.09l.01-.01ZM12.03 7.25C11.88 5.02 13.69 3.18 15.76 3c.29 2.58-2.34 4.5-3.73 4.25Z" />
    </svg>
  );
}

function PlayStoreIcon() {
  return (
    <svg aria-hidden="true" className="size-6 fill-current" viewBox="0 0 24 24">
      <path d="M3.18 2.35a1.55 1.55 0 0 0-.68 1.3v16.7c0 .54.27 1.03.68 1.3L12.5 12 3.18 2.35ZM13.2 12.7l2.55 2.64-9.44 5.4L13.2 12.7Zm0-1.4L6.31 3.26l9.44 5.4L13.2 11.3Zm1.04.7 2.85-1.63 2.1 1.2c.64.37.64 1.3 0 1.67l-2.1 1.2-2.85-1.64v-.8Z" />
    </svg>
  );
}

function StoreButtons() {
  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL;

  return (
    <div className="mt-[39px] flex flex-wrap gap-3 max-phone:mt-[33px]">
      {appStoreUrl ? (
        <a
          className="inline-flex items-center gap-2.5 rounded-xl bg-cotali-ink px-3.5 py-2.5 text-left text-cotali-white shadow-sm transition-colors duration-200 hover:bg-cotali-navy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cotali-white"
          href={appStoreUrl}
          aria-label="Baixe o Cotali na App Store"
        >
          <AppleIcon />
          <span>
            <span className="block text-[8px] font-bold uppercase tracking-[0.08em] text-cotali-white/60">
              baixe na
            </span>
            <span className="block font-cotali-display text-[15px] font-semibold tracking-[-0.05em] leading-none">
              App Store
            </span>
          </span>
        </a>
      ) : null}
      <span className="inline-flex items-center gap-2.5 rounded-xl bg-cotali-ink px-3.5 py-2.5 text-left text-cotali-white shadow-sm">
        <PlayStoreIcon />
        <span>
          <span className="block text-[8px] font-bold uppercase tracking-[0.08em] text-cotali-white/60">
            baixe no
          </span>
          <span className="block font-cotali-display text-[15px] font-semibold tracking-[-0.05em] leading-none">
            Google Play
          </span>
        </span>
      </span>
    </div>
  );
}

function HeroSection() {
  return (
    <section
      className="relative overflow-hidden rounded-bl-[120px] bg-cotali-blue text-cotali-white max-phone:rounded-bl-[64px]"
      id="inicio"
    >
      <div
        className="pointer-events-none absolute -right-[190px] -top-[270px] size-[530px] rounded-full border border-cotali-white/20"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-[18%] top-[12%] size-[360px] rounded-full bg-cotali-white/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-[-210px] left-[28%] size-[420px] rounded-full border border-cotali-white/15"
        aria-hidden="true"
      />

      <header
        className={`${container} relative z-10 flex min-h-[100px] items-center justify-between border-b border-cotali-white/20 max-phone:min-h-[78px]`}
      >
        <a
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cotali-white"
          href="#inicio"
          aria-label="Cotali, início"
        >
          <Logo />
        </a>
        <a
          className="group inline-flex items-center gap-2 rounded-full bg-cotali-ink px-4 py-2.5 text-[13px] font-bold text-cotali-white shadow-sm transition-colors duration-200 hover:bg-cotali-navy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cotali-white"
          href="#fluxo"
        >
          ver como funciona <ArrowUpRight />
        </a>
      </header>

      <div
        className={`${container} relative z-10 grid min-h-[650px] grid-cols-[minmax(0,0.8fr)_minmax(470px,1.2fr)] items-center gap-[clamp(42px,6vw,94px)] py-[68px] max-laptop:grid-cols-[minmax(0,0.78fr)_minmax(390px,1fr)] max-laptop:gap-[50px] max-tablet:block max-tablet:py-[78px] max-phone:py-[69px]`}
      >
        <div className="relative z-20 max-w-[570px] motion-safe:animate-cotali-rise">
          <h1 className="mt-0 max-w-[570px] font-cotali-display text-[clamp(4rem,6.1vw,6.2rem)] font-medium tracking-cotali-tight leading-[0.9] max-phone:text-[clamp(3.4rem,17vw,5.2rem)]">
            Explique o serviço.
            <br />
            <em className="not-italic text-cotali-white/60">
              O Cotali monta a proposta.
            </em>
          </h1>
          <p className="mt-7 max-w-[445px] text-[17px] tracking-[-0.015em] leading-[1.55] text-cotali-white/75 max-phone:max-w-[360px] max-phone:text-[15px]">
            Fale pelo celular o que precisa ser feito. Revise os detalhes e
            envie um PDF claro para o cliente.
          </p>
          <div className="mt-[34px] flex flex-wrap items-center gap-5">
            <a
              className="group inline-flex items-center gap-2 bg-cotali-white px-5 py-3 text-[13px] font-bold text-cotali-blue transition-colors duration-200 hover:bg-cotali-white/85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cotali-white"
              href="#fluxo"
            >
              Ver como funciona <ArrowUpRight />
            </a>
            <ArrowLink href="#controle" inverse>
              Você continua no controle
            </ArrowLink>
          </div>
          <StoreButtons />
        </div>

        <div className="relative min-h-[540px] max-tablet:mt-[95px] max-phone:mt-[72px] max-phone:min-h-[500px]">
          <div className="absolute right-[7%] top-[2%] z-10 w-[min(390px,78%)] rotate-[3deg] max-phone:right-[2%] max-phone:w-[86%]">
            <PhoneMockup />
          </div>
          <div className="absolute bottom-[5%] left-[-2%] z-20 w-[min(300px,58%)] rotate-[-5deg] max-tablet:left-[7%] max-phone:bottom-[1%] max-phone:left-[-3%] max-phone:w-[72%]">
            <QuotePreview compact />
          </div>
        </div>
      </div>
    </section>
  );
}

function OutcomesSection() {
  const outcomes = [
    [
      'voice',
      'Fale naturalmente',
      'Não precisa decorar roteiro. Explique o trabalho do seu jeito.',
    ],
    [
      'review',
      'Revise antes de enviar',
      'Itens, valores e prazos só entram quando estiverem claros para você.',
    ],
    [
      'pdf',
      'Compartilhe um PDF',
      'A proposta fica pronta para você enviar ao cliente quando decidir.',
    ],
  ] as const;

  return (
    <section className="bg-cotali-white" id="produto">
      <div className={`${container} py-[104px] max-phone:py-[86px]`}>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(260px,0.58fr)] items-end gap-[70px] max-tablet:grid-cols-1 max-tablet:gap-7">
          <div data-cotali-reveal>
            <SectionTag number="01" label="o que o Cotali faz" />
            <h2
              className={`${editorialHeading} mt-7 max-w-[760px] text-[clamp(3.2rem,5.7vw,5.5rem)] text-cotali-blue max-phone:mt-[23px] max-phone:text-[clamp(2.9rem,14vw,4.2rem)]`}
            >
              Uma conversa vira
              <br />
              <span className="text-cotali-blue/50">trabalho organizado.</span>
            </h2>
          </div>
          <p className="max-w-[420px] text-base tracking-[-0.015em] leading-[1.6] text-cotali-blue/60">
            O Cotali entra no intervalo entre o pedido do cliente e a proposta
            que você precisa enviar.
          </p>
        </div>

        <div className="mt-[76px] grid grid-cols-3 divide-x divide-cotali-blue/15 border-y border-cotali-blue/15 max-tablet:mt-[58px] max-phone:mt-[49px] max-phone:grid-cols-1 max-phone:divide-x-0 max-phone:divide-y">
          {outcomes.map(([kind, title, description]) => (
            <div
              className="px-7 py-7 first:pl-0 last:pr-0 max-tablet:px-5 max-phone:flex max-phone:items-start max-phone:gap-4 max-phone:px-0 max-phone:py-6"
              key={title}
            >
              <FeatureIcon kind={kind} />
              <div className="mt-6 max-phone:mt-0">
                <h3 className="font-cotali-display text-[21px] font-semibold tracking-[-0.06em] leading-none">
                  {title}
                </h3>
                <p className="mt-4 max-w-[280px] text-sm leading-[1.5] text-cotali-blue/60">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VoiceToQuoteSection() {
  return (
    <section className="bg-cotali-white" id="fluxo">
      <div className={`${container} py-[24px] max-phone:py-0`}>
        <div className="overflow-hidden rounded-tl-[110px] rounded-br-[34px] bg-cotali-sky px-[clamp(34px,6vw,86px)] py-[clamp(56px,6vw,88px)] max-phone:rounded-tl-[58px] max-phone:px-5 max-phone:py-[69px]">
          <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] items-center gap-[clamp(38px,7vw,105px)] max-tablet:grid-cols-1">
            <div className="max-w-[530px]" data-cotali-reveal>
              <SectionTag number="02" label="da voz à proposta" />
              <h2 className={`${editorialHeading} mt-7 max-w-[600px] text-[clamp(3rem,5vw,5rem)] text-cotali-blue max-phone:mt-[23px] max-phone:text-[clamp(2.9rem,14vw,4.2rem)]`}>Você explica.<br /><span className="text-cotali-blue/50">O orçamento<br />toma forma.</span></h2>
              <p className="mt-8 max-w-[480px] text-base tracking-[-0.015em] leading-[1.6] text-cotali-blue/70 max-phone:mt-[25px] max-phone:text-[15px]">O fluxo começa com uma gravação simples e termina em uma proposta que você consegue revisar.</p>
              <div className="mt-[39px]"><ArrowLink href="#controle">entenda o fluxo</ArrowLink></div>
            </div>

            <FlowVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

function ControlSection() {
  return (
    <section className="bg-cotali-white" id="controle">
      <div className={`${container} py-[24px] max-phone:py-0`}>
        <div className="relative overflow-hidden rounded-tr-[110px] rounded-bl-[34px] bg-cotali-ink px-[clamp(34px,6vw,86px)] py-[clamp(56px,6vw,88px)] text-cotali-white max-phone:rounded-tr-[58px] max-phone:px-5 max-phone:py-[69px]">
          <div
            className="pointer-events-none absolute -left-24 top-16 size-[340px] rounded-full bg-cotali-blue/25 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-20 -top-28 size-[300px] rounded-full border border-cotali-white/15"
            aria-hidden="true"
          />
          <div className="relative z-10 grid grid-cols-[minmax(0,0.85fr)_minmax(300px,0.75fr)] items-center gap-[clamp(45px,8vw,125px)] max-tablet:grid-cols-1">
            <div className="max-w-[540px]" data-cotali-reveal>
              <SectionTag inverse number="03" label="sua decisão" />
              <h2 className="mb-7 mt-[26px] font-cotali-display text-[clamp(3.2rem,5vw,5rem)] font-medium tracking-[-0.09em] leading-[0.94] max-phone:mt-[23px] max-phone:text-[clamp(3.1rem,15vw,4.5rem)]">
                A sugestão aparece.
                <br />
                <em className="not-italic text-cotali-white/75">
                  A decisão é sua.
                </em>
              </h2>
              <p className="max-w-[420px] text-base leading-[1.6] text-cotali-white/75 max-phone:text-[15px]">
                O Cotali ajuda a organizar a conversa, mas não fala pelo seu
                trabalho.
              </p>
              <div className="mt-[58px] max-w-[500px]">
                {[
                  'Se algo não ficou claro, fica pendente.',
                  'Se você não falou, o Cotali não inventa.',
                  'Nada é enviado antes da sua conferência.',
                ].map((item, index) => (
                  <div
                    className="grid grid-cols-[35px_1fr] gap-4 border-t border-cotali-white/20 py-[18px] last:border-b"
                    key={item}
                  >
                    <span className="font-cotali-display text-[13px] text-cotali-white/60">
                      0{index + 1}
                    </span>
                    <p className="m-0 text-sm leading-[1.45]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <ReviewVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

function ShareSection() {
  return (
    <section className="bg-cotali-white" id="compartilhar">
      <div className={`${container} py-[24px] max-phone:py-0`}>
        <div className="overflow-hidden rounded-tl-[110px] rounded-br-[34px] bg-cotali-cloud px-[clamp(34px,6vw,86px)] py-[clamp(56px,6vw,88px)] max-phone:rounded-tl-[58px] max-phone:px-5 max-phone:py-[69px]">
          <div className="grid grid-cols-[minmax(290px,0.75fr)_minmax(0,1fr)] items-center gap-[clamp(42px,8vw,115px)] max-tablet:grid-cols-1">
            <ShareVisual />
            <div className="order-2 max-w-[620px] max-tablet:order-1" data-cotali-reveal>
              <SectionTag number="04" label="quando estiver pronto" />
              <h2
                className={`${editorialHeading} mt-7 text-[clamp(3.2rem,5.4vw,5.3rem)] text-cotali-blue max-phone:mt-[23px] max-phone:text-[clamp(2.9rem,14vw,4.2rem)]`}
              >
                A proposta fica clara.
                <br />
                <span className="text-cotali-blue/50">
                  O envio fica simples.
                </span>
              </h2>
              <p className="mt-8 max-w-[500px] text-base tracking-[-0.015em] leading-[1.6] text-cotali-blue/70 max-phone:mt-[25px] max-phone:text-[15px]">
                Depois da sua revisão, o Cotali prepara o PDF e facilita o
                compartilhamento pelo WhatsApp.
              </p>
              <div className="mt-[51px] flex flex-wrap items-center gap-x-5 gap-y-4 text-[11px] font-bold uppercase tracking-[0.07em] text-cotali-blue max-phone:grid max-phone:w-full max-phone:grid-cols-[minmax(0,1fr)_auto] max-phone:gap-x-3 max-phone:gap-y-3">
                <span>PDF pronto</span>
                <span className="text-cotali-blue/30">→</span>
                <span>cliente selecionado</span>
                <span className="text-cotali-blue/30">→</span>
                <span>você compartilha</span>
              </div>
              <div className="mt-[39px]">
                <ArrowLink href="#para-quem">ver para quem é</ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AudienceSection() {
  return (
    <section
      className={`${container} border-t border-cotali-blue/20 py-[112px] max-phone:py-[86px]`}
      id="para-quem"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)] items-start gap-[clamp(45px,9vw,140px)] max-tablet:grid-cols-1 max-tablet:gap-[58px]">
          <div data-cotali-reveal>
            <SectionTag number="05" label="feito para a vida real" />
          <h2 className={`${editorialHeading} mt-7 max-w-[700px] text-[clamp(3.2rem,5.7vw,5.5rem)] text-cotali-blue max-phone:mt-[23px] max-phone:text-[clamp(2.9rem,14vw,4.2rem)]`}>Entre uma visita<br /><span className="text-cotali-blue/50">e outra.</span></h2>
          <p className="mt-8 max-w-[500px] text-base tracking-[-0.015em] leading-[1.6] text-cotali-blue/60 max-phone:mt-[25px] max-phone:text-[15px]">Para quem recebe pedidos pelo WhatsApp, trabalha com as próprias mãos e precisa responder enquanto o serviço continua.</p>
        </div>
        <div className="border-l border-cotali-blue/20 pl-[30px] max-tablet:max-w-[620px] max-phone:border-l-0 max-phone:border-t max-phone:pl-0 max-phone:pt-[26px]" data-cotali-reveal data-cotali-reveal-delay="120">
          <p className="mb-[22px] text-[11px] font-bold uppercase tracking-[0.08em] text-cotali-blue/60">Um orçamento pode começar com:</p>
          {['uma mensagem do cliente', 'uma visita no local', 'uma ideia ainda incompleta', 'uma fala no caminho'].map((item, index) => <span className="flex items-center justify-between border-t border-cotali-blue/20 py-[18px] font-cotali-display text-xl font-medium tracking-[-0.05em] last:border-b" key={item}><span>{item}</span><span className="text-sm text-cotali-blue/40">0{index + 1}</span></span>)}
        </div>
      </div>
    </section>
  );
}

function QuestionsSection() {
  const questions = [
    [
      'Preciso falar de um jeito específico?',
      'Não. Explique o serviço com naturalidade. Diga o que será feito, os materiais, o preço e o prazo, quando souber.',
    ],
    [
      'O Cotali inventa preços ou informações?',
      'Não. O que não estiver claro fica marcado para você confirmar. A proposta só deve ser enviada depois da sua conferência.',
    ],
    [
      'O PDF é enviado sozinho?',
      'Não. O Cotali prepara o PDF e facilita o envio pelo WhatsApp. Você decide quando compartilhar.',
    ],
  ];

  return (
    <section
      className="border-t border-cotali-blue/20 bg-cotali-sky"
      id="duvidas"
    >
      <div className={`${container} py-[104px] max-phone:py-[86px]`}>
        <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] gap-[clamp(45px,8vw,120px)] max-tablet:grid-cols-1 max-tablet:gap-[52px]">
          <div data-cotali-reveal>
            <SectionTag number="06" label="para ficar claro" />
            <h2
              className={`${editorialHeading} mt-7 max-w-[510px] text-[clamp(2.8rem,5vw,4.8rem)] text-cotali-blue max-phone:mt-[23px] max-phone:text-[clamp(2.9rem,14vw,4.2rem)]`}
            >
              O que você precisa saber.
            </h2>
          </div>
          <div className="border-b border-cotali-blue/20" data-cotali-reveal data-cotali-reveal-delay="120">
            {questions.map(([question, answer]) => (
              <details
                className="group border-t border-cotali-blue/20"
                key={question}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-[30px] rounded-sm py-[23px] font-cotali-display text-xl font-medium tracking-[-0.05em] transition-colors hover:text-cotali-blue/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cotali-blue marker:hidden max-phone:py-[19px] max-phone:text-[17px]">
                  {question}
                  <span className="text-[22px] font-normal text-cotali-blue/60 transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mb-[25px] mr-[50px] mt-[-3px] max-w-[570px] text-sm leading-[1.55] text-cotali-blue/75 max-phone:mr-[25px] max-phone:text-[13px]">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ClosingSection() {
  return (
    <section className={`${container} relative min-h-[470px] overflow-hidden rounded-tr-[110px] bg-cotali-blue py-[100px] text-cotali-white max-phone:min-h-[505px] max-phone:rounded-tr-[58px] max-phone:py-[83px]`} id="lancamento">
      <div className="pointer-events-none absolute right-[4%] top-[38px] font-cotali-display text-[clamp(15rem,30vw,29rem)] font-semibold tracking-[-0.18em] leading-[0.75] text-cotali-white/20 max-phone:-right-[9%] max-phone:top-[26px] max-phone:text-[17rem]" aria-hidden="true">c.</div>
      <div className="relative z-10 max-w-[720px]" data-cotali-reveal>
        <Eyebrow inverse>o próximo passo</Eyebrow>
        <h2 className="mb-[27px] mt-[26px] font-cotali-display text-[clamp(3.5rem,6vw,6rem)] font-medium tracking-cotali-tight leading-[0.91] max-phone:mt-[23px] max-phone:text-[clamp(3.2rem,15vw,4.8rem)]">
          Explique o serviço.
          <br />
          <em className="not-italic text-cotali-white/80">
            Veja a proposta tomar forma.
          </em>
        </h2>
        <p className="max-w-[430px] text-base leading-[1.6] text-cotali-white/75 max-phone:text-[15px]">
          O Cotali está sendo preparado para profissionais que precisam
          responder bem, mesmo quando o dia está corrido.
        </p>
        <a
          className="group mt-[38px] inline-flex items-center gap-2 bg-cotali-white px-5 py-3 text-[13px] font-bold text-cotali-blue transition-colors duration-200 hover:bg-cotali-white/85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cotali-white"
          href="#fluxo"
        >
          Ver o fluxo completo <ArrowUpRight />
        </a>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="overflow-x-clip">
      <RevealObserver />
      <HeroSection />
      <OutcomesSection />
      <VoiceToQuoteSection />
      <ControlSection />
      <ShareSection />
      <AudienceSection />
      <QuestionsSection />
      <ClosingSection />
      <footer
        className={`${container} flex min-h-[108px] items-center justify-between gap-4 text-[10px] uppercase tracking-[0.09em] text-cotali-blue/60 max-phone:min-h-[125px] max-phone:flex-wrap max-phone:gap-[15px] max-phone:py-6`}
      >
        <a
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cotali-blue"
          href="#inicio"
          aria-label="Cotali, início"
        >
          <Logo />
        </a>
        <span className="max-phone:order-3 max-phone:w-full">
          orçamentos claros para trabalhos reais
        </span>
      </footer>
    </main>
  );
}
