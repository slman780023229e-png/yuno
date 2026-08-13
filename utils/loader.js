import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLORS = {
    reset: "\x1b[0m",
    red: "\x1b[38;5;196m",
    orange: "\x1b[38;5;208m",
    gold: "\x1b[38;5;220m",
    yellow: "\x1b[38;5;226m",
    green: "\x1b[38;5;46m",
    cyan: "\x1b[38;5;51m",
    blue: "\x1b[38;5;39m",
    purple: "\x1b[38;5;93m",
    pink: "\x1b[38;5;213m",
    white: "\x1b[97m",
    gray: "\x1b[38;5;245m"
};

// =============================
// ⚡ كاش البلجنات (تحميل ذكي وآمن)
// =============================

let pluginsCache = null;

export async function loadPlugins(sock) {
    if (pluginsCache) return pluginsCache;

    const pluginsPath = path.join(__dirname, "../plugins");

    if (!fs.existsSync(pluginsPath)) {
        fs.mkdirSync(pluginsPath, { recursive: true });
    }

    const files = fs.readdirSync(pluginsPath).filter(file => file.endsWith(".js"));

    console.log(`
${COLORS.purple}╔═══════════════════════════════════════════════╗
${COLORS.blue}║                                                    ║
${COLORS.gold}║             👑 𝐀𝐑𝐓𝐇𝐔𝐑 𝐒𝐘𝐒𝐓𝐄𝐌 👑             ║
${COLORS.blue}║                                                    ║
${COLORS.cyan}╠═══════════════════════════════════════════════╣
${COLORS.green}║ ⚡ MODULE   : Plugin Loader                        ║
${COLORS.yellow}║ 📦 STATUS   : Scanning Plugins...                  ║
${COLORS.orange}║ 🛡️ SECURITY : ACTIVE                               ║
${COLORS.pink}║ 🚀 ENGINE   : ARTHUR CORE                          ║
${COLORS.gray}║ 🕒 ${new Date().toLocaleString("ar-SA").padEnd(43)}║
${COLORS.purple}╚═══════════════════════════════════════════════╝
${COLORS.reset}
`);

    let count = 0;
    const plugins = [];

    for (const file of files) {
        try {
            const filePath = path.join(pluginsPath, file);
            // تحويل المسار إلى صيغة URL صحيحة متوافقة مع جميع المنصات (Windows / Termux / Linux) مع كسر الكاش
            const fileUrl = `${pathToFileURL(filePath).href}?update=${Date.now()}`;
            const plugin = await import(fileUrl);

            if (plugin.default && typeof plugin.default === "object") {
                plugins.push(plugin.default);
                count++;

                // 📦 إطار مربع أنيق ومرتب لكل بلجن تم تحميله بنجاح
                console.log(
                    `${COLORS.cyan}╭────────────────────────────────────────╮${COLORS.reset}\n` +
                    `${COLORS.cyan}│${COLORS.reset} ${COLORS.green}✅ PLUGIN LOADED :${COLORS.reset} ${COLORS.white}${file.padEnd(20)}${COLORS.reset} ${COLORS.cyan}│${COLORS.reset}\n` +
                    `${COLORS.cyan}╰────────────────────────────────────────╯${COLORS.reset}`
                );
            } else {
                console.log(
                    `${COLORS.yellow}╭────────────────────────────────────────╮${COLORS.reset}\n` +
                    `${COLORS.yellow}│${COLORS.reset} ${COLORS.orange}⚠️ INVALID PLUGIN :${COLORS.reset} ${COLORS.white}${file.padEnd(19)}${COLORS.reset} ${COLORS.yellow}│${COLORS.reset}\n` +
                    `${COLORS.yellow}╰────────────────────────────────────────╯${COLORS.reset}`
                );
            }
        } catch (err) {
            console.log(
                `${COLORS.red}╭────────────────────────────────────────╮${COLORS.reset}\n` +
                `${COLORS.red}│${COLORS.reset} ${COLORS.red}❌ ERROR IN FILE :${COLORS.reset} ${COLORS.white}${file.padEnd(20)}${COLORS.reset} ${COLORS.red}│${COLORS.reset}\n` +
                `${COLORS.red}├────────────────────────────────────────┤${COLORS.reset}\n` +
                `${COLORS.red}│${COLORS.reset} ${COLORS.gray}Reason : ${err.message.slice(0, 30).padEnd(30)}${COLORS.reset} ${COLORS.red}│${COLORS.reset}\n` +
                `${COLORS.red}╰────────────────────────────────────────╯${COLORS.reset}`
            );
        }
    }

    pluginsCache = plugins;

    console.log(`
${COLORS.purple}╔═══════════════════════════════════════════════╗
${COLORS.blue}║                                                    ║
${COLORS.green}║              ✅ 𝐀𝐑𝐓𝐇𝐔𝐑 𝐎𝐍𝐋𝐈𝐍𝐄 ✅              ║
${COLORS.blue}║                                                    ║
${COLORS.cyan}╠═══════════════════════════════════════════════╣
${COLORS.gold}║ 📦 PLUGINS   : ${String(count).padEnd(35)}║
${COLORS.green}║ ⚡ STATUS    : READY                              ║
${COLORS.yellow}║ 🛡️ SECURITY  : ENABLED                            ║
${COLORS.pink}║ 🚀 ENGINE    : ACTIVE                             ║
${COLORS.orange}║ 📂 PATH      : plugins/                           ║
${COLORS.gray}║ 🕒 ${new Date().toLocaleString("ar-SA").padEnd(43)}║
${COLORS.cyan}╠═══════════════════════════════════════════════╣
${COLORS.green}║         ✦ 𝐓𝐇𝐄 𝐒𝐘𝐒𝐓𝐄𝐌 𝐈𝐒 𝐑𝐄𝐀𝐃𝐘 ✦          ║
${COLORS.purple}╚══════════════════════════════════════════════╝
${COLORS.reset}`);

    return plugins;
}

// =============================
// 🔄 مراقبة التعديلات الحية (Live Watcher) لتحديث البلجنات فوراً
// =============================

export function watchPlugins(onChangeCallback) {
    const pluginsPath = path.join(__dirname, "../plugins");

    if (!fs.existsSync(pluginsPath)) {
        fs.mkdirSync(pluginsPath, { recursive: true });
    }

    fs.watch(pluginsPath, async (eventType, filename) => {
        if (filename && filename.endsWith(".js")) {
            // تفريغ الكاش فور حدوث أي تعديل لضمان التحديث اللحظي
            pluginsCache = null;

            console.log(
                `${COLORS.gold}
╭────────────────────────────────────────╮
│ 🔄 𝐀𝐑𝐓𝐇𝐔𝐑 𝐋𝐈𝐕𝐄 𝐖𝐀𝐓𝐂𝐇𝐄𝐑             │
├────────────────────────────────────────┤
│ ⚡ الحدث : تم تعديل الملف ${filename.slice(0, 13).padEnd(13)} │
│ ♻️ جاري مسح الكاش وتحديث البلجنات...     │
╰────────────────────────────────────────╯
${COLORS.reset}`
            );

            if (typeof onChangeCallback === "function") {
                await onChangeCallback();
            }
        }
    });
}
