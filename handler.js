import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


const __filename =
fileURLToPath(import.meta.url);


const __dirname =
path.dirname(__filename);



// =============================
// 👑 ملفات نظام النخبة
// =============================


const modeFile =
path.join(
    __dirname,
    "../data/مود.json"
);


const eliteFile =
path.join(
    __dirname,
    "../data/النخبة.json"
);




// =============================
// ⚡ كاش البلجنات (تحميل مرة واحدة)
// =============================


let pluginsCache = null;



async function loadPlugins(){


    if(pluginsCache)
        return pluginsCache;



    const pluginsPath =
    path.join(
        __dirname,
        "../plugins"
    );



    const files =
    fs.readdirSync(
        pluginsPath
    )
    .filter(
        f=>f.endsWith(".js")
    );



    pluginsCache = [];



    for(const file of files){


        try{


            const plugin =
            await import(
                `../plugins/${file}`
            );


            if(plugin.default){

                pluginsCache.push(
                    plugin.default
                );

            }



        }catch(e){


            console.log(
                "PLUGIN LOAD ERROR:",
                file,
                e.message
            );


        }


    }



    return pluginsCache;


}







// =============================
// قراءة وضع النخبة
// =============================


function getMode(){


    if(!fs.existsSync(modeFile)){


        fs.writeFileSync(
            modeFile,
            JSON.stringify(
                {
                    elite:false
                },
                null,
                2
            )
        );


    }



    return JSON.parse(
        fs.readFileSync(
            modeFile,
            "utf-8"
        )
    );


}




// =============================
// 🎨 𝐘𝐔𝐍𝐎 COLORS
// =============================


const COLORS = {


    reset:"\x1b[0m",


    gold:"\x1b[38;5;220m",

    green:"\x1b[38;5;46m",

    red:"\x1b[38;5;196m",

    cyan:"\x1b[38;5;51m",

    purple:"\x1b[38;5;141m",

    yellow:"\x1b[38;5;226m",

    blue:"\x1b[38;5;45m",

    white:"\x1b[38;5;255m"


};





function log(type,text){


    const icons = {


        ok:"✅",

        cmd:"⚡",

        err:"❌",

        elite:"👑"


    };



    const colors = {


        ok:COLORS.green,

        cmd:COLORS.cyan,

        err:COLORS.red,

        elite:COLORS.gold


    };



console.log(

`${colors[type] || COLORS.cyan}

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃ 𓆩 ❄ 𝐘𝐔𝐍𝐎 𝐒𝐘𝐒𝐓𝐄𝐌 ❄ 𓆪
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ${icons[type] || "•"} ${text}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

${COLORS.reset}`

);


}





// =============================
// 👑 قراءة النخبة
// =============================


function getElite(){


    if(!fs.existsSync(eliteFile)){


        fs.writeFileSync(
            eliteFile,
            JSON.stringify(
                [],
                null,
                2
            )
        );


    }



    return JSON.parse(
        fs.readFileSync(
            eliteFile,
            "utf-8"
        )
    );


}




// =============================
// 🚀 بداية HANDLER
// =============================


export async function handleMessages(sock,m){


    const start =
    Date.now();



    const msg =
    m.messages?.[0];



    if(!msg || !msg.message)
        return;



    const jid =
    msg.key.remoteJid;



    const sender =
    msg.key.participant ||
    jid;



    const number =
    sender
    .split("@")[0]
    .replace(/[^0-9]/g,"");
    // =============================
    // ⚡ جلب البلجنات من الكاش
    // =============================

    const plugins =
    await loadPlugins();






    // =============================
    // 🔒 تشغيل مستمعات البلجنات
    // =============================


    for(const cmd of plugins){


        try{


            if(cmd?.onMessage){


                await cmd.onMessage(
                    sock,
                    msg,
                    {
                        jid,
                        sender,
                        number,
                        message:msg
                    }
                );


            }



        }catch(e){


            log(
                "err",
                "Listener : "+e.message
            );


        }


    }







    // =============================
    // 👑 وضع النخبة
    // =============================


    const mode =
    getMode();



    if(mode.elite === true){



        const elite =
        getElite()
        .map(
            n=>n.toString()
        );



        if(!elite.includes(number)){



            console.log(
`${COLORS.gold}

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃ 👑 𝐘𝐔𝐍𝐎 𝐄𝐋𝐈𝐓𝐄 𝐌𝐎𝐃𝐄
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🚫 تم تجاهل الرسالة
┃ 👤 الرقم : ${number}
┃ ❌ ليس من النخبة
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

${COLORS.reset}`
            );



            return;


        }


    }







    // =============================
    // 📝 قراءة النص
    // =============================


    const text =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    "";



    if(!text)
        return;







    // =============================
    // ⚡ تنفيذ الأوامر من الكاش
    // =============================


    for(const cmd of plugins){


        try{



            if(
                cmd &&
                cmd.command &&
                text.startsWith(
                    "." + cmd.command
                )
            ){



                await cmd.execute(
                    sock,
                    msg,
                    {
                        text,
                        jid,
                        sender,
                        number,

                        isGroup:
                        jid.endsWith("@g.us")

                    }
                );




                const time =
                Date.now()-start;



                console.log(
`${COLORS.purple}

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃ ⚜ 𝐘𝐔𝐍𝐎 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 ⚜
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ⚡ الأمر : ${cmd.command}
┃ 👤 الرقم : ${number}
┃ ⏱ السرعة : ${time}ms
┃ ✅ الحالة : تم التنفيذ
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

${COLORS.reset}`
                );



                return;


            }



        }catch(err){


            log(
                "err",
                "خطأ في الأمر : "+err.message
            );


        }


    }
    // =============================
    // ❌ أمر غير موجود
    // =============================


    if(
        text.startsWith(".")
    ){


        const time =
        Date.now()-start;



        console.log(
`${COLORS.red}

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃ ❌ 𝐔𝐍𝐊𝐍𝐎𝐖𝐍 𝐂𝐎𝐌𝐌𝐀𝐍𝐃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ⚡ الأمر : ${text}
┃ 👤 الرقم : ${number}
┃ ⏱ السرعة : ${time}ms
┃ 🔎 الحالة : NOT FOUND
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

${COLORS.reset}`
        );


    }




}