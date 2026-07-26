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

    // طلب العضو للرابط بنفسه إذا كان مسجلاً
    if(text.trim() === "الرابط"){
        const registered = isUserRegisteredInFolder(sender);
        if(registered){
            const linkMsg = await sock.sendMessage(
                jid,
                {
                    text:
`🪶 𝐅𝐋𝐎𝐑𝐈𝐀

رابط دخولك يا غالي:
🔗 Https://chat.whatsapp.com/FL8ikcoc4v7CV9mkcjPeAw

اضغط الرابط وادخل القروب الأساسي 🤍

🪶 𝐅𝐋𝐎𝐑𝐈𝐀`,
                    mentions: [sender]
                },
                { quoted: msg }
            );

            const warnMsg = await sock.sendMessage(
                jid,
                {
                    text: `*(ملاحظة: سيتم حذف هذا الرابط خلال دقيقة لحماية المجموعة. إذا أردت الرابط مرة أخرى اكتب: الرابط)*`,
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

    // استقبال رد "من طرف مين"
    if(waitingForPartyUsers.has(sender)){

        let rawText = text.trim();
        let partyName = "غير محدد";

        if(rawText.includes("من طرف")){
            const parts = rawText.split("من طرف");
            if(parts[1]){
                partyName = parts[1].replace(/[\[\]()【】؟?]/g, "").trim();
            }
        } else {
            partyName = rawText.replace(/^(من|طرف|مين|يا|؟|\?)+/g, "").trim();
        }

        if(!partyName) partyName = "غير محدد";

        waitingForPartyUsers.delete(sender);

        pendingUsers.set(
            sender,
            {
                inviter: partyName
            }
        );

        return sock.sendMessage(
            jid,
            {
                text:
`🪶 𝐅𝐋𝐎𝐑𝐈𝐀

منور يا بعد قلبي ✨

الحين سو هذي الخطوتين البسيطة:
1️⃣ اكتب لقبك داخل أقواس كذا: [لقبك هنا]
2️⃣ حط معاها صورة شخصيتك وأرسلها رسالة وحدة (أو رد على رسالة اللقب بصورة، أو رد على الصورة باللقب)

*ملاحظه شخصيتك يعني:*
*الشخصيه الي اخترتها مثلا: اخترت ناروتو ارسل صورته هيك*

من طرف: ${partyName}

🪶 𝐅𝐋𝐎𝐑𝐈𝐀`
            },
            {
                quoted: msg
            }
        );
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

    // استخراج اسم الطرف بدون الحاجة لأقواس (بعد كلمة من طرف)
    if(text.includes("من طرف")){
        const part =
        text.split("من طرف")[1];

        if(part){
            inviterName =
            part
            .replace(/[\[\]()【】]/g, "")
            .trim()
            .split("\n")[0];
        }
    }

    const pending =
    pendingUsers.get(sender);

    if(!inviterName && pending){
        inviterName =
        pending.inviter;
    }

    const imageMessage = msg.message?.imageMessage;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    // فحص تكرار اللقب والشخصية
    if(characterName && characterName !== "اللقب" && characterName !== "[ ]"){
        if(isCharacterTaken(characterName)){
            return sock.sendMessage(
                jid,
                {
                    text: `⚠️ عذراً، هذا اللقب أو الشخصية (**${characterName}**) مأخوذ ومسجل مسبقاً من قبل عضو آخر! اختر لقباً غيره ❌`
                },
                { quoted: msg }
            );
        }
    }

    // حالة: أرسل الصورة وحدها بدون لقب
    if(imageMessage && !characterName){
        return sock.sendMessage(
            jid,
            {
                text: "⚠️ يا قلبي أنت أرسلت الصورة لحالها! لازم تكتب لقبك بين أقواس [ ] مع الصورة بنفس الرسالة، أو رد على رسالتك اللي فيها اللقب بصورة شخصيتك، أو رد على الصورة باللقب 📷"
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

    if(!inviterName)
    inviterName = "غير محدد";

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

    // حالة: أرسل اللقب بدون صورة
    if(!validImageSource || !targetMsg){
        return sock.sendMessage(
            jid,
            {
                text: "⚠️ نسيت تحط الصورة! رد على رسالة لقبك بصورة شخصيتك، أو رد على الصورة باللقب، أو أرسل اللقب مع الصورة مع بعض برسالة وحدة 📷"
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
            { text: "❌ ما قدرت أحمل الصورة، حاول ترسلها مرة ثانية" },
            { quoted: msg }
        );
    }

    // التحقق مرة أخرى من التكرار قبل الحفظ النهائي لضمان الأمان التام
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

✅ تم تسجيل لقبك بنجاح يا وحش

🎭 لقبك:
**${characterName}**

👤 من طرف:
**${inviterName}**

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
            text: `*(ملاحظة: سيتم حذف هذا الرابط خلال دقيقة لحماية المجموعة. إذا أردت الرابط مرة أخرى اكتب: الرابط)*`,
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
            { text: "❌ هذا الأمر يشتغل داخل المجموعات بس" },
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

✅ ابشر، تم تفعيل نظام الاستقبال بنجاح

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

🎭 لقبك المسجل:
**${registered}**

لو ضاع عليك الرابط، اكتب كلمة: الرابط

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

            await sock.sendMessage(
                jid,
                {
                    text:
`🪶 منورنا يا هلا بك @${user.split("@")[0]} 🤍

عشان ندخلك القروب، رد على هذي الرسالة واكتب مين جابك أو من طرف مين دخلت؟
(مثال اكتب كذا: طرف فلان)`,
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

🎭 شخصيته كانت:
**${oldChar}**

🪶 𝐅𝐋𝐎𝐑𝐈𝐀`,
                    mentions: [user]
                }
            );

        }
    }

}

};