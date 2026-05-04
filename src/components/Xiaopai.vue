<template>
  <image :src="svgSrc" :style="{ width: size + 'rpx', height: (size * 1.2) + 'rpx' }" mode="aspectFit" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  mood?: string
  size?: number
}>(), { mood: 'idle', size: 80 })

const top = '#fdfaf2'
const bot = '#0b9d6a'
const botDeep = '#078558'
const cheek = '#ffb6a8'
const eye = '#0f1f1a'
const mouth = '#0f1f1a'
const accent = '#26e69b'

const cheeks = `<g opacity="0.7"><ellipse cx="34" cy="42" rx="4" ry="2.4" fill="${cheek}"/><ellipse cx="66" cy="42" rx="4" ry="2.4" fill="${cheek}"/></g>`

const body = `<g>
  <path d="M22 50 L22 78 a28 28 0 0 0 56 0 L78 50 Z" fill="${bot}"/>
  <path d="M22 50 L22 32 a28 28 0 0 1 56 0 L78 50 Z" fill="${top}"/>
  <line x1="22" y1="50" x2="78" y2="50" stroke="rgba(0,0,0,0.08)" stroke-width="0.6"/>
  <ellipse cx="38" cy="30" rx="9" ry="6" fill="#fff" opacity="0.7"/>
</g>`

const faces: Record<string, string> = {
  idle: `<circle cx="40" cy="38" r="2.4" fill="${eye}"/><circle cx="60" cy="38" r="2.4" fill="${eye}"/>${cheeks}<path d="M44 45 q6 4 12 0" stroke="${mouth}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  happy: `<path d="M34 39 q4 -4 10 0" stroke="${eye}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M56 39 q4 -4 10 0" stroke="${eye}" stroke-width="2.4" fill="none" stroke-linecap="round"/>${cheeks}<path d="M42 45 q8 6 16 0" stroke="${mouth}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  wave: `<path d="M36 38 q4 -2 8 0" stroke="${eye}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M56 38 q4 -2 8 0" stroke="${eye}" stroke-width="2.2" fill="none" stroke-linecap="round"/>${cheeks}<path d="M42 46 q8 5 16 0" stroke="${mouth}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  thinking: `<circle cx="40" cy="38" r="2.4" fill="${eye}"/><circle cx="60" cy="38" r="2.4" fill="${eye}"/><line x1="36" y1="32" x2="44" y2="30" stroke="${eye}" stroke-width="1.6" stroke-linecap="round"/>${cheeks}<ellipse cx="50" cy="46" rx="2.2" ry="1.6" fill="${mouth}"/><text x="62" y="22" font-size="14" fill="${botDeep}" font-weight="800">?</text>`,
  sleeping: `<path d="M38 38 q3 -2 6 0" stroke="${eye}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M56 38 q3 -2 6 0" stroke="${eye}" stroke-width="2.2" fill="none" stroke-linecap="round"/>${cheeks}<path d="M44 46 q6 4 12 0" stroke="${mouth}" stroke-width="1.8" fill="none" stroke-linecap="round"/><text x="78" y="22" font-size="11" fill="${accent}" font-weight="700">z</text><text x="84" y="14" font-size="8" fill="${accent}" font-weight="700">Z</text>`,
  celebrate: `<path d="M34 38 q3 -3 8 0" stroke="${eye}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M58 38 q3 -3 8 0" stroke="${eye}" stroke-width="2.4" fill="none" stroke-linecap="round"/>${cheeks}<path d="M40 44 q10 8 20 0 q-3 4 -10 4 q-7 0 -10 -4 z" fill="${mouth}"/><circle cx="14" cy="20" r="2" fill="#f59e0b"/><circle cx="86" cy="22" r="2" fill="${accent}"/><circle cx="22" cy="10" r="1.5" fill="#ff6b8b"/><circle cx="78" cy="8" r="1.5" fill="#7dd3a3"/>`,
  worried: `<line x1="34" y1="30" x2="42" y2="33" stroke="${eye}" stroke-width="1.8" stroke-linecap="round"/><line x1="58" y1="33" x2="66" y2="30" stroke="${eye}" stroke-width="1.8" stroke-linecap="round"/><circle cx="40" cy="39" r="2.2" fill="${eye}"/><circle cx="60" cy="39" r="2.2" fill="${eye}"/>${cheeks}<path d="M44 48 q6 -3 12 0" stroke="${mouth}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M70 30 q1 4 0 5 q-2 0 -1 -5 z" fill="#7ec0f5"/>`,
  sick: `<path d="M36 35 l8 8 M44 35 l-8 8" stroke="${eye}" stroke-width="2.2" stroke-linecap="round"/><path d="M56 35 l8 8 M64 35 l-8 8" stroke="${eye}" stroke-width="2.2" stroke-linecap="round"/><path d="M44 47 q6 3 12 0" stroke="${mouth}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  eating: `<path d="M34 39 q4 -3 8 0" stroke="${eye}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M58 39 q4 -3 8 0" stroke="${eye}" stroke-width="2.2" fill="none" stroke-linecap="round"/>${cheeks}<ellipse cx="50" cy="47" rx="3.5" ry="3" fill="${mouth}"/>`,
  reading: `<circle cx="40" cy="40" r="2.4" fill="${eye}"/><circle cx="60" cy="40" r="2.4" fill="${eye}"/><line x1="34" y1="33" x2="44" y2="32" stroke="${eye}" stroke-width="1.6" stroke-linecap="round"/><line x1="56" y1="32" x2="66" y2="33" stroke="${eye}" stroke-width="1.6" stroke-linecap="round"/>${cheeks}<line x1="46" y1="46" x2="54" y2="46" stroke="${mouth}" stroke-width="1.6" stroke-linecap="round"/>`,
  love: `<path d="M40 36 q-3 0 -3 3 q0 3 3 4 q3 -1 3 -4 q0 -3 -3 -3 z M40 36 q3 0 3 3" fill="#ff6b8b"/><path d="M60 36 q-3 0 -3 3 q0 3 3 4 q3 -1 3 -4 q0 -3 -3 -3 z M60 36 q3 0 3 3" fill="#ff6b8b"/>${cheeks}<path d="M44 46 q6 4 12 0" stroke="${mouth}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M82 30 q-2 -3 -4 -1 q-2 2 0 4 q2 2 4 -3 z" fill="#ff6b8b" opacity="0.8"/>`,
  running: `<circle cx="40" cy="38" r="2.4" fill="${eye}"/><circle cx="60" cy="38" r="2.4" fill="${eye}"/><line x1="34" y1="32" x2="44" y2="33" stroke="${eye}" stroke-width="1.8" stroke-linecap="round"/><line x1="56" y1="33" x2="66" y2="32" stroke="${eye}" stroke-width="1.8" stroke-linecap="round"/>${cheeks}<ellipse cx="50" cy="46" rx="3" ry="2" fill="${mouth}"/><line x1="6" y1="38" x2="14" y2="38" stroke="${botDeep}" stroke-width="1.6" stroke-linecap="round" opacity="0.5"/><line x1="4" y1="46" x2="16" y2="46" stroke="${botDeep}" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>`,
}

const arms: Record<string, string> = {
  idle: `<circle cx="22" cy="72" r="5" fill="${top}" stroke="${botDeep}" stroke-width="1"/><circle cx="78" cy="72" r="5" fill="${top}" stroke="${botDeep}" stroke-width="1"/>`,
  happy: `<circle cx="22" cy="72" r="5" fill="${top}" stroke="${botDeep}" stroke-width="1"/><circle cx="78" cy="72" r="5" fill="${top}" stroke="${botDeep}" stroke-width="1"/>`,
  sick: `<circle cx="22" cy="72" r="5" fill="${top}" stroke="${botDeep}" stroke-width="1"/><circle cx="78" cy="72" r="5" fill="${top}" stroke="${botDeep}" stroke-width="1"/>`,
  wave: `<circle cx="22" cy="72" r="5" fill="${top}" stroke="${botDeep}" stroke-width="1"/><line x1="76" y1="60" x2="86" y2="44" stroke="${botDeep}" stroke-width="3" stroke-linecap="round"/><circle cx="88" cy="40" r="5.5" fill="${top}" stroke="${botDeep}" stroke-width="1"/>`,
  celebrate: `<line x1="24" y1="62" x2="14" y2="42" stroke="${botDeep}" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="40" r="5.5" fill="${top}" stroke="${botDeep}" stroke-width="1"/><line x1="76" y1="62" x2="86" y2="42" stroke="${botDeep}" stroke-width="3" stroke-linecap="round"/><circle cx="88" cy="40" r="5.5" fill="${top}" stroke="${botDeep}" stroke-width="1"/>`,
  thinking: `<circle cx="22" cy="72" r="5" fill="${top}" stroke="${botDeep}" stroke-width="1"/><line x1="76" y1="60" x2="68" y2="42" stroke="${botDeep}" stroke-width="3" stroke-linecap="round"/><circle cx="66" cy="40" r="5.5" fill="${top}" stroke="${botDeep}" stroke-width="1"/>`,
  sleeping: `<circle cx="22" cy="72" r="5" fill="${top}" stroke="${botDeep}" stroke-width="1"/><circle cx="78" cy="72" r="5" fill="${top}" stroke="${botDeep}" stroke-width="1"/>`,
  worried: `<line x1="24" y1="60" x2="20" y2="48" stroke="${botDeep}" stroke-width="3" stroke-linecap="round"/><circle cx="18" cy="46" r="5" fill="${top}" stroke="${botDeep}" stroke-width="1"/><circle cx="78" cy="72" r="5" fill="${top}" stroke="${botDeep}" stroke-width="1"/>`,
  eating: `<circle cx="22" cy="72" r="5" fill="${top}" stroke="${botDeep}" stroke-width="1"/><line x1="76" y1="60" x2="74" y2="48" stroke="${botDeep}" stroke-width="3" stroke-linecap="round"/><rect x="68" y="36" width="12" height="14" rx="1" fill="#7ec0f5" stroke="${botDeep}" stroke-width="1"/>`,
  reading: `<line x1="26" y1="62" x2="32" y2="58" stroke="${botDeep}" stroke-width="3" stroke-linecap="round"/><line x1="74" y1="62" x2="68" y2="58" stroke="${botDeep}" stroke-width="3" stroke-linecap="round"/><rect x="32" y="55" width="36" height="18" rx="3" fill="#fff" stroke="${botDeep}" stroke-width="1"/><line x1="36" y1="60" x2="60" y2="60" stroke="${botDeep}" stroke-width="0.8" opacity="0.5"/><line x1="36" y1="64" x2="56" y2="64" stroke="${botDeep}" stroke-width="0.8" opacity="0.5"/>`,
  love: `<line x1="26" y1="64" x2="38" y2="58" stroke="${botDeep}" stroke-width="3" stroke-linecap="round"/><line x1="74" y1="64" x2="62" y2="58" stroke="${botDeep}" stroke-width="3" stroke-linecap="round"/><path d="M50 60 c-3 -4 -10 -4 -10 2 c0 5 10 10 10 10 c0 0 10 -5 10 -10 c0 -6 -7 -6 -10 -2 z" fill="#ff6b8b"/>`,
  running: `<line x1="22" y1="60" x2="14" y2="50" stroke="${botDeep}" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="48" r="5" fill="${top}" stroke="${botDeep}" stroke-width="1"/><line x1="78" y1="60" x2="86" y2="70" stroke="${botDeep}" stroke-width="3" stroke-linecap="round"/><circle cx="88" cy="72" r="5" fill="${top}" stroke="${botDeep}" stroke-width="1"/>`,
}

const svgSrc = computed(() => {
  const m = props.mood || 'idle'
  const face = faces[m] || faces.idle
  const arm = arms[m] || arms.idle
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">${arm}${body}${face}</svg>`
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
})
</script>
