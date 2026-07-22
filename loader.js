import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


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



export async function loadPlugins(sock){


    const pluginsPath =
    path.join(
        __dirname,
        "../plugins"
    );



    if(!fs.existsSync(pluginsPath)){

        fs.mkdirSync(
            pluginsPath,
            {
                recursive:true
            }
        );

    }



    const files =
    fs.readdirSync(pluginsPath)
    .filter(
        file=>file.endsWith(".js")
    );



    console.log(`
${COLORS.purple}╔═══════════════════════════════════════════════╗
${COLORS.blue}║                                                    ║
${COLORS.gold}║             👑 𝐘𝐔𝐍𝐎 𝐒𝐘𝐒𝐓𝐄𝐌 👑              ║
${COLORS.blue}║                                                    ║
${COLORS.cyan}╠═══════════════════════════════════════════════╣
${COLORS.green}║ ⚡ MODULE   : Plugin Loader                        ║
${COLORS.yellow}║ 📦 STATUS   : Scanning Plugins...                  ║
${COLORS.orange}║ 🛡️ SECURITY : ACTIVE                               ║
${COLORS.pink}║ 🚀 ENGINE   : YUNO CORE                            ║
${COLORS.gray}║ 🕒 ${new Date().toLocaleString("ar-SA").padEnd(43)}║
${COLORS.purple}╚═══════════════════════════════════════════════╝
${COLORS.reset}
`);



    let count = 0;



    for(const file of files){


        try{


            const plugin =
            await import(
                `../plugins/${file}`
            );



            if(
                plugin.default &&
                typeof plugin.default === "object"
            ){

                count++;

                console.log(
`${COLORS.green}✔${COLORS.reset} ${COLORS.white}${file}${COLORS.reset}`
                );

            }else{

                console.log(
`${COLORS.yellow}⚠${COLORS.reset} ${COLORS.white}${file}${COLORS.reset} ${COLORS.orange}(غير صالح)${COLORS.reset}`
                );

            }

        }catch(err){

            console.log(
`${COLORS.red}✘${COLORS.reset} ${COLORS.white}${file}${COLORS.reset}
${COLORS.red}└─ ${err.message}${COLORS.reset}`
            );

        }

    }
    console.log(`

${COLORS.purple}╔═══════════════════════════════════════════════╗
${COLORS.blue}║                                                    ║
${COLORS.green}║              ✅ 𝐘𝐔𝐍𝐎 𝐎𝐍𝐋𝐈𝐍𝐄 ✅               ║
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

}