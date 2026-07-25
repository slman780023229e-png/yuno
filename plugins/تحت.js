import fs from "fs";

export default {

    command: "تحت",

    category: "الإدارة",

    description: "طرد عضو بالرد مع قفل الشات",


    execute: async(sock,msg,data)=>{


        const jid =
        data.jid;


        if(!jid.endsWith("@g.us")){

            return sock.sendMessage(
                jid,
                {
                    text:"❌ *الأمر للمجموعات فقط*"
                }
            );

        }



        const meta =
        await sock.groupMetadata(jid);



        const admin =
        meta.participants.find(
            p=>p.id===data.sender
        );



        if(!admin?.admin){

            return sock.sendMessage(
                jid,
                {
                    text:"❌ *الأمر للمشرفين فقط*"
                }
            );

        }



        const user =
        msg.message
        ?.extendedTextMessage
        ?.contextInfo
        ?.participant;



        if(!user){

            return sock.sendMessage(
                jid,
                {
                    text:
`⚠️ *رد على رسالة العضو*

مثال:
↩️ رد على رسالة الشخص
*.تحت*`
                }
            );

        }



        // قفل الشات

        await sock.groupSettingUpdate(
            jid,
            "announcement"
        );



        await sock.sendMessage(
            jid,
            {
                text:
`🚨 *تنبيه إداري*

🐜 العضو:
@${user.split("@")[0]}

💬 *شوف تحت يا صرصور 🪳*`,
                mentions:[user]
            }
        );



        setTimeout(
            async()=>{


                await sock.groupParticipantsUpdate(
                    jid,
                    [user],
                    "remove"
                );


                await sock.sendMessage(
                    jid,
                    {
                        text:
`╭━━━〔 🛡️ 𝐀𝐑𝐓𝐇𝐔𝐑 〕━━━╮

🚫 *تم طرد العضو بنجاح*

👤 العضو:
@${user.split("@")[0]}

⚡ السبب:
*إجراء إداري*

╰━━━━━━━━━━━━━━╯`,
                        mentions:[user]
                    }
                );


                // فتح الشات بعد الطرد
                await sock.groupSettingUpdate(
                    jid,
                    "not_announcement"
                );


            },
            3000
        );


    }

};