const api = require('../services/index');
module.exports = {
  async load(page, work) {
    page.setData({ loading: true, error: '' });
    try { await work(); } catch (error) { page.setData({ error: error.message || '暂时无法加载，请重试' }); }
    finally { page.setData({ loading: false }); }
  },
  toast(message) { wx.showToast({ title: message, icon: 'none' }); },
  go(url) { if (getCurrentPages().length >= 8) wx.redirectTo({url}); else wx.navigateTo({ url }); },
  home() { wx.reLaunch({ url: '/pages/home/index' }); },
  share() { return { title: '趣味闯关 · 一起读懂湖南乡村', path: '/pages/home/index', imageUrl: '/assets/v2/landscape.jpg' }; },
  api
};
