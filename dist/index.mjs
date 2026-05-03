// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: __accessProp.bind(mod, key),
        enumerable: true
      });
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);

// node_modules/picocolors/picocolors.js
var require_picocolors = __commonJS((exports, module) => {
  var p = process || {};
  var argv = p.argv || [];
  var env = p.env || {};
  var isColorSupported = !(!!env.NO_COLOR || argv.includes("--no-color")) && (!!env.FORCE_COLOR || argv.includes("--color") || p.platform === "win32" || (p.stdout || {}).isTTY && env.TERM !== "dumb" || !!env.CI);
  var formatter = (open, close, replace = open) => (input) => {
    let string2 = "" + input, index = string2.indexOf(close, open.length);
    return ~index ? open + replaceClose(string2, close, replace, index) + close : open + string2 + close;
  };
  var replaceClose = (string2, close, replace, index) => {
    let result = "", cursor = 0;
    do {
      result += string2.substring(cursor, index) + replace;
      cursor = index + close.length;
      index = string2.indexOf(close, cursor);
    } while (~index);
    return result + string2.substring(cursor);
  };
  var createColors = (enabled = isColorSupported) => {
    let f = enabled ? formatter : () => String;
    return {
      isColorSupported: enabled,
      reset: f("\x1B[0m", "\x1B[0m"),
      bold: f("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
      dim: f("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
      italic: f("\x1B[3m", "\x1B[23m"),
      underline: f("\x1B[4m", "\x1B[24m"),
      inverse: f("\x1B[7m", "\x1B[27m"),
      hidden: f("\x1B[8m", "\x1B[28m"),
      strikethrough: f("\x1B[9m", "\x1B[29m"),
      black: f("\x1B[30m", "\x1B[39m"),
      red: f("\x1B[31m", "\x1B[39m"),
      green: f("\x1B[32m", "\x1B[39m"),
      yellow: f("\x1B[33m", "\x1B[39m"),
      blue: f("\x1B[34m", "\x1B[39m"),
      magenta: f("\x1B[35m", "\x1B[39m"),
      cyan: f("\x1B[36m", "\x1B[39m"),
      white: f("\x1B[37m", "\x1B[39m"),
      gray: f("\x1B[90m", "\x1B[39m"),
      bgBlack: f("\x1B[40m", "\x1B[49m"),
      bgRed: f("\x1B[41m", "\x1B[49m"),
      bgGreen: f("\x1B[42m", "\x1B[49m"),
      bgYellow: f("\x1B[43m", "\x1B[49m"),
      bgBlue: f("\x1B[44m", "\x1B[49m"),
      bgMagenta: f("\x1B[45m", "\x1B[49m"),
      bgCyan: f("\x1B[46m", "\x1B[49m"),
      bgWhite: f("\x1B[47m", "\x1B[49m"),
      blackBright: f("\x1B[90m", "\x1B[39m"),
      redBright: f("\x1B[91m", "\x1B[39m"),
      greenBright: f("\x1B[92m", "\x1B[39m"),
      yellowBright: f("\x1B[93m", "\x1B[39m"),
      blueBright: f("\x1B[94m", "\x1B[39m"),
      magentaBright: f("\x1B[95m", "\x1B[39m"),
      cyanBright: f("\x1B[96m", "\x1B[39m"),
      whiteBright: f("\x1B[97m", "\x1B[39m"),
      bgBlackBright: f("\x1B[100m", "\x1B[49m"),
      bgRedBright: f("\x1B[101m", "\x1B[49m"),
      bgGreenBright: f("\x1B[102m", "\x1B[49m"),
      bgYellowBright: f("\x1B[103m", "\x1B[49m"),
      bgBlueBright: f("\x1B[104m", "\x1B[49m"),
      bgMagentaBright: f("\x1B[105m", "\x1B[49m"),
      bgCyanBright: f("\x1B[106m", "\x1B[49m"),
      bgWhiteBright: f("\x1B[107m", "\x1B[49m")
    };
  };
  module.exports = createColors();
  module.exports.createColors = createColors;
});

// src/utils/pretty-error.ts
import PrettyError from "pretty-error";
var pe = new PrettyError().start().withColors();
process.on("uncaughtException", (err) => {});

// src/app.ts
import { Hono } from "hono";

// src/di/container.ts
import { Container as InversifyContainer, injectable } from "inversify";

// src/di/ContainerException.ts
class ContainerException extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = "ContainerException";
  }
}

// src/di/container.ts
var di = new InversifyContainer;

class Container {
  add(target, scope = "singleton" /* Singleton */) {
    try {
      di.unbind(target);
    } catch {}
    try {
      injectable()(target);
    } catch {}
    const binding = di.bind(target).toSelf();
    switch (scope) {
      case "request" /* Request */:
        binding.inRequestScope();
        break;
      case "transient" /* Transient */:
        binding.inTransientScope();
        break;
      default:
        binding.inSingletonScope();
    }
  }
  get(target) {
    try {
      return di.get(target);
    } catch (error) {
      throw new ContainerException(`Failed to resolve dependency for ${target.name}.`, error instanceof Error ? error : undefined);
    }
  }
  removeConstant(identifier) {
    if (di.isBound(identifier)) {
      di.unbind(identifier);
    }
  }
  has(target) {
    return di.isBound(target);
  }
  getConstant(identifier) {
    try {
      return di.get(identifier);
    } catch (error) {
      throw new ContainerException(`Failed to resolve constant for identifier ${String(identifier)}.`, error instanceof Error ? error : undefined);
    }
  }
  addConstant(identifier, value) {
    try {
      di.unbind(identifier);
    } catch {}
    di.bind(identifier).toConstantValue(value);
  }
  hasConstant(identifier) {
    return di.isBound(identifier);
  }
  remove(target) {
    if (di.isBound(target)) {
      di.unbind(target);
    }
  }
}
var container = new Container;

// src/app.ts
var app = new Hono().basePath("/api");
container.addConstant("app", app);
var app_default = app;

// src/env.ts
import * as z from "zod";
var envSchema = z.object({
  SERVER_URL: z.string(),
  DATABASE_URL: z.string(),
  BETTER_AUTH_URL: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  NODE_ENV: z.enum(["development", "production"]).default("development")
});
function parseEnv() {
  try {
    envSchema.parse(Bun.env);
  } catch (e) {
    if (e instanceof Error) {} else {}
    process.exit(1);
  }
}

// src/di/loadModules.ts
import { readdirSync, statSync } from "fs";
import { join } from "path";
var shouldImportFile = (file) => file.endsWith(".ts") && !file.endsWith(".test.ts");
async function loadDiModules(...dirs) {
  for (const dir of dirs) {
    await loadDiModulesFromDirectory(dir);
  }
}
async function loadDiModulesFromDirectory(dir) {
  for (const file of readdirSync(dir)) {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      await loadDiModulesFromDirectory(fullPath);
    } else if (shouldImportFile(file)) {
      await import(fullPath);
    }
  }
}

// src/utils/controller.ts
import { readdirSync as readdirSync2, statSync as statSync2 } from "fs";
import { join as join2 } from "path";

// src/di/index.ts
import { inject as inversifyInject } from "inversify";

// src/utils/logger.ts
var p = __toESM(require_picocolors(), 1);
import"figures";
import PrettyError2 from "pretty-error";
var pe3 = new PrettyError2;
var logger = {
  error: (message) => {},
  success: (message) => {},
  exception: (error) => {
    if (error instanceof Error) {} else {}
  },
  warn: (message) => {},
  info: (message) => {}
};

// src/utils/controller.ts
async function loadControllers(dir) {
  for (const file of readdirSync2(dir)) {
    const fullPath = join2(dir, file);
    if (statSync2(fullPath).isDirectory()) {
      await loadControllers(fullPath);
    } else if (file.endsWith(".ts")) {
      await import(fullPath);
    }
  }
}

// src/index.ts
import { join as join3 } from "path";
await loadDiModules(join3(import.meta.dir, "db", "repositories"), join3(import.meta.dir, "services"), join3(import.meta.dir, "mailers"));
await loadControllers(join3(import.meta.dir, "controllers"));
parseEnv();
var server = Bun.serve({
  port: Bun.env.PORT || 3000,
  hostname: "0.0.0.0",
  fetch: app_default.fetch
});
var hostname = server.hostname === "0.0.0.0" ? "localhost" : server.hostname;
logger.success(`Server running on http://${hostname}:${server.port}`);

//# debugId=59E61A2CDCBF6F3164756E2164756E21
