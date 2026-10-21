/* Read-only browser evidence helper. Evaluate this function through the browser
 * tool after real UI actions; it does not select answers, change state or scroll. */
function inspectNativeLayout() {
  const visible = element => { const rectangle = element.getBoundingClientRect(), style = getComputedStyle(element); return rectangle.width > 0 && rectangle.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'; };
  const bounds = element => { if (!element) return null; const rectangle = element.getBoundingClientRect(); return Object.fromEntries(['left', 'top', 'right', 'bottom', 'width', 'height'].map(key => [key, Number(rectangle[key].toFixed(2))])); };
  const shell = document.querySelector('.game-device'), body = document.querySelector('.panel-body'), footer = document.querySelector('.panel-footer'), fixed = document.querySelector('.quiz-fixed');
  const options = [...document.querySelectorAll('.option')].filter(visible);
  const imageErrors = [...document.querySelectorAll('img')].filter(visible).filter(image => image.complete && image.naturalWidth === 0).map(image => image.getAttribute('src'));
  const activeButtons = [...document.querySelectorAll('button')].filter(visible);
  const undersizedButtons = activeButtons.filter(button => { const rectangle = button.getBoundingClientRect(); return rectangle.width < 43.5 || rectangle.height < 43.5; }).map(button => ({ text: button.textContent.trim().slice(0, 40), className: button.className, bounds: bounds(button) }));
  const bodyBounds = bounds(body), footerBounds = bounds(footer), fixedBounds = bounds(fixed);
  return {
    scope: 'Read-only actual WXML/WXSS browser layout; not WeChat simulator or device evidence',
    viewport: { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth },
    route: shell?.dataset?.route || null, gameId: shell?.dataset?.game || null, modal: shell?.dataset?.modal || '',
    visibleText: document.querySelector('#app')?.innerText?.slice(0, 1500) || '',
    layout: { shell: bounds(shell), scrollViewport: bodyBounds, footer: footerBounds, quizFixed: fixedBounds, scrollTop: body?.scrollTop || 0, scrollHeight: body?.scrollHeight || 0, scrollClientHeight: body?.clientHeight || 0 },
    images: { visible: [...document.querySelectorAll('img')].filter(visible).length, failed: imageErrors },
    options: options.map(option => ({ text: option.textContent.trim(), bounds: bounds(option), fontSize: getComputedStyle(option.querySelector('.option-text') || option).fontSize, whiteSpace: getComputedStyle(option.querySelector('.option-text') || option).whiteSpace })),
    buttons: { visible: activeButtons.length, undersized: undersizedButtons },
    checks: {
      noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth + 1,
      imagesLoadedWithoutFailure: imageErrors.length === 0,
      footerWithinViewport: !footerBounds || footerBounds.bottom <= innerHeight + 1 && footerBounds.left >= -1 && footerBounds.right <= innerWidth + 1,
      scrollDoesNotExtendBehindFooter: !bodyBounds || !footerBounds || bodyBounds.bottom <= footerBounds.top + 1,
      quizHeaderSeparateFromScrollableContent: !fixedBounds || !bodyBounds || fixedBounds.bottom <= bodyBounds.top + 1,
      optionHeightsUniform: options.length < 2 || Math.max(...options.map(option => option.getBoundingClientRect().height)) - Math.min(...options.map(option => option.getBoundingClientRect().height)) < 1,
      questionUses20px: !document.querySelector('.question-title') || getComputedStyle(document.querySelector('.question-title')).fontSize === '20px',
      allButtonsHave44pxTargets: undersizedButtons.length === 0
    }
  };
}
if (typeof module !== 'undefined') module.exports = inspectNativeLayout;
