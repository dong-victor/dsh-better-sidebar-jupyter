/**
 * Python / Jupyter environment detection for the notebook kernel. The kernel
 * runs through a Python bridge process (python/bridge.py) that uses
 * jupyter_client + ipykernel, so the plugin reports precisely what is missing
 * when execution cannot start.
 * @module dsh-jupyter/host/env
 */

import { spawn } from 'node:child_process'

/** Python interpreter resolution order: env var override, then `python`. */
export function resolvePythonCommand(): string {
  return process.env.DSH_JUPYTER_PYTHON ?? 'python'
}

export interface EnvReport {
  python: { ok: boolean; executable: string; version: string } | { ok: false; executable: string; error: string }
  jupyter: { ok: boolean; clientVersion: string; ipykernelVersion: string } | { ok: false; error: string }
  checkedAt: number
}

const DETECT_SCRIPT = [
  'import json, sys',
  'out = {"executable": sys.executable, "version": sys.version.split()[0]}',
  'try:',
  '    import jupyter_client, ipykernel',
  '    out["jupyter_client"] = jupyter_client.__version__',
  '    out["ipykernel"] = ipykernel.__version__',
  'except Exception as e:',
  '    out["jupyter_error"] = str(e)',
  'print(json.dumps(out))',
].join('\n')

const lastCache = new Map<string, { at: number; report: EnvReport }>()

/**
 * Detect the Python/Jupyter environment, caching for `ttlMs` (kernel-heavy
 * detection is not free).
 */
export function detectEnv(ttlMs = 30_000): Promise<EnvReport> {
  const python = resolvePythonCommand()
  const cached = lastCache.get(python)
  if (cached !== undefined && Date.now() - cached.at < ttlMs) return Promise.resolve(cached.report)
  return new Promise((resolve) => {
    const report: EnvReport = {
      python: { ok: false, executable: python, error: '' },
      jupyter: { ok: false, error: '' },
      checkedAt: Date.now(),
    }
    let stdout = ''
    let stderr = ''
    let settled = false
    const finish = (): void => {
      if (settled) return
      settled = true
      if (!report.python.ok) report.jupyter = { ok: false, error: report.python.ok ? '' : 'python unavailable' }
      lastCache.set(python, { at: Date.now(), report })
      resolve(report)
    }
    let child: ReturnType<typeof spawn>
    try {
      child = spawn(python, ['-c', DETECT_SCRIPT], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      })
    } catch (error) {
      report.python = { ok: false, executable: python, error: error instanceof Error ? error.message : String(error) }
      finish()
      return
    }
    const timer = setTimeout(() => {
      try { child.kill() } catch { /* gone */ }
    }, 10_000)
    child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8') })
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8') })
    child.on('error', (error) => {
      clearTimeout(timer)
      report.python = { ok: false, executable: python, error: error.message }
      finish()
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        report.python = { ok: false, executable: python, error: (stderr.trim() || `exit code ${String(code)}`).slice(0, 400) }
        finish()
        return
      }
      report.python = { ok: true, executable: python, version: 'unknown' }
      try {
        const parsed = JSON.parse(stdout) as Record<string, string>
        if (typeof parsed.version === 'string') report.python = { ok: true, executable: python, version: parsed.version }
        if (typeof parsed.jupyter_client === 'string' && typeof parsed.ipykernel === 'string') {
          report.jupyter = { ok: true, clientVersion: parsed.jupyter_client, ipykernelVersion: parsed.ipykernel }
        } else {
          report.jupyter = { ok: false, error: parsed.jupyter_error ?? 'jupyter_client/ipykernel not importable' }
        }
      } catch {
        report.jupyter = { ok: false, error: 'unparseable detection output' }
      }
      finish()
    })
  })
}
