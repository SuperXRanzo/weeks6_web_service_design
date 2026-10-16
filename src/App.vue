<script setup>
import { ref, nextTick, onBeforeUnmount } from 'vue'
import { readAccounts, saveAccounts, readSession, saveSession, clearSession } from './storage.js'

const mode = ref('signin')
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const accounts = ref(readAccounts())
const savedEmail = readSession()
const profile = ref(accounts.value.find(account => account.email === savedEmail) ?? null)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const shake = ref(false)
const card = ref(null)
let timer

async function showError(message) {
  error.value = message
  shake.value = false
  await nextTick()
  void card.value?.offsetWidth
  shake.value = true
}
function switchMode(nextMode) {
  if (busy.value) return
  mode.value = nextMode
  password.value = ''
  confirmPassword.value = ''
  error.value = ''
  notice.value = ''
  shake.value = false
}
async function submitForm() {
  if (busy.value || profile.value) return
  error.value = ''
  notice.value = ''
  const value = email.value.trim().toLowerCase()
  if (mode.value === 'signup' && name.value.trim().length < 2) {
    return showError('Use at least 2 characters for your demo name.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return showError('Enter a demo email, such as alex@example.com.')
  }
  if (password.value.length < 4) {
    return showError('Use at least 4 made-up password characters.')
  }
  const existing = accounts.value.find(account => account.email === value)
  if (mode.value === 'signup') {
    if (password.value !== confirmPassword.value) {
      return showError('The two demo password fields must match.')
    }
    if (existing) return showError('This demo email already exists. Sign in instead.')
  } else if (!existing) {
    return showError('Create a demo account with this email first.')
  }
  busy.value = true
  // UI delay only. No request or password verification happens here.
  await new Promise(resolve => { timer = setTimeout(resolve, 1200) })
  if (mode.value === 'signup') {
    const account = { name: name.value.trim(), email: value }
    accounts.value = [...accounts.value, account]
    const saved = saveAccounts(accounts.value)
    email.value = value
    mode.value = 'signin'
    notice.value = saved ? 'Demo account created. Sign in with this email.'
      : 'Demo account created for this tab only. Sign in with this email.'
  } else {
    const saved = saveSession(existing.email)
    profile.value = existing
    notice.value = saved ? '' : 'Signed in for this tab only.'
  }
  password.value = ''
  confirmPassword.value = ''
  shake.value = false
  busy.value = false
}
function logout() {
  const removed = clearSession()
  profile.value = null
  mode.value = 'signin'
  password.value = ''
  confirmPassword.value = ''
  error.value = ''
  shake.value = false
  notice.value = removed ? '' : 'Storage could not be cleared. Check browser settings.'
}
function focusPanel(element) { element.querySelector('[data-heading]')?.focus() }
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <main class="shell">
    <aside class="intro">
      <a class="brand" href="#" @click.prevent>FORM / LAB</a>
      <div class="intro-copy"><p class="eyebrow">SIGN IN &amp; SIGN UP</p>
        <h1>Make the<br>next step<br>feel natural.</h1>
        <p>Two forms. Clear feedback. One smooth experience.</p>
      </div>
      <p class="intro-footer">Web Service Design · English section</p>
    </aside>
    <section class="workspace" aria-label="Sign in and sign up practice">
      <p class="demo-label">LOCAL DEMO</p>
      <Transition name="panel" mode="out-in" @after-enter="focusPanel">
        <section v-if="!profile" :key="mode" class="card-shell" :class="{ 'signup-shell': mode === 'signup' }">
          <div ref="card" class="card" :class="{ 'is-error': shake }">
            <p class="eyebrow">{{ mode === 'signup' ? 'START HERE' : 'WELCOME BACK' }}</p>
            <h2 data-heading tabindex="-1">{{ mode === 'signup' ? 'Sign up.' : 'Sign in.' }}</h2>
            <p class="description">{{ mode === 'signup' ? 'Create a demo profile in this browser.' : 'Use the email from your demo sign-up.' }}</p>
            <form @submit.prevent="submitForm" novalidate :aria-busy="busy">
              <fieldset :disabled="busy">
                <div v-if="mode === 'signup'" class="field"><label for="name">Demo name</label>
                  <input id="name" v-model="name" type="text" autocomplete="off" placeholder="Alex" maxlength="60" :aria-invalid="!!error" aria-describedby="form-error"></div>
                <div class="field"><label for="email">Email</label>
                  <input id="email" v-model="email" type="email" autocomplete="off" placeholder="alex@example.com" maxlength="100" :aria-invalid="!!error" aria-describedby="form-error"></div>
                <div class="field"><label for="password">Demo password</label>
                  <input id="password" v-model="password" type="password" autocomplete="off" placeholder="Any 4+ made-up characters" maxlength="100" :aria-invalid="!!error" aria-describedby="password-help form-error">
                  <small id="password-help">{{ mode === 'signup' ? 'Never saved. Repeat the value below.' : 'Any 4+ characters work. No password check.' }}</small></div>
                <div v-if="mode === 'signup'" class="field"><label for="confirm-password">Confirm demo password</label>
                  <input id="confirm-password" v-model="confirmPassword" type="password" autocomplete="off" placeholder="Repeat the demo value" maxlength="100" :aria-invalid="!!error" aria-describedby="form-error"></div>
                <p id="form-error" class="error-message" role="alert">{{ error }}</p>
                <button class="primary" type="submit" :disabled="busy">
                  <span v-if="busy" class="spinner" aria-hidden="true"></span>
                  <span>{{ busy ? (mode === 'signup' ? 'Creating your profile…' : 'Opening your space…') : (mode === 'signup' ? 'Create demo account' : 'Sign in') }}</span>
                  <span v-if="!busy" aria-hidden="true">→</span>
                </button>
              </fieldset>
            </form>
            <p class="switch-copy">{{ mode === 'signup' ? 'Already have a demo account?' : 'New to the demo?' }}
              <button class="text-button" type="button" :disabled="busy" @click="switchMode(mode === 'signup' ? 'signin' : 'signup')">{{ mode === 'signup' ? 'Sign in' : 'Sign up' }}</button>
            </p>
          </div>
        </section>
        <section v-else key="welcome" class="card-shell">
          <div class="card welcome">
            <p class="eyebrow">YOUR DEMO SPACE</p><h2 data-heading tabindex="-1">Hello, {{ profile.name }}.</h2>
            <p class="description">Your sign-up profile is ready.</p>
            <dl class="profile-details"><dt>Demo email</dt><dd>{{ profile.email }}</dd></dl>
            <p class="reload-hint">Reload to restore this screen. Sign out to return to the form.</p>
            <button class="primary" type="button" @click="logout">Sign out <span aria-hidden="true">↗</span></button>
          </div>
        </section>
      </Transition>
      <p class="notice" role="status">{{ notice }}</p>
      <p class="demo-note">UI practice only. Passwords are not saved or verified.</p>
    </section>
  </main>
</template>
