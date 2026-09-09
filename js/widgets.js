/**
 * 小组件数据逻辑：默认占位、双击/点击唤起编辑、原生Blob原画质保存
 */

// 默认占位图（极简高质感 SVG 数据流，无外部网络依赖）
const DEFAULT_PLACEHOLDER = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23D0D2D0'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='16' fill='%23777777' font-family='serif'>SELECT IMAGE</text></svg>";

const DEFAULT_WIDGET_DATA = {
  p1: {
    title: 'Inny',
    desc: 'A violinist who loves to eat and play, he usually likes to go shopping with friends...',
    tag: "It's very close to you",
    imageBlob: null
  },
  p2: {
    month: 'October',
    subtitle: 'My little life.',
    dateTxt: '27/10/2026',
    imageBlob: null,
    avatarBlob: null
  },
  p3: {
    head: 'DAILY MOMENT',
    t1: 'yummy',
    t2: '▶ PLAY LIST',
    t3: '° plog .!',
    imageBlob: null
  }
};

let currentEditingWidget = null;
let temporaryBlobMap = {};

// 初始化并恢复小组件数据
async function loadWidgets() {
  for (const key of ['p1', 'p2', 'p3']) {
    let saved = await window.phoneStorage.getItem(key);
    if (!saved) {
      saved = DEFAULT_WIDGET_DATA[key];
    }
    renderWidgetUI(key, saved);
  }
}

// 渲染到界面
function renderWidgetUI(widgetId, data) {
  if (widgetId === 'p1') {
    document.getElementById('p1-title').textContent = data.title;
    document.getElementById('p1-desc').textContent = data.desc;
    document.getElementById('p1-tag').textContent = data.tag;
    const imgEl = document.getElementById('p1-img');
    imgEl.src = data.imageBlob ? URL.createObjectURL(data.imageBlob) : DEFAULT_PLACEHOLDER;
  }
  
  if (widgetId === 'p2') {
    document.getElementById('p2-month').textContent = data.month;
    document.getElementById('p2-sub').textContent = data.subtitle;
    document.getElementById('p2-date-txt').textContent = data.dateTxt;
    const imgEl = document.getElementById('p2-img');
    imgEl.src = data.imageBlob ? URL.createObjectURL(data.imageBlob) : DEFAULT_PLACEHOLDER;
    const avatarEl = document.getElementById('p2-avatar-img');
    avatarEl.src = data.avatarBlob ? URL.createObjectURL(data.avatarBlob) : DEFAULT_PLACEHOLDER;
  }

  if (widgetId === 'p3') {
    document.getElementById('p3-head').textContent = data.head;
    document.getElementById('p3-t1').textContent = data.t1;
    document.getElementById('p3-t2').textContent = data.t2;
    document.getElementById('p3-t3').textContent = data.t3;
    const imgEl = document.getElementById('p3-img');
    imgEl.src = data.imageBlob ? URL.createObjectURL(data.imageBlob) : DEFAULT_PLACEHOLDER;
  }
}

// 唤起编辑面板
async function openEditor(widgetId) {
  currentEditingWidget = widgetId;
  temporaryBlobMap = {};
  const saved = (await window.phoneStorage.getItem(widgetId)) || DEFAULT_WIDGET_DATA[widgetId];
  
  const titleMap = { p1: '编辑 P1 顶部长卡片', p2: '编辑 P2 日历组件', p3: '编辑 P3 搜索拍立得' };
  document.getElementById('editorModalTitle').textContent = titleMap[widgetId];
  
  const container = document.getElementById('editorDynamicFields');
  container.innerHTML = '';

  if (widgetId === 'p1') {
    container.innerHTML = `
      <div class="edit-field-group">
        <label>更换背景图 (无损高清)</label>
        <input type="file" accept="image/*" id="f-p1-img" />
      </div>
      <div class="edit-field-group">
        <label>主标题</label>
        <input type="text" id="f-p1-title" value="${saved.title || ''}" />
      </div>
      <div class="edit-field-group">
        <label>浮动气泡文字</label>
        <input type="text" id="f-p1-tag" value="${saved.tag || ''}" />
      </div>
      <div class="edit-field-group">
        <label>简介描述</label>
        <textarea id="f-p1-desc" rows="3">${saved.desc || ''}</textarea>
      </div>
    `;
    bindFileInput('f-p1-img', 'imageBlob');
  } else if (widgetId === 'p2') {
    container.innerHTML = `
      <div class="edit-field-group">
        <label>更换大图 (无损高清)</label>
        <input type="file" accept="image/*" id="f-p2-img" />
      </div>
      <div class="edit-field-group">
        <label>更换小头像</label>
        <input type="file" accept="image/*" id="f-p2-avatar" />
      </div>
      <div class="edit-field-group">
        <label>月份英文</label>
        <input type="text" id="f-p2-month" value="${saved.month || ''}" />
      </div>
      <div class="edit-field-group">
        <label>副标题</label>
        <input type="text" id="f-p2-sub" value="${saved.subtitle || ''}" />
      </div>
      <div class="edit-field-group">
        <label>底部日期文字</label>
        <input type="text" id="f-p2-date" value="${saved.dateTxt || ''}" />
      </div>
    `;
    bindFileInput('f-p2-img', 'imageBlob');
    bindFileInput('f-p2-avatar', 'avatarBlob');
  } else if (widgetId === 'p3') {
    container.innerHTML = `
      <div class="edit-field-group">
        <label>更换拍立得照片 (无损高清)</label>
        <input type="file" accept="image/*" id="f-p3-img" />
      </div>
      <div class="edit-field-group">
        <label>栏目标题</label>
        <input type="text" id="f-p3-head" value="${saved.head || ''}" />
      </div>
      <div class="edit-field-group">
        <label>第一行字</label>
        <input type="text" id="f-p3-t1" value="${saved.t1 || ''}" />
      </div>
      <div class="edit-field-group">
        <label>第二行字</label>
        <input type="text" id="f-p3-t2" value="${saved.t2 || ''}" />
      </div>
      <div class="edit-field-group">
        <label>第三行字</label>
        <input type="text" id="f-p3-t3" value="${saved.t3 || ''}" />
      </div>
    `;
    bindFileInput('f-p3-img', 'imageBlob');
  }

  document.getElementById('editorOverlay').classList.add('show');
}

function bindFileInput(elementId, blobKey) {
  setTimeout(() => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // 原文件直接暂存为原始 Blob，绝不进行有损压缩
        temporaryBlobMap[blobKey] = file;
      }
    });
  }, 50);
}

// 保存当前编辑的小组件
async function saveCurrentWidget() {
  if (!currentEditingWidget) return;
  const id = currentEditingWidget;
  const prev = (await window.phoneStorage.getItem(id)) || DEFAULT_WIDGET_DATA[id];

  let payload = { ...prev };

  if (id === 'p1') {
    payload.title = document.getElementById('f-p1-title').value;
    payload.tag = document.getElementById('f-p1-tag').value;
    payload.desc = document.getElementById('f-p1-desc').value;
    if (temporaryBlobMap['imageBlob']) {
      payload.imageBlob = temporaryBlobMap['imageBlob'];
    }
  } else if (id === 'p2') {
    payload.month = document.getElementById('f-p2-month').value;
    payload.subtitle = document.getElementById('f-p2-sub').value;
    payload.dateTxt = document.getElementById('f-p2-date').value;
    if (temporaryBlobMap['imageBlob']) payload.imageBlob = temporaryBlobMap['imageBlob'];
    if (temporaryBlobMap['avatarBlob']) payload.avatarBlob = temporaryBlobMap['avatarBlob'];
  } else if (id === 'p3') {
    payload.head = document.getElementById('f-p3-head').value;
    payload.t1 = document.getElementById('f-p3-t1').value;
    payload.t2 = document.getElementById('f-p3-t2').value;
    payload.t3 = document.getElementById('f-p3-t3').value;
    if (temporaryBlobMap['imageBlob']) payload.imageBlob = temporaryBlobMap['imageBlob'];
  }

  // 存入 IndexedDB
  await window.phoneStorage.setItem(id, payload);
  // 重新渲染视图
  renderWidgetUI(id, payload);
  // 关闭弹窗
  closeEditor();
}

function closeEditor() {
  document.getElementById('editorOverlay').classList.remove('show');
  currentEditingWidget = null;
  temporaryBlobMap = {};
}

// 绑定各组件的双击/长按/点击编辑入口
function initWidgetEvents() {
  ['p1', 'p2', 'p3'].forEach(key => {
    const el = document.getElementById('widget' + key.toUpperCase());
    if (el) {
      // 移动端体验：双击组件进入编辑模式
      el.addEventListener('dblclick', () => openEditor(key));
    }
  });

  document.getElementById('closeEditorBtn').addEventListener('click', closeEditor);
  document.getElementById('saveWidgetBtn').addEventListener('click', saveCurrentWidget);
}
