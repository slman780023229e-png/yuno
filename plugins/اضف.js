import fs from "fs";
import path from "path";
import { downloadMediaMessage } from '@whiskeysockets/baileys';

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
    const root = process.cwd();
    return fs.readdirSync(root).filter(file=>{
        const full = path.join(root, file);
        return fs.statSync(full).isDirectory();
    });
}

export default {

    command: 'اضف',

    description: 'إضافة ملفات وصور ومجلدات (خاص بالنخبة)',

    usage: '.اضف رقم الاسم',

    category: 'النخبه',

    async execute(sock, msg){

        try{

            const chatId = msg.key.remoteJid;

            const sender =
            msg.key.participant ||
            msg.participant ||
            msg.key.remoteJid;

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

            // عرض المجلدات
            if(!args[0]){

                const folders = getFolders();

                let list =
`
> ━ ╼╃ ⌬〔 📁 ملفات البوت 📁 〕⌬ ╄╾ ━

`;

                folders.forEach((f, i)=>{
                    list +=
`
> *${i+1}- 📂 ${f}*
`;
                });

                list +=
`
> ─────────────

طريقة الاستخدام:

.اضف رقم المجلد اسم الملف

مثال:

.اضف 1 test


لإنشاء مجلد:

.اضف مجلد اسم_المجلد
`;

                return sock.sendMessage(chatId, {
                    text: list
                }, {quoted: msg});

            }

            // إنشاء مجلد
            if(args[0] === "مجلد"){

                if(!args[1])
                return sock.sendMessage(chatId, {
                    text: "❌ اكتب اسم المجلد"
                }, {quoted: msg});

                fs.mkdirSync(
                    path.join(process.cwd(), args[1]),
                    {recursive: true}
                );

                return sock.sendMessage(chatId, {
                    text:
`✅ تم إنشاء المجلد:
📂 ${args[1]}`
                }, {quoted: msg});

            }

            const folders = getFolders();
            const index = parseInt(args[0]) - 1;

            if(!folders[index]){
                return sock.sendMessage(chatId, {
                    text: "❌ رقم المجلد غير موجود"
                }, {quoted: msg});
            }

            const fileName = args[1];

            if(!fileName){
                return sock.sendMessage(chatId, {
                    text: "❌ اكتب اسم الملف"
                }, {quoted: msg});
            }

            const quoted =
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if(!quoted){
                return sock.sendMessage(chatId, {
                    text: "❌ رد على الكود أو الصورة"
                }, {quoted: msg});
            }

            const folderPath = path.join(process.cwd(), folders[index]);

            // حفظ صورة
            if(quoted.imageMessage){

                const buffer = await downloadMediaMessage(
                    { message: quoted },
                    'buffer',
                    {},
                    { logger: console }
                );

                const ext =
                quoted.imageMessage.mimetype?.includes('png')
                ? '.png'
                : '.jpg';

                fs.writeFileSync(
                    path.join(folderPath, fileName + ext),
                    buffer
                );

                return sock.sendMessage(chatId, {
                    text:
`
✅ تم حفظ الصورة

📂 ${folders[index]}

🖼️ ${fileName + ext}
`
                }, {quoted: msg});

            }

            // حفظ كود
            const code =
            quoted.conversation ||
            quoted.extendedTextMessage?.text ||
            "";

            if(!code){
                return sock.sendMessage(chatId, {
                    text: "❌ لم يتم العثور على محتوى"
                }, {quoted: msg});
            }

            let saveName =
            fileName.endsWith('.js')
            ? fileName
            : fileName + '.js';

            fs.writeFileSync(
                path.join(folderPath, saveName),
                code,
                'utf8'
            );

            await sock.sendMessage(chatId, {
                text:
`
✅ تم حفظ الملف

📂 ${folders[index]}

📄 ${saveName}
`
            }, {quoted: msg});

        }catch(e){

            console.log("اضف خطأ:", e);

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text:
`❌ خطأ:
${e.message}`
                },
                {quoted: msg}
            );

        }

    }

};
