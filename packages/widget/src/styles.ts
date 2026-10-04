// Scoped to the widget's shadow root, so the host page's CSS cannot break it and it cannot leak out.
export const styles: string = `
:host {
  --kwazi-accent: #0F766E;
  --kwazi-ink: #17212B;
  --kwazi-soft: #374151;
  --kwazi-muted: #64748B;
  --kwazi-line: #E2E8F0;
  --kwazi-canvas: #F6F8FB;
  --kwazi-paper: #FFFFFF;
  --kwazi-gold: #FFB547;
  --kwazi-good: #05A67A;
  --kwazi-bad: #EE5D50;
  all: initial;
  font-family: ui-rounded, "SF Pro Rounded", "Nunito", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--kwazi-ink);
  font-size: 15px;
  line-height: 1.45;
}
:host([data-inline]) { display: block; height: 100%; }
* { box-sizing: border-box; }
button { font: inherit; cursor: pointer; border: 0; background: none; color: inherit; }
button:focus-visible, a:focus-visible, textarea:focus-visible, select:focus-visible, input:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--kwazi-accent) 45%, transparent); outline-offset: 2px;
}

.launcher {
  position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
  width: 62px; height: 62px; border-radius: 22px; background: var(--kwazi-accent); color: #fff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, .25); display: grid; place-items: center;
  animation: kz-float 3.2s ease-in-out infinite; transition: transform .2s ease;
}
.launcher:hover { transform: scale(1.06) rotate(-4deg); }
.launcher:active { transform: scale(.94); }
.launcher-face { font-weight: 900; font-size: 28px; }
.launcher-ring {
  position: absolute; inset: -6px; border-radius: 26px; border: 3px solid var(--kwazi-accent);
  opacity: 0; animation: kz-ring 2.4s ease-out infinite;
}

.panel {
  position: fixed; right: 20px; bottom: 96px; z-index: 2147483001;
  width: min(420px, calc(100vw - 32px)); height: min(680px, calc(100vh - 120px));
  background: var(--kwazi-paper); border-radius: 26px; box-shadow: 0 24px 60px rgba(15, 23, 42, .28);
  display: flex; flex-direction: column; overflow: hidden;
  opacity: 0; pointer-events: none; transform: translateY(24px) scale(.96); transform-origin: bottom right;
  transition: opacity .22s ease, transform .32s cubic-bezier(.2, 1.3, .4, 1);
}
.panel.open { opacity: 1; pointer-events: auto; transform: none; }
.panel.inline { position: relative; right: auto; bottom: auto; width: 100%; height: 100%; min-height: 420px; box-shadow: none; border: 1px solid var(--kwazi-line); }
@media (max-width: 540px) {
  .panel:not(.inline) { inset: 0; width: 100vw; height: 100dvh; border-radius: 0; transform: translateY(40px); }
  .panel:not(.inline).open { transform: none; }
}

.header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: var(--kwazi-accent); color: #fff; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 17px; }
.logo { width: 34px; height: 34px; border-radius: 12px; background: rgba(255,255,255,.2); display: grid; place-items: center; font-weight: 900; animation: kz-wiggle 4s ease-in-out infinite; }
.close { font-size: 28px; line-height: 1; width: 40px; height: 40px; border-radius: 12px; color: #fff; }
.close:hover { background: rgba(255,255,255,.15); }

.sources { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 14px 0; }
.sources:empty { display: none; }
.chip-label { font-size: 12px; color: var(--kwazi-muted); font-weight: 700; align-self: center; }
.chip { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: color-mix(in srgb, var(--kwazi-accent) 12%, white); color: var(--kwazi-accent); animation: kz-pop .35s cubic-bezier(.2, 1.4, .4, 1) both; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.pickers { display: flex; gap: 8px; padding: 10px 14px 0; }
.pickers[hidden], .picker[hidden] { display: none; }
.picker { flex: 1; min-width: 0; min-height: 40px; border: 1px solid var(--kwazi-line); border-radius: 12px; padding: 0 10px; font: inherit; background: var(--kwazi-canvas); color: var(--kwazi-ink); }

.log { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; background: var(--kwazi-canvas); scroll-behavior: smooth; }
.bubble { max-width: 88%; padding: 10px 14px; border-radius: 18px; animation: kz-rise .35s cubic-bezier(.2, 1.2, .4, 1) both; }
.bubble p { margin: 4px 0 0; }
.bubble.me { align-self: flex-end; background: var(--kwazi-accent); color: #fff; border-bottom-right-radius: 6px; }
.bubble.kwazi { align-self: flex-start; background: var(--kwazi-paper); border: 1px solid var(--kwazi-line); border-bottom-left-radius: 6px; }
.thumb { display: block; max-width: 180px; max-height: 180px; border-radius: 12px; }
.pdf { display: inline-block; font-weight: 900; font-size: 12px; padding: 4px 8px; border-radius: 8px; background: var(--kwazi-gold); color: #4A3000; }
.thinking { display: flex; align-items: center; gap: 10px; color: var(--kwazi-muted); }
.dots { display: inline-flex; gap: 4px; }
.dots i { width: 8px; height: 8px; border-radius: 50%; background: var(--kwazi-accent); animation: kz-bounce 1s ease-in-out infinite; }
.dots i:nth-child(2) { animation-delay: .15s; }
.dots i:nth-child(3) { animation-delay: .3s; }
.thinking-text.swap { animation: kz-fade .4s ease both; }
.notice { align-self: center; font-size: 13px; color: var(--kwazi-bad); background: #FFF1F0; padding: 8px 12px; border-radius: 12px; animation: kz-shake .4s ease both; }

.answer { align-self: stretch; background: var(--kwazi-paper); border: 1px solid var(--kwazi-line); border-radius: 20px; padding: 14px; animation: kz-rise .4s cubic-bezier(.2, 1.2, .4, 1) both; display: flex; flex-direction: column; gap: 10px; }
.answer.nested { margin-top: 8px; padding: 10px; border-style: dashed; background: var(--kwazi-canvas); }
.answer.safety { border-color: var(--kwazi-gold); background: #FFF6E5; }
.answer-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.topic { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--kwazi-accent); }
.low { font-size: 12px; font-weight: 700; color: #7A4F00; background: #FFF6E5; border-radius: 999px; padding: 2px 8px; }
.understood { margin: 0; color: var(--kwazi-soft); font-style: italic; }
.steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.step { display: flex; gap: 10px; animation: kz-slide .4s cubic-bezier(.2, 1.2, .4, 1) both; }
.step-number { flex: none; width: 28px; height: 28px; border-radius: 10px; background: color-mix(in srgb, var(--kwazi-accent) 14%, white); color: var(--kwazi-accent); font-weight: 900; display: grid; place-items: center; }
.step-body { flex: 1; min-width: 0; }
.step-body p { margin: 2px 0 6px; color: var(--kwazi-soft); }
.math { display: block; font-family: ui-monospace, Menlo, Consolas, monospace; background: var(--kwazi-canvas); border-radius: 10px; padding: 6px 10px; overflow-x: auto; white-space: pre-wrap; }
.breakdown { margin-top: 6px; font-size: 13px; font-weight: 800; color: var(--kwazi-accent); padding: 6px 10px; border-radius: 999px; background: color-mix(in srgb, var(--kwazi-accent) 10%, white); transition: transform .15s ease; }
.breakdown:hover { transform: translateY(-1px); }
.breakdown.loading { animation: kz-pulse 1s ease-in-out infinite; }
.step-controls { display: flex; gap: 8px; }
.ghost { flex: 1; min-height: 40px; border-radius: 999px; border: 1px solid var(--kwazi-line); font-weight: 800; color: var(--kwazi-accent); transition: background .15s ease, transform .15s ease; }
.ghost:hover { background: var(--kwazi-canvas); }
.ghost:active { transform: scale(.97); }
.final { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border-radius: 16px; background: color-mix(in srgb, var(--kwazi-good) 12%, white); border: 1px solid color-mix(in srgb, var(--kwazi-good) 40%, white); }
.final.pop { animation: kz-pop .5s cubic-bezier(.2, 1.6, .4, 1) both; }
.final-label { font-size: 12px; font-weight: 800; color: var(--kwazi-good); text-transform: uppercase; letter-spacing: .04em; }
.final-text { font-weight: 800; font-size: 16px; }
.after { display: flex; flex-direction: column; gap: 10px; }
.after:empty { display: none; }

.check { position: relative; padding: 12px; border-radius: 16px; background: #FFF6E5; border: 1px solid #FFD18A; animation: kz-rise .4s ease both; }
.check p { margin: 4px 0 8px; font-weight: 700; }
.check-label { font-size: 12px; font-weight: 800; color: #7A4F00; text-transform: uppercase; letter-spacing: .04em; }
.choices { display: grid; gap: 6px; }
.choice { text-align: left; padding: 10px 12px; border-radius: 12px; background: #fff; border: 1px solid var(--kwazi-line); font-weight: 700; transition: transform .15s ease, background .2s ease; }
.choice:hover:not(:disabled) { transform: translateX(3px); }
.choice:disabled { cursor: default; }
.choice.right { background: color-mix(in srgb, var(--kwazi-good) 18%, white); border-color: var(--kwazi-good); animation: kz-pop .4s ease both; }
.choice.wrong { background: #FFF1F0; border-color: var(--kwazi-bad); animation: kz-shake .4s ease both; }
.result { margin: 8px 0 0; font-weight: 800; animation: kz-fade .3s ease both; }
.result.yes { color: var(--kwazi-good); }
.result.no { color: #9A3412; }
.confetti { position: absolute; left: 50%; top: 40%; pointer-events: none; }
.confetti i { position: absolute; width: 8px; height: 12px; border-radius: 2px; animation: kz-confetti 1.2s cubic-bezier(.1, .8, .3, 1) forwards; }

.followups { display: flex; flex-wrap: wrap; gap: 6px; }
.followup { font-size: 13px; font-weight: 700; padding: 8px 12px; border-radius: 999px; border: 1px solid var(--kwazi-line); background: #fff; transition: transform .15s ease, border-color .15s ease; }
.followup:hover { transform: translateY(-2px); border-color: var(--kwazi-accent); }
.citations { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.citation { font-size: 12px; color: var(--kwazi-accent); font-weight: 700; text-decoration: none; border-bottom: 1px dashed currentColor; }

.preview { padding: 0 14px; }
.preview:empty { display: none; }
.pill { display: inline-flex; align-items: center; gap: 8px; margin-top: 8px; padding: 6px 8px; border-radius: 14px; background: var(--kwazi-canvas); border: 1px solid var(--kwazi-line); font-size: 13px; animation: kz-pop .3s ease both; }
.pill img { width: 36px; height: 36px; object-fit: cover; border-radius: 8px; }
.remove { width: 28px; height: 28px; border-radius: 8px; font-size: 18px; color: var(--kwazi-muted); }
.composer { display: flex; align-items: flex-end; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--kwazi-line); background: var(--kwazi-paper); }
.input { flex: 1; resize: none; min-height: 44px; max-height: 120px; padding: 11px 14px; border-radius: 16px; border: 1px solid var(--kwazi-line); font: inherit; color: var(--kwazi-ink); background: var(--kwazi-canvas); }
.icon, .send { flex: none; width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; transition: transform .15s ease; }
.icon { color: var(--kwazi-accent); background: color-mix(in srgb, var(--kwazi-accent) 10%, white); }
.send { color: #fff; background: var(--kwazi-accent); }
.icon:active, .send:active { transform: scale(.9); }
.send:disabled { opacity: .5; }
.icon svg, .send svg { width: 22px; height: 22px; }
.footer { font-size: 11px; color: var(--kwazi-muted); text-align: center; padding: 0 12px 8px; background: var(--kwazi-paper); }
.welcome strong { font-size: 16px; }

@keyframes kz-float { 0%, 100% { translate: 0 0; } 50% { translate: 0 -5px; } }
@keyframes kz-ring { 0% { opacity: .6; transform: scale(.9); } 100% { opacity: 0; transform: scale(1.35); } }
@keyframes kz-wiggle { 0%, 90%, 100% { rotate: 0deg; } 93% { rotate: -10deg; } 96% { rotate: 10deg; } }
@keyframes kz-rise { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes kz-slide { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: none; } }
@keyframes kz-pop { 0% { opacity: 0; transform: scale(.85); } 100% { opacity: 1; transform: none; } }
@keyframes kz-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes kz-bounce { 0%, 100% { transform: translateY(0); opacity: .5; } 50% { transform: translateY(-6px); opacity: 1; } }
@keyframes kz-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
@keyframes kz-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
@keyframes kz-confetti { 0% { transform: translate(0, 0) rotate(0); opacity: 1; } 100% { transform: translate(var(--x), calc(var(--y) + 160px)) rotate(var(--r)); opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;
