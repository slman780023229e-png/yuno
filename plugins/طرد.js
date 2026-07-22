export default {

    command: "طرد",
    category: "المجموعات",

    description: "طرد العضو المخالف",

    execute: async (sock, msg, data) => {


        const jid = data.jid;


        // للمجموعات فقط
        if(!jid.endsWith("@g.us")){

            return sock.sendMessage(
                jid,
                {
                    text:
`╭━━━━━━━━━━━━━━╮
┃ 🚫 أمر الطرد
┣━━━━━━━━━━━━━━┫
┃ ❌ هذا الأمر للمجموعات فقط
╰━━━━━━━━━━━━━━╯`
                }
            );

        }



        // جلب معلومات المجموعة
        const metadata =
        await sock.groupMetadata(jid);



        const admins =
        metadata.participants
        .filter(
            p=>p.admin
        )
        .map(
            p=>p.id
        );



        // فحص أدمن المستخدم
        if(!admins.includes(data.sender)){


            return sock.sendMessage(
                jid,
                {
                    text:
`╭━━━━━━━━━━━━━━╮
┃ 👑 نظام النخبة
┣━━━━━━━━━━━━━━┫
┃ ❌ هذا الأمر للأدمن فقط
╰━━━━━━━━━━━━━━╯`
                }
            );

        }




        // العضو بالمنشن
        const mentioned =
        msg.message
        ?.extendedTextMessage
        ?.contextInfo
        ?.mentionedJid;



        if(
            !mentioned ||
            mentioned.length === 0
        ){

            return sock.sendMessage(
                jid,
                {
                    text:
`╭━━━━━━━━━━━━━━╮
┃ 🚫 أمر الطرد
┣━━━━━━━━━━━━━━┫
┃ ⚡ الاستخدام:
┃ .طرد @العضو
╰━━━━━━━━━━━━━━╯`
                }
            );

        }



        try{


            await sock.groupParticipantsUpdate(
                jid,
                mentioned,
                "remove"
            );



            await sock.sendMessage(
                jid,
                {
                    text:
`╭━━━━━━━━━━━━━━╮
┃ 🚫 تم الطرد
┣━━━━━━━━━━━━━━┫
┃ 👤 العضو:
┃ @${mentioned[0].split("@")[0]}
┃
┃ ⚡ بواسطة:
┃ @${data.number}
╰━━━━━━━━━━━━━━╯`,
                    mentions:[
                        ...mentioned,
                        data.sender
                    ]
                }
            );


        }catch(err){


            await sock.sendMessage(
                jid,
                {
                    text:
`╭━━━━━━━━━━━━━━╮
┃ ❌ فشل الطرد
┣━━━━━━━━━━━━━━┫
┃ ${err.message}
╰━━━━━━━━━━━━━━╯`
                }
            );


        }


    }

};
