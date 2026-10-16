import { createApp } from 'vue'
import App from './App.vue'
import './base.css'
import './motion.css'
import { initFx } from './fx.js'
createApp(App).mount('#app')
initFx()
