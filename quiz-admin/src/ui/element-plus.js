import { defineAsyncComponent } from 'vue';
import {
  ElButton,
  ElConfigProvider,
  ElDescriptionsItem,
  ElIcon,
  ElMenu,
  ElMenuItem,
  ElOption,
  ElTag
} from 'element-plus';
import 'element-plus/es/components/button/style/css';
import 'element-plus/es/components/config-provider/style/css';
import 'element-plus/es/components/icon/style/css';
import 'element-plus/es/components/menu/style/css';
import 'element-plus/es/components/menu-item/style/css';
import 'element-plus/es/components/tag/style/css';
import 'element-plus/es/components/message/style/css';
import 'element-plus/es/components/message-box/style/css';

const groups = [
  {
    load: () => import('./form-components.js'),
    names: [
      'ElColorPicker',
      'ElDialog',
      'ElDivider',
      'ElForm',
      'ElFormItem',
      'ElInput',
      'ElInputNumber',
      'ElRadioButton',
      'ElRadioGroup',
      'ElSelect',
      'ElSwitch'
    ]
  },
  {
    load: () => import('./table-components.js'),
    names: ['ElTable', 'ElTableColumn', 'ElPagination']
  },
  { load: () => import('./detail-components.js'), names: ['ElDescriptions'] }
];

// Navigation is immediately available. Editor, table and detail code/styles are
// fetched when those components are first rendered, preserving the existing UI.
export function installUi(app) {
  // Parent components inspect these slot children by VNode.type.name; keep
  // their real component identity while deferring the heavier parent code.
  for (const component of [
    ElButton,
    ElDescriptionsItem,
    ElIcon,
    ElMenu,
    ElMenuItem,
    ElOption,
    ElTag
  ])
    app.component(component.name, component);
  for (const group of groups)
    for (const name of group.names)
      app.component(
        name,
        defineAsyncComponent(async () => (await group.load())[name])
      );
}
export { ElConfigProvider };
