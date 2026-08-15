import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadPlugins } from "./loader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================
// 👑 الملفات
// =============================

const modeFile = path.join(__dirname, "../data/مود.json");
const eliteFile = path.join(__dirname, "../data/النخبة.json");
const ownerFile = path.join(__dirname, "../data/owner.json");

// =============================
// 🎨 ARTHUR COLORS
// =============================

const COLORS = {
    reset: "\x1b[0m",
    gold: "\x1b[38;5;220m",
    green: "\x1b[38;5;46m",
    red: "\x1b[38;5;196m",
    cyan: "\x1b[38;5;51m",
    purple: "\x1b[38;5;141m",
    yellow: "\x1b[38;5;226m",
    blue: "\x1b[38;5;45m",
    white: "\x1b[38;5;255m",
    gray: "\x1b[38;5;245m"
};

function log(type, text) {
    try {
        const icons = {
            ok: "✅",
            cmd: "⚡",
            err: "❌",
            elite: "👑"
        };

        const colors = {
            ok: COLORS.green,
            cmd: COLORS.cyan,
            err: COLORS.red,
            elite: COLORS.gold
        };

        console.log(
            `${colors[type] || COLORS.cyan}
╭────────────────────────────────────────╮
│ 🛡️ 𝐀𝐑𝐓𝐇𝐔𝐑 𝐒𝐘𝐒𝐓𝐄𝐌 🛡️
├────────────────────────────────────────┤
│ ${icons[type] || "•"} ${text}
╰────────────────────────────────────────╯
${COLORS.reset}`
        );
    } catch {}
}

// =============================
// 🔍 استخراج الرقم
// =============================

export const extractPureNumber = (jid) => {
    try {
        if (!jid) return "";

        return String(jid)
            .replace(/[@:].*/g, "")
            .replace(/\D/g, "");
    } catch {
        return "";
    }
};

// =============================
// ⚙️ قراءة الوضع
// =============================

let cachedMode = null;
let lastModeCheck = 0;

function getMode() {
    try {
        const now = Date.now();

        if (
            cachedMode &&
            now - lastModeCheck < 3000
        ) {
            return cachedMode;
        }

        if (!fs.existsSync(modeFile)) {
            fs.mkdirSync(
                path.dirname(modeFile),
                { recursive: true }
            );

            fs.writeFileSync(
                modeFile,
                JSON.stringify(
                    { elite: false },
                    null,
                    2
                )
            );
        }

        const content =
            fs.readFileSync(
                modeFile,
                "utf8"
            );

        const parsed =
            JSON.parse(content || "{}");

        cachedMode =
            parsed &&
            typeof parsed === "object"
                ? parsed
                : { elite: false };

        lastModeCheck = now;

        return cachedMode;

    } catch {
        return cachedMode || {
            elite: false
        };
    }
}

// =============================
// 👑 نظام النخبة
// =============================

let eliteCache = null;
let lastEliteCheck = 0;

function getElite() {
    try {
        const now = Date.now();

        if (
            Array.isArray(eliteCache) &&
            now - lastEliteCheck < 5000
        ) {
            return eliteCache;
        }

        if (!fs.existsSync(eliteFile)) {
            fs.mkdirSync(
                path.dirname(eliteFile),
                { recursive: true }
            );

            fs.writeFileSync(
                eliteFile,
                "[]"
            );

            eliteCache = [];
            lastEliteCheck = now;

            return eliteCache;
        }

        const content =
            fs.readFileSync(
                eliteFile,
                "utf8"
            );

        if (!content.trim()) {
            eliteCache = [];
            lastEliteCheck = now;
            return eliteCache;
        }

        const data =
            JSON.parse(content);

        const list =
            Array.isArray(data)
                ? data
                : [];

        eliteCache =
            list
                .map(item => {

                    if (
                        typeof item ===
                        "object" &&
                        item !== null
                    ) {
                        return extractPureNumber(
                            item.number ||
                            item.id ||
                            Object.values(item)[0]
                        );
                    }

                    return extractPureNumber(
                        item
                    );
                })
                .filter(
                    number =>
                        number &&
                        number.length >= 5
                );

        lastEliteCheck = now;

        return eliteCache;

    } catch {
        return Array.isArray(eliteCache)
            ? eliteCache
            : [];
    }
}

// =============================
// 👑 إضافة رقم الجلسة للنخبة
// =============================

let eliteWritePromise = Promise.resolve();
let sessionEliteNumber = null;

function addEliteAutomatically(number) {

    const cleanNum =
        extractPureNumber(number);

    if (
        !cleanNum ||
        cleanNum.length < 5
    ) {
        return;
    }

    // منع إعادة معالجة نفس الرقم
    if (
        sessionEliteNumber === cleanNum
    ) {
        return;
    }

    sessionEliteNumber = cleanNum;

    eliteWritePromise =
        eliteWritePromise
            .then(async () => {

                try {

                    let list = getElite();

                    if (
                        list.includes(cleanNum)
                    ) {
                        return;
                    }

                    list = [
                        ...new Set([
                            ...list,
                            cleanNum
                        ])
                    ];

                    // كتابة ذرية
                    const tempFile =
                        `${eliteFile}.tmp`;

                    await fs.promises.mkdir(
                        path.dirname(eliteFile),
                        { recursive: true }
                    );

                    await fs.promises.writeFile(
                        tempFile,
                        JSON.stringify(
                            list,
                            null,
                            2
                        ),
                        "utf8"
                    );

                    await fs.promises.rename(
                        tempFile,
                        eliteFile
                    );

                    eliteCache = list;
                    lastEliteCheck =
                        Date.now();

                    log(
                        "elite",
                        `تم حفظ رقم الجلسة ${cleanNum} في النخبة 👑`
                    );

                } catch (error) {

                    console.error(
                        "Elite Write Error:",
                        error?.message ||
                        error
                    );
                }
            })
            .catch(() => {});

}

// =============================
// 🛡️ الأونر
// =============================

let cachedOwner = null;

function getOwner() {
    try {

        if (cachedOwner) {
            return cachedOwner;
        }

        if (
            fs.existsSync(ownerFile)
        ) {

            try {

                const data =
                    JSON.parse(
                        fs.readFileSync(
                            ownerFile,
                            "utf8"
                        )
                    );

                if (data?.owner) {

                    cachedOwner =
                        extractPureNumber(
                            data.owner
                        );

                    return cachedOwner;
                }

            } catch {}
        }

        if (process.env.OWNER_NUMBER) {

            cachedOwner =
                extractPureNumber(
                    process.env.OWNER_NUMBER
                );

            return cachedOwner;
        }

        return "967000000000";

    } catch {
        return "967000000000";
    }
}

// =============================
// 🔍 مطابقة الأرقام
// =============================

function isSameNumber(
    num1,
    num2
) {
    try {

        if (!num1 || !num2) {
            return false;
        }

        const clean1 =
            extractPureNumber(num1);

        const clean2 =
            extractPureNumber(num2);

        if (!clean1 || !clean2) {
            return false;
        }

        return (
            clean1 === clean2 ||
            clean1.endsWith(clean2) ||
            clean2.endsWith(clean1)
        );

    } catch {
        return false;
    }
}

// =============================
// 🚀 تحميل البلجنات مرة واحدة
// =============================

let loadedPluginsCache = null;
let pluginsLoadingPromise = null;

async function getLoadedPlugins(sock) {

    if (
        Array.isArray(
            loadedPluginsCache
        )
    ) {
        return loadedPluginsCache;
    }

    if (pluginsLoadingPromise) {
        return pluginsLoadingPromise;
    }

    pluginsLoadingPromise =
        (async () => {

            try {

                const plugins =
                    await loadPlugins(sock);

                loadedPluginsCache =
                    Array.isArray(plugins)
                        ? plugins
                        : [];

                return loadedPluginsCache;

            } catch (error) {

                console.error(
                    "Plugin Loader Error:",
                    error?.message ||
                    error
                );

                loadedPluginsCache = [];

                return [];
            } finally {

                pluginsLoadingPromise =
                    null;
            }

        })();

    return pluginsLoadingPromise;
}

export function clearPluginsCache() {
    loadedPluginsCache = null;
}

// =============================
// 🛡️ منع معالجة الرسالة مرتين
// =============================

const processedMessages =
    new Map();

const MESSAGE_CACHE_TIME =
    30 * 1000;

function wasProcessed(id) {

    if (!id) {
        return false;
    }

    const now = Date.now();

    const old =
        processedMessages.get(id);

    if (
        old &&
        now - old <
        MESSAGE_CACHE_TIME
    ) {
        return true;
    }

    processedMessages.set(
        id,
        now
    );

    // تنظيف قديم
    if (
        processedMessages.size >
        5000
    ) {

        for (
            const [key, time]
            of processedMessages
        ) {

            if (
                now - time >
                MESSAGE_CACHE_TIME
            ) {
                processedMessages.delete(
                    key
                );
            }
        }
    }

    return false;
}

// =============================
// 🚀 معالجة مستقلة لكل رسالة
// =============================

export async function handleMessages(
    sock,
    m
) {

    try {

        const message =
            m?.messages?.[0];

        const messageId =
            message?.key?.id;

        if (
            messageId &&
            wasProcessed(messageId)
        ) {
            return;
        }

        /*
         * مهم جدًا:
         * لا يوجد Queue عام هنا.
         *
         * كل رسالة لها Promise مستقلة.
         * إذا .تيك تأخر، بقية الأوامر تعمل.
         */

        Promise.resolve()
            .then(() =>
                executeHandlerLogic(
                    sock,
                    m
                )
            )
            .catch(error => {

                console.error(
                    "Handler Error:",
                    error?.message ||
                    error
                );

            });

    } catch (error) {

        console.error(
            "handleMessages Error:",
            error?.message ||
            error
        );
    }
}

// =============================
// ⚡ المنطق الأساسي
// =============================

async function executeHandlerLogic(
    sock,
    m
) {

    try {

        const botJid =
            sock.user?.id;

        const currentBotNumber =
            extractPureNumber(
                botJid
            );

        // إضافة رقم الجلسة مرة واحدة فقط
        if (
            currentBotNumber
        ) {
            addEliteAutomatically(
                currentBotNumber
            );
        }

        const msg =
            m?.messages?.[0];

        if (
            !msg ||
            !msg.message
        ) {
            return;
        }

        const jid =
            msg.key?.remoteJid;

        if (!jid) {
            return;
        }

        const isGroup =
            jid.endsWith("@g.us");

        const isPrivate =
            jid.endsWith(
                "@s.whatsapp.net"
            );

        const sender =
            msg.key?.fromMe
                ? (
                    currentBotNumber
                        ? `${currentBotNumber}@s.whatsapp.net`
                        : (
                            msg.key?.participant ||
                            jid
                        )
                )
                : (
                    isGroup
                        ? (
                            msg.key?.participant ||
                            jid
                        )
                        : jid
                );

        const number =
            extractPureNumber(
                sender
            );

        const ownerNumber =
            getOwner();

        const isOwner =
            isSameNumber(
                number,
                ownerNumber
            );

        const eliteList =
            getElite();

        const isEliteUser =
            isOwner ||
            isSameNumber(
                number,
                currentBotNumber
            ) ||
            eliteList.some(
                elite =>
                    isSameNumber(
                        number,
                        elite
                    )
            );

        // =============================
        // 📦 البلجنات
        // =============================

        const plugins =
            await getLoadedPlugins(
                sock
            );

        if (
            !Array.isArray(
                plugins
            )
        ) {
            return;
        }

        // =============================
        // 🔔 onMessage
        // =============================

        for (
            const cmd
            of plugins
        ) {

            try {

                if (
                    typeof cmd?.onMessage !==
                    "function"
                ) {
                    continue;
                }

                /*
                 * onMessage مستقل.
                 * لا نخلي بلجن مراقبة واحد
                 * يوقف بقية النظام.
                 */

                Promise.resolve()
                    .then(() =>
                        cmd.onMessage(
                            sock,
                            msg,
                            {
                                jid,
                                sender,
                                number,
                                isOwner,
                                ownerNumber,
                                isGroup,
                                isPrivate,
                                message: msg,
                                isElite:
                                    isEliteUser
                            }
                        )
                    )
                    .catch(error => {

                        console.error(
                            "Plugin onMessage Error:",
                            error?.message ||
                            error
                        );

                    });

            } catch {}
        }

        // =============================
        // 🔐 وضع النخبة
        // =============================

        const mode =
            getMode();

        if (
            mode?.elite === true &&
            !isOwner &&
            !isSameNumber(
                number,
                currentBotNumber
            )
        ) {

            if (!isEliteUser) {
                return;
            }
        }

        // =============================
        // 📝 استخراج النص
        // =============================

        const rawText =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.buttonsResponseMessage?.selectedButtonId ||
            msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
            msg.message.templateButtonReplyMessage?.selectedId ||
            "";

        if (!rawText) {
            return;
        }

        const text =
            String(rawText).trim();

        const hasPrefix =
            /^[./\\#,!^&+=]/.test(
                text
            );

        const noPrefixText =
            text
                .replace(
                    /^[./\\#,!^&+=]/,
                    ""
                )
                .trim();

        if (!noPrefixText) {
            return;
        }

        const commandName =
            noPrefixText
                .split(/\s+/)[0]
                .toLowerCase();

        // =============================
        // ⚡ البحث عن الأمر
        // =============================

        for (
            const cmd
            of plugins
        ) {

            try {

                if (
                    !cmd?.command
                ) {
                    continue;
                }

                const validCmds =
                    Array.isArray(
                        cmd.command
                    )
                        ? cmd.command
                        : [
                            cmd.command
                        ];

                const isMatched =
                    validCmds.some(
                        c =>
                            c &&
                            String(c)
                                .toLowerCase() ===
                            commandName
                    );

                if (!isMatched) {
                    continue;
                }

                // الأوامر بدون بادئة
                if (
                    !hasPrefix &&
                    !isEliteUser
                ) {
                    return;
                }

                log(
                    "cmd",
                    `${commandName} ← ${jid}`
                );

                /*
                 * هنا الأمر يُنفذ بشكل مستقل.
                 *
                 * إذا كان تيك يحتاج 60 ثانية،
                 * لا توجد Queue تمنع مجموعة ثانية.
                 */

                await Promise.resolve(
                    cmd.execute(
                        sock,
                        msg,
                        {
                            text,
                            noPrefixText,
                            commandName,
                            jid,
                            sender,
                            number,
                            isOwner,
                            ownerNumber,
                            isGroup,
                            isPrivate,
                            hasPrefix,
                            isElite:
                                isEliteUser
                        }
                    )
                );

                return;

            } catch (error) {

                console.error(
                    `Command Error [${commandName}]:`,
                    error?.message ||
                    error
                );

                /*
                 * الخطأ في أمر واحد لا يوقف
                 * استقبال الرسائل التالية.
                 */

                return;
            }
        }

    } catch (error) {

        console.error(
            "executeHandlerLogic Error:",
            error?.message ||
            error
        );
    }
            }
