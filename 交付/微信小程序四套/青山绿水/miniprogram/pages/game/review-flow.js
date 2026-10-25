'use strict';
// Review-only fixtures stay separate from player navigation and service state.
const scenarioNames = [
  'home',
  'quiz',
  'selected',
  'correct',
  'revive',
  'locked',
  'result',
  'certificate',
  'long',
  'image',
  'video',
  'long-explanation',
  'empty',
  'failure',
  'disabled',
  'ranking-empty',
  'ranking-failure',
  'save-failure',
  'journey',
  'chapter-2',
  'chapter-3',
  'chapter-4',
  'ranking',
  'ranking-loading',
  'points',
  'points-empty',
  'points-loading',
  'points-failure',
  'certificate-empty',
  'certificate-loading',
  'certificate-failure',
  'certificate-permission',
  'certificate-saved',
  'certificate-share'
];
const scenarioLabels = [
  '首页（重置评审数据）',
  '答题默认',
  '选中答案',
  '答对与解析',
  '答错复活',
  '次数耗尽锁定',
  '本关结算',
  '本游戏证书',
  '长题和两行选项',
  '图片题',
  '视频题',
  '长解析',
  '空目录',
  '加载失败和重试',
  '已完成关卡停用',
  '榜单空数据',
  '榜单加载失败',
  '证书保存失败',
  '关卡探索步道',
  '第2关视觉',
  '第3关视觉',
  '第4关视觉',
  '排行榜',
  '榜单加载中',
  '积分明细',
  '积分无记录',
  '积分加载中',
  '积分加载失败',
  '未获得证书',
  '证书生成中',
  '证书生成失败',
  '相册权限未开启',
  '证书保存成功',
  '证书分享'
];
function createReviewFlow({ service, wx }) {
  return {
    async applyScenario(name) {
      if (!this._review) return;
      this._rankEmpty = name === 'ranking-empty';
      this._certificateReviewState = ['certificate-loading', 'certificate-failure'].includes(name)
        ? name
        : '';
      const certificateScenario = name.startsWith('certificate-') && name !== 'certificate-empty';
      const records = name.startsWith('ranking') || name.startsWith('points'),
        sample = ['ranking', 'points'].includes(name)
          ? 'journey'
          : records || name === 'certificate-empty'
            ? 'home'
            : certificateScenario
              ? 'certificate'
              : name;
      await service.scenario(
        name === 'save-failure' ? 'certificate' : name === 'failure' ? 'home' : sample
      );
      let route = ['home', 'disabled'].includes(name)
        ? 'home'
        : name === 'empty' || name === 'failure' || name === 'journey'
          ? 'levels'
          : ['result', 'complete'].includes(name)
            ? 'result'
            : name.startsWith('certificate') || name === 'save-failure'
              ? 'certificate'
              : name.startsWith('ranking')
                ? 'ranking'
                : name.startsWith('points')
                  ? 'points'
                  : 'quiz';
      this.setData({
        route,
        modal: '',
        recordsLoading: records && name.endsWith('loading'),
        recordsError: records && name.endsWith('failure') ? '连接暂未恢复，请检查网络后重试。' : '',
        error: name === 'failure' ? '当前为加载失败评审状态，请重试。' : '',
        scenarioIndex: Math.max(0, scenarioNames.indexOf(name))
      });
      this.refresh();
      if (['home', 'levels'].includes(route)) wx.nextTick(() => this.focusMap());
      if (name === 'save-failure') this.showModal('save-failure');
      if (this._certificateReviewState)
        this.certificateState({
          certificateImage: '',
          certificateImageLoading: name === 'certificate-loading',
          certificateImageError: name === 'certificate-failure',
          certificateSaveMessage: ''
        });
      if (name === 'certificate-permission') this.showModal('album-permission');
      if (name === 'certificate-saved')
        this.certificateState({ certificateSaveMessage: '证书图片已保存到相册' });
      if (name === 'certificate-share') this.showModal('certificate-share');
    },
    pickScenario(e) {
      this.applyScenario(scenarioNames[Number(e.detail.value)]);
    }
  };
}
module.exports = { scenarioNames, scenarioLabels, createReviewFlow };
