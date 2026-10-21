'use strict';
// Final art tokens and native UI surfaces; source illustration/brand shapes are separate assets.
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');
const {palettes}=require('../miniprogram/services-v4/visual-feedback');
const home='.game-device.feedback-20261019.activity-page.home-layout';
let css='/* Final art: warm matte material, readable paper, restrained emphasis. */\n';
for(const [id,p] of Object.entries(palettes))css+=`.game-device.feedback-20261019.skin-${id}{--ink:${p.ink};--accent:${p.accent};--pale:${p.light};--muted:${p.muted};--edge:${p.edge};--panel-edge:${p.panelEdge};--route-paper:${p.light};--route-ink:${p.ink};--theme-fill:${p.fill};--button-top:${p.top};--button-bottom:${p.bottom};--panel:linear-gradient(150deg,${p.paper},${p.light});--ribbon-shadow:${p.shadow};background:${p.light};color:${p.ink}}\n`;
css+=`${home} .activity-links>button.activity-shortcut{font-weight:500}
${home} .shortcut-mark{background:#fffdf5c9;box-shadow:none}
${home} button.route-caption{background:#fffcf2f5;border:1px solid #eee1c9;box-shadow:0 2px 5px #69543212;border-radius:13px;padding:6px 10px}
${home} .route-stop.is-reached button.route-caption{background:#fffdf6;border:1px solid var(--panel-edge);box-shadow:0 2px 5px #69543218;color:var(--ink)}
${home} .route-stop.completed button.route-caption{background:#fffdf0ed;border-color:#c6cea8;box-shadow:0 2px 4px #69543210;color:var(--ink)}
${home} .route-stop.locked button.route-caption{background:#fff9e9e8;border-color:#f2e5ce;box-shadow:none;color:#757263}
${home} .route-caption-label{font-size:11px;line-height:15px;color:var(--muted)}
${home} .route-caption-name{font-size:18px;line-height:24px;font-weight:700;text-shadow:none}
${home} .current .route-caption-name{font-size:19px;line-height:25px}
${home} .route-caption-state{font-size:13px;line-height:18px;margin-top:1px;font-weight:500;color:var(--muted)}
${home} .route-caption-reward{font-size:11px;line-height:15px;margin-top:2px;color:var(--muted);background:transparent;border:0;box-shadow:none;padding:0}
${home} .route-stop.locked .route-base{opacity:.8}
${home} .route-number{top:calc(var(--home-node-w) * .55);font-size:17px;line-height:20px;font-weight:800;color:#68583c;text-shadow:0 1px #fff8}
${home} .route-halo{border:2px solid #fff7d6;box-shadow:0 0 0 4px #f8e4aa65;opacity:.9}
${home} .route-stop.today-locked .route-halo{opacity:.72}
${home} .route-node-badge{border-color:#fffaf0;background:var(--paper,#fffdf6);box-shadow:0 1px 3px #66543720,inset 0 0 0 1px var(--edge)}
${home} .route-node-badge.done{background:#6c8a49}
/* Native UI shadow keeps the original character pixels intact. */
${home} button.chapter-mascot::before{content:"";position:absolute;left:29%;right:29%;bottom:0;height:2px;border-radius:50%;box-shadow:0 1px 2px 1px #5f573b26;pointer-events:none}
${home} .chapter-mascot mascot-actor{position:relative;z-index:1}
.game-device.feedback-20261019 .theme-panel{border-width:1px;box-shadow:0 4px 14px #65522e0b,inset 0 1px #fff9}
${home} .theme-panel{border:0;box-shadow:none}
.game-device.feedback-20261019 .white-card{background:#fffdf6;border:1px solid var(--edge);box-shadow:0 2px 5px #6754340d}
.game-device.feedback-20261019 .theme-modal{border:1px solid var(--panel-edge);box-shadow:0 12px 30px #34332430;background:var(--panel);border-radius:22px}
.game-device.feedback-20261019 .theme-modal .chapter-welcome{border:0;box-shadow:none;background:transparent;padding:6px 2px 14px}
.game-device.feedback-20261019 .theme-modal .rule-grid{gap:0;border:1px solid var(--edge);border-radius:12px;background:#ffffff70;overflow:hidden}
.game-device.feedback-20261019 .theme-modal .rule-grid .rule-cell{border:0;border-right:1px solid var(--edge);border-radius:0;box-shadow:none;background:transparent;padding:12px 4px;color:var(--ink)}
.game-device.feedback-20261019 .theme-modal .rule-grid .rule-cell:last-child{border-right:0}
.game-device.feedback-20261019 .theme-modal .rule-grid .b{font-size:25px;line-height:32px;color:var(--ink)}
.game-device.feedback-20261019 .theme-modal .p{font-size:14px;line-height:24px}
.game-device.feedback-20261019 .theme-modal .modal-lead{font-size:17px!important}
.game-device.feedback-20261019 .quest-banner{background:linear-gradient(115deg,#fffdf6,var(--pale));box-shadow:none}
.game-device.feedback-20261019 .option{border-color:var(--edge);background:#fffdf7;box-shadow:0 1px 3px #6754340b}
.game-device.feedback-20261019 .option.selected{background:var(--pale);border-color:var(--accent);box-shadow:0 0 0 1px var(--panel-edge)}
.game-device.feedback-20261019 .option.correct{background:#edf5e5;border-color:#769a5d;color:#35572c;box-shadow:none}
.game-device.feedback-20261019 .profile-badge,.game-device.feedback-20261019 .question-tag{color:var(--ink);border-color:var(--edge)}
@media(max-width:350px){${home} .route-caption-reward{font-size:10px;line-height:14px}${home} .today-locked .route-caption-state{font-size:12px}}
`;
fs.writeFileSync(path.join(root,'miniprogram/pages/game/final-art-20261019.wxss'),css);
let button=`:host{display:block;width:100%;flex-shrink:0}
.game-button{--fill-top:#c18f5b;--fill-bottom:#9b653f;--label:#fffdf5;--button-edge:#d7b38b;--button-shadow:#835b3426;position:relative;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:100%;min-height:52px;min-width:0;max-width:none;margin:0;padding:10px 18px;border:1px solid var(--button-edge);border-radius:26px;background:linear-gradient(180deg,var(--fill-top),var(--fill-bottom));color:var(--label);box-shadow:0 2px 0 var(--button-shadow),inset 0 1px #ffffff80;font:700 17px/24px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;letter-spacing:0;text-shadow:none;transition:transform .12s,box-shadow .12s}
`;
for(const [id,p] of Object.entries(palettes))button+=`.game-button.skin-${id}{--fill-top:${p.top};--fill-bottom:${p.bottom};--label:${p.buttonText};--button-edge:${p.buttonEdge};--button-shadow:${p.shadow}}\n`;
button+=`.game-button.game-button{width:100%;max-width:none;min-width:0;margin:0;flex:1}
.game-button.game-button::after{content:none;display:none;border:0;box-shadow:none}
.button-inset{display:none}.button-label{position:relative;z-index:1}
.game-button.secondary{min-height:44px;background:#fffdf6;color:var(--secondary-label,#5a4a31);border-color:var(--button-edge);box-shadow:none;font-size:15px;border-radius:22px}
.game-button.primary.is-home-action{height:52px;min-height:52px;padding:9px 12px;gap:10px;font-size:16px;line-height:22px;overflow:hidden}
.is-home-action .button-label{display:block;flex:1;min-width:0;text-align:center;white-space:nowrap}
.action-emblem{position:relative;display:flex;align-items:center;justify-content:center;flex:0 0 30px;box-sizing:border-box;width:30px;height:30px;border:1px solid #ffffff65;border-radius:9px;background:#ffffff21;box-shadow:inset 0 1px #ffffff45}
.action-emblem image{display:block;width:21px;height:21px}
.action-forward{display:flex;align-items:center;justify-content:center;flex:0 0 26px;box-sizing:border-box;width:26px;height:26px;border:1px solid #ffffff75;border-radius:50%;background:#ffffff20}
.action-forward image{display:block;width:13px;height:13px}
.game-button.pressed{transform:translateY(2px);box-shadow:0 1px 0 var(--button-shadow),inset 0 1px 2px #4d3b2418}
.game-button[disabled]{background:#e2e2d7;color:#676c5b;border-color:#eae8da;box-shadow:none;text-shadow:none}
.game-button[disabled] .action-emblem,.game-button[disabled] .action-forward{opacity:.55}
@media(max-width:350px){.game-button.primary.is-home-action{font-size:15px;padding-left:10px;padding-right:10px;gap:8px}}
@media(prefers-reduced-motion:reduce){.game-button{transition:none}}
`;
for(const [id,p] of Object.entries(palettes))button+=`.game-button.secondary.skin-${id}{--secondary-label:${p.ink}}\n`;
fs.writeFileSync(path.join(root,'miniprogram/components/game-button/index.wxss'),button);
console.log('Built final native art tokens and button surfaces from visual-feedback palettes');
