import fs from "fs";
import path from "path";


export default {

    command: "مود",

    category: "النخبه",

    description: "تشغيل أو إيقاف نظام النخبه",


    execute: async(sock,msg,data)=>{


        const jid = data.jid;



        const args =
        data.text
        .trim()
        .split(/\s+/)
        .slice(1);



        const mode =
        args[0]
        ?.toLowerCase();



        if(
            mode !== "on" &&
            mode !== "off"
        ){

            return sock.sendMessage(
                jid,
                {
                    text:
`╭━━━━━━━━━━━━━━━━━━━━╮
┃ 👑 𝐘𝐔𝐍𝐎 𝐄𝐋𝐈𝐓𝐄
┣━━━━━━━━━━━━━━━━━━━━┫
┃ ⚡ استخدام المود:
┃
┃ 🟢 .مود on
┃ 🔴 .مود off
┃
┃ 🛡️ تشغيل أو إيقاف النخبة
╰━━━━━━━━━━━━━━━━━━━━╯`
                }
            );

        }



        // ملف المود

        const modeFile =
        path.join(
            process.cwd(),
            "data",
            "مود.json"
        );



        // إنشاء مجلد data إذا غير موجود

        const dataFolder =
        path.join(
            process.cwd(),
            "data"
        );


        if(!fs.existsSync(dataFolder)){

            fs.mkdirSync(
                dataFolder,
                {
                    recursive:true
                }
            );

        }



        fs.writeFileSync(
            modeFile,
            JSON.stringify(
                {
                    elite:
                    mode === "on"
                },
                null,
                2
            )
        );



        await sock.sendMessage(
            jid,
            {
                text:
`╭━━━━━━━━━━━━━━━━━━━━╮
┃ 👑 𝐘𝐔𝐍𝐎 𝐄𝐋𝐈𝐓𝐄
┣━━━━━━━━━━━━━━━━━━━━┫
┃ ${
mode === "on"
?
"🟢 تم تشغيل نظام النخبة"
:
"🔴 تم إيقاف نظام النخبة"
}
┃
┃ ⚡ الحالة:
┃ ${mode.toUpperCase()}
┃
┃ 🚀 النظام:
┃ 𝐘𝐔𝐍𝐎 𝐂𝐎𝐑𝐄
╰━━━━━━━━━━━━━━━━━━━━╯`
            }
        );



        console.log(
`
╭━━━━━━━━━━━━━━━━━━━━╮
┃ 👑 𝐘𝐔𝐍𝐎 𝐄𝐋𝐈𝐓𝐄
┣━━━━━━━━━━━━━━━━━━━━┫
┃ ⚡ MODE : ${mode.toUpperCase()}
┃ 🕒 TIME : ${new Date().toLocaleTimeString("ar-SA")}
╰━━━━━━━━━━━━━━━━━━━━╯
`
        );


    }

};