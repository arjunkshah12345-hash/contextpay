globalThis.process ||= { env: { PAYPAL_MODE: "mock", PLANNER: "heuristic", COMPRESS_ENGINE: "local", NO_COLOR: "1", PUBLIC_URL: location.origin + location.pathname.replace(/\/[^/]*$/, "") }, argv: [], execPath: "", stdout: {}, exit(c) { throw new Error("exit " + c); }, cwd: () => "/" };
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/path-browserify/index.js
var require_path_browserify = __commonJS({
  "node_modules/path-browserify/index.js"(exports, module) {
    "use strict";
    function assertPath(path2) {
      if (typeof path2 !== "string") {
        throw new TypeError("Path must be a string. Received " + JSON.stringify(path2));
      }
    }
    function normalizeStringPosix(path2, allowAboveRoot) {
      var res = "";
      var lastSegmentLength = 0;
      var lastSlash = -1;
      var dots = 0;
      var code;
      for (var i = 0; i <= path2.length; ++i) {
        if (i < path2.length)
          code = path2.charCodeAt(i);
        else if (code === 47)
          break;
        else
          code = 47;
        if (code === 47) {
          if (lastSlash === i - 1 || dots === 1) {
          } else if (lastSlash !== i - 1 && dots === 2) {
            if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
              if (res.length > 2) {
                var lastSlashIndex = res.lastIndexOf("/");
                if (lastSlashIndex !== res.length - 1) {
                  if (lastSlashIndex === -1) {
                    res = "";
                    lastSegmentLength = 0;
                  } else {
                    res = res.slice(0, lastSlashIndex);
                    lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
                  }
                  lastSlash = i;
                  dots = 0;
                  continue;
                }
              } else if (res.length === 2 || res.length === 1) {
                res = "";
                lastSegmentLength = 0;
                lastSlash = i;
                dots = 0;
                continue;
              }
            }
            if (allowAboveRoot) {
              if (res.length > 0)
                res += "/..";
              else
                res = "..";
              lastSegmentLength = 2;
            }
          } else {
            if (res.length > 0)
              res += "/" + path2.slice(lastSlash + 1, i);
            else
              res = path2.slice(lastSlash + 1, i);
            lastSegmentLength = i - lastSlash - 1;
          }
          lastSlash = i;
          dots = 0;
        } else if (code === 46 && dots !== -1) {
          ++dots;
        } else {
          dots = -1;
        }
      }
      return res;
    }
    function _format(sep, pathObject) {
      var dir = pathObject.dir || pathObject.root;
      var base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
      if (!dir) {
        return base;
      }
      if (dir === pathObject.root) {
        return dir + base;
      }
      return dir + sep + base;
    }
    var posix = {
      // path.resolve([from ...], to)
      resolve: function resolve() {
        var resolvedPath = "";
        var resolvedAbsolute = false;
        var cwd;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path2;
          if (i >= 0)
            path2 = arguments[i];
          else {
            if (cwd === void 0)
              cwd = process.cwd();
            path2 = cwd;
          }
          assertPath(path2);
          if (path2.length === 0) {
            continue;
          }
          resolvedPath = path2 + "/" + resolvedPath;
          resolvedAbsolute = path2.charCodeAt(0) === 47;
        }
        resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);
        if (resolvedAbsolute) {
          if (resolvedPath.length > 0)
            return "/" + resolvedPath;
          else
            return "/";
        } else if (resolvedPath.length > 0) {
          return resolvedPath;
        } else {
          return ".";
        }
      },
      normalize: function normalize(path2) {
        assertPath(path2);
        if (path2.length === 0) return ".";
        var isAbsolute = path2.charCodeAt(0) === 47;
        var trailingSeparator = path2.charCodeAt(path2.length - 1) === 47;
        path2 = normalizeStringPosix(path2, !isAbsolute);
        if (path2.length === 0 && !isAbsolute) path2 = ".";
        if (path2.length > 0 && trailingSeparator) path2 += "/";
        if (isAbsolute) return "/" + path2;
        return path2;
      },
      isAbsolute: function isAbsolute(path2) {
        assertPath(path2);
        return path2.length > 0 && path2.charCodeAt(0) === 47;
      },
      join: function join() {
        if (arguments.length === 0)
          return ".";
        var joined;
        for (var i = 0; i < arguments.length; ++i) {
          var arg = arguments[i];
          assertPath(arg);
          if (arg.length > 0) {
            if (joined === void 0)
              joined = arg;
            else
              joined += "/" + arg;
          }
        }
        if (joined === void 0)
          return ".";
        return posix.normalize(joined);
      },
      relative: function relative(from, to) {
        assertPath(from);
        assertPath(to);
        if (from === to) return "";
        from = posix.resolve(from);
        to = posix.resolve(to);
        if (from === to) return "";
        var fromStart = 1;
        for (; fromStart < from.length; ++fromStart) {
          if (from.charCodeAt(fromStart) !== 47)
            break;
        }
        var fromEnd = from.length;
        var fromLen = fromEnd - fromStart;
        var toStart = 1;
        for (; toStart < to.length; ++toStart) {
          if (to.charCodeAt(toStart) !== 47)
            break;
        }
        var toEnd = to.length;
        var toLen = toEnd - toStart;
        var length = fromLen < toLen ? fromLen : toLen;
        var lastCommonSep = -1;
        var i = 0;
        for (; i <= length; ++i) {
          if (i === length) {
            if (toLen > length) {
              if (to.charCodeAt(toStart + i) === 47) {
                return to.slice(toStart + i + 1);
              } else if (i === 0) {
                return to.slice(toStart + i);
              }
            } else if (fromLen > length) {
              if (from.charCodeAt(fromStart + i) === 47) {
                lastCommonSep = i;
              } else if (i === 0) {
                lastCommonSep = 0;
              }
            }
            break;
          }
          var fromCode = from.charCodeAt(fromStart + i);
          var toCode = to.charCodeAt(toStart + i);
          if (fromCode !== toCode)
            break;
          else if (fromCode === 47)
            lastCommonSep = i;
        }
        var out = "";
        for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
          if (i === fromEnd || from.charCodeAt(i) === 47) {
            if (out.length === 0)
              out += "..";
            else
              out += "/..";
          }
        }
        if (out.length > 0)
          return out + to.slice(toStart + lastCommonSep);
        else {
          toStart += lastCommonSep;
          if (to.charCodeAt(toStart) === 47)
            ++toStart;
          return to.slice(toStart);
        }
      },
      _makeLong: function _makeLong(path2) {
        return path2;
      },
      dirname: function dirname(path2) {
        assertPath(path2);
        if (path2.length === 0) return ".";
        var code = path2.charCodeAt(0);
        var hasRoot = code === 47;
        var end = -1;
        var matchedSlash = true;
        for (var i = path2.length - 1; i >= 1; --i) {
          code = path2.charCodeAt(i);
          if (code === 47) {
            if (!matchedSlash) {
              end = i;
              break;
            }
          } else {
            matchedSlash = false;
          }
        }
        if (end === -1) return hasRoot ? "/" : ".";
        if (hasRoot && end === 1) return "//";
        return path2.slice(0, end);
      },
      basename: function basename(path2, ext) {
        if (ext !== void 0 && typeof ext !== "string") throw new TypeError('"ext" argument must be a string');
        assertPath(path2);
        var start = 0;
        var end = -1;
        var matchedSlash = true;
        var i;
        if (ext !== void 0 && ext.length > 0 && ext.length <= path2.length) {
          if (ext.length === path2.length && ext === path2) return "";
          var extIdx = ext.length - 1;
          var firstNonSlashEnd = -1;
          for (i = path2.length - 1; i >= 0; --i) {
            var code = path2.charCodeAt(i);
            if (code === 47) {
              if (!matchedSlash) {
                start = i + 1;
                break;
              }
            } else {
              if (firstNonSlashEnd === -1) {
                matchedSlash = false;
                firstNonSlashEnd = i + 1;
              }
              if (extIdx >= 0) {
                if (code === ext.charCodeAt(extIdx)) {
                  if (--extIdx === -1) {
                    end = i;
                  }
                } else {
                  extIdx = -1;
                  end = firstNonSlashEnd;
                }
              }
            }
          }
          if (start === end) end = firstNonSlashEnd;
          else if (end === -1) end = path2.length;
          return path2.slice(start, end);
        } else {
          for (i = path2.length - 1; i >= 0; --i) {
            if (path2.charCodeAt(i) === 47) {
              if (!matchedSlash) {
                start = i + 1;
                break;
              }
            } else if (end === -1) {
              matchedSlash = false;
              end = i + 1;
            }
          }
          if (end === -1) return "";
          return path2.slice(start, end);
        }
      },
      extname: function extname(path2) {
        assertPath(path2);
        var startDot = -1;
        var startPart = 0;
        var end = -1;
        var matchedSlash = true;
        var preDotState = 0;
        for (var i = path2.length - 1; i >= 0; --i) {
          var code = path2.charCodeAt(i);
          if (code === 47) {
            if (!matchedSlash) {
              startPart = i + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
          if (code === 46) {
            if (startDot === -1)
              startDot = i;
            else if (preDotState !== 1)
              preDotState = 1;
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
        preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
          return "";
        }
        return path2.slice(startDot, end);
      },
      format: function format(pathObject) {
        if (pathObject === null || typeof pathObject !== "object") {
          throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
        }
        return _format("/", pathObject);
      },
      parse: function parse(path2) {
        assertPath(path2);
        var ret = { root: "", dir: "", base: "", ext: "", name: "" };
        if (path2.length === 0) return ret;
        var code = path2.charCodeAt(0);
        var isAbsolute = code === 47;
        var start;
        if (isAbsolute) {
          ret.root = "/";
          start = 1;
        } else {
          start = 0;
        }
        var startDot = -1;
        var startPart = 0;
        var end = -1;
        var matchedSlash = true;
        var i = path2.length - 1;
        var preDotState = 0;
        for (; i >= start; --i) {
          code = path2.charCodeAt(i);
          if (code === 47) {
            if (!matchedSlash) {
              startPart = i + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
          if (code === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
        preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
          if (end !== -1) {
            if (startPart === 0 && isAbsolute) ret.base = ret.name = path2.slice(1, end);
            else ret.base = ret.name = path2.slice(startPart, end);
          }
        } else {
          if (startPart === 0 && isAbsolute) {
            ret.name = path2.slice(1, startDot);
            ret.base = path2.slice(1, end);
          } else {
            ret.name = path2.slice(startPart, startDot);
            ret.base = path2.slice(startPart, end);
          }
          ret.ext = path2.slice(startDot, end);
        }
        if (startPart > 0) ret.dir = path2.slice(0, startPart - 1);
        else if (isAbsolute) ret.dir = "/";
        return ret;
      },
      sep: "/",
      delimiter: ":",
      win32: null,
      posix: null
    };
    posix.posix = posix;
    module.exports = posix;
  }
});

// static-demo/shims/fs.js
var K = "contextpay:";
var fs = {
  readFileSync(f) {
    const v = localStorage.getItem(K + f);
    if (v == null) {
      if (/src\//.test(f)) return SRC;
      throw new Error("ENOENT");
    }
    return v;
  },
  writeFileSync(f, d) {
    localStorage.setItem(K + f, d);
  },
  renameSync(a, b) {
    localStorage.setItem(K + b, localStorage.getItem(K + a));
    localStorage.removeItem(K + a);
  },
  mkdirSync() {
  },
  existsSync: (f) => localStorage.getItem(K + f) != null,
  readdirSync() {
    return ["server.js", "mandate.js", "planner.js", "paypal.js"];
  }
};
var SRC = Array.from({ length: 400 }, (_, i) => `export function handler${i}(req, res) { const x = require("./mod${i % 17}"); module.exports.h${i} = x; return res.json({ ok: ${i} }); }`).join("\n");
var fs_default = fs;
var { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, readdirSync } = fs;

// agent/demo-agent.js
var import_node_path = __toESM(require_path_browserify(), 1);
var BASE = process.env.CONTEXTPAY_URL || `http://localhost:${process.env.PORT || 4242}`;
var WAIT = !process.argv.includes("--no-wait");
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
var plain = process.env.NO_COLOR || !process.stdout.isTTY;
var c = plain ? { dim: "", bold: "", green: "", yellow: "", cyan: "", reset: "" } : { dim: "\x1B[2m", bold: "\x1B[1m", green: "\x1B[32m", yellow: "\x1B[33m", cyan: "\x1B[36m", reset: "\x1B[0m" };
var say = (...a) => console.log(...a);
async function api(method, route, body) {
  const res = await fetch(BASE + route, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...process.env.AGENT_TOKEN ? { Authorization: `Bearer ${process.env.AGENT_TOKEN}` } : {}
    },
    body: body ? JSON.stringify(body) : void 0
  });
  return { status: res.status, body: await res.json() };
}
function ciLog(failingTest, noiseLines) {
  const lines = [];
  for (let i = 0; i < noiseLines; i++) {
    lines.push(`[${String(i).padStart(5, "0")}] ok   packages/core/test/case_${i % 97}.test.ts (${i % 13 + 2}ms)`);
    if (i % 400 === 0) lines.push(`[${i}] info  cache restored for workspace chunk ${i / 400}`);
  }
  const at = Math.floor(noiseLines * 0.71);
  lines.splice(
    at,
    0,
    `FAIL packages/auth/test/${failingTest}`,
    `  AssertionError: expected session.expiresAt to be after issuedAt`,
    `    at Object.<anonymous> (packages/auth/test/${failingTest}:42:18)`,
    `    at refreshSession (packages/auth/src/session.ts:118:9)`
  );
  return lines.join("\n");
}
function sourceBundle() {
  const dir = import_node_path.default.resolve("src");
  return fs_default.readdirSync(dir).map((f) => `// file: src/${f}
${fs_default.readFileSync(import_node_path.default.join(dir, f), "utf8")}`).join("\n\n");
}
async function ensureCredits(job) {
  const { body: state } = await api("GET", "/api/state");
  const projectedCost = job.estimated_tokens / 1e6 * state.prices.creditPerMTok;
  if (state.wallet.balanceUsd >= projectedCost) {
    say(c.dim + `  wallet $${state.wallet.balanceUsd.toFixed(4)} covers projected $${projectedCost.toFixed(4)}` + c.reset);
    return true;
  }
  return buy(job, `wallet $${state.wallet.balanceUsd.toFixed(4)} < projected $${projectedCost.toFixed(4)}`);
}
async function buy(job, why) {
  say(c.yellow + `  needs credits (${why}). asking the planner\u2026` + c.reset);
  const { status, body } = await api("POST", "/api/agent/topup", { job });
  if (status !== 200) throw new Error(`top-up failed: ${body.error}`);
  if (body.plan) say(c.dim + `  planner: ${body.plan.rationale}` + c.reset);
  if (body.status === "charged") {
    say(c.green + `  \u2714 paid $${body.amount_usd.toFixed(2)} from saved PayPal wallet (order ${body.order_id})` + c.reset);
    return true;
  }
  if (body.status === "declined") {
    say(`  \u2718 planner declined: not worth buying. continuing uncompressed.`);
    return false;
  }
  if (body.status === "failed") {
    say(`  \u2718 PayPal did not complete the $${body.amount_usd.toFixed(2)} charge. continuing uncompressed.`);
    return false;
  }
  if (body.status === "awaiting_human") {
    say(c.bold + `  \u23F8 blocked by your rules: ${body.reason}. waiting for you.` + c.reset);
    say(`    approve or deny on the dashboard (${body.dashboard_url || BASE}), or pay via PayPal:
    ${c.cyan}${body.approve_url}${c.reset}`);
    if (!WAIT) return false;
    for (let i = 0; i < 900; i++) {
      await sleep(2e3);
      const { body: a } = await api("GET", `/api/agent/approvals/${body.approval_id}`);
      if (a.status === "approved") {
        say(c.green + `  \u2714 you approved $${a.amount_usd.toFixed(2)}. wallet now $${a.balance_usd.toFixed(4)}. resuming.` + c.reset);
        return true;
      }
      if (a.status === "denied" || a.status === "expired") {
        say(`  \u2718 purchase ${a.status}. continuing the job uncompressed.`);
        return false;
      }
    }
    say("  gave up waiting for approval.");
    return false;
  }
  throw new Error(`unexpected top-up status ${body.status}`);
}
async function compressStep(label, context, query, job) {
  let r = await api("POST", "/v1/compress", { context, query });
  if (r.status === 402) {
    if (!await buy(job, `402 from /v1/compress: balance $${r.body.balance_usd}`)) return null;
    r = await api("POST", "/v1/compress", { context, query });
  }
  if (r.status !== 200) throw new Error(`compress failed: ${r.body.error}`);
  const b = r.body;
  say(`  ${label.padEnd(34)} ${String(b.original_tokens).padStart(7)} tok in   paid $${b.charged_usd.toFixed(4)}   [${b.engine}]`);
  return b;
}
async function main() {
  const { body: s } = await api("GET", "/api/state").catch(() => {
    throw new Error(`ContextPay isn't running at ${BASE}. Start it with: npm start`);
  });
  say(`${c.bold}ContextPay demo agent${c.reset}  paypal=${s.paypalMode} compression=${s.compressEngine} planner=${s.planner}`);
  if (!s.vault) say(c.yellow + "  no saved PayPal wallet yet: every purchase will need your approval. Save one in the dashboard." + c.reset);
  const job1 = { description: "Fix the failing auth session-refresh test in CI", estimated_tokens: 2e6 };
  say(`
${c.bold}Job 1:${c.reset} ${job1.description} (~${job1.estimated_tokens / 1e6}M tokens)`);
  await ensureCredits(job1);
  const src = sourceBundle();
  for (let i = 0; i < 4; i++) {
    await compressStep(`CI log, attempt ${i + 1}`, ciLog("session.test.ts", 6e3 + i * 1500), "why does the session refresh test fail?", job1);
  }
  await compressStep("source files for the fix", src + "\n" + ciLog("session.test.ts", 3e3), "refreshSession expiresAt issuedAt", job1);
  const job2 = { description: "Migrate the whole monorepo from CommonJS to ESM", estimated_tokens: 8e7 };
  say(`
${c.bold}Job 2:${c.reset} ${job2.description} (~${job2.estimated_tokens / 1e6}M tokens)`);
  if (await ensureCredits(job2)) {
    for (let i = 0; i < 3; i++) {
      await compressStep(`package ${i + 1}: require() call sites`, src.repeat(6) + ciLog("esm.test.ts", 4e3), "require module.exports import", job2);
    }
  } else {
    say(c.dim + "  job 2 runs without compression: full context goes to the model." + c.reset);
  }
  const { body: end } = await api("GET", "/api/state");
  const u = end.usage;
  say(`
${c.bold}Summary${c.reset}`);
  const pc = end.purchaseCounts;
  say(`  ${u.requests} compression calls, ${u.tokensIn.toLocaleString()} tokens in, $${u.spentOnCompressionUsd.toFixed(4)} of credits used`);
  say(`  purchases: ${pc.paid} paid by the agent, ${pc.blocked} blocked by your rules, ${pc.approved} approved by you`);
  say(`  agent spend today $${end.spentTodayUsd.toFixed(2)} of $${end.mandate.dailyCapUsd.toFixed(2)}; wallet $${end.wallet.balanceUsd.toFixed(4)}`);
}
var done = main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
export {
  done
};
