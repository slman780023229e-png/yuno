import fs from "fs";
import path from "path";

const baseDir = process.cwd();

const dataDir =
path.join(baseDir, "data");

const stateFile =
path.join(dataDir, "welcomeState.json");

const jsonFile =
path.join(dataDir, "استقبال.json");

const استقبالFolder =
path.join(baseDir, "استقبال_الألقاب");

if(!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir, { recursive: true });
}

if(!fs.existsSync(استقبالFolder)){
    fs.mkdirSync(استقبالFolder, { recursive: true });
}

if(!fs.existsSync(stateFile)){
    fs.writeFileSync(
        stateFile,
        JSON.stringify({}, null, 2)
    );
}

if(!fs.existsSync(jsonFile)){
    fs.writeFileSync(
        jsonFile,
        JSON.stringify({}, null, 2)
    );
}

function loadState(){
    try{
        return JSON.parse(
            fs.readFileSync(
                stateFile,
                "utf8"
            )
        );
    }catch{
        return {};
    }
}

function saveState(data){
    fs.writeFileSync(
        stateFile,
        JSON.stringify(data, null, 2)
    );
}

function loadData(){
    try{
        return JSON.parse(
            fs.readFileSync(
                jsonFile,
                "utf8"
            )
        );
    }catch{
        return {};
    }
}

function saveData(data){
    fs.writeFileSync(
        jsonFile,
        JSON.stringify(data, null, 2)
    );
}

// دالة ذكية لتنظيف وتوحيد الحروف (تتجاهل الهمزات والتشكيل والأخطاء الإملائية الشائعة)
function smartNormalize(str) {
    return str
        .toLowerCase()
        .replace(/[إأآٱ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/[^أ-يa-z0-9]/g, "");
}

function detectParty(text) {
    const cleanText = smartNormalize(text);
    
    // مصفوفة الكلمات المفتاحية الداخلية المخفية تماماً عن النصوص الظاهرة
    const targets = [
        { name: "أيزن", keys: ["ايزن", "ازن", "ايسن"] },
        { name: "ارثر", keys: ["ارثر", "ارتور", "ارتر", "اثر"] },
        { name: "الوكا", keys: ["الوكا", "لوكا", "الوكه"] },
        { name: "هينا", keys: ["هينا", "هينه"] },
        { name: "روبين", keys: ["روبين", "روبن"] },
        { name: "نامي", keys: ["نامي", "نامه"] },
        { name: "اسكانور", keys: ["اسكانور", "سكانور", "اسكنور"] }
    ];

    for (const item of targets) {
        for (const key of item.keys) {
            if (cleanText.includes(smartNormalize(key))) {
                return item.name;
            }
        }
    }
    
    // إذا كتب العضو أي اسم غير موجود أو نص آخر، يأخذ الكلمة الأولى أو يعتبرها كما كتبها بتنسيق نظيف
    const words = text.trim().split(/\s+/);
    if (words.length > 0 && words[0].length > 1) {
        return words[0].replace(/[\[\]()]/g, "");
    }
    
    return "غير معروف";
}

function isUserRegisteredInFolder(sender){
    try{
        const userNumber =
        sender.split("@")[0];

        const folders =
        fs.readdirSync(
            استقبالFolder,
            {
                withFileTypes: true
            }
        );

        for(const folder of folders){
            if(!folder.isDirectory())
            continue;

            const info =
            path.join(
                استقبالFolder,
                folder.name,
                "معلومات_اللقب.txt"
            );

            if(fs.existsSync(info)){
                const text =
                fs.readFileSync(
                    info,
                    "utf8"
                );

                if(
                    text.includes(sender) ||
                    text.includes(userNumber)
                ){
                    return folder.name;
                }
            }
        }
    }catch(e){}

    return null;
}

function isCharacterTaken(characterName){
    try{
        const safeName = characterName.replace(/[\/\\?%*:|"<>]/g, "_");
        const userFolder = path.join(استقبالFolder, safeName);
        return fs.existsSync(userFolder);
    }catch(e){
        return false;
    }
}

function deleteMessageAfterDelay(
    sock,
    jid,
    key,
    delay = 60000
){
    setTimeout(async() => {
        try{
            await sock.sendMessage(
                jid,
                {
                    delete: key
                }
            );
        }catch{}
    }, delay);
}

const pendingUsers = new Map();
const waitingForPartyUsers = new Map();
const notifiedUsers = new Map();

export default {

command: "استقبال",
category: "الحماية",
description: "نظام استقبال الأعضاء وتسجيل الألقاب الذكي",

onMessage: async(sock, msg, data) => {

    const jid =
    msg.key.remoteJid;

    if(
        !jid ||
        !jid.endsWith("@g.us")
    )
    return;

    const db =
    loadState();

    if(!db[jid]?.active)
    return;

    const sender =
    msg.key.participant;

    if(!sender)
    return;

    const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    "";

    if(!text && !msg.message?.imageMessage)
    return;

    // طلب الرابط يدوياً للمسجلين
    if(text.trim() === "الرابط"){
        const registered = isUserRegisteredInFolder(sender);
        if(registered){
            const linkMsg = await sock.sendMessage(
                jid,
                {
                    text:
`🪶 𝐅𝐋𝐎𝐑𝐈𝐀

🔗 رابط دخولك للقروب الأساسي:
Https://chat.whatsapp.com/FL8ikcoc4v7CV9mkcjPeAw

اضغط الرابط وادخل بسرعة 🤍

🪶 𝐅𝐋𝐎𝐑𝐈𝐀`,
                    mentions: [sender]
                },
                { quoted: msg }
            );

            const warnMsg = await sock.sendMessage(
                jid,
                {
                    text: `*(ملاحظة: سيتم حذف هذا الرابط خلال دقيقة لحماية المجموعة)*`,
                    mentions: [sender]
                },
                { quoted: linkMsg }
            );

            if(linkMsg && linkMsg.key){
                deleteMessageAfterDelay(sock, jid, linkMsg.key, 60000);
            }
        }
        return;
    }

    // الخطوة 2: استقبال اسم الشخص الذي جلب العضو (بذكاء تام وبدون قيود) وإرسال الاستمارة الفارغة
    if(waitingForPartyUsers.has(sender)){
        let rawText = text.trim();
        let partyName = detectParty(rawText);

        waitingForPartyUsers.delete(sender);

        pendingUsers.set(
            sender,
            {
                inviter: partyName
            }
        );

        // إرسال الاستمارة الفارغة بشكل مرتب وواضح جداً
        await sock.sendMessage(
            jid,
            {
                text:
`╭━━━〔 📝 اسـتـمـارة الـتـسـجـيـل 〕━━━╮

الـقـب [ ]
من طرف [ ${partyName} ]

╰━━━━━━━━━━━━━━━━━━╯

📸 **التعليمات:**
أرسل لقبك داخل الأقواس وصورة شخصيتك مع بعض في **رسالة واحدة**!`,
                mentions: [sender]
            },
            { quoted: msg }
        );

        return;
    }

    // استخراج اللقب بدقة من داخل أي أقواس
    let characterName = "";
    let inviterName = "";

    const brackets =
    [...text.matchAll(
    /[\(\[【「『《（](.*?)[\)\]】」』》（]/g
    )];

    if(brackets.length){
        characterName =
        brackets[0][1].trim();
    }

    let detectedFromText = detectParty(text);
    if(detectedFromText && detectedFromText !== "غير معروف"){
        inviterName = detectedFromText;
    }

    const pending =
    pendingUsers.get(sender);

    if(!inviterName && pending){
        inviterName =
        pending.inviter;
    }

    if(!inviterName){
        inviterName = "غير معروف";
    }

    const imageMessage = msg.message?.imageMessage;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    // فحص تكرار اللقب
    if(characterName && characterName !== "اللقب" && characterName !== "[ ]"){
        if(isCharacterTaken(characterName)){
            return sock.sendMessage(
                jid,
                {
                    text: `⚠️ عذراً، هذا اللقب (**${characterName}**) مأخوذ ومسجل مسبقاً من قبل عضو آخر! اختر لقباً غيره ❌`
                },
                { quoted: msg }
            );
        }
    }

    if(imageMessage && !characterName){
        return sock.sendMessage(
            jid,
            {
                text: "⚠️ **خطأ بسيط:** أنت أرسلت الصورة وحدها! لازم تكتب لقبك بين أقواس `[ ]` وترسلها مع الصورة برسالة واحدة 📷"
            },
            { quoted: msg }
        );
    }

    if(
    !characterName ||
    characterName === "اللقب" ||
    characterName === "[ ]"
    )
    return;

    let targetMsg = null;
    let validImageSource = false;

    if(imageMessage){
        targetMsg = msg;
        validImageSource = true;
    }
    else if(quoted?.imageMessage){
        targetMsg = {
            message: quoted
        };
        validImageSource = true;
    }

    if(!validImageSource && quoted){
        if(quoted.imageMessage){
            targetMsg = { message: quoted };
            validImageSource = true;
        }
    }

    if(!validImageSource || !targetMsg){
        return sock.sendMessage(
            jid,
            {
                text: "⚠️ **خطأ بسيط:** نسيت إرفاق الصورة! أرسل اللقب والصورة مع بعض برسالة واحدة 📷"
            },
            {
                quoted: msg
            }
        );
    }

    // تحميل الصورة
    let buffer;

    try{
        const {
            downloadContentFromMessage
        } =
        await import("@whiskeysockets/baileys");

        let type =
        Object.keys(targetMsg.message)[0];

        let content =
        targetMsg.message[type];

        const stream =
        await downloadContentFromMessage(
            content,
            "image"
        );

        buffer =
        Buffer.from([]);

        for await(const chunk of stream){
            buffer =
            Buffer.concat(
                [
                    buffer,
                    chunk
                ]
            );
        }

    }catch(e){
        return sock.sendMessage(
            jid,
            { text: "❌ حدث خطأ في تحميل الصورة، حاول إرسالها مرة أخرى" },
            { quoted: msg }
        );
    }

    if(isCharacterTaken(characterName)){
        return sock.sendMessage(
            jid,
            {
                text: `⚠️ عذراً، هذا اللقب (**${characterName}**) تم تسجيله قبل قليل بواسطة عضو آخر! اختر لقباً غيره ❌`
            },
            { quoted: msg }
        );
    }

    const safeName =
    characterName
    .replace(/[\/\\?%*:|"<>]/g, "_");

    const userFolder =
    path.join(
        استقبالFolder,
        safeName
    );

    if(!fs.existsSync(userFolder)){
        fs.mkdirSync(
            userFolder,
            {
                recursive: true
            }
        );
    }

    const imagePath =
    path.join(
        userFolder,
        `${safeName}.jpg`
    );

    fs.writeFileSync(
        imagePath,
        buffer
    );

    const infoPath =
    path.join(
        userFolder,
        "معلومات_اللقب.txt"
    );

    fs.writeFileSync(
        infoPath,
        `
مسار الصورة: ${imagePath}
اللقب: ${characterName}
من طرف: ${inviterName}
رقم المستخدم: ${sender}
التاريخ: ${new Date().toISOString()}
`
    );

    const groupData =
    loadData();

    if(!groupData[jid])
    groupData[jid] = {};

    groupData[jid][sender] = {
        user: sender,
        character: characterName,
        inviter: inviterName,
        image: imagePath,
        time: new Date().toISOString()
    };

    saveData(groupData);

    pendingUsers.delete(sender);
    notifiedUsers.delete(sender);

    const sentMsg = await sock.sendMessage(
        jid,
        {
            text:
`🪶 𝐅𝐋𝐎𝐑𝐈𝐀

✅ تم تسجيل لقبك بنجاح يا وحش!

🎭 لقبك: **${characterName}**
👤 من طرف: **${inviterName}**

🔗 رابط الدخول للقروب الأساسي:
Https://chat.whatsapp.com/FL8ikcoc4v7CV9mkcjPeAw

اضغط الرابط وادخل بسرعة!

🪶 𝐅𝐋𝐎𝐑𝐈𝐀`,
            mentions: [sender]
        },
        {
            quoted: msg
        }
    );

    const warnMsgReg = await sock.sendMessage(
        jid,
        {
            text: `*(ملاحظة: سيتم حذف هذا الرابط خلال دقيقة لحماية المجموعة)*`,
            mentions: [sender]
        },
        {
            quoted: sentMsg
        }
    );

    if(sentMsg && sentMsg.key){
        deleteMessageAfterDelay(sock, jid, sentMsg.key, 60000);
    }

},

execute: async(sock, msg, data) => {

    const jid =
    data.jid;

    if(
        !jid.endsWith("@g.us")
    ){
        return sock.sendMessage(
            jid,
            { text: "❌ هذا الأمر يشتغل داخل المجموعات فقط" },
            { quoted: msg }
        );
    }

    const text =
    data.text ||
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    "";

    const clean =
    text.trim().replace(/^\./, "").trim();

    const args =
    clean.split(/\s+/);

    const action =
    args[1] || args[0];

    const db =
    loadState();

    if(
        action !== "تفعيل" &&
        action !== "تعطيل"
    ){
        return sock.sendMessage(
            jid,
            {
                text:
`🪶 حالة نظام الاستقبال

${db[jid]?.active ? "✅ النظام شغال ومفعل" : "⛔ النظام مطفي حالياً"}

طريقة الاستخدام:
.استقبال تفعيل
.استقبال تعطيل`
            },
            { quoted: msg }
        );
    }

    if(action === "تفعيل"){
        db[jid] = {
            active: true
        };

        saveState(db);

        return sock.sendMessage(
            jid,
            {
                text:
`━━━╼╃⌬〔 🪶 𝐅𝐋𝐎𝐑𝐈𝐀 🪶 〕⌬╄━━━

✅ تم تفعيل نظام الاستقبال بنجاح

🪶 𝐅𝐋𝐎𝐑𝐈𝐀 𝐁𝐎𝐓`
            },
            { quoted: msg }
        );
    }

    if(action === "تعطيل"){
        delete db[jid];
        saveState(db);

        return sock.sendMessage(
            jid,
            {
                text:
`⛔ تم تعطيل نظام الاستقبال بنجاح

🪶 𝐅𝐋𝐎𝐑𝐈𝐀`
            },
            { quoted: msg }
        );
    }

},

onGroupParticipantsUpdate: async(sock, update) => {

    const jid = update.id;
    const db = loadState();

    if(!db[jid]?.active)
    return;

    if(update.action === "add"){
        for(const user of update.participants){

            notifiedUsers.delete(user);

            const registered =
            isUserRegisteredInFolder(user);

            if(registered){
                notifiedUsers.set(
                    user,
                    true
                );

                await sock.sendMessage(
                    jid,
                    {
                        text:
`🪶 𝐅𝐋𝐎𝐑𝐈𝐀

⚠️ يا هلا، أنت مسجل عندنا من قبل!
👤 @${user.split("@")[0]}

🎭 لقبك المسجل: **${registered}**
لو ضاع عليك الرابط، اكتب كلمة: **الرابط**

🪶 𝐅𝐋𝐎𝐑𝐈𝐀`,
                        mentions: [user]
                    }
                );

                continue;
            }

            waitingForPartyUsers.set(
                user,
                true
            );

            // الخطوة 1: طلب اسم الشخص الذي جلب العضو بشكل سريع وفوري وبدون رسائل سلام طويلة
            await sock.sendMessage(
                jid,
                {
                    text:
`منورنا يا هلا بك @${user.split("@")[0]} 🤍
من طرف مين دخلت؟`,
                    mentions: [user]
                }
            );

        }
    }

    if(update.action === "remove"){
        for(const user of update.participants){

            waitingForPartyUsers.delete(user);
            pendingUsers.delete(user);
            notifiedUsers.delete(user);

            const oldChar =
            isUserRegisteredInFolder(user) ||
            "بدون لقب";

            await sock.sendMessage(
                jid,
                {
                    text:
`🪶 𝐅𝐋𝐎𝐑𝐈𝐀

👋 مع السلامة، الله يحفظه العضو:
@${user.split("@")[0]}

🎭 شخصيته كانت: **${oldChar}**

🪶 𝐅𝐋𝐎𝐑𝐈𝐀`,
                    mentions: [user]
                }
            );

        }
    }

}

};
