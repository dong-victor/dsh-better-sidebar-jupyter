import { mkdir, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { WebSocket, WebSocketServer } from "ws";
//#region src/host/jupyter/notebook.ts
/**
* Notebook filesystem service: read, write, validate, and enumerate .ipynb
* files under the workspace gate. All paths crossing this service are
* canonical (already passed through the gate).
* @module dsh-jupyter/host/notebook
*/
/** Parse errors carry a readable message. */
var NotebookError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "NotebookError";
	}
};
/** Build a fresh empty notebook (nbformat 4.5, one empty code cell). */
function emptyNotebook() {
	return {
		cells: [{
			cell_type: "code",
			execution_count: null,
			metadata: {},
			outputs: [],
			source: ""
		}],
		metadata: {
			kernelspec: {
				display_name: "Python 3",
				language: "python",
				name: "python3"
			},
			language_info: {
				name: "python",
				version: "3"
			}
		},
		nbformat: 4,
		nbformat_minor: 5
	};
}
/** Validate a parsed notebook; throws NotebookError when malformed. */
function validateNotebook(value) {
	if (typeof value !== "object" || value === null) throw new NotebookError("notebook is not a JSON object");
	const nb = value;
	if (!Array.isArray(nb.cells)) throw new NotebookError("notebook has no cells array");
	const cells = [];
	for (const raw of nb.cells) {
		if (typeof raw !== "object" || raw === null) throw new NotebookError("a cell is not a JSON object");
		const cell = raw;
		const type = cell.cell_type;
		if (type !== "code" && type !== "markdown" && type !== "raw") throw new NotebookError(`unknown cell_type ${String(type)}`);
		const source = normalizeSource(cell.source);
		const normalized = {
			...cell,
			source
		};
		if (type === "code") {
			if (!Array.isArray(cell.outputs)) normalized.outputs = [];
			if (typeof cell.execution_count !== "number" && cell.execution_count !== null) normalized.execution_count = null;
		}
		cells.push(normalized);
	}
	return {
		cells,
		metadata: typeof nb.metadata === "object" && nb.metadata !== null ? nb.metadata : {},
		nbformat: typeof nb.nbformat === "number" ? nb.nbformat : 4,
		nbformat_minor: typeof nb.nbformat_minor === "number" ? nb.nbformat_minor : 5
	};
}
/** A cell source may be a string or a list of strings; join into one string. */
function normalizeSource(source) {
	if (typeof source === "string") return source;
	if (Array.isArray(source)) return source.map((part) => typeof part === "string" ? part : String(part)).join("");
	return source === void 0 || source === null ? "" : String(source);
}
/** Serialize a notebook the way Jupyter writes it: 2-space indent + newline. */
function serializeNotebook(nb) {
	return JSON.stringify(validateNotebook(nb), null, 2) + "\n";
}
/** Parse notebook bytes; throws NotebookError on malformed JSON. */
function parseNotebook(text) {
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch (error) {
		throw new NotebookError(`invalid notebook JSON: ${error instanceof Error ? error.message : String(error)}`);
	}
	return validateNotebook(parsed);
}
/**
* The notebook fs service. Every public method takes an already-gated
* canonical path.
*/
var NotebookFs = class {
	/** Read and validate a notebook file. */
	async read(path) {
		let text;
		try {
			text = await readFile(path, "utf8");
		} catch (error) {
			throw new NotebookError(`cannot read notebook: ${error instanceof Error ? error.message : String(error)}`);
		}
		return parseNotebook(text);
	}
	/** Validate and write a notebook file (atomic-ish: temp + rename not needed on loopback, keep simple). */
	async write(path, nb) {
		const payload = serializeNotebook(nb);
		try {
			await writeFile(path, payload, "utf8");
		} catch (error) {
			throw new NotebookError(`cannot write notebook: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	/** Create a new empty notebook at dir/name.ipynb; returns the absolute path. */
	async create(dir, name) {
		let filename = name.trim().replace(/[\\/:*?"<>|]/g, "_");
		if (!/\.ipynb$/i.test(filename)) filename += ".ipynb";
		const path = join(dir, filename);
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, serializeNotebook(emptyNotebook()), "utf8");
		return path;
	}
	/**
	* Persist a completed cell execution into the notebook file (background
	* execution log). Locates the cell by its stable `id` (nbformat 4.5), falling
	* back to the cell index the client captured when the run started, then to
	* the executed source text. Writes the collected outputs + execution count
	* and records the cell id so later runs match directly.
	* @returns true when the notebook was updated on disk.
	*/
	async applyOutputs(path, cellId, index, source, outputs, executionCount) {
		let nb;
		try {
			nb = await this.read(path);
		} catch {
			return false;
		}
		const cells = nb.cells;
		let target;
		if (cellId !== "") target = cells.find((cell) => cell.id === cellId);
		if (target === void 0 && index >= 0 && index < cells.length) target = cells[index];
		if (target === void 0) target = cells.find((cell) => normalizeSource(cell.source) === source);
		if (target === void 0 || target.cell_type !== "code") return false;
		const updated = {
			...target,
			id: cellId,
			outputs,
			execution_count: executionCount
		};
		cells[cells.indexOf(target)] = updated;
		try {
			await this.write(path, {
				...nb,
				cells
			});
			return true;
		} catch {
			return false;
		}
	}
	/** List one directory: subdirectories and files (notebooks flagged). */
	async list(dir) {
		let entries;
		try {
			entries = await readdir(dir);
		} catch (error) {
			throw new NotebookError(`cannot list directory: ${error instanceof Error ? error.message : String(error)}`);
		}
		const out = [];
		for (const name of entries) {
			const path = join(dir, name);
			let isDir = false;
			try {
				isDir = (await stat(path)).isDirectory();
			} catch {
				continue;
			}
			out.push({
				name,
				path,
				isDir,
				isNotebook: !isDir && /\.ipynb$/i.test(name)
			});
		}
		out.sort((a, b) => {
			if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
			return a.name.localeCompare(b.name);
		});
		return out;
	}
};
//#endregion
//#region src/host/jupyter/env.ts
/**
* Python / Jupyter environment detection for the notebook kernel. The kernel
* runs through a Python bridge process (python/bridge.py) that uses
* jupyter_client + ipykernel, so the plugin reports precisely what is missing
* when execution cannot start.
* @module dsh-jupyter/host/env
*/
/** Python interpreter resolution order: env var override, then `python`. */
function resolvePythonCommand() {
	return process.env.DSH_JUPYTER_PYTHON ?? "python";
}
const DETECT_SCRIPT = [
	"import json, sys",
	"out = {\"executable\": sys.executable, \"version\": sys.version.split()[0]}",
	"try:",
	"    import jupyter_client, ipykernel",
	"    out[\"jupyter_client\"] = jupyter_client.__version__",
	"    out[\"ipykernel\"] = ipykernel.__version__",
	"except Exception as e:",
	"    out[\"jupyter_error\"] = str(e)",
	"print(json.dumps(out))"
].join("\n");
const lastCache = /* @__PURE__ */ new Map();
/**
* Detect the Python/Jupyter environment, caching for `ttlMs` (kernel-heavy
* detection is not free).
*/
function detectEnv(ttlMs = 3e4) {
	const python = resolvePythonCommand();
	const cached = lastCache.get(python);
	if (cached !== void 0 && Date.now() - cached.at < ttlMs) return Promise.resolve(cached.report);
	return new Promise((resolve) => {
		const report = {
			python: {
				ok: false,
				executable: python,
				error: ""
			},
			jupyter: {
				ok: false,
				error: ""
			},
			checkedAt: Date.now()
		};
		let stdout = "";
		let stderr = "";
		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			if (!report.python.ok) report.jupyter = {
				ok: false,
				error: report.python.ok ? "" : "python unavailable"
			};
			lastCache.set(python, {
				at: Date.now(),
				report
			});
			resolve(report);
		};
		let child;
		try {
			child = spawn(python, ["-c", DETECT_SCRIPT], {
				windowsHide: true,
				stdio: [
					"ignore",
					"pipe",
					"pipe"
				],
				env: {
					...process.env,
					PYTHONIOENCODING: "utf-8"
				}
			});
		} catch (error) {
			report.python = {
				ok: false,
				executable: python,
				error: error instanceof Error ? error.message : String(error)
			};
			finish();
			return;
		}
		const timer = setTimeout(() => {
			try {
				child.kill();
			} catch {}
		}, 1e4);
		child.stdout?.on("data", (chunk) => {
			stdout += chunk.toString("utf8");
		});
		child.stderr?.on("data", (chunk) => {
			stderr += chunk.toString("utf8");
		});
		child.on("error", (error) => {
			clearTimeout(timer);
			report.python = {
				ok: false,
				executable: python,
				error: error.message
			};
			finish();
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			if (code !== 0) {
				report.python = {
					ok: false,
					executable: python,
					error: (stderr.trim() || `exit code ${String(code)}`).slice(0, 400)
				};
				finish();
				return;
			}
			report.python = {
				ok: true,
				executable: python,
				version: "unknown"
			};
			try {
				const parsed = JSON.parse(stdout);
				if (typeof parsed.version === "string") report.python = {
					ok: true,
					executable: python,
					version: parsed.version
				};
				if (typeof parsed.jupyter_client === "string" && typeof parsed.ipykernel === "string") report.jupyter = {
					ok: true,
					clientVersion: parsed.jupyter_client,
					ipykernelVersion: parsed.ipykernel
				};
				else report.jupyter = {
					ok: false,
					error: parsed.jupyter_error ?? "jupyter_client/ipykernel not importable"
				};
			} catch {
				report.jupyter = {
					ok: false,
					error: "unparseable detection output"
				};
			}
			finish();
		});
	});
}
//#endregion
//#region src/host/jupyter/kernel.ts
/**
* Kernel manager: one Python bridge subprocess per notebook. The bridge
* (python/bridge.py) owns jupyter_client; this class owns the process, the
* JSON-lines stdin/stdout protocol, and the WebSocket fan-out to browsers.
*
* Kernel identity: the canonical notebook path. A kernel is started lazily on
* the first WebSocket attach. It runs in the BACKGROUND: closing the last
* editor tab does NOT kill it (a cell may still be executing), so a notebook
* keeps running and its outputs are written back to the .ipynb file as each
* execution completes. Kernels are shut down on explicit `shutdown`, on
* restart, after an idle timeout with no connections, or on plugin dispose.
* @module dsh-jupyter/host/kernel
*/
/** How long a kernel with no browser connections stays alive before shutdown. */
const IDLE_TTL_MS = Number(process.env.DSH_EXPLORER_KERNEL_IDLE_MS ?? 18e5);
/**
* Convert one accumulated nbformat-shaped output record back into the bridge
* event shape the browser reducer consumes (replay for late-attaching
* sockets). Unknown output types degrade to a log line (never a crash).
*/
function nbOutputToBridgeEvent(cellId, out) {
	const type = out.output_type;
	if (type === "stream") return {
		type: "stream",
		cell_id: cellId,
		name: out.name === "stderr" ? "stderr" : "stdout",
		text: String(out.text ?? "")
	};
	if (type === "display_data" || type === "update_display_data") return {
		type,
		cell_id: cellId,
		data: out.data ?? {},
		metadata: out.metadata ?? {}
	};
	if (type === "execute_result") return {
		type: "execute_result",
		cell_id: cellId,
		data: out.data ?? {},
		metadata: out.metadata ?? {},
		execution_count: typeof out.execution_count === "number" ? out.execution_count : null
	};
	if (type === "error") return {
		type: "error",
		cell_id: cellId,
		ename: typeof out.ename === "string" ? out.ename : "Error",
		evalue: typeof out.evalue === "string" ? out.evalue : "",
		traceback: Array.isArray(out.traceback) ? out.traceback.filter((line) => typeof line === "string") : []
	};
	return {
		type: "log",
		level: "warn",
		message: `skipping replay of unknown output ${String(type)}`
	};
}
/** Locate python/bridge.py next to the built lib/index.js (or src during dev). */
function bridgeScriptPath() {
	const built = fileURLToPath(new URL("../python/bridge.py", import.meta.url));
	if (existsSync(built)) return built;
	return fileURLToPath(new URL("../../python/bridge.py", import.meta.url));
}
/** Parse one JSON line from the bridge stdout. */
function parseLine(line) {
	try {
		const value = JSON.parse(line);
		if (typeof value === "object" && value !== null && typeof value.type === "string") return value;
		return null;
	} catch {
		return null;
	}
}
var KernelManager = class {
	kernels = /* @__PURE__ */ new Map();
	waiters = /* @__PURE__ */ new Map();
	persist;
	constructor(persist) {
		this.persist = persist;
	}
	/** Attach a browser socket to the kernel for `path`; starts it if needed. */
	async attach(path, socket) {
		let entry = this.kernels.get(path);
		if (entry === void 0 || entry.closed || entry.proc.exitCode !== null) entry = this.start(path);
		this.clearIdleTimer(entry);
		entry.attachCount += 1;
		entry.sockets.add(socket);
		if (!entry.ready) await this.waitReady(path, entry);
		if (entry.closed || entry.proc.exitCode !== null) throw new Error(entry.lastError ?? "kernel exited while attaching");
		socket.on("close", () => {
			this.detachSocket(path, socket);
		});
		socket.on("error", () => {
			this.detachSocket(path, socket);
		});
		return {
			key: path,
			command: (command) => this.command(path, command),
			detach: () => {
				this.detachSocket(path, socket);
			}
		};
	}
	/** Wait (with timeout) for the kernel's ready event. */
	waitReady(key, entry) {
		if (entry.ready) return Promise.resolve();
		return new Promise((resolve, reject) => {
			const waiter = {
				resolve,
				reject,
				timer: setTimeout(() => {
					const list = this.waiters.get(key);
					if (list === void 0) return;
					const index = list.findIndex((w) => w.resolve === resolve);
					if (index !== -1) list.splice(index, 1);
					reject(new Error(entry.lastError ?? "kernel failed to start (python bridge did not report ready in time)"));
				}, 9e4)
			};
			const list = this.waiters.get(key) ?? [];
			list.push(waiter);
			this.waiters.set(key, list);
		});
	}
	/** Spawn a bridge process for a kernel key (the notebook path). */
	start(key) {
		const stale = this.kernels.get(key);
		if (stale !== void 0 && !stale.closed) return stale;
		if (stale !== void 0) {
			try {
				stale.proc.kill();
			} catch {}
			this.kernels.delete(key);
		}
		const python = resolvePythonCommand();
		const script = bridgeScriptPath();
		const entry = {
			key,
			python,
			proc: void 0,
			ready: false,
			attachCount: 0,
			sockets: /* @__PURE__ */ new Set(),
			lastError: null,
			closed: false,
			outputsByCell: /* @__PURE__ */ new Map(),
			codeByCell: /* @__PURE__ */ new Map(),
			indexByCell: /* @__PURE__ */ new Map(),
			busy: false,
			executingCellId: null,
			idleTimer: null,
			completedByCell: /* @__PURE__ */ new Map()
		};
		const cwd = dirname(key);
		const proc = spawn(python, ["-u", script], {
			cwd,
			windowsHide: true,
			stdio: [
				"pipe",
				"pipe",
				"pipe"
			],
			env: {
				...process.env,
				PYTHONIOENCODING: "utf-8",
				DSH_JUPYTER_KERNEL_CWD: cwd
			}
		});
		entry.proc = proc;
		this.kernels.set(key, entry);
		let buffer = "";
		proc.stdout.on("data", (chunk) => {
			buffer += chunk.toString("utf8");
			let newline = buffer.indexOf("\n");
			while (newline !== -1) {
				const line = buffer.slice(0, newline);
				buffer = buffer.slice(newline + 1);
				const event = parseLine(line);
				if (event !== null) this.handleEvent(key, entry, event);
				newline = buffer.indexOf("\n");
			}
		});
		proc.stderr.on("data", (chunk) => {
			const text = chunk.toString("utf8").trim();
			if (text !== "") this.broadcast(entry, {
				type: "event",
				event: {
					type: "log",
					level: "warn",
					message: text.slice(0, 1e3)
				}
			});
		});
		proc.on("error", (error) => {
			entry.lastError = error.message;
			this.failWaiters(key, new Error(error.message));
			this.killEntry(key, entry, `bridge error: ${error.message}`);
		});
		proc.on("close", (code) => {
			if (!entry.closed) {
				entry.closed = true;
				this.failWaiters(key, /* @__PURE__ */ new Error(`bridge exited (code ${String(code)})`));
				this.broadcast(entry, {
					type: "kernel_state",
					running: false,
					ready: false,
					reason: `bridge exited (${String(code)})`
				});
				entry.sockets.forEach((socket) => {
					try {
						socket.close(1011, "kernel exited");
					} catch {}
				});
				entry.sockets.clear();
			}
			if (this.kernels.get(key) === entry) this.kernels.delete(key);
		});
		return entry;
	}
	/** Route one bridge event: resolve ready waiters, update state, relay. */
	handleEvent(key, entry, event) {
		if (event.type === "ready") {
			entry.ready = true;
			this.resolveWaiters(key);
		} else if (event.type === "kernel_died") {
			entry.lastError = typeof event.message === "string" ? event.message : "kernel died";
			this.broadcast(entry, {
				type: "kernel_state",
				running: false,
				ready: false,
				reason: entry.lastError
			});
		} else if (event.type === "status") {
			entry.busy = event.execution_state === "busy";
			if (entry.busy) {
				this.clearIdleTimer(entry);
				if (typeof event.cell_id === "string" && event.cell_id !== "") entry.executingCellId = event.cell_id;
			} else {
				entry.executingCellId = null;
				if (entry.attachCount <= 0) this.scheduleIdleShutdown(key, entry);
			}
		} else if (event.type === "execute_reply") {
			const cellId = typeof event.cell_id === "string" ? event.cell_id : "";
			if (cellId !== "") this.persistRun(key, entry, cellId, event);
		} else this.accumulateOutput(entry, event);
		this.broadcast(entry, {
			type: "event",
			event
		});
	}
	/** Append one bridge output event to the cell's accumulated outputs. */
	accumulateOutput(entry, event) {
		const cellId = typeof event.cell_id === "string" ? event.cell_id : "";
		if (cellId === "") return;
		const type = event.type;
		if (type === "clear_output") {
			entry.outputsByCell.set(cellId, []);
			return;
		}
		if (type !== "stream" && type !== "display_data" && type !== "update_display_data" && type !== "execute_result" && type !== "error") return;
		const list = entry.outputsByCell.get(cellId) ?? [];
		if (type === "stream") {
			const name = event.name === "stderr" ? "stderr" : "stdout";
			const text = typeof event.text === "string" ? event.text : "";
			const last = list[list.length - 1];
			if (last !== void 0 && last.output_type === "stream" && last.name === name) last.text = String(last.text) + text;
			else list.push({
				output_type: "stream",
				name,
				text
			});
		} else if (type === "display_data") list.push({
			output_type: "display_data",
			data: event.data ?? {},
			metadata: event.metadata ?? {}
		});
		else if (type === "update_display_data") list.push({
			output_type: "update_display_data",
			data: event.data ?? {},
			metadata: event.metadata ?? {}
		});
		else if (type === "execute_result") list.push({
			output_type: "execute_result",
			data: event.data ?? {},
			metadata: event.metadata ?? {},
			execution_count: typeof event.execution_count === "number" ? event.execution_count : null
		});
		else if (type === "error") list.push({
			output_type: "error",
			ename: typeof event.ename === "string" ? event.ename : "Error",
			evalue: typeof event.evalue === "string" ? event.evalue : "",
			traceback: Array.isArray(event.traceback) ? event.traceback.filter((line) => typeof line === "string") : []
		});
		entry.outputsByCell.set(cellId, list);
	}
	/** Persist a finished execution to the notebook file (background log). */
	async persistRun(key, entry, cellId, reply) {
		const outputs = entry.outputsByCell.get(cellId) ?? [];
		const source = entry.codeByCell.get(cellId) ?? "";
		const index = entry.indexByCell.get(cellId) ?? -1;
		const count = typeof reply.execution_count === "number" ? reply.execution_count : null;
		entry.outputsByCell.delete(cellId);
		entry.codeByCell.delete(cellId);
		entry.indexByCell.delete(cellId);
		if (outputs.length > 0 || count !== null) {
			entry.completedByCell.set(cellId, {
				outputs,
				execution_count: count,
				ok: reply.ok !== false
			});
			if (entry.completedByCell.size > 200) {
				const oldest = entry.completedByCell.keys().next().value;
				if (oldest !== void 0) entry.completedByCell.delete(oldest);
			}
		}
		if (this.persist === void 0 || outputs.length === 0 && count === null) return;
		try {
			await this.persist(key, cellId, index, source, outputs, count);
		} catch {}
	}
	resolveWaiters(key) {
		const list = this.waiters.get(key);
		if (list === void 0) return;
		this.waiters.delete(key);
		for (const waiter of list) {
			clearTimeout(waiter.timer);
			waiter.resolve();
		}
	}
	failWaiters(key, error) {
		const list = this.waiters.get(key);
		if (list === void 0) return;
		this.waiters.delete(key);
		for (const waiter of list) {
			clearTimeout(waiter.timer);
			waiter.reject(error);
		}
	}
	broadcast(entry, frame) {
		const payload = JSON.stringify(frame);
		for (const socket of entry.sockets) if (socket.readyState === socket.OPEN) try {
			socket.send(payload);
		} catch {}
	}
	/** Write one JSON command line to the bridge stdin. */
	command(key, command) {
		const entry = this.kernels.get(key);
		if (entry === void 0 || entry.closed || entry.proc.stdin.destroyed) return;
		if (command.op === "execute") {
			const cellId = typeof command.cell_id === "string" ? command.cell_id : "";
			if (cellId !== "") {
				entry.codeByCell.set(cellId, typeof command.code === "string" ? command.code : "");
				entry.indexByCell.set(cellId, typeof command.index === "number" ? command.index : -1);
				entry.outputsByCell.set(cellId, []);
				entry.completedByCell.delete(cellId);
			}
		}
		try {
			entry.proc.stdin.write(JSON.stringify(command) + "\n");
		} catch {}
	}
	clearIdleTimer(entry) {
		if (entry.idleTimer !== null) {
			clearTimeout(entry.idleTimer);
			entry.idleTimer = null;
		}
	}
	/** Arm the idle shutdown timer (no sockets, not busy). */
	scheduleIdleShutdown(key, entry) {
		if (entry.closed || entry.idleTimer !== null || entry.attachCount > 0 || entry.busy) return;
		entry.idleTimer = setTimeout(() => {
			entry.idleTimer = null;
			this.shutdown(key);
		}, IDLE_TTL_MS);
		entry.idleTimer.unref();
	}
	detachSocket(key, socket) {
		const entry = this.kernels.get(key);
		if (entry === void 0) return;
		entry.sockets.delete(socket);
		entry.attachCount = Math.max(0, entry.attachCount - 1);
		if (entry.attachCount <= 0) this.scheduleIdleShutdown(key, entry);
	}
	killEntry(key, entry, reason) {
		if (entry.closed) return;
		entry.closed = true;
		this.clearIdleTimer(entry);
		this.broadcast(entry, {
			type: "kernel_state",
			running: false,
			ready: false,
			reason
		});
		entry.sockets.forEach((socket) => {
			try {
				socket.close(1011, "kernel exited");
			} catch {}
		});
		entry.sockets.clear();
		try {
			entry.proc.kill();
		} catch {}
		if (this.kernels.get(key) === entry) this.kernels.delete(key);
	}
	/** Shut down one kernel (bridge + sockets). Idempotent. */
	shutdown(key) {
		const entry = this.kernels.get(key);
		if (entry === void 0 || entry.closed) return;
		entry.closed = true;
		this.clearIdleTimer(entry);
		this.command(key, { op: "shutdown" });
		setTimeout(() => {
			try {
				entry.proc.kill();
			} catch {}
		}, 1500).unref();
		this.broadcast(entry, {
			type: "kernel_state",
			running: false,
			ready: false,
			reason: "shutdown"
		});
		entry.sockets.forEach((socket) => {
			try {
				socket.close(1e3, "kernel shutdown");
			} catch {}
		});
		entry.sockets.clear();
		if (this.kernels.get(key) === entry) this.kernels.delete(key);
	}
	/** Restart a kernel in place (bridge restart op). */
	restart(key) {
		this.command(key, { op: "restart" });
	}
	/** Interrupt the running kernel. */
	interrupt(key) {
		this.command(key, { op: "interrupt" });
	}
	/** Status summary for one key. */
	status(key) {
		const entry = this.kernels.get(key);
		if (entry === void 0 || entry.closed || entry.proc.exitCode !== null) return {
			kernelId: key,
			running: false,
			python: resolvePythonCommand(),
			ready: false,
			attachCount: 0,
			lastError: null,
			busy: false,
			executingCellId: null
		};
		return {
			kernelId: key,
			running: true,
			python: entry.python,
			ready: entry.ready,
			attachCount: entry.attachCount,
			lastError: entry.lastError,
			busy: entry.busy,
			executingCellId: entry.executingCellId
		};
	}
	/**
	* The state a freshly attached browser needs to re-sync a run that started
	* while it was away: whether the kernel is busy, which client cell is
	* executing (plus the cell index captured when the run started — the
	* fallback a re-attached browser uses when its cell ids differ), that
	* cell's accumulated outputs so far (so the reopened notebook shows the
	* live partial output instead of an idle cell), the cells still waiting in
	* the batch, and any recently completed executions this browser may have
	* missed.
	*/
	attachState(key) {
		const entry = this.kernels.get(key);
		if (entry === void 0 || entry.closed || entry.proc.exitCode !== null) return {
			busy: false,
			executingCellId: null,
			index: -1,
			outputs: [],
			pendingCells: [],
			completions: []
		};
		const completions = [];
		for (const [cellId, done] of entry.completedByCell) completions.push({
			cell_id: cellId,
			outputs: done.outputs.map((out) => nbOutputToBridgeEvent(cellId, out)),
			execution_count: done.execution_count,
			ok: done.ok
		});
		const executing = entry.busy && entry.executingCellId !== null ? entry.executingCellId : null;
		const pendingCells = [];
		for (const cellId of entry.codeByCell.keys()) pendingCells.push({
			cellId,
			index: entry.indexByCell.get(cellId) ?? -1
		});
		return {
			busy: entry.busy,
			executingCellId: executing,
			index: executing !== null ? entry.indexByCell.get(executing) ?? -1 : -1,
			outputs: executing !== null ? (entry.outputsByCell.get(executing) ?? []).map((out) => nbOutputToBridgeEvent(executing, out)) : [],
			pendingCells,
			completions
		};
	}
	/**
	* Every live kernel, for the explorer's "running notebook" indicator.
	* `inside` (optional) filters to paths under a directory (the route passes
	* the session's canonical cwd).
	*/
	list(inside) {
		const out = [];
		for (const [key, entry] of this.kernels) {
			if (entry.closed || entry.proc.exitCode !== null) continue;
			if (inside !== void 0 && !inside(key)) continue;
			out.push({
				key,
				running: true,
				busy: entry.busy
			});
		}
		return out;
	}
	/** Drop the buffered completions for one kernel (they were just replayed). */
	clearCompletions(key) {
		const entry = this.kernels.get(key);
		if (entry === void 0) return;
		entry.completedByCell.clear();
	}
	/** Shut down every kernel (plugin dispose). */
	dispose() {
		for (const key of [...this.kernels.keys()]) this.shutdown(key);
	}
};
//#endregion
//#region src/host/fence.ts
function header(headers, name) {
	const value = headers[name];
	return typeof value === "string" ? value : void 0;
}
/** Normalized URL of a Host-header authority, or undefined when unparsable. */
function parseAuthority(authority) {
	try {
		return new URL(`http://${authority}`);
	} catch {
		return;
	}
}
/** Whether a normalized URL hostname names the local loopback authority. */
function isLoopbackHostname(hostname) {
	if (hostname === "localhost" || hostname === "[::1]") return true;
	const parts = hostname.split(".");
	return parts.length === 4 && parts[0] === "127" && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}
/** Canonical authority form: hostname, or hostname:port when a port was written. */
function canonicalAuthority(entry, entryUrl) {
	const port = entryUrl.port !== "" ? entryUrl.port : new URL(`https://${entry}`).port;
	return port === "" ? entryUrl.hostname : `${entryUrl.hostname}:${port}`;
}
/** Whether the request authority matches a trustedHosts entry (exact or port-less). */
function isTrustedAuthority(hostUrl, trustedHosts) {
	return trustedHosts.some((entry) => {
		const entryUrl = parseAuthority(entry);
		if (entryUrl === void 0) return false;
		return canonicalAuthority(entry, entryUrl) === entryUrl.hostname ? entryUrl.hostname === hostUrl.hostname : entryUrl.host === hostUrl.host;
	});
}
/**
* Decide whether one request may reach the plugin routes.
* @param request - node HTTP request facts (headers).
* @param trustedHosts - non-loopback authorities this deployment serves.
* @returns true when the Host is ours (loopback or trusted) and browser markers are same-origin.
*/
function isTrustedApiRequest(request, trustedHosts) {
	const host = header(request.headers, "host");
	if (host === void 0) return false;
	const hostUrl = parseAuthority(host);
	if (hostUrl === void 0) return false;
	if (!isLoopbackHostname(hostUrl.hostname) && !isTrustedAuthority(hostUrl, trustedHosts)) return false;
	if (header(request.headers, "sec-fetch-site") === "cross-site") return false;
	const origin = header(request.headers, "origin");
	if (origin === void 0) return true;
	try {
		return new URL(origin).host === hostUrl.host;
	} catch {
		return false;
	}
}
//#endregion
//#region src/host/gate.ts
/**
* Session-scoped path gate for the jupyter plugin routes. Every notebook
* request carries a sessionId (+ optional client cwd) and a path; this gate
* resolves the session's AUTHORITATIVE working directory from the session
* store (the same source dsh-better-sidebar uses) and requires the
* (canonicalized) target to live inside it — a notebook outside the
* conversation's cwd is refused, exactly like the sidebar's own fs routes.
* @module dsh-better-sidebar-jupyter/host/gate
*/
/** Case-insensitive (on win32) containment check with both separators normalized. */
function isPathInside(root, child) {
	if (root === "" || child === "") return false;
	const norm = (value) => value.replaceAll("\\", "/").replace(/\/+$/, "");
	const normRoot = norm(root);
	const normChild = norm(child);
	if (process.platform === "win32") {
		const a = normRoot.toLowerCase();
		const b = normChild.toLowerCase();
		if (b === a) return true;
		return b.startsWith(`${a}/`);
	}
	if (normChild === normRoot) return true;
	return normChild.startsWith(`${normRoot}/`);
}
/** The session's authoritative working directory (header cwd wins, then the
*  client-provided cwd, then the process cwd — never throws for a blank one). */
function sessionCwdOf(ctx, sessionId, clientCwd) {
	const headerCwd = ctx.sessions.get(sessionId)?.header.cwd;
	if (headerCwd !== void 0 && headerCwd !== "") return headerCwd;
	if (clientCwd !== void 0 && clientCwd !== "") return clientCwd;
	return process.cwd();
}
/**
* Build a gate bound to one session scope. The requested path may be
* absolute (the common case — the sidebar passes absolute paths) or
* relative to the session cwd; the canonicalized result is required to be
* inside the (canonicalized) session cwd.
*/
function createSessionGate(ctx, sessionId, clientCwd) {
	return async (raw) => {
		if (typeof raw !== "string" || raw === "") return {
			ok: false,
			error: "empty path"
		};
		const cwd = sessionCwdOf(ctx, sessionId, clientCwd);
		let target = isAbsolute(raw) ? raw : join(cwd, raw);
		let canonicalCwd;
		try {
			target = await realpath(target);
			canonicalCwd = await realpath(cwd);
		} catch {
			return {
				ok: false,
				error: "path does not resolve on disk"
			};
		}
		if (!isPathInside(canonicalCwd, target)) return {
			ok: false,
			error: "path is outside the session working directory"
		};
		return {
			ok: true,
			canonical: target
		};
	};
}
//#endregion
//#region src/host/routes.ts
/** Route family base. */
const JUPYTER_API = {
	env: "/api/dsh-better-sidebar-jupyter/env",
	notebook: "/api/dsh-better-sidebar-jupyter/notebook",
	kernels: "/api/dsh-better-sidebar-jupyter/kernels",
	kernelStatus: "/api/dsh-better-sidebar-jupyter/kernel/status",
	kernelStop: "/api/dsh-better-sidebar-jupyter/kernel/stop",
	kernelInterrupt: "/api/dsh-better-sidebar-jupyter/kernel/interrupt",
	kernelRestart: "/api/dsh-better-sidebar-jupyter/kernel/restart",
	kernelWs: "/api/dsh-better-sidebar-jupyter/kernel/ws"
};
/** Cap on JSON request bodies (notebooks can be large — base64 images). */
const MAX_JSON_BODY_BYTES = 67108864;
/** One noServer WebSocket server for kernel streams. */
const kernelWss = new WebSocketServer({ noServer: true });
function writeJson(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"referrer-policy": "no-referrer"
	});
	res.end(payload);
}
async function readJsonBody(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		const buffer = chunk;
		size += buffer.length;
		if (size > MAX_JSON_BODY_BYTES) return void 0;
		chunks.push(buffer);
	}
	try {
		const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
		return typeof parsed === "object" && parsed !== null ? parsed : void 0;
	} catch {
		return;
	}
}
function queryParam(url, name) {
	const value = url.searchParams.get(name);
	return value === null ? void 0 : value;
}
/**
* Build every jupyter route plus the kernel WebSocket upgrade.
* @param deps - ctx, fs, kernels, fence.
* @returns routes and the upgrade route.
*/
function makeRoutes(deps) {
	const { ctx, fs, kernels, fence } = deps;
	const guard = (req, res, method) => {
		if (!fence(req)) {
			writeJson(res, 403, { error: "forbidden" });
			return false;
		}
		if (req.method !== method) {
			writeJson(res, 405, { error: `method not allowed: ${req.method}` });
			return false;
		}
		return true;
	};
	/**
	* Resolve a query path through the session gate. Requires sessionId; the
	* optional client cwd rides the query (the sidebar passes it while the
	* session header is still hydrating).
	* @returns the canonical gated path, or null (a 400 was already written).
	*/
	const gatePath = async (url, res, fallback = "") => {
		const sessionId = queryParam(url, "sessionId");
		if (sessionId === void 0 || sessionId === "") {
			writeJson(res, 400, { error: "sessionId is required" });
			return null;
		}
		const raw = queryParam(url, "path") ?? fallback;
		const verdict = await createSessionGate(ctx, sessionId, queryParam(url, "cwd"))(raw);
		if (!verdict.ok) {
			writeJson(res, 400, { error: `workspace gate: ${verdict.error}` });
			return null;
		}
		return verdict.canonical;
	};
	return {
		routes: [
			{
				kind: "exact",
				path: JUPYTER_API.env,
				handler: async (req, res) => {
					if (!guard(req, res, "GET")) return;
					writeJson(res, 200, { report: await detectEnv() });
				}
			},
			{
				kind: "exact",
				path: JUPYTER_API.kernels,
				handler: async (req, res) => {
					if (!guard(req, res, "GET")) return;
					const url = new URL(req.url ?? "/", "http://localhost");
					const sessionId = queryParam(url, "sessionId");
					if (sessionId === void 0 || sessionId === "") {
						writeJson(res, 400, { error: "sessionId is required" });
						return;
					}
					const sessionCwd = ctx.sessions.get(sessionId)?.header.cwd;
					if (sessionCwd === void 0 || sessionCwd === "") {
						writeJson(res, 400, { error: "workspace gate: session has no cwd" });
						return;
					}
					const verdict = await createSessionGate(ctx, sessionId, queryParam(url, "cwd"))(sessionCwd);
					if (!verdict.ok) {
						writeJson(res, 400, { error: `workspace gate: ${verdict.error}` });
						return;
					}
					writeJson(res, 200, { kernels: kernels.list((path) => isPathInside(verdict.canonical, path)).map((k) => ({
						path: k.key,
						running: k.running,
						busy: k.busy
					})) });
				}
			},
			{
				kind: "exact",
				path: JUPYTER_API.notebook,
				handler: async (req, res) => {
					const method = req.method ?? "GET";
					if (!fence(req)) {
						writeJson(res, 403, { error: "forbidden" });
						return;
					}
					const url = new URL(req.url ?? "/", "http://localhost");
					if (method === "GET") {
						const path = await gatePath(url, res);
						if (path === null) return;
						try {
							writeJson(res, 200, { nb: await fs.read(path) });
						} catch (error) {
							writeJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
						}
						return;
					}
					if (method !== "PUT") {
						writeJson(res, 405, { error: `method not allowed: ${method}` });
						return;
					}
					const path = await gatePath(url, res);
					if (path === null) return;
					const body = await readJsonBody(req);
					if (body === void 0 || body.nb === void 0) {
						writeJson(res, 400, { error: "invalid JSON body: { nb } required" });
						return;
					}
					try {
						await fs.write(path, body.nb);
						writeJson(res, 200, { ok: true });
					} catch (error) {
						writeJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
					}
				}
			},
			{
				kind: "exact",
				path: JUPYTER_API.kernelStatus,
				handler: async (req, res) => {
					if (!guard(req, res, "GET")) return;
					const url = new URL(req.url ?? "/", "http://localhost");
					const path = await gatePath(url, res);
					if (path === null) return;
					writeJson(res, 200, { kernel: kernels.status(path) });
				}
			},
			{
				kind: "exact",
				path: JUPYTER_API.kernelStop,
				handler: async (req, res) => {
					if (!guard(req, res, "POST")) return;
					const url = new URL(req.url ?? "/", "http://localhost");
					const path = await gatePath(url, res);
					if (path === null) return;
					kernels.shutdown(path);
					writeJson(res, 200, { ok: true });
				}
			},
			{
				kind: "exact",
				path: JUPYTER_API.kernelInterrupt,
				handler: async (req, res) => {
					if (!guard(req, res, "POST")) return;
					const url = new URL(req.url ?? "/", "http://localhost");
					const path = await gatePath(url, res);
					if (path === null) return;
					kernels.interrupt(path);
					writeJson(res, 200, { ok: true });
				}
			},
			{
				kind: "exact",
				path: JUPYTER_API.kernelRestart,
				handler: async (req, res) => {
					if (!guard(req, res, "POST")) return;
					const url = new URL(req.url ?? "/", "http://localhost");
					const path = await gatePath(url, res);
					if (path === null) return;
					kernels.restart(path);
					writeJson(res, 200, { ok: true });
				}
			}
		],
		upgrade: {
			path: JUPYTER_API.kernelWs,
			handler: (req, socket, head) => {
				if (!fence(req)) {
					socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
					socket.destroy();
					return;
				}
				const url = new URL(req.url ?? "/", "http://localhost");
				const sessionId = queryParam(url, "sessionId");
				const rawPath = queryParam(url, "path");
				if (sessionId === void 0 || sessionId === "" || rawPath === void 0 || rawPath === "") {
					socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
					socket.destroy();
					return;
				}
				createSessionGate(ctx, sessionId, queryParam(url, "cwd"))(rawPath).then((verdict) => {
					if (!verdict.ok) {
						socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
						socket.destroy();
						return;
					}
					kernelWss.handleUpgrade(req, socket, head, (ws) => {
						let handle;
						let closed = false;
						const close = () => {
							if (closed) return;
							closed = true;
							try {
								handle?.detach();
							} catch {}
						};
						kernels.attach(verdict.canonical, ws).then((attached) => {
							if (ws.readyState !== WebSocket.OPEN) {
								attached.detach();
								return;
							}
							handle = attached;
							const state = kernels.attachState(verdict.canonical);
							ws.send(JSON.stringify({
								type: "kernel_state",
								running: true,
								ready: true,
								key: verdict.canonical,
								busy: state.busy,
								cellId: state.executingCellId,
								index: state.index,
								pendingCells: state.pendingCells
							}));
							if (state.busy && state.executingCellId !== null) {
								ws.send(JSON.stringify({
									type: "event",
									event: {
										type: "status",
										execution_state: "busy",
										cell_id: state.executingCellId
									}
								}));
								ws.send(JSON.stringify({
									type: "event",
									event: {
										type: "clear_output",
										cell_id: state.executingCellId,
										wait: false
									}
								}));
								for (const event of state.outputs) ws.send(JSON.stringify({
									type: "event",
									event
								}));
							}
							for (const done of state.completions) {
								ws.send(JSON.stringify({
									type: "event",
									event: {
										type: "clear_output",
										cell_id: done.cell_id,
										wait: false
									}
								}));
								for (const event of done.outputs) ws.send(JSON.stringify({
									type: "event",
									event
								}));
								ws.send(JSON.stringify({
									type: "event",
									event: {
										type: "execute_reply",
										cell_id: done.cell_id,
										ok: done.ok,
										execution_count: done.execution_count
									}
								}));
							}
							if (state.completions.length > 0) kernels.clearCompletions(verdict.canonical);
						}).catch((error) => {
							if (ws.readyState === WebSocket.OPEN) {
								ws.send(JSON.stringify({
									type: "kernel_error",
									message: error instanceof Error ? error.message : String(error)
								}));
								ws.close(1011, "kernel failed");
							}
							closed = true;
						});
						ws.on("message", (data) => {
							let frame;
							try {
								frame = JSON.parse(String(data));
							} catch {
								return;
							}
							const type = frame.type;
							if (type === "execute") {
								const cellId = typeof frame.cellId === "string" ? frame.cellId : "";
								const code = typeof frame.code === "string" ? frame.code : "";
								const index = typeof frame.index === "number" ? frame.index : -1;
								if (cellId === "") return;
								handle?.command({
									op: "execute",
									cell_id: cellId,
									code,
									index
								});
							} else if (type === "interrupt") handle?.command({ op: "interrupt" });
							else if (type === "restart") handle?.command({ op: "restart" });
							else if (type === "shutdown") {
								handle?.command({ op: "shutdown" });
								close();
								try {
									ws.close(1e3, "kernel shutdown");
								} catch {}
							}
						});
						ws.on("close", close);
						ws.on("error", close);
					});
				}).catch(() => {
					socket.write("HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n");
					socket.destroy();
				});
			}
		}
	};
}
//#endregion
//#region src/index.ts
/** Plugin identity for cordis.yml rows / the bundle patch. */
const name = "dsh-better-sidebar-jupyter";
/** Services required before mounting: the webserver routes, the session
*  store (authoritative cwd for the path gate), and the web runtime's
*  trusted hosts (the /api gateway's trust source). */
const inject = [
	"webServer",
	"sessions",
	"webRuntime"
];
/** Plugin body: mount the fenced jupyter routes and the kernel lifecycle. */
function apply(ctx) {
	const fence = (req) => isTrustedApiRequest(req, ctx.webRuntime.trustedHosts);
	const fs = new NotebookFs();
	const kernels = new KernelManager((path, cellId, index, source, outputs, executionCount) => fs.applyOutputs(path, cellId, index, source, outputs, executionCount).then(() => void 0));
	ctx.effect(() => {
		const { routes, upgrade } = makeRoutes({
			ctx,
			fs,
			kernels,
			fence
		});
		const disposers = routes.map((route) => ctx.webServer.register(route));
		disposers.push(ctx.webServer.registerUpgrade(upgrade));
		return () => {
			for (const dispose of disposers) try {
				dispose();
			} catch {}
		};
	}, "dsh-better-sidebar-jupyter: routes");
	ctx.effect(() => () => {
		kernels.dispose();
	}, "dsh-better-sidebar-jupyter: teardown");
}
//#endregion
export { apply, inject, name };
