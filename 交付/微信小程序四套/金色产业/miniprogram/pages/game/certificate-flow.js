'use strict';
const certificateArt = require('../../services-v4/certificate-art');

// Page-bound certificate state and platform album permissions stay together.
function createCertificateFlow({ wx, getSkin }) {
  return {
    certificateFooter() {
      return {
        footerPrimary: this.data.certificateImageLoading
          ? '正在生成证书…'
          : this.data.certificateImageError
            ? '重新生成证书'
            : '保存证书图片',
        footerAction: this.data.certificateImageError ? 'retry-certificate' : 'save',
        footerDisabled: this.data.certificateImageLoading,
        footerSecondary: '分享学习成果',
        secondaryAction: 'share-cert'
      };
    },
    certificateState(patch) {
      if (!this._alive) return;
      this.setData(patch);
      if (this.data.route === 'certificate' && this.data.certificate)
        this.setData(this.certificateFooter());
    },
    previewCertificate() {
      const file = this.data.certificateImage;
      if (!file || !wx.previewImage) return;
      wx.previewImage({
        current: file,
        urls: [file],
        fail: (e) => {
          if (this._alive && this.data.route === 'certificate' && !/cancel/i.test(e.errMsg || ''))
            this.toast('暂未打开预览，请稍后重试');
        }
      });
    },
    certificateImageFailed(e) {
      const file = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.src;
      if (file && file !== this.data.certificateImage) return;
      this.certificateState({
        certificateImage: '',
        certificateImageLoading: false,
        certificateImageError: true,
        certificateSaveMessage: ''
      });
      this._certificateImageLost = true;
    },
    prepareCertificate(force = false) {
      const c = this.data.certificate;
      if (!c) return Promise.reject(Error('NO_CERTIFICATE'));
      const document = certificateArt.model(c, getSkin()),
        key = JSON.stringify(document);
      if (!force && this._certificateKey === key && this._certificateTask)
        return this._certificateImageLost
          ? Promise.reject(Error('CERTIFICATE_IMAGE_LOST'))
          : this._certificateTask;
      if (force) this._certificateReviewState = '';
      this._certificateImageLost = false;
      this._certificateKey = key;
      const generation = (this._certificateGeneration = (this._certificateGeneration || 0) + 1);
      this.certificateState({
        certificateImage: '',
        certificateImageLoading: true,
        certificateImageError: false,
        certificateSaveMessage: ''
      });
      const previous = this._certificateQueue || Promise.resolve();
      const task = previous
        .catch(() => {})
        .then(() => certificateArt.render(wx, this, document))
        .then((result) => {
          if (
            this._alive &&
            key === this._certificateKey &&
            generation === this._certificateGeneration
          )
            this.certificateState({
              certificateImage: result.filePath,
              certificateImageRatio: result.height / result.width,
              certificateImageLoading: false,
              certificateImageError: false
            });
          return result.filePath;
        })
        .catch((error) => {
          if (
            this._alive &&
            key === this._certificateKey &&
            generation === this._certificateGeneration
          )
            this.certificateState({ certificateImageLoading: false, certificateImageError: true });
          throw error;
        });
      this._certificateQueue = task;
      this._certificateTask = task;
      return task;
    },
    albumPermission() {
      return new Promise((resolve) => {
        if (!wx.getSetting) return resolve(undefined);
        wx.getSetting({
          success: (r) => resolve((r.authSetting || {})['scope.writePhotosAlbum']),
          fail: () => resolve(undefined)
        });
      });
    },
    openAlbumSettings() {
      if (this.data.busy) return;
      this.setData({ busy: true });
      const failed = (e) => {
        if (this._alive)
          this.toast(
            e && e.code === 'BROWSER_PREVIEW_UNSUPPORTED'
              ? '请在微信中打开相册设置'
              : '暂未打开设置，请稍后重试'
          );
      };
      if (!wx.openSetting) {
        this.setData({ busy: false });
        failed();
        return;
      }
      // Called directly by the explicit settings button, before any await.
      try {
        wx.openSetting({
          success: (r) => {
            if (!this._alive) return;
            if ((r.authSetting || {})['scope.writePhotosAlbum'] === true) {
              this.setData({ modal: '' });
              this.toast('权限已开启，请再次点击保存');
            } else this.toast('相册权限尚未开启');
          },
          fail: failed,
          complete: () => {
            if (this._alive) this.setData({ busy: false });
          }
        });
      } catch (e) {
        this.setData({ busy: false });
        failed(e);
      }
    },
    async saveCertificate() {
      if (!this.data.certificate || this.data.busy) return;
      const certificateId = this.data.certificate.id;
      let stage = 'generate';
      this.setData({ busy: true, modal: '', certificateSaveMessage: '' });
      const current = () =>
        this._alive &&
        this.data.route === 'certificate' &&
        this.data.certificate &&
        this.data.certificate.id === certificateId;
      try {
        const filePath = await this.prepareCertificate();
        if (!current()) return;
        const allowed = await this.albumPermission();
        if (!current()) return;
        if (allowed === false) {
          this.showModal('album-permission');
          return;
        }
        stage = 'album';
        const result = await new Promise((resolve, reject) =>
          wx.saveImageToPhotosAlbum({ filePath, success: resolve, fail: reject })
        );
        if (current()) {
          const message =
            result && result.destination === 'download'
              ? '已发起证书图片下载'
              : '证书图片已保存到相册';
          this.certificateState({ certificateSaveMessage: message });
          this.toast(message);
        }
      } catch (e) {
        if (current() && stage === 'album') {
          const message = String((e && e.errMsg) || (e && e.message) || '');
          if (/cancel/i.test(message)) this.toast('已取消保存，可随时再试');
          else if (
            /auth(?:orize)?[ :_-]*(?:deny|denied)|permission|access[ :_-]*denied/i.test(message)
          )
            this.showModal('album-permission');
          else this.showModal('save-failure');
        }
      } finally {
        if (this._alive) this.setData({ busy: false });
      }
    }
  };
}
module.exports = { createCertificateFlow };
