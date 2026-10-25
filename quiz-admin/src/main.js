import { createApp, h } from 'vue';
import { ElConfigProvider, installUi } from './ui/element-plus.js';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import './style.css';
import App from './App.vue';
const app = createApp({ render: () => h(ElConfigProvider, { locale: zhCn }, () => h(App)) });
app.use(installUi).mount('#app');
