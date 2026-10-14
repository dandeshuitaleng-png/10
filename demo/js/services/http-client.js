// The same authenticated contract is used by the browser and WeChat adapter.
class ApiError extends Error {
  constructor(code, message, status = 0) { super(message || code); this.code = code; this.status = status; }
}
class HttpClient {
  constructor({baseUrl = '', transport, token = null} = {}) {
    if (baseUrl && !/^https:\/\//.test(baseUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl)) throw new Error('HTTPS_REQUIRED');
    this.baseUrl = baseUrl.replace(/\/$/, ''); this.transport = transport; this.token = token;
  }
  async request(path, body, method = body === undefined ? 'GET' : 'POST') {
    if (!path.startsWith('/api/')) throw new Error('INVALID_API_PATH');
    const headers = {'Content-Type':'application/json'};
    if (this.token) headers.Authorization = 'Bearer ' + this.token;
    let response;
    try {
      if (this.transport) response = await this.transport({url: this.baseUrl + path, method, headers, body});
      else {
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
        try { const r = await fetch(this.baseUrl + path, {method, headers, credentials: 'same-origin', body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal}); response = {status:r.status, data:await r.json()}; }
        finally { clearTimeout(timer); }
      }
    } catch (_) { throw new ApiError('NETWORK_UNAVAILABLE', '连接暂时中断，请重试。'); }
    if (response.status < 200 || response.status >= 300 || response.data?.error) {
      throw new ApiError(response.data?.error?.code || 'REQUEST_FAILED', response.data?.error?.message || '操作未完成，请重试。', response.status);
    }
    if (!response.data || !Object.prototype.hasOwnProperty.call(response.data, 'data')) throw new ApiError('INVALID_RESPONSE', '服务响应暂不可用。');
    return response.data.data;
  }
}
function wechatTransport(api) {
  return ({url, method, headers, body}) => new Promise((resolve, reject) => {
    api.request({url, method, header:headers, data:body, timeout:12000,
      success:r => resolve({status:r.statusCode, data:r.data}), fail:reject});
  });
}
module.exports = {HttpClient, ApiError, wechatTransport};
