export default {

    command: "رفع",

    category: "المجموعات",

    description: "رفع عضو إلى مشرف",


    execute: async(sock,msg,data)=>{

        const jid = data.jid;

        if(!jid.endsWith("@g.us")){

            return sock.sendMessage(
                jid,
                {
                    text:
`╭━━━━━━━━━━━━━━╮
┃ 👑 𝐘𝐔𝐍𝐎 𝐀𝐃𝐌𝐈𝐍
┣━━━━━━━━━━━━━━┫
┃ ❌ الأمر للمجموعات فقط
╰━━━━━━━━━━━━━━╯`
                }
            );

        }



        // ضع رقمك هنا بدون +
        const OWNER = "967XXXXXXXXX";



        const sender =
        data.sender
        .split("@")[0]
        .replace(/\D/g,"");



        if(sender !== OWNER){

            return sock.sendMessage(
                jid,
                {
                    text:
`╭━━━━━━━━━━━━━━╮
┃ 🚫 𝐀𝐂𝐂𝐄𝐒𝐒
┣━━━━━━━━━━━━━━┫
┃ ❌ هذا الأمر للمالك فقط
╰━━━━━━━━━━━━━━╯`
                }
            );

        }



        const metadata =
        await sock.groupMetadata(jid);



        const bot =
        metadata.participants.find(
            p=>p.id===sock.user.id
        );



        if(!bot?.admin){

            return sock.sendMessage(
                jid,
                {
                    text:
`╭━━━━━━━━━━━━━━╮
┃ ⚠️ 𝐘𝐔𝐍𝐎
┣━━━━━━━━━━━━━━┫
┃ ❌ البوت ليس مشرفًا
╰━━━━━━━━━━━━━━╯`
                }
            );

        }



        const target =
        msg.message
        ?.extendedTextMessage
        ?.contextInfo
        ?.participant;



        if(!target){

            return sock.sendMessage(
                jid,
                {
                    text:
`╭━━━━━━━━━━━━━━╮
┃ 📌 طريقة الاستخدام
┣━━━━━━━━━━━━━━┫
┃ 📝 قم بالرد على رسالة
┃ العضو ثم اكتب:
┃
┃ .رفع
╰━━━━━━━━━━━━━━╯`
                }
            );

        }



        await sock.groupParticipantsUpdate(

            jid,

            [target],

            "promote"

        );



        await sock.sendMessage(
            jid,
            {
                text:
`╭━━━━━━━━━━━━━━╮
┃ 👑 𝐘𝐔𝐍𝐎
┣━━━━━━━━━━━━━━┫
┃ ✅ تم رفع العضو
┃ إلى مشرف بنجاح
┃
┃ 👤 @${target.split("@")[0]}
╰━━━━━━━━━━━━━━╯`,
                mentions:[
                    target
                ]
            }
        );



        console.log(`
╭━━━━━━━━━━━━━━╮
┃ 👑 YUNO ADMIN
┣━━━━━━━━━━━━━━┫
┃ ✅ MEMBER PROMOTED
┃ 👤 ${target.split("@")[0]}
┃ 👮 BY : ${sender}
╰━━━━━━━━━━━━━━╯
`);

    }

};