/**
 * dsh-jupyter surface copy: zh is the key source, en mirrors every key.
 */

export const zh = {
  'entry.label': 'Jupyter',
  'entry.tooltip': 'Jupyter 笔记本（浏览 / 编辑 / 运行 .ipynb）',
  'panel.title': 'Jupyter 笔记本',
  'panel.subtitle': '浏览工作区中的 .ipynb，编辑并运行单元格',
  // browser
  'browser.empty': '当前工作区没有 .ipynb 文件。点击「新建笔记本」创建，或打开一个工作区。',
  'browser.noWorkspace': '没有可用的工作区。请先在 DSH 中打开一个项目工作区。',
  'browser.open': '打开',
  'browser.new': '新建笔记本',
  'browser.newPrompt': '笔记本名称（将创建于当前目录）：',
  'browser.refresh': '刷新',
  'browser.up': '上级目录',
  'browser.dir': '目录',
  'browser.notebook': '笔记本',
  'browser.workspace': '工作区',
  'browser.envOk': 'Python 环境就绪',
  'browser.envMissing': '缺少执行环境：{detail}',
  'browser.envHint': '需要 Python 与 jupyter_client、ipykernel（pip install jupyter_client ipykernel）',
  'browser.openFailed': '打开笔记本失败：{error}',
  // editor toolbar
  'editor.save': '保存',
  'editor.saved': '已保存',
  'editor.saveFailed': '保存失败：{error}',
  'editor.run': '运行',
  'editor.runAll': '全部运行',
  'editor.runAllHint': '按顺序运行所有代码单元格（遇错停止）',
  'editor.addBelow': '下方插入',
  'editor.delete': '删除单元格',
  'editor.moveUp': '上移',
  'editor.moveDown': '下移',
  'editor.convert': '切换 代码/Markdown',
  'editor.back': '返回列表',
  'editor.interrupt': '中断内核',
  'editor.restart': '重启内核',
  'editor.shutdown': '关闭内核',
  'editor.kernelReady': '内核就绪',
  'editor.kernelStarting': '内核启动中…',
  'editor.kernelIdle': '内核未启动',
  'editor.startKernel': '启动内核',
  'editor.kernelDead': '内核已退出：{reason}',
  'editor.kernelNoEnv': '执行环境不可用：{detail}',
  'editor.unsaved': '未保存',
  'editor.markdownEdit': '编辑 Markdown（双击预览切换）',
  'editor.codeHint': '代码单元格（Shift+Enter 运行并跳到下一格，Ctrl+Enter 运行）',
  'editor.clearOutputs': '清空输出',
  'editor.executing': '运行中…',
  'editor.execCount': 'Out[{count}]',
  'editor.rawHint': 'raw 单元格：内容原样保存，不参与执行',
  // output
  'output.empty': '（无输出）',
  'output.error': '执行出错',
  // statuses
  'status.busy': '运行中',
  'status.idle': '空闲',
  'status.connecting': '连接内核中…',
  'status.disconnected': '内核未连接',
  // errors
  'error.transport': '无法访问插件接口（/api/dsh-explorer/jupyter）',
  'error.invalidNotebook': '无效的笔记本文件：{error}',
  'error.kernelFailed': '内核启动失败：{error}',
  'common.cancel': '取消',
  'common.close': '关闭',
  'common.loading': '加载中…',
  'common.error': '错误：{error}',
}

export const en: Record<keyof typeof zh, string> = {
  'entry.label': 'Jupyter',
  'entry.tooltip': 'Jupyter notebooks (browse / edit / run .ipynb)',
  'panel.title': 'Jupyter Notebooks',
  'panel.subtitle': 'Browse .ipynb files in your workspace, edit and run cells',
  // browser
  'browser.empty': 'No .ipynb files in the current workspace. Click “New notebook” to create one, or open a workspace.',
  'browser.noWorkspace': 'No workspaces available. Open a project workspace in DSH first.',
  'browser.open': 'Open',
  'browser.new': 'New notebook',
  'browser.newPrompt': 'Notebook name (created in the current directory):',
  'browser.refresh': 'Refresh',
  'browser.up': 'Up',
  'browser.dir': 'Directory',
  'browser.notebook': 'Notebook',
  'browser.workspace': 'Workspace',
  'browser.envOk': 'Python environment ready',
  'browser.envMissing': 'Execution environment missing: {detail}',
  'browser.envHint': 'Requires Python with jupyter_client and ipykernel (pip install jupyter_client ipykernel)',
  'browser.openFailed': 'Failed to open notebook: {error}',
  // editor toolbar
  'editor.save': 'Save',
  'editor.saved': 'Saved',
  'editor.saveFailed': 'Save failed: {error}',
  'editor.run': 'Run',
  'editor.runAll': 'Run All',
  'editor.runAllHint': 'Run every code cell in order (stops on error)',
  'editor.addBelow': 'Add below',
  'editor.delete': 'Delete cell',
  'editor.moveUp': 'Move up',
  'editor.moveDown': 'Move down',
  'editor.convert': 'Code / Markdown',
  'editor.back': 'Back to list',
  'editor.interrupt': 'Interrupt kernel',
  'editor.restart': 'Restart kernel',
  'editor.shutdown': 'Shutdown kernel',
  'editor.kernelReady': 'Kernel ready',
  'editor.kernelStarting': 'Starting kernel…',
  'editor.kernelIdle': 'Kernel not started',
  'editor.startKernel': 'Start kernel',
  'editor.kernelDead': 'Kernel exited: {reason}',
  'editor.kernelNoEnv': 'Execution environment unavailable: {detail}',
  'editor.unsaved': 'Unsaved',
  'editor.markdownEdit': 'Edit Markdown (double-click to toggle preview)',
  'editor.codeHint': 'Code cell (Shift+Enter runs and advances, Ctrl+Enter runs in place)',
  'editor.clearOutputs': 'Clear outputs',
  'editor.executing': 'Running…',
  'editor.execCount': 'Out[{count}]',
  'editor.rawHint': 'raw cell: content is stored as-is, not executed',
  // output
  'output.empty': '(no output)',
  'output.error': 'Execution failed',
  // statuses
  'status.busy': 'Busy',
  'status.idle': 'Idle',
  'status.connecting': 'Connecting to kernel…',
  'status.disconnected': 'Kernel not connected',
  // errors
  'error.transport': 'Cannot reach the plugin API (/api/dsh-explorer/jupyter)',
  'error.invalidNotebook': 'Invalid notebook file: {error}',
  'error.kernelFailed': 'Kernel failed to start: {error}',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.loading': 'Loading…',
  'common.error': 'Error: {error}',
}

/** Locale key union. */
export type JupyterKey = keyof typeof zh

/** Tiny interpolation: {name} -> value. */
export function t(dictionary: Record<string, string>, key: string, values?: Record<string, string | number>): string {
  let text = dictionary[key] ?? key
  if (values !== undefined) {
    for (const [name, value] of Object.entries(values)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}
