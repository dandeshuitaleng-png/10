'use strict';
// Reference-matched native surfaces. Supplied title/IP art remains separate and unchanged.
const fs=require('node:fs'),path=require('node:path');
const project=path.resolve(__dirname,'..'),{palettes}=require('../miniprogram/services-v4/visual-feedback');
const shell='.game-device.feedback-20261019',home=shell+'.activity-page.home-layout';
let css='/* 2026-10-20: sampled from the supplied red/green/gold reference panels. */\n';
for(const [id,p] of Object.entries(palettes))css+=`${shell}.skin-${id}{--ink:${p.ink};--accent:${p.accent};--pale:${p.light};--muted:${p.muted};--edge:${p.edge};--panel-edge:${p.panelEdge};--route-paper:${p.light};--route-ink:${p.ink};--theme-fill:${p.fill};--button-top:${p.top};--button-bottom:${p.bottom};--panel:linear-gradient(165deg,${p.panelTop},${p.panelBottom} 68%);--ribbon-shadow:${p.shadow};--reference-frame:${p.frameWidth}px;background:${p.light};color:${p.ink}}\n`;
css+=`${home} .activity-header{background:var(--pale)}
${home}.skin-industry .home-title-label .activity-title,${shell}.skin-industry .theme-heading .h1,${shell}.skin-industry .modal-decoration .modal-game-name{color:#674310;text-shadow:0 1px #fff2aa;font-family:-apple-system,"PingFang SC",sans-serif}
${home}.skin-industry .home-title-label .activity-title{font-size:24px;font-weight:800;letter-spacing:1px}
${shell}.skin-industry .theme-heading .h1{font-size:23px;font-weight:800;letter-spacing:1px}
${shell}.skin-industry .modal-decoration .modal-game-name{font-size:22px;font-weight:800;letter-spacing:1px}
${home} .activity-links{box-shadow:inset 0 1px 0 var(--edge)}
${home} .activity-links>button.activity-shortcut{color:var(--ink);font-weight:500;gap:5px}
${home} .activity-links .shortcut-mark{width:24px;height:26px;border:0;border-radius:0;background:transparent;box-shadow:none}
${home} .activity-links .shortcut-mark game-icon{width:21px;height:21px;opacity:1}
${home} .activity-shortcut.shortcut-pressed{background:#ffffffb3}
${home} button.route-caption{background:#fffffffa;border:1px solid #ffffff;border-radius:14px;padding:6px 10px;box-shadow:0 2px 5px #45602b1a;color:var(--ink)}
${home} .route-stop.locked button.route-caption{background:#ffffffef;border-color:#ffffff;box-shadow:0 2px 4px #45602b10;color:var(--ink)}
${home} .route-stop.is-reached button.route-caption{background:#ffffff;border:2px solid var(--panel-edge);padding:5px 9px;box-shadow:0 3px 6px #45602b1e;color:var(--ink)}
${home} .route-stop.completed button.route-caption{background:#fffffffa;border-color:#b7dfa3;box-shadow:0 2px 4px #45602b12;color:var(--ink)}
${home} .route-caption-label{font-size:11px;line-height:15px;color:var(--muted);font-weight:500}
${home} .route-caption-name{font-size:18px;line-height:24px;font-weight:700;text-shadow:none}
${home} .route-stop.locked .route-caption-name{font-size:17px;font-weight:600;color:var(--muted)}
${home} .route-stop.is-reached .route-caption-name{font-size:19px;line-height:25px;font-weight:800}
${home} .route-caption-state{font-size:13px;line-height:18px;margin-top:1px;font-weight:500;color:var(--muted)}
${home} .route-stop.is-reached .route-caption-state{color:var(--accent);font-weight:700}
${home} .route-caption-reward{font-size:11px;line-height:15px;margin-top:2px;color:var(--muted);padding:0;background:transparent;border:0;box-shadow:none}
${home} .route-stop .route-base,${home} .route-stop.locked .route-base{opacity:1}
${home} .route-number{top:calc(var(--home-node-w) * .55);font-size:17px;line-height:20px;font-weight:800;color:#6a5728;text-shadow:0 1px #fff8}
${home} .route-halo{border:2px solid #fff7cf;box-shadow:0 0 0 3px #f6d85e60;opacity:.95}
${home} .route-stop.today-locked .route-halo{opacity:.85}
${home} .route-node-badge{background:#ffffff;border:2px solid #ffffff;box-shadow:0 1px 3px #3e651d29,inset 0 0 0 1px var(--edge)}
${home} .route-node-badge.done{background:#5aaf3c}
${home} button.chapter-mascot::before{content:"";position:absolute;left:28%;right:28%;bottom:0;height:2px;border-radius:50%;box-shadow:0 1px 2px 1px #7c6b3229;pointer-events:none}
${home} .chapter-mascot mascot-actor{position:relative;z-index:1}
${home} .panel-footer{background:var(--pale);border-top:1px solid var(--edge)}
${shell} .theme-panel{border:var(--reference-frame) solid var(--panel-edge);border-radius:20px;background:var(--panel);box-shadow:0 5px 14px #3153200c,inset 0 0 0 1px #fff9}
${home} .theme-panel{border:0;border-radius:0;background:transparent;box-shadow:none}
${shell} .white-card{background:#ffffff;border:1px solid #ffffff;border-radius:16px;box-shadow:0 2px 5px #36572312}
${shell} .theme-modal{border:var(--reference-frame) solid var(--panel-edge);border-radius:22px;background:var(--panel);box-shadow:0 10px 24px #214b1b2b,inset 0 0 0 1px #ffffffc4}
${shell} .theme-modal .chapter-welcome{background:#ffffff;border:0;border-radius:15px;box-shadow:0 2px 5px #3657230c;padding:12px 10px;margin-bottom:12px}
${shell} .theme-modal .rule-grid{gap:0;border:0;border-radius:14px;background:#ffffff;overflow:hidden;box-shadow:0 2px 4px #3657230b}
${shell} .theme-modal .rule-grid .rule-cell{background:transparent;border:0;border-right:1px solid var(--edge);border-radius:0;box-shadow:none;padding:10px 4px;color:var(--ink)}
${shell} .theme-modal .rule-grid .rule-cell:last-child{border-right:0}
${shell} .theme-modal .rule-grid .b{font-size:25px;line-height:32px;color:var(--ink)}
${shell} .theme-modal .p{font-size:14px;line-height:24px}
${shell} .theme-modal .modal-lead{font-size:17px!important}
${shell} .modal-topbar button.modal-close{top:-12px;right:4px;width:44px;min-width:44px;height:44px;min-height:44px;background:transparent;border:0;box-shadow:none}
${shell} .modal-topbar .modal-close::before{display:none}
${shell} .modal-topbar .modal-close game-icon{width:19px;height:19px}
${shell} .modal-topbar .modal-close.small-button-pressed{background:#ffffff80}
${shell} .quest-banner{background:#ffffff;border:0;box-shadow:0 2px 5px #3657230b}
${shell} .question-card{background:#ffffff;border:1px solid #ffffff;box-shadow:0 2px 5px #36572312}
${shell} .option{border:1px solid var(--edge);border-radius:28px;clip-path:none;background:#ffffff;box-shadow:0 1px 3px #3657230a}
${shell} .option.selected{border-color:var(--accent);background:var(--pale);box-shadow:0 0 0 1px var(--accent)}
${shell} .option.correct{background:#ecfae8;border-color:#71b157;color:#2d6120;box-shadow:none}
${shell} .profile-badge,${shell} .question-tag{color:var(--ink);border-color:var(--edge)}
${shell} .segmented .tab.active{background:var(--accent);color:#ffffff}
${shell} .state-block{color:var(--ink)}
@media(max-width:350px){${home} .route-caption-reward{font-size:10px;line-height:14px}${home} .today-locked .route-caption-state{font-size:12px}${shell} .theme-modal .chapter-welcome{padding:8px}}
`;
fs.writeFileSync(path.join(project,'miniprogram/pages/game/reference-20261020.wxss'),css);
let button=`:host{display:block;width:100%;flex-shrink:0}
.game-button{--fill-top:#a85f2a;--fill-bottom:#8d451b;--fill-angle:180deg;--label:#fff;--button-edge:#c98245;--button-shadow:#a3632630;position:relative;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:100%;min-width:0;max-width:none;min-height:52px;margin:0;padding:10px 18px;border:1px solid var(--button-edge);border-radius:26px;background:linear-gradient(var(--fill-angle),var(--fill-top),var(--fill-bottom));color:var(--label);box-shadow:0 2px 0 var(--button-shadow),inset 0 1px #ffffffb0;font:800 19px/26px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;letter-spacing:0;text-shadow:none;transition:transform .12s,box-shadow .12s}
`;
for(const [id,p] of Object.entries(palettes))button+=`.game-button.skin-${id}{--fill-top:${p.top};--fill-bottom:${p.bottom};--fill-angle:${p.buttonAngle};--label:${p.buttonText};--button-edge:${p.buttonEdge};--button-shadow:${p.shadow};--secondary-label:${p.ink}}\n`;
button+=`.game-button.game-button{width:100%;max-width:none;min-width:0;margin:0;flex:1}
.game-button.game-button::after{content:none;display:none;border:0;box-shadow:none}
.button-inset{display:none}.button-label{position:relative;z-index:1}
.game-button.secondary{min-height:44px;background:#ffffff;color:var(--secondary-label);border-color:var(--button-edge);box-shadow:none;font-size:15px;line-height:22px;font-weight:600;border-radius:22px}
.game-button.primary.is-home-action{height:52px;min-height:52px;padding:9px 16px;gap:10px;font-size:19px;line-height:26px;overflow:hidden}
.is-home-action .button-label{display:block;flex:1;min-width:0;text-align:center;white-space:nowrap}
.action-emblem{position:relative;display:flex;align-items:center;justify-content:center;flex:0 0 24px;box-sizing:border-box;width:24px;height:26px;border:0;border-radius:0;background:transparent;box-shadow:none}
.action-emblem image{display:block;width:23px;height:23px}
.action-forward{display:flex;align-items:center;justify-content:center;flex:0 0 16px;box-sizing:border-box;width:16px;height:26px;border:0;border-radius:0;background:transparent;box-shadow:none}
.action-forward image{display:block;width:15px;height:15px}
.game-button.pressed{transform:translateY(2px);box-shadow:0 0 0 var(--button-shadow),inset 0 2px 4px #28531615}
.game-button[disabled]{background:#e4eadf;color:#677360;border-color:#dce5d5;box-shadow:none}
.game-button[disabled] .button-label{color:#687262;opacity:1}
.game-button[disabled] .action-emblem,.game-button[disabled] .action-forward{opacity:.55}
@media(max-width:350px){.game-button.primary.is-home-action{padding-left:12px;padding-right:12px;gap:8px}.action-emblem{flex-basis:22px;width:22px}.action-emblem image{width:21px;height:21px}}
@media(prefers-reduced-motion:reduce){.game-button{transition:none}}
`;
fs.writeFileSync(path.join(project,'miniprogram/components/game-button/index.wxss'),button);
console.log('Built reference-matched UI and native buttons from sampled palettes.');
