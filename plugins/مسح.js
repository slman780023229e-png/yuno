import fs from "fs";
import path from "path";

// دالة جلب أعضاء النخبة
function getElite(){
    const dataPath = path.join(process.cwd(), "data");
    let elite = [];
    const files = ["النخبة.json", "النخبه.json", "النخبة", "النخبه"];

    for(const file of files){
        const filePath = path.join(dataPath, file);
        if(fs.existsSync(filePath)){
            try{
                elite = JSON.parse(fs.readFileSync(filePath, "utf8"));
                break;
            }catch(err){}
        }
    }
    return elite.map(x => String(x).replace(/\D/g, ""));
}

function getFolders(){
    return fs.readdirSync(process.cwd())
    .filter(file=>{
        const full = path.join(process.cwd(), file);
        return fs.statSync(full).isDirectory();
    });
}

function getFiles(folder){
    const folderPath = path.join(process.cwd(), folder);
    return fs.readdirSync(folderPath)
    .filter(file=>{
        const full = path.join(folderPath, file);
        return fs.statSync(full).isFile();
    });
}

export default {

    command: 'مسح',

    description: 'حذف ملفات البوت (خاص بالنخبة)',

    usage: '.مسح رقم المجلد رقم الملف',

    category: 'النخبه',

    async execute(sock, msg){

        try{

            const chatId = msg.key.remoteJid;

            const sender =
            msg.key.participant ||
            msg.participant ||
            chatId;

            const senderNumber = sender.split("@")[0].replace(/\D/g, "");
            const eliteUsers = getElite();

            // التحقق من صلاحية النخبة
            if(!eliteUsers.includes(senderNumber)){
                return sock.sendMessage(chatId, {
                    text:
`╭━━━━━━━━━━━━━━╮
┃ ❌ رفض الأمر
┣━━━━━━━━━━━━━━┫
┃ 👑 هذا الأمر للنخبة فقط
╰━━━━━━━━━━━━━━╯`
                }, {quoted: msg});
            }

            const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            "";

            const args =
            text.trim()
            .split(/\s+/)
            .slice(1);

            const folders = getFolders();

            if(!args[0]){

                let list =
`
> ━ ╼╃ ⌬〔 🗑️ مسح الملفات 🗑️ 〕⌬ ╄╾ ━

> *┤ 📂 المجلدات:*

`;

                folders.forEach((f, i)=>{
                    list +=
`
> *┤ ${i+1}- 📁 ${f}*
`;
                });

                list +=
`
> *┤────────────···*

> *┤ طريقة الاستخدام:*

> *┤ .مسح رقم المجلد*

> *┤ لعرض الملفات*

> *┤────────────···*

> *┤ .مسح رقم المجلد رقم الملف*

> *┤ لحذف الملف*

> *⋅ ───━ •﹝❄﹞• ━─── ⋅*
> ┇ 𝐘𝐔𝐍𝐎 𝐁𝐎𝐓 ❄
`;

                return sock.sendMessage(chatId, {
                    text: list
                }, {quoted: msg});

            }

            const folderIndex = parseInt(args[0]) - 1;

            if(!folders[folderIndex]){
                return sock.sendMessage(chatId, {
                    text: "❌ رقم المجلد غير موجود"
                }, {quoted: msg});
            }

            const files = getFiles(folders[folderIndex]);

            if(!args[1]){

                let list =
`
> ━ ╼╃ ⌬〔 📂 الملفات 📂 〕⌬ ╄╾ ━

> *┤ المجلد:*
> *┤ ${folders[folderIndex]}*

> *┤────────────···*
`;

                if(files.length === 0){
                    list +=
`
> *┤ ❌ لا توجد ملفات*
`;
                } else {
                    files.forEach((f, i)=>{
                        list +=
`
> *┤ ${i+1}- 📄 ${f}*
`;
                    });
                }

                list +=
`
> *┤────────────···*

> *┤ للحذف:*

> *┤ .مسح ${folderIndex+1} رقم الملف*

> *⋅ ───━ •﹝❄﹞• ━─── ⋅*
> ┇ 𝐘𝐔𝐍𝐎 𝐁𝐎𝐓 ❄
`;

                return sock.sendMessage(chatId, {
                    text: list
                }, {quoted: msg});

            }

            const fileIndex = parseInt(args[1]) - 1;

            if(!files[fileIndex]){
                return sock.sendMessage(chatId, {
                    text: "❌ الملف غير موجود"
                }, {quoted: msg});
            }

            const filePath = path.join(
                process.cwd(),
                folders[folderIndex],
                files[fileIndex]
            );

            fs.unlinkSync(filePath);

            await sock.sendMessage(chatId, {
                text:
`
> ━ ╼╃ ⌬〔 ✅ تم المسح ✅ 〕⌬ ╄╾ ━

> *┤ 📂 المجلد:*
> *┤ ${folders[folderIndex]}*

> *┤ 📄 الملف:*
> *┤ ${files[fileIndex]}*

> *┤ تم حذف الملف بنجاح*

> *⋅ ───━ •﹝❄﹞• ━─── ⋅*
> ┇ 𝐘𝐔𝐍𝐎 𝐁𝐎𝐓 ❄
`,
            }, {quoted: msg});

        }catch(e){

            console.log("مسح خطأ:", e);

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: `❌ خطأ:\n${e.message}`
                },
                {quoted: msg}
            );

        }

    }

};
