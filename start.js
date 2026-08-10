import chalk from "chalk";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================
// 🛡️ درع حماية وتطهير ملفات الجلسة والاتصال
// =============================
function protectAndCleanSession() {
    try {
        const sessionPaths = [
            path.join(__dirname, "session"),
            path.join(__dirname, "sessions"),
            path.join(__dirname, "../session"),
            path.join(__dirname, "../sessions")
        ];

        for (const sessionDir of sessionPaths) {
            if (fs.existsSync(sessionDir)) {
                const files = fs.readdirSync(sessionDir);
                const seenFiles = new Set();

                for (const file of files) {
                    const filePath = path.join(sessionDir, file);
                    try {
                        const stats = fs.statSync(filePath);
                        if (stats.isFile()) {
                            if (stats.size === 0) {
                                fs.unlinkSync(filePath);
                                continue;
                            }

                            if (seenFiles.has(file) || file.includes("copy") || file.includes("bak") || file.endsWith("~")) {
                                fs.unlinkSync(filePath);
                            } else {
                                seenFiles.add(file);
                            }
                        }
                    } catch {}
                }
            }
        }
    } catch {}
}

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));

function bar(percent, size = 30) {
    const filled = Math.floor(
        (percent / 100) * size
    );

    return (
        "█".repeat(filled) +
        "░".repeat(size - filled)
    );
}

async function loading(text) {
    for (let i = 0; i <= 100; i += 5) {
        process.stdout.write(
            `\r${chalk.cyan(text)} [${bar(i)}] ${i}%`
        );
        await sleep(80);
    }

    console.log(
        chalk.green(" ✓")
    );
}

async function start() {
    protectAndCleanSession();

    console.clear();

    // 👑 شعار أسطوري ضخم داخل كبسولة مربعة مع ألوان آمنة وصحيحة
    console.log(`
${chalk.yellow("╔══════════════════════════════════════════════════════════════════╗")}
${chalk.yellow("║")} ${chalk.red("█████╗ ██████╗ ████████╗██╗  ██╗██╗   ██╗██████╗     👑 𝐀𝐑𝐓𝐇𝐔𝐑 👑")} ${chalk.yellow("║")}
${chalk.yellow("║")} ${chalk.green("██╔══██╗██╔══██╗╚══██╔══╝██║  ██║██║   ██║██╔══██╗    🛡️ SYSTEM")}   ${chalk.yellow("║")}
${chalk.yellow("║")} ${chalk.cyan("███████║██████╔╝   ██║   ███████║██║   ██║██████╔╝    ⚡ ONLINE")}   ${chalk.yellow("║")}
${chalk.yellow("║")} ${chalk.magenta("██╔══██║██╔══██╗   ██║   ██╔══██║██║   ██║██╔══██╗                ")} ${chalk.yellow("║")}
${chalk.yellow("║")} ${chalk.blue("██║  ██║██║  ██║   ██║   ██║  ██║╚██████╔╝██║  ██║  v6.0 SECURE")} ${chalk.yellow("║")}
${chalk.yellow("╚══════════════════════════════════════════════════════════════════╝")}
`);

    await loading(
        "⚡ INITIALIZING ARTHUR KERNEL"
    );

    await loading(
        "🔧 LOADING MODULES & PLUGINS"
    );

    await loading(
        "🚀 STARTING ARTHUR BOT ENGINE"
    );

    console.log(
        chalk.green("\n[✓] Launching main.js successfully...\n")
    );

    const bot = spawn(
        "node",
        [path.join(__dirname, "main.js")],
        {
            stdio: "inherit",
            cwd: __dirname
        }
    );

    bot.on(
        "close",
        () => {
            console.log(
                chalk.yellow(
                    "\n[!] Arthur Bot stopped, restarting engine safely..."
                )
            );

            setTimeout(
                start,
                3000
            );
        }
    );
}

process.on("uncaughtException", (err) => {
    console.error(chalk.red("Arthur Start Error: " + err.message));
});

start();
