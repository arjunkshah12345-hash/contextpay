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
    function assertPath(path3) {
      if (typeof path3 !== "string") {
        throw new TypeError("Path must be a string. Received " + JSON.stringify(path3));
      }
    }
    function normalizeStringPosix(path3, allowAboveRoot) {
      var res = "";
      var lastSegmentLength = 0;
      var lastSlash = -1;
      var dots = 0;
      var code;
      for (var i = 0; i <= path3.length; ++i) {
        if (i < path3.length)
          code = path3.charCodeAt(i);
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
              res += "/" + path3.slice(lastSlash + 1, i);
            else
              res = path3.slice(lastSlash + 1, i);
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
          var path3;
          if (i >= 0)
            path3 = arguments[i];
          else {
            if (cwd === void 0)
              cwd = process.cwd();
            path3 = cwd;
          }
          assertPath(path3);
          if (path3.length === 0) {
            continue;
          }
          resolvedPath = path3 + "/" + resolvedPath;
          resolvedAbsolute = path3.charCodeAt(0) === 47;
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
      normalize: function normalize(path3) {
        assertPath(path3);
        if (path3.length === 0) return ".";
        var isAbsolute = path3.charCodeAt(0) === 47;
        var trailingSeparator = path3.charCodeAt(path3.length - 1) === 47;
        path3 = normalizeStringPosix(path3, !isAbsolute);
        if (path3.length === 0 && !isAbsolute) path3 = ".";
        if (path3.length > 0 && trailingSeparator) path3 += "/";
        if (isAbsolute) return "/" + path3;
        return path3;
      },
      isAbsolute: function isAbsolute(path3) {
        assertPath(path3);
        return path3.length > 0 && path3.charCodeAt(0) === 47;
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
      _makeLong: function _makeLong(path3) {
        return path3;
      },
      dirname: function dirname(path3) {
        assertPath(path3);
        if (path3.length === 0) return ".";
        var code = path3.charCodeAt(0);
        var hasRoot = code === 47;
        var end = -1;
        var matchedSlash = true;
        for (var i = path3.length - 1; i >= 1; --i) {
          code = path3.charCodeAt(i);
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
        return path3.slice(0, end);
      },
      basename: function basename(path3, ext) {
        if (ext !== void 0 && typeof ext !== "string") throw new TypeError('"ext" argument must be a string');
        assertPath(path3);
        var start2 = 0;
        var end = -1;
        var matchedSlash = true;
        var i;
        if (ext !== void 0 && ext.length > 0 && ext.length <= path3.length) {
          if (ext.length === path3.length && ext === path3) return "";
          var extIdx = ext.length - 1;
          var firstNonSlashEnd = -1;
          for (i = path3.length - 1; i >= 0; --i) {
            var code = path3.charCodeAt(i);
            if (code === 47) {
              if (!matchedSlash) {
                start2 = i + 1;
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
          if (start2 === end) end = firstNonSlashEnd;
          else if (end === -1) end = path3.length;
          return path3.slice(start2, end);
        } else {
          for (i = path3.length - 1; i >= 0; --i) {
            if (path3.charCodeAt(i) === 47) {
              if (!matchedSlash) {
                start2 = i + 1;
                break;
              }
            } else if (end === -1) {
              matchedSlash = false;
              end = i + 1;
            }
          }
          if (end === -1) return "";
          return path3.slice(start2, end);
        }
      },
      extname: function extname(path3) {
        assertPath(path3);
        var startDot = -1;
        var startPart = 0;
        var end = -1;
        var matchedSlash = true;
        var preDotState = 0;
        for (var i = path3.length - 1; i >= 0; --i) {
          var code = path3.charCodeAt(i);
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
        return path3.slice(startDot, end);
      },
      format: function format(pathObject) {
        if (pathObject === null || typeof pathObject !== "object") {
          throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
        }
        return _format("/", pathObject);
      },
      parse: function parse(path3) {
        assertPath(path3);
        var ret = { root: "", dir: "", base: "", ext: "", name: "" };
        if (path3.length === 0) return ret;
        var code = path3.charCodeAt(0);
        var isAbsolute = code === 47;
        var start2;
        if (isAbsolute) {
          ret.root = "/";
          start2 = 1;
        } else {
          start2 = 0;
        }
        var startDot = -1;
        var startPart = 0;
        var end = -1;
        var matchedSlash = true;
        var i = path3.length - 1;
        var preDotState = 0;
        for (; i >= start2; --i) {
          code = path3.charCodeAt(i);
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
            if (startPart === 0 && isAbsolute) ret.base = ret.name = path3.slice(1, end);
            else ret.base = ret.name = path3.slice(startPart, end);
          }
        } else {
          if (startPart === 0 && isAbsolute) {
            ret.name = path3.slice(1, startDot);
            ret.base = path3.slice(1, end);
          } else {
            ret.name = path3.slice(startPart, startDot);
            ret.base = path3.slice(startPart, end);
          }
          ret.ext = path3.slice(startDot, end);
        }
        if (startPart > 0) ret.dir = path3.slice(0, startPart - 1);
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

// static-demo/shims/empty.js
var empty_default = {};
function zodOutputFormat() {
}
var z = new Proxy({}, { get: () => () => new Proxy({}, { get: (t, k) => k === "then" ? void 0 : () => t }) });

// static-demo/shims/crypto.js
var c = { randomUUID: () => globalThis.crypto.randomUUID(), timingSafeEqual: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]) };
var crypto_default = c;
var { randomUUID, timingSafeEqual } = c;

// src/server.js
var import_node_path2 = __toESM(require_path_browserify(), 1);

// static-demo/shims/child_process.js
function spawn() {
  globalThis.process.env.CONTEXTPAY_URL = location.origin + location.pathname.replace(/\/[^/]*$/, "");
  const l = {};
  const child = { on(ev, fn) {
    (l[ev] ||= []).push(fn);
    return child;
  } };
  import(new URL("./agent.js?" + Date.now(), import.meta.url).href).then((m) => m.done).then(
    () => (l.exit || []).forEach((f) => f(0)),
    () => (l.exit || []).forEach((f) => f(1))
  );
  return child;
}

// static-demo/shims/url.js
var fileURLToPath = (u) => new URL(u).pathname;
var pathToFileURL = (p) => ({ href: "file://" + p });

// static-demo/shims/express.js
function compile(p) {
  const keys = [];
  const re = new RegExp("^" + p.replace(/:([A-Za-z_]+)/g, (_, k) => (keys.push(k), "([^/]+)")) + "/?$");
  return { re, keys };
}
function express() {
  const routes = [], errs = [];
  const app2 = {
    use(fn) {
      if (typeof fn === "function" && fn.length === 4) errs.push(fn);
    },
    get(p, ...h) {
      routes.push({ m: "GET", ...compile(p), h });
    },
    post(p, ...h) {
      routes.push({ m: "POST", ...compile(p), h });
    },
    listen(_p, cb) {
      setTimeout(cb);
      return { address: () => ({ port: 0 }) };
    },
    handle(method, url, body, headers = {}) {
      return new Promise((resolve) => {
        const u = new URL(url, "http://x");
        const res = {
          code: 200,
          status(c2) {
            this.code = c2;
            return this;
          },
          json(o) {
            resolve({ status: this.code, body: o });
            return this;
          },
          send(o) {
            resolve({ status: this.code, body: o });
            return this;
          },
          redirect(loc) {
            resolve({ status: 302, location: loc });
            return this;
          }
        };
        const req = { method, query: Object.fromEntries(u.searchParams), body: body || {}, params: {}, get: (k) => headers[k.toLowerCase()] };
        const fail = (err) => {
          if (errs[0]) errs[0](err, req, res, () => {
          });
          else resolve({ status: 500, body: { error: String(err) } });
        };
        const r = routes.find((r2) => r2.m === method && r2.re.test(u.pathname));
        if (!r) return resolve({ status: 404, body: { error: "not found" } });
        const mm = u.pathname.match(r.re);
        r.keys.forEach((k, i2) => req.params[k] = decodeURIComponent(mm[i2 + 1]));
        let i = 0;
        const next = (err) => {
          if (err) return fail(err);
          const fn = r.h[i++];
          if (!fn) return;
          try {
            const p = fn(req, res, next);
            if (p && p.catch) p.catch(fail);
          } catch (e) {
            fail(e);
          }
        };
        next();
      });
    }
  };
  return app2;
}
express.json = () => () => {
};
express.static = () => () => {
};

// src/paypal.js
var BASES = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com"
};
var liveAllowed = () => process.env.PAYPAL_ENV === "live" && process.env.CONTEXTPAY_ALLOW_LIVE === "1";
function paypalMode() {
  if (process.env.PAYPAL_MODE === "mock") return "mock";
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return "mock";
  return liveAllowed() ? "live" : "sandbox";
}
var cachedToken = null;
async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 6e4) return cachedToken.value;
  const basic = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch(`${BASES[paypalMode()]}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials"
  });
  if (!res.ok) throw new PayPalError("oauth", res.status, await res.text());
  const body = await res.json();
  cachedToken = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1e3 };
  return cachedToken.value;
}
var PayPalError = class extends Error {
  constructor(op, status, detail) {
    super(`PayPal ${op} failed (${status}): ${String(detail).slice(0, 400)}`);
    this.status = status;
    this.detail = detail;
  }
};
async function call(op, method, path3, body, requestId) {
  const res = await fetch(`${BASES[paypalMode()]}${path3}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      // Idempotency: a retried agent charge must never double-bill.
      "PayPal-Request-Id": requestId || crypto_default.randomUUID(),
      Prefer: "return=representation"
    },
    body: body ? JSON.stringify(body) : void 0
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new PayPalError(op, res.status, text);
  return json;
}
var link = (resource, rel) => resource.links?.find((l) => l.rel === rel)?.href;
var money = (usd) => ({ currency_code: "USD", value: usd.toFixed(2) });
function purchaseUnit(amountUsd, description, customId) {
  return { amount: money(amountUsd), description, custom_id: customId };
}
async function createCheckoutOrder({ amountUsd, returnUrl, cancelUrl, description, customId }) {
  if (paypalMode() === "mock") {
    const id = `MOCK-ORDER-${crypto_default.randomUUID().slice(0, 8)}`;
    return { id, approveUrl: `${returnUrl}?token=${id}&mock=1` };
  }
  const order = await call("create order", "POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [purchaseUnit(amountUsd, description, customId)],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: "ContextPay",
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
          return_url: returnUrl,
          cancel_url: cancelUrl
        }
      }
    }
  });
  return { id: order.id, approveUrl: link(order, "payer-action") || link(order, "approve") };
}
async function captureOrder(orderId) {
  if (paypalMode() === "mock") return { id: orderId, status: "COMPLETED", captureId: `MOCK-CAP-${orderId.slice(-8)}`, captureStatus: "COMPLETED" };
  const order = await call("capture order", "POST", `/v2/checkout/orders/${orderId}/capture`, {}, `capture-${orderId}`);
  return summarizeOrder(order);
}
function summarizeOrder(order) {
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
  return { id: order.id, status: order.status, captureId: capture?.id, captureStatus: capture?.status };
}
var isPaid = (summary) => summary.status === "COMPLETED" && (!summary.captureStatus || summary.captureStatus === "COMPLETED");
async function createVaultSetupToken({ returnUrl, cancelUrl }) {
  if (paypalMode() === "mock") {
    const id = `MOCK-SETUP-${crypto_default.randomUUID().slice(0, 8)}`;
    return { id, approveUrl: `${returnUrl}?approval_token_id=${id}&mock=1` };
  }
  const setup = await call("create vault setup token", "POST", "/v3/vault/setup-tokens", {
    payment_source: {
      paypal: {
        description: "ContextPay: lets your coding agent top up compression credits within your limits",
        usage_type: "MERCHANT",
        customer_type: "CONSUMER",
        permit_multiple_payment_tokens: false,
        experience_context: {
          brand_name: "ContextPay",
          return_url: returnUrl,
          cancel_url: cancelUrl,
          shipping_preference: "NO_SHIPPING",
          vault_instruction: "ON_PAYER_APPROVAL"
        }
      }
    }
  });
  return { id: setup.id, approveUrl: link(setup, "approve") };
}
async function createPaymentToken(setupTokenId) {
  if (paypalMode() === "mock") {
    return { id: `MOCK-VAULT-${setupTokenId.slice(-8)}`, payerEmail: "sandbox-buyer@example.com" };
  }
  const token = await call("create payment token", "POST", "/v3/vault/payment-tokens", {
    payment_source: { token: { id: setupTokenId, type: "SETUP_TOKEN" } }
  }, `vault-${setupTokenId}`);
  return { id: token.id, payerEmail: token.payment_source?.paypal?.email_address || null };
}
async function chargeVault({ paymentTokenId, amountUsd, description, customId, requestId }) {
  if (paypalMode() === "mock") {
    if (process.env.MOCK_DECLINE_VAULT === "1") return { id: `MOCK-ORDER-${requestId.slice(0, 8)}`, status: "COMPLETED", captureStatus: "DECLINED" };
    return { id: `MOCK-ORDER-${requestId.slice(0, 8)}`, status: "COMPLETED", captureId: `MOCK-CAP-${requestId.slice(-8)}`, captureStatus: "COMPLETED" };
  }
  const order = await call("vault charge", "POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [purchaseUnit(amountUsd, description, customId)],
    payment_source: {
      paypal: {
        vault_id: paymentTokenId,
        // paypal_wallet_stored_credential: payer not present, variable
        // top-ups on an agreed rule (an automatic reload). `usage` is left to
        // PayPal (DERIVED) because the first agent charge is not SUBSEQUENT.
        stored_credential: {
          payment_initiator: "MERCHANT",
          usage_pattern: "UNSCHEDULED_PREPAID"
        }
      }
    }
  }, requestId);
  if (order.status === "COMPLETED") return summarizeOrder(order);
  return captureOrder(order.id);
}
async function deletePaymentToken(paymentTokenId) {
  if (paypalMode() === "mock") return;
  try {
    await call("delete payment token", "DELETE", `/v3/vault/payment-tokens/${encodeURIComponent(paymentTokenId)}`);
  } catch (e) {
    if (e.status !== 404) throw e;
  }
}

// src/compress.js
var SC_URL = process.env.SUPERCOMPRESS_URL || "https://www.supercompress.dev/api/v1/compress";
var estimateTokens = (text) => Math.ceil(text.length / 4);
var compressEngine = () => process.env.SUPERCOMPRESS_API_KEY && process.env.COMPRESS_ENGINE !== "local" ? "supercompress" : "local-fallback";
async function compress({ context, query }) {
  if (compressEngine() === "supercompress") {
    let res;
    try {
      res = await fetch(SC_URL, {
        method: "POST",
        headers: { "X-API-Key": process.env.SUPERCOMPRESS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ context, query, source: "contextpay" }),
        signal: AbortSignal.timeout(Number(process.env.SUPERCOMPRESS_TIMEOUT_MS || 3e4))
      });
    } catch (e) {
      return { ...localCompress({ context, query }), engine: "local-fallback (supercompress unreachable)" };
    }
    if (!res.ok) throw new Error(`SuperCompress ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const r = await res.json();
    return {
      engine: "supercompress",
      compressedText: r.compressed_text,
      originalTokens: r.original_tokens,
      keptTokens: r.kept_tokens,
      tokensSaved: r.tokens_saved
    };
  }
  return localCompress({ context, query });
}
function localCompress({ context, query }) {
  const lines = context.split("\n");
  const lowered = lines.map((l) => l.toLowerCase());
  const terms = new Set(
    query.toLowerCase().split(/[^a-z0-9_]+/).filter((w) => w.length > 2).filter((w) => lowered.filter((l) => l.includes(w)).length < Math.max(3, lines.length * 0.05))
  );
  const keep = /* @__PURE__ */ new Set();
  lowered.forEach((lower, i) => {
    const hit = /error|exception|fail|traceback|panic|assert/.test(lower) || [...terms].some((t) => lower.includes(t));
    if (hit) for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 1); j++) keep.add(j);
  });
  const kept = lines.filter((_, i) => keep.has(i)).join("\n");
  const originalTokens = estimateTokens(context);
  const keptTokens = estimateTokens(kept);
  return {
    engine: "local-fallback",
    compressedText: kept,
    originalTokens,
    keptTokens,
    tokensSaved: Math.max(0, originalTokens - keptTokens)
  };
}

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

// src/store.js
var import_node_path = __toESM(require_path_browserify(), 1);
var FILE = process.env.CONTEXTPAY_DB || import_node_path.default.resolve("data/state.json");
var DEFAULT_STATE = {
  wallet: { balanceUsd: 0 },
  mandate: {
    autoTopupEnabled: true,
    perTxnCapUsd: 2,
    dailyCapUsd: 5,
    minRoi: 3
    // only buy credits expected to return at least 3x their cost
  },
  vault: null,
  // { paymentTokenId, payerEmail, createdAt }
  pendingSetupTokenId: null,
  // Every purchase the agent attempted or a human made. Statuses:
  //   paid               agent paid on its own, inside the mandate
  //   awaiting_approval  blocked by the mandate, waiting for a human
  //   approved           a human approved it (saved wallet or PayPal checkout)
  //   denied | expired   a human said no, or nobody answered in time
  //   failed             PayPal did not complete the charge
  //   declined           the planner decided not to buy
  //   awaiting_payment   a manual top-up checkout the human has not finished
  purchases: [],
  usage: { requests: 0, tokensIn: 0, tokensSaved: 0, spentOnCompressionUsd: 0 },
  events: []
};
var state = load();
function load() {
  try {
    const saved = JSON.parse(fs_default.readFileSync(FILE, "utf8"));
    const base = structuredClone(DEFAULT_STATE);
    for (const [k, v] of Object.entries(saved)) {
      base[k] = v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k]) ? { ...base[k], ...v } : v;
    }
    if (!Array.isArray(base.purchases)) base.purchases = [];
    return base;
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}
function save() {
  fs_default.mkdirSync(import_node_path.default.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs_default.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs_default.renameSync(tmp, FILE);
}
function getState() {
  return state;
}
function update(fn) {
  fn(state);
  save();
  return state;
}
function logEvent(type, data) {
  update((s) => {
    s.events.push({ at: (/* @__PURE__ */ new Date()).toISOString(), type, ...data });
    if (s.events.length > 500) s.events.splice(0, s.events.length - 500);
  });
}
function reset() {
  state = structuredClone(DEFAULT_STATE);
  save();
}
var round4 = (n) => Math.round(n * 1e4) / 1e4;
var utcDay = (iso = (/* @__PURE__ */ new Date()).toISOString()) => iso.slice(0, 10);
function spentTodayUsd() {
  const today = utcDay();
  return state.events.filter((e) => e.type === "topup" && e.source === "agent" && utcDay(e.at) === today).reduce((sum, e) => sum + e.amountUsd, 0);
}

// src/mandate.js
var PRICES = {
  // ContextPay's demo credit rate: dollars of prepaid credit consumed per 1M
  // input tokens sent through /v1/compress. A configurable demo assumption.
  creditPerMTok: Number(process.env.CREDIT_PRICE_PER_MTOK || 0.125),
  // What the downstream model charges per 1M input tokens. Used only to judge
  // whether a purchase is worth it. Configurable.
  downstreamPerMTok: Number(process.env.DOWNSTREAM_PRICE_PER_MTOK || 4)
};
var MAX_PURCHASE_USD = 500;
var creditCostUsd = (tokensIn) => tokensIn / 1e6 * PRICES.creditPerMTok;
function checkAgentCharge(amountUsd) {
  const { mandate, vault } = getState();
  if (!vault) return { allowed: false, reason: "no PayPal wallet saved yet" };
  if (!mandate.autoTopupEnabled) return { allowed: false, reason: "auto top-up is turned off" };
  if (!(amountUsd > 0)) return { allowed: false, reason: "amount must be positive" };
  if (amountUsd > mandate.perTxnCapUsd)
    return { allowed: false, reason: `$${amountUsd.toFixed(2)} is over the $${mandate.perTxnCapUsd.toFixed(2)} per-purchase limit` };
  const spent = spentTodayUsd();
  if (spent + amountUsd > mandate.dailyCapUsd)
    return {
      allowed: false,
      reason: `would bring today's agent spend to $${(spent + amountUsd).toFixed(2)}, over the $${mandate.dailyCapUsd.toFixed(2)} daily limit`
    };
  return { allowed: true };
}

// src/planner.js
var MODEL = process.env.PLANNER_MODEL || "claude-opus-5-5";
var PRIOR_RATIO = Number(process.env.PLANNER_PRIOR_RATIO || 0.5);
var plannerName = () => process.env.PLANNER === "heuristic" ? "heuristic" : MODEL;
var Plan = z.object({
  decision: z.enum(["buy", "decline"]),
  amount_usd: z.number(),
  expected_tokens_compressed: z.number(),
  expected_savings_usd: z.number(),
  rationale: z.string()
});
var SYSTEM = `You are the purchasing planner inside ContextPay. A coding agent compresses its context through ContextPay before sending it to an expensive model, and pays for compression from a prepaid credit wallet funded with PayPal.

The agent has just run out of credits. Decide whether buying more is worth it, and how much.

How to decide:
- Cost of compression: tokens_in / 1e6 * credit_price_per_mtok.
- Value of compression: tokens_saved / 1e6 * downstream_price_per_mtok. Estimate tokens_saved for the upcoming job from the measured ratio so far (or the provided prior_ratio if there is no history yet).
- Buy only if expected value is at least min_roi times the cost.
- Size the purchase to cover the upcoming job plus a modest buffer (about 25%). Round up to whole cents; never below $1.00, PayPal's practical minimum here.
- You may propose an amount above the human's per-purchase limit if the job genuinely needs it; the system will then ask the human to approve it. Don't shrink a purchase below what the job needs just to fit the limit.
- Keep the rationale to one or two plain sentences a busy developer would read on a dashboard. Say how much you are buying, roughly how many tokens it covers, and whether the projected return clears the human's minimum. Do not quote compression or savings percentages or ratios.`;
async function planTopup(input) {
  if (process.env.PLANNER === "heuristic") return { ...heuristicPlan(input), planner: "heuristic" };
  let response;
  try {
    response = await new empty_default().messages.parse({
      model: MODEL,
      max_tokens: 4e3,
      output_config: { effort: "low", format: zodOutputFormat(Plan) },
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(plannerContext(input), null, 2) }]
    });
  } catch (e) {
    if (e instanceof empty_default.AuthenticationError || e instanceof empty_default.APIConnectionError || /credential|api key|apiKey|authToken/i.test(e.message)) {
      return { ...heuristicPlan(input), planner: "heuristic (Claude unavailable)" };
    }
    throw e;
  }
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return { ...heuristicPlan(input), planner: "heuristic (model gave no plan)" };
  }
  return { ...response.parsed_output, planner: MODEL };
}
function plannerContext({ upcomingJob, usage, balanceUsd, mandate }) {
  return {
    upcoming_job: upcomingJob,
    measured_so_far: {
      requests: usage.requests,
      tokens_in: usage.tokensIn,
      tokens_saved: usage.tokensSaved,
      savings_ratio: usage.tokensIn ? +(usage.tokensSaved / usage.tokensIn).toFixed(3) : null,
      prior_ratio: PRIOR_RATIO
    },
    wallet_balance_usd: balanceUsd,
    prices: {
      credit_price_per_mtok: PRICES.creditPerMTok,
      downstream_price_per_mtok: PRICES.downstreamPerMTok
    },
    mandate: {
      per_purchase_limit_usd: mandate.perTxnCapUsd,
      daily_limit_usd: mandate.dailyCapUsd,
      min_roi: mandate.minRoi
    }
  };
}
function heuristicPlan({ upcomingJob, usage, mandate }) {
  const ratio = usage.tokensIn ? usage.tokensSaved / usage.tokensIn : PRIOR_RATIO;
  const tokens = upcomingJob.estimated_tokens;
  const cost = tokens / 1e6 * PRICES.creditPerMTok;
  const value = tokens * ratio / 1e6 * PRICES.downstreamPerMTok;
  const amount = Math.max(1, Math.ceil(cost * 1.25 * 100) / 100);
  const roi = cost > 0 ? value / cost : 0;
  const mtok = (tokens / 1e6).toFixed(1);
  if (roi < mandate.minRoi) {
    return {
      decision: "decline",
      amount_usd: 0,
      expected_tokens_compressed: tokens,
      expected_savings_usd: +value.toFixed(4),
      rationale: `The projected return on ~${mtok}M tokens is under your ${mandate.minRoi}x minimum, so the agent will not buy.`
    };
  }
  return {
    decision: "buy",
    amount_usd: amount,
    expected_tokens_compressed: tokens,
    expected_savings_usd: +value.toFixed(4),
    rationale: `$${amount.toFixed(2)} covers ~${mtok}M tokens for this job plus a 25% buffer, and the projected return clears your ${mandate.minRoi}x minimum.`
  };
}

// src/server.js
var ROOT = import_node_path2.default.resolve(import_node_path2.default.dirname(fileURLToPath(import.meta.url)), "..");
var PORT = Number(process.env.PORT || 4242);
var baseUrl = () => process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
var APPROVAL_TTL_MS = Number(process.env.APPROVAL_TTL_MINUTES || 30) * 6e4;
var app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.static(import_node_path2.default.join(ROOT, "public")));
var nowIso = () => (/* @__PURE__ */ new Date()).toISOString();
var findPurchase = (pred) => getState().purchases.find(pred);
var patchPurchase = (id, patch) => update((s) => {
  const p = s.purchases.find((x) => x.id === id);
  if (p) Object.assign(p, patch, { updatedAt: nowIso() });
});
var credit = (amountUsd, source, ref) => {
  update((s) => s.wallet.balanceUsd = round4(s.wallet.balanceUsd + amountUsd));
  logEvent("topup", { amountUsd, source, ref });
};
function expireStaleApprovals() {
  const cutoff = Date.now() - APPROVAL_TTL_MS;
  for (const p of getState().purchases) {
    if (p.status === "awaiting_approval" && Date.parse(p.createdAt) < cutoff) {
      patchPurchase(p.id, { status: "expired", decidedBy: "timeout" });
      logEvent("approval_expired", { amountUsd: p.amountUsd, ref: p.id });
    }
  }
}
var pendingApprovals = () => getState().purchases.filter((p) => p.status === "awaiting_approval");
function agentAuth(req, res, next) {
  const want = process.env.AGENT_TOKEN;
  if (!want) return next();
  const got = (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got), b = Buffer.from(want);
  if (a.length === b.length && crypto_default.timingSafeEqual(a, b)) return next();
  res.status(401).json({ error: "missing or wrong agent token" });
}
app.get("/healthz", (_req, res) => res.json({ ok: true, paypal: paypalMode() }));
app.get("/api/state", (_req, res) => {
  expireStaleApprovals();
  const s = getState();
  const counts = { paid: 0, approved: 0, blocked: 0 };
  for (const p of s.purchases) {
    if (p.origin !== "agent") continue;
    if (p.status === "paid") counts.paid++;
    else if (p.status === "approved") counts.approved++;
    if (p.blockedReason) counts.blocked++;
  }
  res.json({
    paypalMode: paypalMode(),
    compressEngine: compressEngine(),
    planner: plannerName(),
    prices: PRICES,
    wallet: s.wallet,
    mandate: s.mandate,
    vault: s.vault && { payerEmail: s.vault.payerEmail, createdAt: s.vault.createdAt },
    spentTodayUsd: round4(spentTodayUsd()),
    pendingApprovals: pendingApprovals(),
    purchaseCounts: counts,
    usage: { requests: s.usage.requests, tokensIn: s.usage.tokensIn, spentOnCompressionUsd: s.usage.spentOnCompressionUsd },
    demoAgentRunning: Boolean(demoChild),
    events: s.events.slice(-60).reverse()
  });
});
app.get("/api/ledger", (_req, res) => {
  expireStaleApprovals();
  res.json(
    [...getState().purchases].reverse().map((p) => ({
      id: p.id,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt || p.createdAt,
      origin: p.origin,
      job: p.job?.description || (p.origin === "you" ? "manual top-up" : ""),
      estimatedTokens: p.job?.estimated_tokens ?? null,
      amountUsd: p.amountUsd,
      status: p.status,
      decidedBy: p.decidedBy || null,
      method: p.method || null,
      blockedReason: p.blockedReason || null,
      rationale: p.plan?.rationale || null,
      planner: p.plan?.planner || null,
      paypalOrderId: p.orderId || null,
      paypalCaptureId: p.captureId || null
    }))
  );
});
app.post("/api/mandate", (req, res) => {
  const { autoTopupEnabled, perTxnCapUsd, dailyCapUsd, minRoi } = req.body || {};
  const num = (v, lo, hi) => Number.isFinite(+v) && +v >= lo && +v <= hi ? +v : null;
  update((s) => {
    if (typeof autoTopupEnabled === "boolean") s.mandate.autoTopupEnabled = autoTopupEnabled;
    if (num(perTxnCapUsd, 1, MAX_PURCHASE_USD) != null) s.mandate.perTxnCapUsd = +perTxnCapUsd;
    if (num(dailyCapUsd, 1, 5e3) != null) s.mandate.dailyCapUsd = +dailyCapUsd;
    if (num(minRoi, 1, 100) != null) s.mandate.minRoi = +minRoi;
  });
  logEvent("mandate", { mandate: getState().mandate });
  res.json(getState().mandate);
});
app.post("/api/reset", (_req, res) => {
  if (process.env.ALLOW_RESET === "0") return res.status(403).json({ error: "reset is disabled on this host" });
  if (demoChild) return res.status(409).json({ error: "the demo agent is running; wait for it to finish" });
  reset();
  res.json({ ok: true });
});
app.post("/api/vault/start", async (_req, res, next) => {
  try {
    const setup = await createVaultSetupToken({
      returnUrl: `${baseUrl()}/paypal/vault-return`,
      cancelUrl: `${baseUrl()}/?vault=cancelled`
    });
    update((s) => s.pendingSetupTokenId = setup.id);
    res.json({ approveUrl: setup.approveUrl });
  } catch (e) {
    next(e);
  }
});
app.get("/paypal/vault-return", async (req, res, next) => {
  try {
    const setupId = getState().pendingSetupTokenId;
    const returned = String(req.query.approval_token_id || "");
    if (!setupId) return res.redirect("/?vault=missing");
    if (returned && returned !== setupId) return res.redirect("/?vault=mismatch");
    const token = await createPaymentToken(setupId);
    update((s) => {
      s.vault = { paymentTokenId: token.id, payerEmail: token.payerEmail, createdAt: nowIso() };
      s.pendingSetupTokenId = null;
    });
    logEvent("vault_saved", { payerEmail: token.payerEmail });
    res.redirect("/?vault=saved");
  } catch (e) {
    next(e);
  }
});
app.post("/api/vault/remove", async (_req, res, next) => {
  try {
    const v = getState().vault;
    if (v) await deletePaymentToken(v.paymentTokenId);
    update((s) => s.vault = null);
    logEvent("vault_removed", {});
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
async function createCheckout(amountUsd, ref) {
  return createCheckoutOrder({
    amountUsd,
    description: `ContextPay compression credits ($${amountUsd.toFixed(2)})`,
    customId: ref,
    returnUrl: `${baseUrl()}/paypal/return`,
    cancelUrl: `${baseUrl()}/?checkout=cancelled`
  });
}
app.post("/api/topup/checkout", async (req, res, next) => {
  try {
    const amountUsd = Math.round(Number(req.body?.amountUsd) * 100) / 100;
    if (!(amountUsd >= 1 && amountUsd <= MAX_PURCHASE_USD)) return res.status(400).json({ error: `amount must be $1 to $${MAX_PURCHASE_USD}` });
    const id = crypto_default.randomUUID();
    const order = await createCheckout(amountUsd, id);
    update(
      (s) => s.purchases.push({ id, origin: "you", amountUsd, status: "awaiting_payment", method: "checkout", orderId: order.id, approveUrl: order.approveUrl, createdAt: nowIso() })
    );
    res.json({ ref: id, approveUrl: order.approveUrl });
  } catch (e) {
    next(e);
  }
});
app.get("/paypal/return", async (req, res, next) => {
  try {
    const orderId = String(req.query.token || "");
    const p = findPurchase((x) => x.orderId === orderId && (x.status === "awaiting_approval" || x.status === "awaiting_payment"));
    if (!p) return res.redirect("/?checkout=unknown");
    const captured = await captureOrder(orderId);
    if (!isPaid(captured)) {
      logEvent("charge_failed", { amountUsd: p.amountUsd, status: captured.captureStatus || captured.status, ref: p.id });
      return res.redirect(`/?checkout=${encodeURIComponent(captured.captureStatus || captured.status)}`);
    }
    patchPurchase(p.id, {
      status: p.status === "awaiting_approval" ? "approved" : "paid",
      decidedBy: "you",
      method: "checkout",
      captureId: captured.captureId
    });
    credit(p.amountUsd, "human", { orderId, captureId: captured.captureId, purchase: p.id });
    res.redirect("/?checkout=approved");
  } catch (e) {
    next(e);
  }
});
app.post("/api/approvals/:id/approve", async (req, res, next) => {
  try {
    expireStaleApprovals();
    const p = findPurchase((x) => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: "unknown approval" });
    if (p.status !== "awaiting_approval") return res.status(409).json({ error: `approval is already ${p.status}` });
    const { vault } = getState();
    if (!vault) return res.status(409).json({ error: "no saved PayPal wallet; approve with the PayPal checkout link instead", approveUrl: p.approveUrl });
    patchPurchase(p.id, { status: "charging" });
    const order = await chargeVault({
      paymentTokenId: vault.paymentTokenId,
      amountUsd: p.amountUsd,
      description: `ContextPay credits approved by you: ${p.job?.description || ""}`.slice(0, 127),
      customId: p.id,
      requestId: `approve-${p.id}`
    }).catch((e) => {
      patchPurchase(p.id, { status: "awaiting_approval" });
      throw e;
    });
    if (!isPaid(order)) {
      patchPurchase(p.id, { status: "awaiting_approval" });
      logEvent("charge_failed", { amountUsd: p.amountUsd, status: order.captureStatus || order.status, ref: p.id });
      return res.status(402).json({ error: `PayPal charge did not complete (${order.captureStatus || order.status})`, approveUrl: p.approveUrl });
    }
    patchPurchase(p.id, { status: "approved", decidedBy: "you", method: "saved wallet", vaultOrderId: order.id, captureId: order.captureId });
    credit(p.amountUsd, "human", { orderId: order.id, captureId: order.captureId, purchase: p.id });
    logEvent("approval_granted", { amountUsd: p.amountUsd, ref: p.id, method: "saved wallet" });
    res.json({ status: "approved", balance_usd: getState().wallet.balanceUsd });
  } catch (e) {
    next(e);
  }
});
app.post("/api/approvals/:id/deny", (req, res) => {
  const p = findPurchase((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "unknown approval" });
  if (p.status !== "awaiting_approval") return res.status(409).json({ error: `approval is already ${p.status}` });
  patchPurchase(p.id, { status: "denied", decidedBy: "you" });
  logEvent("approval_denied", { amountUsd: p.amountUsd, ref: p.id });
  res.json({ status: "denied" });
});
app.post("/v1/compress", agentAuth, async (req, res, next) => {
  const { context = "", query = "Summarize this context." } = req.body || {};
  if (!context || typeof context !== "string") return res.status(400).json({ error: "context is required" });
  const reserved = round4(creditCostUsd(estimateTokens(context)));
  const { balanceUsd } = getState().wallet;
  if (balanceUsd < reserved) {
    return res.status(402).json({ error: "payment_required", balance_usd: balanceUsd, cost_usd: reserved, topup_endpoint: "/api/agent/topup" });
  }
  update((s) => s.wallet.balanceUsd = round4(s.wallet.balanceUsd - reserved));
  let result;
  try {
    result = await compress({ context, query: String(query) });
  } catch (e) {
    update((s) => s.wallet.balanceUsd = round4(s.wallet.balanceUsd + reserved));
    return next(e);
  }
  const chargedUsd = round4(creditCostUsd(result.originalTokens));
  update((s) => {
    s.wallet.balanceUsd = round4(s.wallet.balanceUsd + reserved - chargedUsd);
    s.usage.requests += 1;
    s.usage.tokensIn += result.originalTokens;
    s.usage.tokensSaved += result.tokensSaved;
    s.usage.spentOnCompressionUsd = round4(s.usage.spentOnCompressionUsd + chargedUsd);
  });
  res.json({
    compressed_text: result.compressedText,
    engine: result.engine,
    original_tokens: result.originalTokens,
    kept_tokens: result.keptTokens,
    charged_usd: chargedUsd,
    balance_usd: getState().wallet.balanceUsd
  });
});
var topupInFlight = null;
app.post("/api/agent/topup", agentAuth, async (req, res, next) => {
  if (topupInFlight) {
    try {
      return res.json({ ...await topupInFlight, coalesced: true });
    } catch (e) {
      return next(e);
    }
  }
  topupInFlight = agentTopup(req.body?.job);
  try {
    res.json(await topupInFlight);
  } catch (e) {
    next(e);
  } finally {
    topupInFlight = null;
  }
});
var awaitingHuman = (p) => ({
  status: "awaiting_human",
  amount_usd: p.amountUsd,
  reason: p.blockedReason,
  approval_id: p.id,
  approve_url: p.approveUrl,
  dashboard_url: baseUrl(),
  plan: p.plan
});
async function agentTopup(job) {
  expireStaleApprovals();
  const open = getState().purchases.find((p) => p.status === "awaiting_approval" || p.status === "charging");
  if (open) return { ...awaitingHuman(open), already_pending: true };
  const s = getState();
  const upcomingJob = {
    description: String(job?.description || "unspecified coding task").slice(0, 500),
    estimated_tokens: Math.min(1e10, Math.max(1e3, Math.round(Number(job?.estimated_tokens) || 1e6)))
  };
  const plan = await planTopup({ upcomingJob, usage: s.usage, balanceUsd: s.wallet.balanceUsd, mandate: s.mandate });
  logEvent("plan", { plan, job: upcomingJob });
  const id = crypto_default.randomUUID();
  const record = { id, origin: "agent", job: upcomingJob, plan, createdAt: nowIso() };
  const proposed = Number(plan.amount_usd);
  if (plan.decision === "decline" || !Number.isFinite(proposed) || proposed <= 0) {
    update((st) => st.purchases.push({ ...record, amountUsd: 0, status: "declined", decidedBy: "planner" }));
    return { status: "declined", plan };
  }
  const amountUsd = Math.min(MAX_PURCHASE_USD, Math.max(1, Math.ceil(proposed * 100) / 100));
  const guard = checkAgentCharge(amountUsd);
  if (guard.allowed) {
    const order2 = await chargeVault({
      paymentTokenId: s.vault.paymentTokenId,
      amountUsd,
      description: `ContextPay agent top-up: ${upcomingJob.description}`.slice(0, 127),
      customId: id,
      requestId: id
    });
    if (!isPaid(order2)) {
      update((st) => st.purchases.push({ ...record, amountUsd, status: "failed", method: "saved wallet", orderId: order2.id }));
      logEvent("charge_failed", { amountUsd, status: order2.captureStatus || order2.status, ref: id });
      return { status: "failed", amount_usd: amountUsd, plan, order_id: order2.id };
    }
    update(
      (st) => st.purchases.push({ ...record, amountUsd, status: "paid", decidedBy: "agent", method: "saved wallet", orderId: order2.id, captureId: order2.captureId })
    );
    credit(amountUsd, "agent", { orderId: order2.id, captureId: order2.captureId, purchase: id });
    return { status: "charged", amount_usd: amountUsd, plan, order_id: order2.id, balance_usd: getState().wallet.balanceUsd };
  }
  const order = await createCheckout(amountUsd, id);
  update(
    (st) => st.purchases.push({ ...record, amountUsd, status: "awaiting_approval", blockedReason: guard.reason, method: "checkout", orderId: order.id, approveUrl: order.approveUrl })
  );
  logEvent("approval_requested", { amountUsd, reason: guard.reason, ref: id });
  return awaitingHuman(findPurchase((x) => x.id === id));
}
app.get("/api/agent/approvals/:id", agentAuth, (req, res) => {
  expireStaleApprovals();
  const p = findPurchase((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "unknown approval" });
  const status = p.status === "awaiting_approval" || p.status === "charging" ? "pending" : p.status;
  res.json({ status, amount_usd: p.amountUsd, decided_by: p.decidedBy || null, balance_usd: getState().wallet.balanceUsd });
});
var demoChild = null;
app.post("/api/demo/run", (_req, res) => {
  if (process.env.ALLOW_DEMO_AGENT === "0") return res.status(403).json({ error: "the demo agent is disabled on this host" });
  if (demoChild) return res.status(409).json({ error: "the demo agent is already running" });
  const port = serverPort();
  demoChild = spawn(process.execPath, [import_node_path2.default.join(ROOT, "agent/demo-agent.js")], {
    cwd: ROOT,
    env: { ...process.env, CONTEXTPAY_URL: `http://127.0.0.1:${port}`, NO_COLOR: "1" },
    stdio: ["ignore", "inherit", "inherit"]
  });
  logEvent("demo_started", {});
  demoChild.on("exit", (code) => {
    demoChild = null;
    logEvent("demo_finished", { code });
  });
  res.json({ started: true });
});
app.use((err, _req, res, _next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "request body is not valid JSON" });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "request body is too large" });
  console.error(err);
  logEvent("error", { message: err.message });
  const upstream = err instanceof PayPalError || /^SuperCompress /.test(err.message);
  res.status(upstream ? 502 : 500).json({ error: err.message });
});
var server = null;
var serverPort = () => server?.address()?.port || PORT;
function start(port = PORT) {
  return new Promise((resolve) => {
    server = app.listen(port, () => resolve(server));
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.PAYPAL_ENV === "live" && !liveAllowed())
    console.warn("PAYPAL_ENV=live ignored: set CONTEXTPAY_ALLOW_LIVE=1 as well to move real money. Using the sandbox.");
  start().then(() => console.log(`ContextPay on ${baseUrl()}  (PayPal: ${paypalMode()})`));
}
export {
  agentTopup,
  app,
  start
};
