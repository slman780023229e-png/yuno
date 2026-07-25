import fs from "fs";


export default {

    command: "خفض",

    category: "المجموعات",

    description: "خفض مشرف إلى عضو",



    execute: async(sock,msg,data)=>{


        const jid =
        data.jid;



        if(!jid.endsWith("@g.us")){

            return sock.sendMessage(
                jid,
                {
                    text:
                    "❌ *الأمر للمجموعات فقط*"
                }
            );

        }



        const meta =
        await sock.groupMetadata(jid);



        const sender =
        data.sender;



        const senderAdmin =
        meta.participants.find(
            p=>p.id===sender
        );



        if(!senderAdmin?.admin){

            return sock.sendMessage(
                jid,
                {
                    text:
                    "❌ *الأمر للمشرفين فقط*"
                }
            );

        }




        let user =
        msg.message
        ?.extendedTextMessage
        ?.contextInfo
        ?.participant;



        const mentioned =
        msg.message
        ?.extendedTextMessage
        ?.contextInfo
        ?.mentionedJid;



        if(!user && mentioned?.length){

            user =
            mentioned[0];

        }




        if(!user){

            return sock.sendMessage(
                jid,
                {
                    text:
`⚠️ *حدد المشرف*

طريقة الاستخدام:

↩️ رد على رسالة المشرف
*.خفض*

أو:
*.خفض @العضو*`
                }
            );

        }




        const target =
        meta.participants.find(
            p=>p.id===user
        );



        if(!target){

            return sock.sendMessage(
                jid,
                {
                    text:
                    "❌ *العضو غير موجود في المجموعة*"
                }
            );

        }




        // التحقق أنه مشرف

        if(!target.admin){

            return sock.sendMessage(
                jid,
                {
                    text:
`⚠️ *لا يمكن خفض العضو*

👤 العضو:
@${user.split("@")[0]}

📌 السبب:
*العضو ليس مشرفًا*`,
                    mentions:[
                        user
                    ]
                }
            );

        }




        // منع صاحب المجموعة

        if(meta.owner === user){

            return sock.sendMessage(
                jid,
                {
                    text:
                    "👑 *لا يمكن خفض مالك المجموعة*"
                }
            );

        }





        // منع البوت

        const bot =
        sock.user.id.split(":")[0]
        +
        "@s.whatsapp.net";



        if(user === bot){

            return sock.sendMessage(
                jid,
                {
                    text:
                    "🤖 *لا يمكن خفض البوت*"
                }
            );

        }




        // منع النخبة

        if(fs.existsSync("./data/النخبة.json")){


            try{


                const elite =
                JSON.parse(
                    fs.readFileSync(
                        "./data/النخبة.json",
                        "utf8"
                    )
                );



                const num =
                user
                .split("@")[0];



                if(
                    elite
                    .map(
                        x=>String(x)
                    )
                    .includes(num)
                ){

                    return sock.sendMessage(
                        jid,
                        {
                            text:
`👑 *عضو من النخبة*

لا يمكن خفض:
@${num}`,
                            mentions:[
                                user
                            ]
                        }
                    );

                }


            }catch{}

        }





        await sock.groupParticipantsUpdate(
            jid,
            [
                user
            ],
            "demote"
        );




        await sock.sendMessage(
            jid,
            {
                text:
`━━━╼╃⌬〔 👑𝐀𝐑𝐓𝐇𝐔𝐑 👑 〕⌬╄━━━

⬇️ *تم خفض المشرف*

👤 العضو:
@${user.split("@")[0]}

📌 الحالة:
*أصبح عضو عادي*

⚜️ 𝐀𝐑𝐓𝐇𝐔𝐑 𝐁𝐎𝐓

━━━╼╃⌬╄━━━`,
                mentions:[
                    user
                ]
            }
        );


    }


};