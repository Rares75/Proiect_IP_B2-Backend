// @bun
// src/utils/pretty-error.ts
import PrettyError from "pretty-error";
var pe = new PrettyError().start().withColors();
process.on("uncaughtException", (err) => {});

// src/app.ts
import { Hono } from "hono";
import { logger as logger2 } from "hono/logger";

// src/middlware/authMiddleware.ts
import { createMiddleware } from "hono/factory";

// src/auth.ts
import { betterAuth } from "better-auth";

// src/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not found");
}
var db = drizzle(process.env.DATABASE_URL);

// src/auth.ts
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
var auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  user: {
    additionalFields: {
      userName: {
        type: "string"
      },
      phone: {
        type: "string",
        required: false
      }
    }
  },
  plugins: [openAPI()],
  emailAndPassword: {
    enabled: true
  },
  rateLimit: {
    enabled: true,
    window: 60 * 1000,
    max: 10
  }
});
var auth_default = auth;

// src/middlware/authMiddleware.ts
var authMiddlware = async (c, next) => {
  const sessionData = await auth_default.api.getSession({ headers: c.req.raw.headers });
  if (!sessionData?.user || !sessionData?.session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("session", sessionData.session);
  c.set("user", sessionData.user);
  await next();
};
var authMiddleware = createMiddleware(authMiddlware);

// src/middlware/checkStatusMiddleware.ts
import { createMiddleware as createMiddleware2 } from "hono/factory";

// src/db/repositories/account.repository.ts
import { eq, and, count as drizzleCount } from "drizzle-orm";

// src/db/auth-schema.ts
import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

// src/db/enums.ts
import { pgEnum } from "drizzle-orm/pg-core";
var accountStatusEnum = pgEnum("account_status", [
  "ACTIVE",
  "LIMITED",
  "BLOCKED"
]);
var verificationStatusEnum = pgEnum("verification_status", [
  "PENDING",
  "VERIFIED",
  "REJECTED"
]);
var urgencyLevelEnum = pgEnum("urgency_level", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL"
]);
var requestStatusEnum = pgEnum("request_status", [
  "OPEN",
  "MATCHED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "REJECTED"
]);
var offerStatusEnum = pgEnum("offer_status", [
  "PENDING",
  "ACCEPTED",
  "REJECTED"
]);
var assignmentStatusEnum = pgEnum("assignment_status", [
  "ASSIGNED",
  "STARTED",
  "COMPLETED",
  "CANCELLED"
]);
var conversationStatusEnum = pgEnum("conversation_status", [
  "OPEN",
  "CLOSED"
]);
var notificationTypeEnum = pgEnum("notification_type", [
  "NEW_REQUEST",
  "OFFER_ACCEPTED",
  "TASK_UPDATED",
  "TASK_COMPLETED",
  "WARNING"
]);

// src/db/auth-schema.ts
var user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  userName: text("userName").notNull().unique(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date).notNull()
});
var session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => /* @__PURE__ */ new Date).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })
}, (table) => [index("session_userId_idx").on(table.userId)]);
var account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  status: accountStatusEnum("status").notNull().default("ACTIVE"),
  banned_at: timestamp("banned_at").defaultNow(),
  bannedReason: text("banned_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => /* @__PURE__ */ new Date).notNull()
}, (table) => [index("account_userId_idx").on(table.userId)]);
var verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date).notNull()
}, (table) => [index("verification_identifier_idx").on(table.identifier)]);
var userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account)
}));
var sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id]
  })
}));
var accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id]
  })
}));

// src/db/repositories/account.repository.ts
class AccountRepository {
  async create(data) {
    const [newAccount] = await db.insert(account).values(data).returning();
    return newAccount;
  }
  async findById(id) {
    const [foundAccount] = await db.select().from(account).where(eq(account.id, id));
    return foundAccount;
  }
  async update(id, data) {
    const [updatedAccount] = await db.update(account).set({ ...data, updatedAt: new Date }).where(eq(account.id, id)).returning();
    return updatedAccount;
  }
  async delete(id) {
    const result = await db.delete(account).where(eq(account.id, id)).returning({ id: account.id });
    return result.length > 0;
  }
  async exists(id) {
    const [{ value }] = await db.select({ value: drizzleCount() }).from(account).where(eq(account.id, id));
    return value > 0;
  }
  async findFirstBy(criteria) {
    const conditions = [];
    for (const [key, value] of Object.entries(criteria)) {
      if (value !== undefined) {
        const column = account[key];
        conditions.push(eq(column, value));
      }
    }
    if (conditions.length === 0) {
      return;
    }
    const [foundAccount] = await db.select().from(account).where(and(...conditions));
    return foundAccount;
  }
  async findMany(limit = 50, offset = 0) {
    return await db.select().from(account).limit(limit).offset(offset);
  }
  async count() {
    const [{ value }] = await db.select({ value: drizzleCount() }).from(account);
    return value;
  }
}
var accountRepository = new AccountRepository;

// src/exceptions/user.management/UserManagementException.ts
class UsermanagementException extends Error {
  constructor(message, cause) {
    super(message, {
      cause
    });
    this.name = "UsermanagementException";
  }
}

// node_modules/chalk/source/vendor/ansi-styles/index.js
var ANSI_BACKGROUND_OFFSET = 10;
var wrapAnsi16 = (offset = 0) => (code) => `\x1B[${code + offset}m`;
var wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`;
var wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`;
var styles = {
  modifier: {
    reset: [0, 0],
    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    overline: [53, 55],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29]
  },
  color: {
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    blackBright: [90, 39],
    gray: [90, 39],
    grey: [90, 39],
    redBright: [91, 39],
    greenBright: [92, 39],
    yellowBright: [93, 39],
    blueBright: [94, 39],
    magentaBright: [95, 39],
    cyanBright: [96, 39],
    whiteBright: [97, 39]
  },
  bgColor: {
    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49],
    bgBlackBright: [100, 49],
    bgGray: [100, 49],
    bgGrey: [100, 49],
    bgRedBright: [101, 49],
    bgGreenBright: [102, 49],
    bgYellowBright: [103, 49],
    bgBlueBright: [104, 49],
    bgMagentaBright: [105, 49],
    bgCyanBright: [106, 49],
    bgWhiteBright: [107, 49]
  }
};
var modifierNames = Object.keys(styles.modifier);
var foregroundColorNames = Object.keys(styles.color);
var backgroundColorNames = Object.keys(styles.bgColor);
var colorNames = [...foregroundColorNames, ...backgroundColorNames];
function assembleStyles() {
  const codes = new Map;
  for (const [groupName, group] of Object.entries(styles)) {
    for (const [styleName, style] of Object.entries(group)) {
      styles[styleName] = {
        open: `\x1B[${style[0]}m`,
        close: `\x1B[${style[1]}m`
      };
      group[styleName] = styles[styleName];
      codes.set(style[0], style[1]);
    }
    Object.defineProperty(styles, groupName, {
      value: group,
      enumerable: false
    });
  }
  Object.defineProperty(styles, "codes", {
    value: codes,
    enumerable: false
  });
  styles.color.close = "\x1B[39m";
  styles.bgColor.close = "\x1B[49m";
  styles.color.ansi = wrapAnsi16();
  styles.color.ansi256 = wrapAnsi256();
  styles.color.ansi16m = wrapAnsi16m();
  styles.bgColor.ansi = wrapAnsi16(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET);
  Object.defineProperties(styles, {
    rgbToAnsi256: {
      value(red, green, blue) {
        if (red === green && green === blue) {
          if (red < 8) {
            return 16;
          }
          if (red > 248) {
            return 231;
          }
          return Math.round((red - 8) / 247 * 24) + 232;
        }
        return 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
      },
      enumerable: false
    },
    hexToRgb: {
      value(hex) {
        const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
        if (!matches) {
          return [0, 0, 0];
        }
        let [colorString] = matches;
        if (colorString.length === 3) {
          colorString = [...colorString].map((character) => character + character).join("");
        }
        const integer = Number.parseInt(colorString, 16);
        return [
          integer >> 16 & 255,
          integer >> 8 & 255,
          integer & 255
        ];
      },
      enumerable: false
    },
    hexToAnsi256: {
      value: (hex) => styles.rgbToAnsi256(...styles.hexToRgb(hex)),
      enumerable: false
    },
    ansi256ToAnsi: {
      value(code) {
        if (code < 8) {
          return 30 + code;
        }
        if (code < 16) {
          return 90 + (code - 8);
        }
        let red;
        let green;
        let blue;
        if (code >= 232) {
          red = ((code - 232) * 10 + 8) / 255;
          green = red;
          blue = red;
        } else {
          code -= 16;
          const remainder = code % 36;
          red = Math.floor(code / 36) / 5;
          green = Math.floor(remainder / 6) / 5;
          blue = remainder % 6 / 5;
        }
        const value = Math.max(red, green, blue) * 2;
        if (value === 0) {
          return 30;
        }
        let result = 30 + (Math.round(blue) << 2 | Math.round(green) << 1 | Math.round(red));
        if (value === 2) {
          result += 60;
        }
        return result;
      },
      enumerable: false
    },
    rgbToAnsi: {
      value: (red, green, blue) => styles.ansi256ToAnsi(styles.rgbToAnsi256(red, green, blue)),
      enumerable: false
    },
    hexToAnsi: {
      value: (hex) => styles.ansi256ToAnsi(styles.hexToAnsi256(hex)),
      enumerable: false
    }
  });
  return styles;
}
var ansiStyles = assembleStyles();
var ansi_styles_default = ansiStyles;

// node_modules/chalk/source/vendor/supports-color/index.js
import process2 from "process";
import os from "os";
import tty from "tty";
function hasFlag(flag, argv = globalThis.Deno ? globalThis.Deno.args : process2.argv) {
  const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
  const position = argv.indexOf(prefix + flag);
  const terminatorPosition = argv.indexOf("--");
  return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
}
var { env } = process2;
var flagForceColor;
if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
  flagForceColor = 0;
} else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
  flagForceColor = 1;
}
function envForceColor() {
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") {
      return 1;
    }
    if (env.FORCE_COLOR === "false") {
      return 0;
    }
    return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
  }
}
function translateLevel(level) {
  if (level === 0) {
    return false;
  }
  return {
    level,
    hasBasic: true,
    has256: level >= 2,
    has16m: level >= 3
  };
}
function _supportsColor(haveStream, { streamIsTTY, sniffFlags = true } = {}) {
  const noFlagForceColor = envForceColor();
  if (noFlagForceColor !== undefined) {
    flagForceColor = noFlagForceColor;
  }
  const forceColor = sniffFlags ? flagForceColor : noFlagForceColor;
  if (forceColor === 0) {
    return 0;
  }
  if (sniffFlags) {
    if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
      return 3;
    }
    if (hasFlag("color=256")) {
      return 2;
    }
  }
  if ("TF_BUILD" in env && "AGENT_NAME" in env) {
    return 1;
  }
  if (haveStream && !streamIsTTY && forceColor === undefined) {
    return 0;
  }
  const min = forceColor || 0;
  if (env.TERM === "dumb") {
    return min;
  }
  if (process2.platform === "win32") {
    const osRelease = os.release().split(".");
    if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
      return Number(osRelease[2]) >= 14931 ? 3 : 2;
    }
    return 1;
  }
  if ("CI" in env) {
    if (["GITHUB_ACTIONS", "GITEA_ACTIONS", "CIRCLECI"].some((key) => (key in env))) {
      return 3;
    }
    if (["TRAVIS", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRONE"].some((sign) => (sign in env)) || env.CI_NAME === "codeship") {
      return 1;
    }
    return min;
  }
  if ("TEAMCITY_VERSION" in env) {
    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
  }
  if (env.COLORTERM === "truecolor") {
    return 3;
  }
  if (env.TERM === "xterm-kitty") {
    return 3;
  }
  if (env.TERM === "xterm-ghostty") {
    return 3;
  }
  if (env.TERM === "wezterm") {
    return 3;
  }
  if ("TERM_PROGRAM" in env) {
    const version = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
    switch (env.TERM_PROGRAM) {
      case "iTerm.app": {
        return version >= 3 ? 3 : 2;
      }
      case "Apple_Terminal": {
        return 2;
      }
    }
  }
  if (/-256(color)?$/i.test(env.TERM)) {
    return 2;
  }
  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
    return 1;
  }
  if ("COLORTERM" in env) {
    return 1;
  }
  return min;
}
function createSupportsColor(stream, options = {}) {
  const level = _supportsColor(stream, {
    streamIsTTY: stream && stream.isTTY,
    ...options
  });
  return translateLevel(level);
}
var supportsColor = {
  stdout: createSupportsColor({ isTTY: tty.isatty(1) }),
  stderr: createSupportsColor({ isTTY: tty.isatty(2) })
};
var supports_color_default = supportsColor;

// node_modules/chalk/source/utilities.js
function stringReplaceAll(string, substring, replacer) {
  let index2 = string.indexOf(substring);
  if (index2 === -1) {
    return string;
  }
  const substringLength = substring.length;
  let endIndex = 0;
  let returnValue = "";
  do {
    returnValue += string.slice(endIndex, index2) + substring + replacer;
    endIndex = index2 + substringLength;
    index2 = string.indexOf(substring, endIndex);
  } while (index2 !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
function stringEncaseCRLFWithFirstIndex(string, prefix, postfix, index2) {
  let endIndex = 0;
  let returnValue = "";
  do {
    const gotCR = string[index2 - 1] === "\r";
    returnValue += string.slice(endIndex, gotCR ? index2 - 1 : index2) + prefix + (gotCR ? `\r
` : `
`) + postfix;
    endIndex = index2 + 1;
    index2 = string.indexOf(`
`, endIndex);
  } while (index2 !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}

// node_modules/chalk/source/index.js
var { stdout: stdoutColor, stderr: stderrColor } = supports_color_default;
var GENERATOR = Symbol("GENERATOR");
var STYLER = Symbol("STYLER");
var IS_EMPTY = Symbol("IS_EMPTY");
var levelMapping = [
  "ansi",
  "ansi",
  "ansi256",
  "ansi16m"
];
var styles2 = Object.create(null);
var applyOptions = (object, options = {}) => {
  if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
    throw new Error("The `level` option should be an integer from 0 to 3");
  }
  const colorLevel = stdoutColor ? stdoutColor.level : 0;
  object.level = options.level === undefined ? colorLevel : options.level;
};

class Chalk {
  constructor(options) {
    return chalkFactory(options);
  }
}
var chalkFactory = (options) => {
  const chalk = (...strings) => strings.join(" ");
  applyOptions(chalk, options);
  Object.setPrototypeOf(chalk, createChalk.prototype);
  return chalk;
};
function createChalk(options) {
  return chalkFactory(options);
}
Object.setPrototypeOf(createChalk.prototype, Function.prototype);
for (const [styleName, style] of Object.entries(ansi_styles_default)) {
  styles2[styleName] = {
    get() {
      const builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
      Object.defineProperty(this, styleName, { value: builder });
      return builder;
    }
  };
}
styles2.visible = {
  get() {
    const builder = createBuilder(this, this[STYLER], true);
    Object.defineProperty(this, "visible", { value: builder });
    return builder;
  }
};
var getModelAnsi = (model, level, type, ...arguments_) => {
  if (model === "rgb") {
    if (level === "ansi16m") {
      return ansi_styles_default[type].ansi16m(...arguments_);
    }
    if (level === "ansi256") {
      return ansi_styles_default[type].ansi256(ansi_styles_default.rgbToAnsi256(...arguments_));
    }
    return ansi_styles_default[type].ansi(ansi_styles_default.rgbToAnsi(...arguments_));
  }
  if (model === "hex") {
    return getModelAnsi("rgb", level, type, ...ansi_styles_default.hexToRgb(...arguments_));
  }
  return ansi_styles_default[type][model](...arguments_);
};
var usedModels = ["rgb", "hex", "ansi256"];
for (const model of usedModels) {
  styles2[model] = {
    get() {
      const { level } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level], "color", ...arguments_), ansi_styles_default.color.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
  const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
  styles2[bgModel] = {
    get() {
      const { level } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level], "bgColor", ...arguments_), ansi_styles_default.bgColor.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
}
var proto = Object.defineProperties(() => {}, {
  ...styles2,
  level: {
    enumerable: true,
    get() {
      return this[GENERATOR].level;
    },
    set(level) {
      this[GENERATOR].level = level;
    }
  }
});
var createStyler = (open, close, parent) => {
  let openAll;
  let closeAll;
  if (parent === undefined) {
    openAll = open;
    closeAll = close;
  } else {
    openAll = parent.openAll + open;
    closeAll = close + parent.closeAll;
  }
  return {
    open,
    close,
    openAll,
    closeAll,
    parent
  };
};
var createBuilder = (self, _styler, _isEmpty) => {
  const builder = (...arguments_) => applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
  Object.setPrototypeOf(builder, proto);
  builder[GENERATOR] = self;
  builder[STYLER] = _styler;
  builder[IS_EMPTY] = _isEmpty;
  return builder;
};
var applyStyle = (self, string) => {
  if (self.level <= 0 || !string) {
    return self[IS_EMPTY] ? "" : string;
  }
  let styler = self[STYLER];
  if (styler === undefined) {
    return string;
  }
  const { openAll, closeAll } = styler;
  if (string.includes("\x1B")) {
    while (styler !== undefined) {
      string = stringReplaceAll(string, styler.close, styler.open);
      styler = styler.parent;
    }
  }
  const lfIndex = string.indexOf(`
`);
  if (lfIndex !== -1) {
    string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
  }
  return openAll + string + closeAll;
};
Object.defineProperties(createChalk.prototype, styles2);
var chalk = createChalk();
var chalkStderr = createChalk({ level: stderrColor ? stderrColor.level : 0 });

// src/utils/logger.ts
import"figures";
var chalk2 = new Chalk;
var logger = {
  info: (message) => {},
  success: (message) => {},
  error: (message) => {},
  exception: (error) => {}
};

// src/services/AccountService.ts
class AccountService {
  accountRepo;
  constructor() {
    this.accountRepo = accountRepository;
  }
  async createAccount(data) {
    try {
      return await this.accountRepo.create(data);
    } catch (error) {
      logger.exception(new UsermanagementException(`Failed to create account: ${error instanceof Error ? error.message : "Unknown error"}`));
      return null;
    }
  }
  async getAccountById(accountId) {
    try {
      if (!accountId) {
        logger.exception(new UsermanagementException("Account ID is required"));
        return null;
      }
      const account2 = await this.accountRepo.findById(accountId);
      if (!account2) {
        logger.exception(new UsermanagementException("Account not found"));
        return null;
      }
      return account2;
    } catch (error) {
      logger.exception(new UsermanagementException(`Failed to fetch account by id: ${error instanceof Error ? error.message : "Unknown error"}`));
      return null;
    }
  }
  async getAccountByUserId(userId) {
    try {
      if (!userId) {
        logger.exception(new UsermanagementException("User ID is required"));
        return null;
      }
      const account2 = await this.accountRepo.findFirstBy({ userId });
      if (!account2) {
        logger.exception(new UsermanagementException("Account not found for user"));
        return null;
      }
      return account2;
    } catch (error) {
      logger.exception(new UsermanagementException(`Failed to fetch account by user id: ${error instanceof Error ? error.message : "Unknown error"}`));
      return null;
    }
  }
  async updateAccount(accountId, data) {
    try {
      if (!accountId) {
        logger.exception(new UsermanagementException("Account ID is required"));
        return null;
      }
      const updatedAccount = await this.accountRepo.update(accountId, data);
      if (!updatedAccount) {
        logger.exception(new UsermanagementException("Failed to update account"));
        return null;
      }
      return updatedAccount;
    } catch (error) {
      logger.exception(new UsermanagementException(`Failed to update account: ${error instanceof Error ? error.message : "Unknown error"}`));
      return null;
    }
  }
  async deleteAccount(accountId) {
    try {
      if (!accountId) {
        logger.exception(new UsermanagementException("Account ID is required"));
        return false;
      }
      return await this.accountRepo.delete(accountId);
    } catch (error) {
      logger.exception(new UsermanagementException(`Failed to delete account: ${error instanceof Error ? error.message : "Unknown error"}`));
      return false;
    }
  }
  async accountExists(accountId) {
    try {
      if (!accountId) {
        logger.exception(new UsermanagementException("Account ID is required"));
        return false;
      }
      return await this.accountRepo.exists(accountId);
    } catch (error) {
      logger.exception(new UsermanagementException(`Failed to check account existence: ${error instanceof Error ? error.message : "Unknown error"}`));
      return false;
    }
  }
  async getAccounts(limit = 50, offset = 0) {
    try {
      return await this.accountRepo.findMany(limit, offset);
    } catch (error) {
      logger.exception(new UsermanagementException(`Failed to fetch accounts: ${error instanceof Error ? error.message : "Unknown error"}`));
      return [];
    }
  }
  async checkUserStatus(userId) {
    const account2 = await this.accountRepo.findFirstBy({ userId });
    if (!account2) {
      logger.exception(new UsermanagementException("Account not found for user"));
      return null;
    }
    return account2.status;
  }
}
var accountService = new AccountService;

// src/middlware/checkStatusMiddleware.ts
var checkStatusMiddlware = async (c, next) => {
  const user2 = c.get("user");
  if (!user2) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const accountStatus = await accountService.checkUserStatus(user2.id);
  if (accountStatus === "BLOCKED") {
    return c.json({ error: "Unauthorized: Account is blocked" }, 403);
  }
  await next();
};
var checkStatus = createMiddleware2(checkStatusMiddlware);

// src/app.ts
var app = new Hono().basePath("/api").use(logger2()).use("/*", authMiddleware).use("/*", checkStatus);
globalThis.app = app;
var app_default = app;

// src/env.ts
import * as z from "zod";
var envSchema = z.object({
  DATABASE_URL: z.string(),
  BETTER_AUTH_URL: z.string(),
  BETTER_AUTH_SECRET: z.string()
});
function parseEnv() {
  try {
    envSchema.parse(Bun.env);
  } catch (e) {
    if (e instanceof Error) {} else {}
    process.exit(1);
  }
}

// src/utils/controller.ts
import { readdirSync, statSync } from "fs";
import { join } from "path";
async function loadControllers(dir) {
  for (const file of readdirSync(dir)) {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      await loadControllers(fullPath);
    } else if (file.endsWith(".ts")) {
      await import(fullPath);
    }
  }
}

// src/index.ts
import { join as join2 } from "path";
await loadControllers(join2(import.meta.dir, "controllers"));
parseEnv();
var server = Bun.serve({
  port: Bun.env.PORT || 3001,
  hostname: "0.0.0.0",
  fetch: app_default.fetch
});

//# debugId=E187A94C82814D9964756E2164756E21
