import chalk from "chalk";
import { spawn } from "child_process";


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


    console.clear();


    console.log(chalk.magenta(`
╔══════════════════════════════════╗
║          𝐘𝐔𝐍𝐎  SYSTEM           ║
║                                  ║
║      WHATSAPP BOT LAUNCHER       ║
╚══════════════════════════════════╝
`));


    await loading(
        "⚡ INITIALIZING"
    );

    await loading(
        "🔧 LOADING MODULES"
    );

    await loading(
        "🚀 STARTING BOT"
    );


    console.log(
        chalk.green("\n[✓] Launching main.js...\n")
    );


    const bot = spawn(
        "node",
        ["main.js"],
        {
            stdio: "inherit"
        }
    );


    bot.on(
        "close",
        () => {

            console.log(
                chalk.yellow(
                    "\n[!] Bot stopped, restarting..."
                )
            );

            setTimeout(
                start,
                3000
            );

        }
    );


}


start();