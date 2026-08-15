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
// ⚡ تحميل البلجنات بشكل مستقر وآمن (بدون كاش خانق للذاكرة)
// =============================

export async function loadPlugins(sock) {
    const pluginsPath = path.join(__dirname, "../plugins");

    if (!fs.existsSync(pluginsPath)) {
        fs.mkdirSync(pluginsPath, { recursive: true });
    }

    const files = fs.readdirSync(pluginsPath).filter(file => file.endsWith(".js"));

    let count = 0;
    const plugins = [];

    for (const file of files) {
        try {
            const filePath = path.join(pluginsPath, file);
            const fileUrl = `${pathToFileURL(filePath).href}?update=${Date.now()}`;
            const plugin = await import(fileUrl);

            if (plugin.default && typeof plugin.default === "object") {
                plugins.push(plugin.default);
                count++;
            }
        } else {
            // تجاهل الملفات غير الصامتة لتخفيف اللوجز
        }
        } catch (err) {
            console.log(`${COLORS.red}❌ Error loading plugin ${file}: ${err.message}${COLORS.reset}`);
        }
    }

    return plugins;
}

// =============================
// 🔄 مراقبة التعديلات الحية (Live Watcher)
// =============================

export function watchPlugins(onChangeCallback) {
    const pluginsPath = path.join(__dirname, "../plugins");

    if (!fs.existsSync(pluginsPath)) {
        fs.mkdirSync(pluginsPath, { recursive: true });
    }

    fs.watch(pluginsPath, async (eventType, filename) => {
        if (filename && filename.endsWith(".js")) {
            if (typeof onChangeCallback === "function") {
                await onChangeCallback();
            }
        }
    });
}
