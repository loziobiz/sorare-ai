var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// .wrangler/tmp/bundle-ijyoPu/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/_internal/utils.mjs
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
__name(PerformanceEntry, "PerformanceEntry");
var PerformanceMark = /* @__PURE__ */ __name(class PerformanceMark2 extends PerformanceEntry {
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
}, "PerformanceMark");
var PerformanceMeasure = class extends PerformanceEntry {
  entryType = "measure";
};
__name(PerformanceMeasure, "PerformanceMeasure");
var PerformanceResourceTiming = class extends PerformanceEntry {
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
__name(PerformanceResourceTiming, "PerformanceResourceTiming");
var PerformanceObserverEntryList = class {
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
__name(PerformanceObserverEntryList, "PerformanceObserverEntryList");
var Performance = class {
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
__name(Performance, "Performance");
var PerformanceObserver = class {
  __unenv__ = true;
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
__name(PerformanceObserver, "PerformanceObserver");
__publicField(PerformanceObserver, "supportedEntryTypes", []);
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/.pnpm/@cloudflare+unenv-preset@2.0.2_unenv@2.0.0-rc.14_workerd@1.20250718.0/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/.pnpm/@cloudflare+unenv-preset@2.0.2_unenv@2.0.0-rc.14_workerd@1.20250718.0/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/.pnpm/wrangler@3.114.17_@cloudflare+workers-types@4.20260226.1/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
import { Socket } from "node:net";
var ReadStream = class extends Socket {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  isRaw = false;
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
  isTTY = false;
};
__name(ReadStream, "ReadStream");

// node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
import { Socket as Socket2 } from "node:net";
var WriteStream = class extends Socket2 {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  columns = 80;
  rows = 24;
  isTTY = false;
};
__name(WriteStream, "WriteStream");

// node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class extends EventEmitter {
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return "";
  }
  get versions() {
    return {};
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  ref() {
  }
  unref() {
  }
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: () => 0 });
  mainModule = void 0;
  domain = void 0;
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};
__name(Process, "Process");

// node_modules/.pnpm/@cloudflare+unenv-preset@2.0.2_unenv@2.0.0-rc.14_workerd@1.20250718.0/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var { exit, platform, nextTick } = getBuiltinModule(
  "node:process"
);
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  nextTick
});
var {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  finalization,
  features,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  on,
  off,
  once,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/.pnpm/wrangler@3.114.17_@cloudflare+workers-types@4.20260226.1/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// src/lib/repository.ts
import { resolve } from "path";
var DefaultUpdateStrategy = class {
  shouldUpdate(currentValue, newValue, _fieldPath) {
    if (newValue === null || newValue === void 0) {
      return false;
    }
    if (currentValue === void 0) {
      return true;
    }
    if (typeof currentValue === "object" && typeof newValue === "object") {
      return JSON.stringify(currentValue) !== JSON.stringify(newValue);
    }
    return currentValue !== newValue;
  }
};
__name(DefaultUpdateStrategy, "DefaultUpdateStrategy");

// src/worker/lib/kv-repository.ts
var KVPlayerRepository = class {
  kv;
  keyCache = null;
  valueCache = /* @__PURE__ */ new Map();
  constructor(kv) {
    this.kv = kv;
  }
  /**
   * Ottiene tutte le chiavi dal KV e le cacha per la durata dell'istanza
   */
  async getKeysMap() {
    const map = /* @__PURE__ */ new Map();
    let cursor;
    do {
      const listResult = await this.kv.list({ cursor, limit: 1e3, metadata: true });
      for (const key of listResult.keys) {
        const metadata = key.metadata;
        const parsed = KVPlayerRepository.parseKey(key.name);
        if (parsed) {
          if (!this.keyCache)
            this.keyCache = /* @__PURE__ */ new Map();
          this.keyCache.set(parsed.playerSlug, key.name);
          map.set(parsed.playerSlug, {
            keyName: key.name,
            metadata
          });
        }
      }
      cursor = listResult.list_complete ? void 0 : listResult.cursor;
    } while (cursor);
    return map;
  }
  /**
   * Genera la key KV per un giocatore
   * Format: {clubCode}:{playerSlug}
   */
  static makeKey(clubCode, playerSlug) {
    return `${clubCode}:${playerSlug}`;
  }
  /**
   * Parse una key KV
   */
  static parseKey(key) {
    const parts = key.split(":");
    if (parts.length !== 2)
      return null;
    return { clubCode: parts[0], playerSlug: parts[1] };
  }
  /**
   * Ottiene la mappa completa di chiavi e metadati (utile per sync)
   */
  async getKeysAndMetadata() {
    return this.getKeysMap();
  }
  async loadLight() {
    const players = [];
    const keysMap = await this.getKeysAndMetadata();
    for (const [slug, info3] of keysMap.entries()) {
      const parsed = KVPlayerRepository.parseKey(info3.keyName);
      if (parsed) {
        let hasAA = true;
        if (info3.metadata) {
          hasAA = info3.metadata.hasAA === true || info3.metadata.hasAA === "true";
        }
        players.push({
          slug,
          name: info3.metadata?.name || slug,
          clubSlug: info3.metadata?.clubSlug || "unknown",
          clubName: info3.metadata?.clubName || "Unknown",
          position: info3.metadata?.position || "Unknown",
          clubCode: parsed.clubCode,
          // Flag per il filtering (usiamo una struttura stats minima)
          stats: {
            aaAnalysis: hasAA ? {
              calculatedAt: "",
              gamesAnalyzed: 0,
              AA5: 1,
              AA15: 1,
              AA25: 1
            } : void 0
          }
        });
      }
    }
    const clubsMap = /* @__PURE__ */ new Map();
    for (const player of players) {
      if (!clubsMap.has(player.clubSlug)) {
        clubsMap.set(player.clubSlug, {
          slug: player.clubSlug,
          name: player.clubName
        });
      }
    }
    return {
      league: "Major League Soccer",
      leagueSlug: "major-league-soccer",
      season: (/* @__PURE__ */ new Date()).getFullYear(),
      totalPlayers: players.length,
      totalClubs: clubsMap.size,
      players,
      extractedAt: (/* @__PURE__ */ new Date()).toISOString(),
      version: 1
    };
  }
  /**
   * Carica tutti i giocatori dal KV completi
   * ATTENZIONE: Usa 1 kv.get() per ogni giocatore. Rischio di Too many subrequests!
   */
  async load() {
    const players = [];
    let cursor;
    do {
      const listResult = await this.kv.list({ cursor, limit: 1e3, metadata: true });
      const batches = [];
      for (let i = 0; i < listResult.keys.length; i += 50) {
        batches.push(listResult.keys.slice(i, i + 50));
      }
      for (const batch of batches) {
        const promises = batch.map((key) => this.kv.get(key.name));
        const values = await Promise.all(promises);
        for (const value of values) {
          if (value) {
            try {
              const player = JSON.parse(value);
              players.push(player);
              this.valueCache.set(player.slug, player);
            } catch (e) {
              console.error(`Failed to parse player data:`, e);
            }
          }
        }
      }
      cursor = listResult.list_complete ? void 0 : listResult.cursor;
    } while (cursor);
    const clubsMap = /* @__PURE__ */ new Map();
    for (const player of players) {
      if (!clubsMap.has(player.clubSlug)) {
        clubsMap.set(player.clubSlug, {
          slug: player.clubSlug,
          name: player.clubName
        });
      }
    }
    return {
      league: "Major League Soccer",
      leagueSlug: "major-league-soccer",
      season: (/* @__PURE__ */ new Date()).getFullYear(),
      totalPlayers: players.length,
      totalClubs: clubsMap.size,
      players,
      extractedAt: (/* @__PURE__ */ new Date()).toISOString(),
      version: 1
    };
  }
  /**
   * Salva l'intero database nel KV
   * Utile per import iniziale o migration
   */
  async save(database) {
    const promises = database.players.map((player) => {
      const key = KVPlayerRepository.makeKey(
        player.clubCode || "UNK",
        player.slug
      );
      this.valueCache.set(player.slug, player);
      return this.kv.put(key, JSON.stringify(player));
    });
    await Promise.all(promises);
  }
  /**
   * Trova un giocatore per slug
   * Utilizza la cache delle chiavi per evitare scan costosi (O(1) list operation per istanza)
   * Utilizza anche una cache dei valori per evitare kv.get ripetuti sullo stesso giocatore!
   */
  async findBySlug(slug) {
    if (this.valueCache.has(slug)) {
      return this.valueCache.get(slug);
    }
    if (!this.keyCache) {
      await this.getKeysMap();
    }
    const keyName = this.keyCache?.get(slug);
    if (keyName) {
      const value = await this.kv.get(keyName);
      if (value) {
        const player = JSON.parse(value);
        this.valueCache.set(slug, player);
        return player;
      }
    }
    return void 0;
  }
  /**
   * Trova un giocatore per clubCode + slug (efficiente)
   */
  async findByClubAndSlug(clubCode, slug) {
    if (this.valueCache.has(slug)) {
      return this.valueCache.get(slug);
    }
    const key = KVPlayerRepository.makeKey(clubCode, slug);
    const value = await this.kv.get(key);
    if (value) {
      const player = JSON.parse(value);
      this.valueCache.set(slug, player);
      return player;
    }
    return void 0;
  }
  /**
   * Aggiorna un singolo giocatore
   */
  async updatePlayer(slug, updates, strategy) {
    const existing = await this.findBySlug(slug);
    if (!existing) {
      throw new Error(`Player not found: ${slug}`);
    }
    const strat = strategy || new DefaultUpdateStrategy();
    const merged = this.deepMergeWithStrategy(
      existing,
      updates,
      strat,
      ""
    );
    const hasChanges = JSON.stringify(existing) !== JSON.stringify(merged);
    if (hasChanges) {
      const key = KVPlayerRepository.makeKey(
        merged.clubCode || existing.clubCode || "UNK",
        merged.slug
      );
      const hasAA = !!(merged.stats?.aaAnalysis?.AA5 != null || merged.stats?.aaAnalysis?.AA15 != null || merged.stats?.aaAnalysis?.AA25 != null);
      await this.kv.put(key, JSON.stringify(merged), {
        metadata: {
          name: merged.name,
          clubSlug: merged.clubSlug,
          position: merged.position,
          hasAA
        }
      });
      this.valueCache.set(slug, merged);
    }
    return hasChanges;
  }
  /**
   * Aggiorna statistiche di un giocatore
   */
  async updatePlayerStats(slug, stats, strategy) {
    const existing = await this.findBySlug(slug);
    if (!existing) {
      throw new Error(`Player not found: ${slug}`);
    }
    const updates = {
      stats: this.mergeStats(existing.stats || {}, stats, strategy)
    };
    return this.updatePlayer(slug, updates, strategy);
  }
  /**
   * Aggiorna molti giocatori in batch
   */
  async updateMany(updates, strategy) {
    const results = /* @__PURE__ */ new Map();
    for (const { slug, data } of updates) {
      try {
        const result = await this.updatePlayer(slug, data, strategy);
        results.set(slug, result);
      } catch (error3) {
        console.warn(`Failed to update player ${slug}:`, error3);
        results.set(slug, false);
      }
      await new Promise((resolve2) => setTimeout(resolve2, 100));
    }
    return results;
  }
  /**
   * Aggiunge un nuovo giocatore (solo se non esiste)
   */
  async addPlayer(player) {
    const key = KVPlayerRepository.makeKey(
      player.clubCode || "UNK",
      player.slug
    );
    const existing = await this.findBySlug(player.slug);
    if (existing) {
      return false;
    }
    const hasAA = !!(player.stats?.aaAnalysis?.AA5 != null || player.stats?.aaAnalysis?.AA15 != null || player.stats?.aaAnalysis?.AA25 != null);
    await this.kv.put(key, JSON.stringify(player), {
      metadata: {
        name: player.name,
        clubSlug: player.clubSlug,
        position: player.position,
        hasAA
      }
    });
    this.valueCache.set(player.slug, player);
    return true;
  }
  /**
   * Lista tutti i giocatori di un club
   */
  async listPlayersByClub(clubCode) {
    const players = [];
    let cursor;
    do {
      const listResult = await this.kv.list({
        prefix: `${clubCode}:`,
        cursor,
        limit: 100
      });
      for (const key of listResult.keys) {
        const value = await this.kv.get(key.name);
        if (value) {
          try {
            players.push(JSON.parse(value));
          } catch (e) {
            console.error(`Failed to parse player data for key ${key.name}:`, e);
          }
        }
      }
      cursor = listResult.list_complete ? void 0 : listResult.cursor;
    } while (cursor);
    return players;
  }
  /**
   * Conta totale giocatori
   */
  async countPlayers() {
    let count3 = 0;
    let cursor;
    do {
      const listResult = await this.kv.list({ cursor, limit: 1e3, metadata: true });
      count3 += listResult.keys.length;
      cursor = listResult.list_complete ? void 0 : listResult.cursor;
    } while (cursor);
    return count3;
  }
  /**
   * Elimina un giocatore
   */
  async deletePlayer(clubCode, slug) {
    const key = KVPlayerRepository.makeKey(clubCode, slug);
    await this.kv.delete(key);
  }
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  mergeStats(existing, updates, strategy) {
    const strat = strategy || new DefaultUpdateStrategy();
    return this.deepMergeWithStrategy(
      existing,
      updates,
      strat,
      ""
    );
  }
  deepMergeWithStrategy(current, updates, strategy, path) {
    const result = { ...current };
    for (const key of Object.keys(updates)) {
      const newPath = path ? `${path}.${key}` : key;
      const currentValue = current[key];
      const newValue = updates[key];
      if (newValue !== null && typeof newValue === "object" && !Array.isArray(newValue) && typeof currentValue === "object" && currentValue !== null && !Array.isArray(currentValue)) {
        result[key] = this.deepMergeWithStrategy(
          currentValue,
          newValue,
          strategy,
          newPath
        );
      } else {
        if (strategy.shouldUpdate(currentValue, newValue, newPath)) {
          result[key] = newValue;
        }
      }
    }
    return result;
  }
};
__name(KVPlayerRepository, "KVPlayerRepository");
function createKVRepository(kv) {
  return new KVPlayerRepository(kv);
}
__name(createKVRepository, "createKVRepository");

// src/worker/lib/sorare-client.ts
var SorareWorkerClient = class {
  apiKey;
  jwtToken;
  baseUrl;
  jwtAud;
  constructor(config2 = {}) {
    this.apiKey = config2.apiKey;
    this.jwtToken = config2.jwtToken;
    this.baseUrl = config2.baseUrl || "https://api.sorare.com/graphql";
    this.jwtAud = config2.jwtAud || "sorare-ai";
  }
  /**
   * Esegue una query GraphQL con retry logic
   */
  async query(query, variables, options = {}) {
    const { retries = 3, retryDelay = 1e3 } = options;
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.executeQuery(query, variables);
      } catch (error3) {
        lastError = error3 instanceof Error ? error3 : new Error(String(error3));
        if (lastError.message.includes("401") || lastError.message.includes("403") || lastError.message.includes("404")) {
          throw lastError;
        }
        if (attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt);
          console.log(`Retry ${attempt + 1}/${retries} after ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    throw lastError;
  }
  async executeQuery(query, variables) {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "JWT-AUD": this.jwtAud
    };
    if (this.apiKey) {
      headers["API-KEY"] = this.apiKey;
    }
    if (this.jwtToken) {
      headers["Authorization"] = `Bearer ${this.jwtToken}`;
    }
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
    }
    const data = await response.json();
    if (data.errors) {
      throw new Error(
        `GraphQL errors: ${data.errors.map((e) => e.message).join(", ")}`
      );
    }
    if (!data.data) {
      throw new Error("No data returned from GraphQL");
    }
    return data.data;
  }
  sleep(ms) {
    return new Promise((resolve2) => setTimeout(resolve2, ms));
  }
};
__name(SorareWorkerClient, "SorareWorkerClient");
function createSorareClient(env2) {
  return new SorareWorkerClient({
    jwtToken: env2.SORARE_API_KEY,
    // Usa come JWT (Authorization: Bearer)
    jwtAud: "sorare-ai"
  });
}
__name(createSorareClient, "createSorareClient");

// src/worker/lib/queries.ts
var GET_MLS_COMPETITION = `
  query GetMlsCompetition {
    football {
      competition(slug: "mls") {
        slug
        name
        clubs(first: 50) {
          edges {
            node {
              slug
              name
              code
            }
          }
        }
      }
    }
  }
`;
var GET_CLUB_PLAYERS = `
  query GetClubPlayers($slug: String!) {
    football {
      club(slug: $slug) {
        slug
        name
        code
        activePlayers(first: 50) {
          edges {
            node {
              slug
              displayName
              anyPositions
              activeClub {
                slug
                name
                code
              }
            }
          }
        }
      }
    }
  }
`;
var GET_PLAYERS_GAME_SCORES = `
  query GetPlayersGameScores($slugs: [String!]!, $last: Int!) {
    players(slugs: $slugs) {
      ... on Player {
        slug
        displayName
        activeClub {
          name
        }
        allPlayerGameScores(first: $last) {
          edges {
            node {
              ... on PlayerGameScore {
                score
                scoreStatus
                anyGame {
                  date
                  homeTeam {
                    name
                  }
                  awayTeam {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;
var GET_PLAYERS_AA_SCORES = `
  query GetPlayersAAScores($slugs: [String!]!, $last: Int!) {
    players(slugs: $slugs) {
      ... on Player {
        slug
        allPlayerGameScores(first: $last) {
          edges {
            node {
              ... on PlayerGameScore {
                allAroundScore
                scoreStatus
              }
            }
          }
        }
      }
    }
  }
`;
var GET_PLAYER_ODDS = `
  query GetPlayerOdds($slugs: [String!]!) {
    players(slugs: $slugs) {
      ... on Player {
        slug
        displayName
        activeClub {
          name
        }
        nextClassicFixturePlayingStatusOdds {
          starterOddsBasisPoints
        }
        nextGame(so5FixtureEligible: true) {
          date
          homeTeam {
            name
            code
          }
          awayTeam {
            name
            code
          }
          homeStats {
            ... on FootballTeamGameStats {
              winOddsBasisPoints
              drawOddsBasisPoints
              loseOddsBasisPoints
            }
          }
          awayStats {
            ... on FootballTeamGameStats {
              winOddsBasisPoints
              drawOddsBasisPoints
              loseOddsBasisPoints
            }
          }
        }
      }
    }
  }
`;

// src/worker/handlers/extract-players.ts
async function extractPlayersHandler(repository, client) {
  console.log("\u{1F50D} [Extract Players] Starting...");
  const result = {
    added: 0,
    updated: 0,
    unchanged: 0,
    total: 0,
    errors: []
  };
  try {
    console.log("Fetching MLS competition...");
    const compData = await client.query(GET_MLS_COMPETITION);
    if (!compData.football?.competition) {
      throw new Error("MLS competition not found");
    }
    const clubEdges = compData.football.competition.clubs.edges;
    console.log(`Found ${clubEdges.length} clubs`);
    const allClubs = [];
    for (let i = 0; i < clubEdges.length; i++) {
      const clubNode = clubEdges[i].node;
      console.log(`[${i + 1}/${clubEdges.length}] Fetching ${clubNode.name}...`);
      let retries = 3;
      let success = false;
      while (retries > 0 && !success) {
        try {
          const clubData = await client.query(GET_CLUB_PLAYERS, {
            slug: clubNode.slug
          });
          if (clubData.football?.club) {
            allClubs.push(clubData.football.club);
            success = true;
            console.log(`  \u2705 ${clubNode.name}: ${clubData.football.club.activePlayers?.edges.length || 0} players`);
          }
        } catch (err) {
          retries--;
          if (retries > 0) {
            const delay = (4 - retries) * 1e3;
            console.warn(`  \u26A0\uFE0F Retry ${clubNode.name} in ${delay}ms... (${retries} left)`);
            await new Promise((resolve2) => setTimeout(resolve2, delay));
          } else {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`  \u274C Failed to fetch ${clubNode.name}: ${msg}`);
            result.errors.push(`${clubNode.name}: ${msg}`);
          }
        }
      }
      await new Promise((resolve2) => setTimeout(resolve2, 50));
    }
    console.log(`Successfully fetched ${allClubs.length} clubs`);
    console.log("Pre-fetching existing KV keys and metadata...");
    const existingKeysMap = await repository.getKeysAndMetadata();
    console.log(`Found ${existingKeysMap.size} existing players in KV`);
    const seenSlugs = /* @__PURE__ */ new Set();
    for (const club of allClubs) {
      for (const edge of club.activePlayers?.edges || []) {
        const player = edge.node;
        if (seenSlugs.has(player.slug))
          continue;
        if (player.activeClub?.slug !== club.slug)
          continue;
        const position = player.anyPositions?.[0] || "Unknown";
        const clubCode = club.code || player.activeClub?.code || "UNK";
        const newKey = KVPlayerRepository.makeKey(clubCode, player.slug);
        try {
          const existingInfo = existingKeysMap.get(player.slug);
          if (existingInfo) {
            const { keyName, metadata } = existingInfo;
            let hasChanges = false;
            if (metadata) {
              hasChanges = metadata.name !== player.displayName || metadata.clubSlug !== club.slug || metadata.position !== position;
            } else {
              hasChanges = true;
            }
            if (hasChanges) {
              const existingPlayer = await repository.findBySlug(player.slug);
              if (existingPlayer) {
                const updates = {
                  name: player.displayName,
                  clubSlug: club.slug,
                  clubName: club.name,
                  clubCode,
                  position
                };
                if (keyName !== newKey) {
                  await repository.kv.delete(keyName);
                  console.log(`Club changed for ${player.displayName}: deleted old key ${keyName}`);
                }
                const updated = await repository.updatePlayer(player.slug, updates);
                if (updated) {
                  result.updated++;
                  console.log(`Updated: ${player.displayName} (${club.name})`);
                }
              }
            } else {
              result.unchanged++;
            }
          } else {
            const newPlayer = {
              slug: player.slug,
              name: player.displayName,
              clubSlug: club.slug,
              clubName: club.name,
              clubCode,
              position
            };
            const added = await repository.addPlayer(newPlayer);
            if (added) {
              result.added++;
              console.log(`Added: ${player.displayName} (${club.name})`);
            }
          }
          seenSlugs.add(player.slug);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`Error processing ${player.slug}: ${msg}`);
          result.errors.push(`${player.slug}: ${msg}`);
        }
      }
    }
    result.total = seenSlugs.size;
    console.log(`
\u2705 Extract complete:`);
    console.log(`   Added: ${result.added}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Unchanged: ${result.unchanged}`);
    console.log(`   Total: ${result.total}`);
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`);
    }
    return result;
  } catch (error3) {
    const msg = error3 instanceof Error ? error3.message : String(error3);
    console.error(`Extract players failed: ${msg}`);
    result.errors.push(`Fatal: ${msg}`);
    return result;
  }
}
__name(extractPlayersHandler, "extractPlayersHandler");

// src/worker/handlers/analyze-homeaway.ts
var GAMES_COUNT = 50;
var DELAY_MS = 50;
async function fetchPlayersHomeAwayBatch(client, playersBatch) {
  const resultMap = /* @__PURE__ */ new Map();
  const slugs = playersBatch.map((p) => p.slug);
  for (const slug of slugs)
    resultMap.set(slug, null);
  try {
    const data = await client.query(GET_PLAYERS_GAME_SCORES, {
      slugs,
      last: GAMES_COUNT
    });
    if (!data.players)
      return resultMap;
    const playerLookup = new Map(playersBatch.map((p) => [p.slug, p]));
    for (const playerData of data.players) {
      const record = playerLookup.get(playerData.slug);
      if (!record)
        continue;
      const clubName = playerData.activeClub?.name || record.clubName;
      const scores = playerData.allPlayerGameScores?.edges?.map((e) => e.node) || [];
      const homeScores = [];
      const awayScores = [];
      for (const score of scores) {
        if (!score?.anyGame)
          continue;
        if (score.score <= 0)
          continue;
        const isHome = score.anyGame.homeTeam?.name === clubName;
        const isAway = score.anyGame.awayTeam?.name === clubName;
        if (isHome)
          homeScores.push(score.score);
        else if (isAway)
          awayScores.push(score.score);
      }
      const homeAverage = homeScores.length > 0 ? homeScores.reduce((a, b) => a + b, 0) / homeScores.length : 0;
      const awayAverage = awayScores.length > 0 ? awayScores.reduce((a, b) => a + b, 0) / awayScores.length : 0;
      const homeAdvantageFactor = awayAverage > 0 ? (homeAverage - awayAverage) / awayAverage : 0;
      resultMap.set(playerData.slug, {
        calculatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        gamesAnalyzed: scores.length,
        home: {
          games: homeScores.length,
          average: Number(homeAverage.toFixed(2))
        },
        away: {
          games: awayScores.length,
          average: Number(awayAverage.toFixed(2))
        },
        homeAdvantageFactor: Number(homeAdvantageFactor.toFixed(4))
      });
    }
    return resultMap;
  } catch (error3) {
    console.warn(`Error fetching HomeAway batch:`, error3);
    return resultMap;
  }
}
__name(fetchPlayersHomeAwayBatch, "fetchPlayersHomeAwayBatch");
async function analyzeHomeAwayHandler(repository, client) {
  console.log("\u{1F3E0} [Analyze Home/Away] Starting...");
  const result = {
    processed: 0,
    updated: 0,
    errors: 0,
    details: []
  };
  try {
    const db = await repository.loadLight();
    const players = db.players;
    console.log(`Found ${players.length} players to analyze`);
    const BATCH_SIZE = 50;
    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE);
      console.log(`[Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(players.length / BATCH_SIZE)}] Analyzing ${batch.length} players...`);
      const batchHomeAwayMap = await fetchPlayersHomeAwayBatch(client, batch);
      for (const player of batch) {
        const stats = batchHomeAwayMap.get(player.slug);
        if (stats) {
          const strategy = new DefaultUpdateStrategy();
          try {
            const updated = await repository.updatePlayerStats(
              player.slug,
              { homeAwayAnalysis: stats },
              strategy
            );
            if (updated) {
              result.updated++;
            }
            result.details.push({
              slug: player.slug,
              name: player.name,
              homeGames: stats.home.games,
              awayGames: stats.away.games,
              homeAvg: stats.home.average,
              awayAvg: stats.away.average,
              haFactor: stats.homeAdvantageFactor
            });
          } catch (err) {
            console.error(`   \u274C Failed to update ${player.slug}:`, err);
            result.errors++;
          }
        } else {
          result.errors++;
        }
        result.processed++;
      }
      if (i + BATCH_SIZE < players.length) {
        await new Promise((resolve2) => setTimeout(resolve2, DELAY_MS));
      }
    }
    console.log(`
\u2705 Home/Away analysis complete:`);
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Errors: ${result.errors}`);
    return result;
  } catch (error3) {
    console.error(`Home/Away analysis failed:`, error3);
    return result;
  }
}
__name(analyzeHomeAwayHandler, "analyzeHomeAwayHandler");

// src/worker/handlers/analyze-aa.ts
var DELAY_MS2 = 50;
async function fetchPlayersAABatch(client, playersBatch) {
  const resultMap = /* @__PURE__ */ new Map();
  const slugs = playersBatch.map((p) => p.slug);
  for (const slug of slugs)
    resultMap.set(slug, null);
  try {
    const data = await client.query(GET_PLAYERS_AA_SCORES, {
      slugs,
      last: 25
    });
    if (!data.players)
      return resultMap;
    for (const playerData of data.players) {
      const scores = playerData.allPlayerGameScores.edges.map(
        (edge) => edge.node
      );
      const validAAScores = scores.filter(
        (score) => score.allAroundScore !== 0 && score.scoreStatus !== "DID_NOT_PLAY"
      ).map((score) => score.allAroundScore);
      const AA5 = validAAScores.length >= 5 ? Number(
        (validAAScores.slice(0, 5).reduce((a, b) => a + b, 0) / 5).toFixed(2)
      ) : null;
      const AA15 = validAAScores.length >= 15 ? Number(
        (validAAScores.slice(0, 15).reduce((a, b) => a + b, 0) / 15).toFixed(2)
      ) : null;
      const AA25 = validAAScores.length >= 25 ? Number(
        (validAAScores.reduce((a, b) => a + b, 0) / validAAScores.length).toFixed(2)
      ) : null;
      resultMap.set(playerData.slug, {
        calculatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        gamesAnalyzed: scores.length,
        AA5,
        AA15,
        AA25,
        validScores: validAAScores
      });
    }
    return resultMap;
  } catch (error3) {
    console.warn(`Error fetching AA batch:`, error3);
    return resultMap;
  }
}
__name(fetchPlayersAABatch, "fetchPlayersAABatch");
async function analyzeAAHandler(repository, client) {
  console.log("\u{1F4CA} [Analyze AA] Starting...");
  const result = {
    processed: 0,
    updated: 0,
    errors: 0,
    byPosition: {}
  };
  try {
    const db = await repository.loadLight();
    const players = db.players;
    console.log(`Found ${players.length} players to analyze`);
    const BATCH_SIZE = 50;
    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE);
      console.log(`[Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(players.length / BATCH_SIZE)}] Analyzing ${batch.length} players...`);
      const batchAAMap = await fetchPlayersAABatch(client, batch);
      for (const player of batch) {
        const aaStats = batchAAMap.get(player.slug);
        if (aaStats) {
          const strategy = new DefaultUpdateStrategy();
          try {
            const updated = await repository.updatePlayerStats(
              player.slug,
              { aaAnalysis: aaStats },
              strategy
            );
            if (updated) {
              result.updated++;
            }
            const pos = player.position || "Unknown";
            if (!result.byPosition[pos]) {
              result.byPosition[pos] = { count: 0, avgAA5: 0 };
            }
            if (aaStats.AA5 !== null) {
              result.byPosition[pos].count++;
              result.byPosition[pos].avgAA5 += aaStats.AA5;
            }
          } catch (err) {
            console.error(`   \u274C Failed to update ${player.slug}:`, err);
            result.errors++;
          }
        } else {
          result.errors++;
        }
        result.processed++;
      }
      if (i + BATCH_SIZE < players.length) {
        await new Promise((resolve2) => setTimeout(resolve2, DELAY_MS2));
      }
    }
    for (const pos of Object.keys(result.byPosition)) {
      const data = result.byPosition[pos];
      if (data.count > 0) {
        data.avgAA5 = Number((data.avgAA5 / data.count).toFixed(2));
      }
    }
    console.log(`
\u2705 AA analysis complete:`);
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Errors: ${result.errors}`);
    return result;
  } catch (error3) {
    console.error(`AA analysis failed:`, error3);
    return result;
  }
}
__name(analyzeAAHandler, "analyzeAAHandler");

// src/worker/handlers/analyze-odds.ts
var DELAY_MS3 = 50;
function basisPointsToPercentage(basisPoints) {
  if (basisPoints == null)
    return null;
  return Math.round(basisPoints / 100);
}
__name(basisPointsToPercentage, "basisPointsToPercentage");
async function fetchPlayersOddsBatch(client, playersBatch) {
  const resultMap = /* @__PURE__ */ new Map();
  const slugs = playersBatch.map((p) => p.slug);
  for (const slug of slugs) {
    resultMap.set(slug, null);
  }
  try {
    const data = await client.query(GET_PLAYER_ODDS, {
      slugs
    });
    if (!data.players || data.players.length === 0) {
      return resultMap;
    }
    const playerLookup = new Map(playersBatch.map((p) => [p.slug, p]));
    for (const playerData of data.players) {
      const record = playerLookup.get(playerData.slug);
      if (!record)
        continue;
      const clubName = playerData.activeClub?.name || record.clubName;
      let startingOdds = null;
      if (playerData.nextClassicFixturePlayingStatusOdds) {
        startingOdds = {
          starterOddsBasisPoints: playerData.nextClassicFixturePlayingStatusOdds.starterOddsBasisPoints
        };
      }
      let nextFixture = null;
      if (playerData.nextGame && clubName) {
        const game = playerData.nextGame;
        const isHome = game.homeTeam.name === clubName;
        const opponent = isHome ? game.awayTeam.name : game.homeTeam.name;
        let teamWinOdds = null;
        if (isHome && game.homeStats) {
          teamWinOdds = {
            winOddsBasisPoints: game.homeStats.winOddsBasisPoints ?? 0,
            drawOddsBasisPoints: game.homeStats.drawOddsBasisPoints ?? 0,
            loseOddsBasisPoints: game.homeStats.loseOddsBasisPoints ?? 0
          };
        } else if (!isHome && game.awayStats) {
          teamWinOdds = {
            winOddsBasisPoints: game.awayStats.winOddsBasisPoints ?? 0,
            drawOddsBasisPoints: game.awayStats.drawOddsBasisPoints ?? 0,
            loseOddsBasisPoints: game.awayStats.loseOddsBasisPoints ?? 0
          };
        }
        nextFixture = {
          fixtureDate: game.date,
          opponent,
          isHome,
          startingOdds,
          teamWinOdds
        };
      }
      resultMap.set(playerData.slug, {
        calculatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        nextFixture
      });
    }
    return resultMap;
  } catch (error3) {
    console.warn(`Error fetching odds for batch:`, error3);
    return resultMap;
  }
}
__name(fetchPlayersOddsBatch, "fetchPlayersOddsBatch");
function formatOddsDisplay(odds) {
  if (!odds?.nextFixture?.startingOdds) {
    return "No odds";
  }
  const { startingOdds, teamWinOdds, isHome, opponent } = odds.nextFixture;
  const starter = basisPointsToPercentage(startingOdds.starterOddsBasisPoints);
  let display = `Starter:${starter}%`;
  if (teamWinOdds) {
    const win = basisPointsToPercentage(teamWinOdds.winOddsBasisPoints);
    const location = isHome ? "vs" : "@";
    display += ` Win:${win}% ${location} ${opponent}`;
  }
  return display;
}
__name(formatOddsDisplay, "formatOddsDisplay");
async function analyzeOddsHandler(repository, client) {
  console.log("\u{1F3B2} [Analyze Odds] Starting...");
  const result = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    withStartingOdds: 0,
    withWinOdds: 0
  };
  try {
    const db = await repository.loadLight();
    const players = db.players;
    console.log(`Found ${players.length} players to analyze`);
    const BATCH_SIZE = 50;
    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE);
      console.log(`[Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(players.length / BATCH_SIZE)}] Analyzing ${batch.length} players...`);
      const batchOddsMap = await fetchPlayersOddsBatch(client, batch);
      for (const player of batch) {
        const odds = batchOddsMap.get(player.slug);
        if (odds) {
          const startingOddsBP = odds.nextFixture?.startingOdds?.starterOddsBasisPoints;
          const hasNextGame = !!odds.nextFixture?.fixtureDate;
          if (!startingOddsBP || startingOddsBP < 1e3 || !hasNextGame) {
            result.skipped++;
            result.processed++;
            continue;
          }
          try {
            const strategy = new DefaultUpdateStrategy();
            const updated = await repository.updatePlayerStats(
              player.slug,
              { odds },
              strategy
            );
            if (updated) {
              result.updated++;
              console.log(`   \u2705 ${player.name}: ${formatOddsDisplay(odds)}`);
            } else {
              result.skipped++;
            }
            if (odds.nextFixture?.startingOdds) {
              result.withStartingOdds++;
            }
            if (odds.nextFixture?.teamWinOdds) {
              result.withWinOdds++;
            }
          } catch (err) {
            console.error(`   \u274C Failed to update ${player.slug}:`, err);
            result.errors++;
          }
        } else {
          result.errors++;
        }
        result.processed++;
      }
      if (i + BATCH_SIZE < players.length) {
        await new Promise((resolve2) => setTimeout(resolve2, DELAY_MS3));
      }
    }
    console.log(`
\u2705 Odds analysis complete:`);
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Skipped (preserved): ${result.skipped}`);
    console.log(`   Errors: ${result.errors}`);
    console.log(`   With starting odds: ${result.withStartingOdds}`);
    console.log(`   With win odds: ${result.withWinOdds}`);
    return result;
  } catch (error3) {
    console.error(`Odds analysis failed:`, error3);
    return result;
  }
}
__name(analyzeOddsHandler, "analyzeOddsHandler");

// src/worker/index.ts
async function handleCron(cron, env2) {
  console.log(`\u{1F514} Cron triggered: ${cron}`);
  const repository = createKVRepository(env2.MLS_PLAYERS);
  const client = createSorareClient(env2);
  if (!env2.SORARE_API_KEY) {
    console.error("\u274C SORARE_API_KEY not configured");
    throw new Error("SORARE_API_KEY not configured");
  }
  switch (cron) {
    case "0 8 * * 2":
      console.log("\u{1F4CB} Running extract-players...");
      await extractPlayersHandler(repository, client);
      break;
    case "0 8 * * 3":
      console.log("\u{1F4CA} Running analyze-homeaway...");
      await analyzeHomeAwayHandler(repository, client);
      console.log("\u{1F4CA} Running analyze-aa...");
      await analyzeAAHandler(repository, client);
      break;
    case "0 0 * * 4":
    case "0 4 * * 4":
    case "0 8 * * 4":
    case "0 12 * * 4":
    case "0 16 * * 4":
    case "0 20 * * 4":
    case "0 0 * * 5":
    case "0 4 * * 5":
    case "0 8 * * 5":
    case "0 12 * * 5":
    case "0 16 * * 5":
    case "0 20 * * 5":
    case "0 0 * * 6":
    case "0 4 * * 6":
    case "0 8 * * 6":
    case "0 12 * * 6":
    case "0 16 * * 6":
    case "0 20 * * 6":
    case "0 0 * * 7":
    case "0 4 * * 7":
    case "0 8 * * 7":
    case "0 12 * * 7":
    case "0 16 * * 7":
    case "0 20 * * 7":
      console.log("\u{1F3B2} Running analyze-odds...");
      await analyzeOddsHandler(repository, client);
      break;
    default:
      console.log(`\u26A0\uFE0F Unknown cron: ${cron}`);
  }
}
__name(handleCron, "handleCron");
async function handleFetch(request, env2, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers });
  }
  try {
    if (path === "/" || path === "/health") {
      const playerCount = await createKVRepository(env2.MLS_PLAYERS).countPlayers();
      return json({
        status: "ok",
        service: "mls-player-sync",
        players: playerCount,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }, headers);
    }
    if (path === "/trigger" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const job = body.job;
      if (!job || !["extract-players", "analyze-homeaway", "analyze-aa", "analyze-odds"].includes(job)) {
        return json({ error: "Unknown job. Use: extract-players, analyze-homeaway, analyze-aa, analyze-odds" }, headers, 400);
      }
      const repository = createKVRepository(env2.MLS_PLAYERS);
      const client = createSorareClient(env2);
      let result;
      switch (job) {
        case "extract-players":
          result = await extractPlayersHandler(repository, client);
          break;
        case "analyze-homeaway":
          result = await analyzeHomeAwayHandler(repository, client);
          break;
        case "analyze-aa":
          result = await analyzeAAHandler(repository, client);
          break;
        case "analyze-odds":
          result = await analyzeOddsHandler(repository, client);
          break;
      }
      return json({
        success: true,
        job,
        result,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }, headers);
    }
    if (path === "/status") {
      const repository = createKVRepository(env2.MLS_PLAYERS);
      const db = await repository.load();
      const withHomeAway = db.players.filter((p) => p.stats?.homeAwayAnalysis).length;
      const withAA = db.players.filter((p) => p.stats?.aaAnalysis).length;
      const withOdds = db.players.filter((p) => p.stats?.odds?.nextFixture?.startingOdds).length;
      return json({
        totalPlayers: db.totalPlayers,
        totalClubs: db.totalClubs,
        withHomeAwayAnalysis: withHomeAway,
        withAAAnalysis: withAA,
        withOdds,
        season: db.season,
        extractedAt: db.extractedAt
      }, headers);
    }
    return json({ error: "Not found" }, headers, 404);
  } catch (error3) {
    const msg = error3 instanceof Error ? error3.message : String(error3);
    console.error("Handler error:", msg);
    return json({ error: msg }, headers, 500);
  }
}
__name(handleFetch, "handleFetch");
function json(data, headers, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}
__name(json, "json");
var worker_default = {
  /**
   * Handler per richieste HTTP
   */
  async fetch(request, env2, ctx) {
    console.log(`[HTTP] ${request.method} ${request.url}`);
    return handleFetch(request, env2, ctx);
  },
  /**
   * Handler per cron triggers
   */
  async scheduled(controller, env2, ctx) {
    console.log(`[CRON] Triggered: ${controller.cron} at ${(/* @__PURE__ */ new Date()).toISOString()}`);
    ctx.waitUntil(
      handleCron(controller.cron, env2).catch((error3) => {
        console.error("Cron handler failed:", error3);
        throw error3;
      })
    );
  }
};

// node_modules/.pnpm/wrangler@3.114.17_@cloudflare+workers-types@4.20260226.1/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/.pnpm/wrangler@3.114.17_@cloudflare+workers-types@4.20260226.1/node_modules/wrangler/templates/middleware/middleware-scheduled.ts
var scheduled = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  const url = new URL(request.url);
  if (url.pathname === "/__scheduled") {
    const cron = url.searchParams.get("cron") ?? "";
    await middlewareCtx.dispatch("scheduled", { cron });
    return new Response("Ran scheduled event");
  }
  const resp = await middlewareCtx.next(request, env2);
  if (request.headers.get("referer")?.endsWith("/__scheduled") && url.pathname === "/favicon.ico" && resp.status === 500) {
    return new Response(null, { status: 404 });
  }
  return resp;
}, "scheduled");
var middleware_scheduled_default = scheduled;

// node_modules/.pnpm/wrangler@3.114.17_@cloudflare+workers-types@4.20260226.1/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    return Response.json(error3, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-ijyoPu/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_scheduled_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/.pnpm/wrangler@3.114.17_@cloudflare+workers-types@4.20260226.1/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-ijyoPu/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
