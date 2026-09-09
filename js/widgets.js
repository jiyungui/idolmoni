/**
 * 文案语录随机池（黑白灰高级艺术/文学风）
 */
const RANDOM_QUOTES = [
  { main: "跟我一起看星星吧，一起聊哪里是北极星，哪里是你的星座，哪里是你的曾经。", foot: "【片刻须臾就好】" },
  { main: "日光穿过百叶窗的缝隙，时间在此刻凝滞为一首无声的诗。", foot: "【白日梦境】" },
  { main: "我们都是夜晚的潜水员，在记忆的深海里打捞未拆封的信件。", foot: "【深海沉溺】" },
  { main: "世界喧闹如集市，而我只想在黑白胶片里找寻你的回音。", foot: "【回声效应】" },
  { main: "不用成为谁的月亮，今夜你就是自己旷野上最明澈的星光。", foot: "【旷野无声】" }
];

const DEFAULT_IMG = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'><rect width='100%' height='100%' fill='%23DCDCDC'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='14' fill='%23777' font-family='serif'>RAW IMAGE</text></svg>";

let currentEditingWidget = null;
let temporaryBlobMap = {};

// 随机获取一条语录
function getRandomQuote() {
  return RANDOM_QUOTES[Math.floor(Math.random() * RANDOM_QUOTES.length)];
}

// 加载全部小组件
async function loadWidgets() {
  for (const key of ['p1', 'p2', 'p3', 'story']) {
    let saved = await window.phoneStorage.getItem(key);
    if (!saved) {
      const q = getRandomQuote();
      if (key === 'p1') {
        saved = { title: 'Silence & Wind', desc: `“${q.main}”`, tag: "It's very close to you" };
      } else if (key === 'p2') {
        saved = { month: 'November', subtitle: '片刻的宁静。', dateTxt: '“风吹落一页白昼”' };
      } else if (key === 'p3') {
        saved = { head: 'DAILY ESSAY', t1: 'silent whispers', t2: '▶ 白日梦游记', t3: '“平淡即真实”' };
      } else if (key === 'story') {
        saved = { author: '测试员', subtext: 'If onli I were in your eye...', quote: q.main, footnote: q.foot, timestamp: '2026年06月13日 08:58' };
      }
      await window.phoneStorage.setItem(key, saved);
    }
    renderWidgetUI(key, saved);
  }
}

// 界面渲染
function renderWidgetUI(id, data) {
  if (id === 'p1') {
    document.getElementById('p1-title').textContent = data.title;
    document.getElementById('p1-desc').textContent = data.desc;
    document.getElementById('p1-tag').textContent = data.tag;
    document.getElementById('p1-img').src = data.imageBlob ? URL.createObjectURL(data.imageBlob) : DEFAULT_IMG;
  } else if (id === 'p2') {
    document.getElementById('p2-month').textContent = data.month;
    document.getElementById('p2-sub').textContent = data.subtitle;
    document.getElementById('p2-date-txt').textContent = data.dateTxt;
    document.getElementById('p2-img').src = data.imageBlob ? URL.createObjectURL(data.imageBlob) : DEFAULT_IMG;
    document.getElementById('p2-avatar-img').src = data.avatarBlob ? URL.createObjectURL(data.avatarBlob) : DEFAULT_IMG;
  } else if (id === 'p3') {
    document.getElementById('p3-head').textContent = data.head;
    document.getElementById('p3-t1').textContent = data.t1;
    document.getElementById('p3-t2').textContent = data.t2;
    document.getElementById('p3-t3').textContent = data.t3;
    document.getElementById('p3-img').src = data.imageBlob ? URL.createObjectURL(data.imageBlob) : DEFAULT_IMG;
  } else if (id === 'story') {
    document.getElementById('story-author').textContent = data.author;
    document.getElementById('story-subtext').textContent = data.subtext;
    document.getElementById('story-quote').textContent = data.quote;
    document.getElementById('story-footnote').textContent = data.footnote;
    document.getElementById('story-timestamp').textContent = data.timestamp;
    document.getElementById('story-avatar-img').src = data.avatarBlob ? URL.createObjectURL(data.avatarBlob) : DEFAULT_IMG;
    document.getElementById('story-g1').src = data.g1Blob ? URL.createObjectURL(data.g1Blob) : DEFAULT_IMG;
    document.getElementById('story-g2').src = data.g2Blob ? URL.createObjectURL(data.g2Blob) : DEFAULT_IMG;
    document.getElementById('story-g3').src = data.g3Blob ? URL.createObjectURL(data.g3Blob) : DEFAULT_IMG;
  }
}

// 快速 Re-roll 随机换一句
async function rerollStoryQuote() {
  const saved = (await window.phoneStorage.getItem('story')) || {};
  const q = getRandomQuote();
  saved.quote = q.main;
  saved.footnote = q.foot;
  const now = new Date();
  saved.timestamp = `${now.getFullYear()}年${String(now.getMonth()+1).padStart(2,'0')}月${String(now.getDate()).padStart(2,'0')}日 ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  await window.phoneStorage.setItem('story', saved);
  renderWidgetUI('story', saved);
}

// 弹出编辑面板
async function openEditor(id) {
  currentEditingWidget = id;
  temporaryBlobMap = {};
  const saved = (await window.phoneStorage.getItem(id)) || {};
  const container = document.getElementById('editorDynamicFields');
  container.innerHTML = '';

  if (id === 'p1') {
    document.getElementById('editorModalTitle').textContent = '编辑 P1 顶部长卡片';
    container.innerHTML = `
      <div class="edit-field-group"><label>高清大图 (无损原画质)</label><input type="file" accept="image/*" id="f-p1-img" /></div>
      <div class="edit-field-group"><label>主标题</label><input type="text" id="f-p1-title" value="${saved.title || ''}" /></div>
      <div class="edit-field-group"><label>浮动气泡文字</label><input type="text" id="f-p1-tag" value="${saved.tag || ''}" /></div>
      <div class="edit-field-group"><label>文案语录</label><textarea id="f-p1-desc" rows="3">${saved.desc || ''}</textarea></div>
    `;
    bindFileInput('f-p1-img', 'imageBlob');
  } else if (id === 'p2') {
    document.getElementById('editorModalTitle').textContent = '编辑 P2 日历卡片';
    container.innerHTML = `
      <div class="edit-field-group"><label>背景大图</label><input type="file" accept="image/*" id="f-p2-img" /></div>
      <div class="edit-field-group"><label>圆形小头像</label><input type="file" accept="image/*" id="f-p2-avatar" /></div>
      <div class="edit-field-group"><label>月份/标题</label><input type="text" id="f-p2-month" value="${saved.month || ''}" /></div>
      <div class="edit-field-group"><label>副文案</label><input type="text" id="f-p2-sub" value="${saved.subtitle || ''}" /></div>
      <div class="edit-field-group"><label>底栏语录</label><input type="text" id="f-p2-date" value="${saved.dateTxt || ''}" /></div>
    `;
    bindFileInput('f-p2-img', 'imageBlob');
    bindFileInput('f-p2-avatar', 'avatarBlob');
  } else if (id === 'p3') {
    document.getElementById('editorModalTitle').textContent = '编辑 P3 拍立得卡片';
    container.innerHTML = `
      <div class="edit-field-group"><label>拍立得原画照片</label><input type="file" accept="image/*" id="f-p3-img" /></div>
      <div class="edit-field-group"><label>栏目名</label><input type="text" id="f-p3-head" value="${saved.head || ''}" /></div>
      <div class="edit-field-group"><label>短句 1</label><input type="text" id="f-p3-t1" value="${saved.t1 || ''}" /></div>
      <div class="edit-field-group"><label>短句 2</label><input type="text" id="f-p3-t2" value="${saved.t2 || ''}" /></div>
      <div class="edit-field-group"><label>短句 3</label><input type="text" id="f-p3-t3" value="${saved.t3 || ''}" /></div>
    `;
    bindFileInput('f-p3-img', 'imageBlob');
  } else if (id === 'story') {
    document.getElementById('editorModalTitle').textContent = '编辑 Story Mode 故事卡';
    container.innerHTML = `
      <div class="edit-field-group"><label>作者头像</label><input type="file" accept="image/*" id="f-st-avatar" /></div>
      <div class="edit-field-group"><label>作者名字</label><input type="text" id="f-st-author" value="${saved.author || ''}" /></div>
      <div class="edit-field-group"><label>署名副标</label><input type="text" id="f-st-sub" value="${saved.subtext || ''}" /></div>
      <div class="edit-field-group"><label>画廊图 1 / 2 / 3</label>
        <input type="file" accept="image/*" id="f-st-g1" style="margin-bottom:4px;"/>
        <input type="file" accept="image/*" id="f-st-g2" style="margin-bottom:4px;"/>
        <input type="file" accept="image/*" id="f-st-g3"/>
      </div>
      <div class="edit-field-group"><label>主语录内容</label><textarea id="f-st-quote" rows="3">${saved.quote || ''}</textarea></div>
      <div class="edit-field-group"><label>语录落款</label><input type="text" id="f-st-foot" value="${saved.footnote || ''}" /></div>
    `;
    bindFileInput('f-st-avatar', 'avatarBlob');
    bindFileInput('f-st-g1', 'g1Blob');
    bindFileInput('f-st-g2', 'g2Blob');
    bindFileInput('f-st-g3', 'g3Blob');
  }

  document.getElementById('editorOverlay').classList.add('show');
}

function bindFileInput(id, blobKey) {
  setTimeout(() => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', (e) => {
      if (e.target.files[0]) temporaryBlobMap[blobKey] = e.target.files[0];
    });
  }, 50);
}

// 保存逻辑
async function saveCurrentWidget() {
  if (!currentEditingWidget) return;
  const id = currentEditingWidget;
  const prev = (await window.phoneStorage.getItem(id)) || {};
  let payload = { ...prev };

  if (id === 'p1') {
    payload.title = document.getElementById('f-p1-title').value;
    payload.tag = document.getElementById('f-p1-tag').value;
    payload.desc = document.getElementById('f-p1-desc').value;
    if (temporaryBlobMap['imageBlob']) payload.imageBlob = temporaryBlobMap['imageBlob'];
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
  } else if (id === 'story') {
    payload.author = document.getElementById('f-st-author').value;
    payload.subtext = document.getElementById('f-st-sub').value;
    payload.quote = document.getElementById('f-st-quote').value;
    payload.footnote = document.getElementById('f-st-foot').value;
    if (temporaryBlobMap['avatarBlob']) payload.avatarBlob = temporaryBlobMap['avatarBlob'];
    if (temporaryBlobMap['g1Blob']) payload.g1Blob = temporaryBlobMap['g1Blob'];
    if (temporaryBlobMap['g2Blob']) payload.g2Blob = temporaryBlobMap['g2Blob'];
    if (temporaryBlobMap['g3Blob']) payload.g3Blob = temporaryBlobMap['g3Blob'];
  }

  await window.phoneStorage.setItem(id, payload);
  renderWidgetUI(id, payload);
  closeEditor();
}

function closeEditor() {
  document.getElementById('editorOverlay').classList.remove('show');
  currentEditingWidget = null;
  temporaryBlobMap = {};
}

function initWidgetEvents() {
  // 双击任意组件呼出编辑
  ['p1', 'p2', 'p3'].forEach(k => {
    document.getElementById('widget' + k.toUpperCase()).addEventListener('dblclick', () => openEditor(k));
  });
  document.getElementById('widgetStory').addEventListener('dblclick', () => openEditor('story'));

  // 单击 Story 卡片的 Re-roll 按钮快速换语录
  document.getElementById('storyRerollBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    rerollStoryQuote();
  });

  // P1 右下角圆钮换语录
  document.getElementById('p1-random-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    const p1 = (await window.phoneStorage.getItem('p1')) || {};
    const q = getRandomQuote();
    p1.desc = `“${q.main}”`;
    await window.phoneStorage.setItem('p1', p1);
    renderWidgetUI('p1', p1);
  });

  document.getElementById('closeEditorBtn').addEventListener('click', closeEditor);
  document.getElementById('saveWidgetBtn').addEventListener('click', saveCurrentWidget);
}
