// Motion layer: anime.js orchestrates UI + the dive into the black hole.
import { animate, stagger, utils } from 'animejs'
import { createBlackHole } from './blackhole.js'

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
const DUST = ['#fff1d6', '#ffd27f', '#ff9a4a', '#ff5a3c', '#ffffff']
const mk = (cls, tag = 'div') => { const e = document.createElement(tag); e.className = cls; e.setAttribute('aria-hidden', 'true'); document.body.appendChild(e); return e }

function enterCard(shell) {
  const items = shell.querySelectorAll('.eyebrow, h2, .description, .field, .switch-copy, .profile-details, .reload-hint')
  animate(items, { opacity: [0, 1], y: [16, 0], delay: stagger(60), duration: 600, ease: 'out(3)' })
}

function burst(ox, oy, count, spread) {
  const bits = Array.from({ length: count }, () => {
    const el = document.createElement('i'), c = DUST[utils.random(0, DUST.length - 1)]
    el.className = 'confetti'; el.style.background = c; el.style.color = c
    el.style.translate = `${ox}px ${oy}px`; document.body.appendChild(el); return el
  })
  animate(bits, {
    x: () => utils.random(-spread, spread), y: () => utils.random(-spread * .8, spread * .8),
    scale: [{ to: () => utils.random(1, 2.4), duration: 250 }, { to: 0, duration: 1300 }],
    opacity: { from: 1, to: 0, delay: 900, duration: 700 }, duration: 1600, ease: 'out(4)',
    onComplete: () => bits.forEach(b => b.remove()),
  })
}

function splitHeadline() {
  const h1 = document.querySelector('.intro h1'); if (!h1) return []
  h1.setAttribute('aria-label', h1.textContent)
  h1.innerHTML = h1.innerHTML.split(/<br\s*\/?>/i).map(l =>
    `<span class="line" aria-hidden="true">${l.trim().split(' ').map(w => `<span class="word">${w}</span>`).join(' ')}</span>`).join('')
  return h1.querySelectorAll('.word')
}

export function initFx() {
  const workspace = document.querySelector('.workspace'), shell = document.querySelector('.shell')
  if (!workspace || !shell) return
  const space = document.createElement('div'); space.className = 'space'; space.setAttribute('aria-hidden', 'true')
  document.body.prepend(space)
  const bh = createBlackHole(space, { reduce })
  const words = splitHeadline()
  if (reduce) return // still frame of the scene, plain UI

  const flash = mk('flash'); const shocks = [mk('shock'), mk('shock'), mk('shock')]
  animate('.brand', { opacity: [0, 1], x: [-12, 0], duration: 700, ease: 'out(3)' })
  animate(words, { y: ['110%', '0%'], opacity: [0, 1], delay: stagger(90, { start: 250 }), duration: 900, ease: 'out(4)' })
  animate('.intro-copy > p, .intro-footer', { opacity: [0, 1], y: [10, 0], delay: stagger(120, { start: 900 }), duration: 700, ease: 'out(3)' })
  const first = workspace.querySelector('.card-shell'); if (first) enterCard(first)

  if (fine) {
    workspace.addEventListener('pointermove', e => {
      const r = workspace.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5
      const card = workspace.querySelector('.card'); if (card) animate(card, { rotateX: -ny * 5, rotateY: nx * 7, duration: 500, ease: 'out(3)' })
    })
    workspace.addEventListener('pointerleave', () => {
      const card = workspace.querySelector('.card'); if (card) animate(card, { rotateX: 0, rotateY: 0, duration: 700, ease: 'out(3)' })
    })
  }

  let diving = false
  // Sign-in success: fall into the hole, white-out explosion, then "Hello, name."
  function dive() {
    if (!bh || diving) return
    diving = true; document.body.classList.add('warping')
    animate(shell, { opacity: 0, duration: 900, delay: 200, ease: 'in(2)' })
    animate(bh.sim, { shake: 1, duration: 1800, delay: 1600, ease: 'in(2)' })
    animate(bh.sim, { dive: 1, duration: 3300, ease: 'in(2)', onComplete: explode })
  }
  function explode() {
    animate(flash, { opacity: [0, 1], scale: [.05, 2.6], duration: 650, ease: 'out(3)' })
    animate(shocks, { scale: [.1, 16], opacity: [{ to: .9, duration: 60 }, { to: 0, duration: 1300 }], delay: stagger(180), duration: 1500, ease: 'out(3)' })
    setTimeout(() => { // scene is fully covered: reset it, then reveal
      bh.reset()
      burst(innerWidth / 2, innerHeight / 2, 110, Math.max(innerWidth, 800) * .45)
      const card = workspace.querySelector('.card-shell'); if (card) enterCard(card)
      animate(flash, { opacity: 0, duration: 1500, ease: 'out(2)' })
      animate(shell, { opacity: 1, duration: 900, delay: 500 })
      animate(bh.sim, { glow: 1, duration: 2600, ease: 'out(3)' })
      document.body.classList.remove('warping'); diving = false
    }, 800)
  }

  new MutationObserver(list => list.forEach(m => {
    if (m.target.getAttribute('aria-busy') === 'true' && workspace.querySelector('h2')?.textContent.trim() === 'Sign in.') dive()
  })).observe(workspace, { subtree: true, attributes: true, attributeFilter: ['aria-busy'] })

  new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => {
    if (diving || n.nodeType !== 1 || !n.matches('.card-shell')) return
    enterCard(n)
    if (!bh && n.querySelector('.welcome')) { const r = n.querySelector('h2').getBoundingClientRect(); burst(r.left + 150, r.top + 20, 50, 300) }
  }))).observe(workspace, { childList: true })
}
