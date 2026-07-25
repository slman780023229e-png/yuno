export default {

    command: "شات",

    category: "الإدارة",

    description: "قفل وفتح شات المجموعة",


    execute: async(sock,msg,data)=>{


        const jid =
        data.jid;


        if(!jid.endsWith("@g.us")){

            return sock.sendMessage(
                jid,
                {
                    text:
                    "❌ الأمر للمجموعات فقط"
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
                    text:
                    "❌ الأمر للمشرفين فقط"
                }
            );

        }



        const text =
        data.text || "";



        // فتح الشات

        if(text.includes("فتح")){


            await sock.groupSettingUpdate(
                jid,
                "not_announcement"
            );


            return sock.sendMessage(
                jid,
                {
                    text:
`🔓 𝐀𝐑𝐓𝐇𝐔𝐑

✅ تم فتح الشات

👥 الجميع يستطيعون الإرسال`
                }
            );

        }



        // قفل الشات

        if(text.includes("قفل")){


            await sock.groupSettingUpdate(
                jid,
                "announcement"
            );



            const match =
            text.match(/\d+/);



            if(match){


                const minutes =
                Number(match[0]);



                await sock.sendMessage(
                    jid,
                    {
                        text:
`🔒 تم قفل الشات

⏳ المدة:
${minutes} دقيقة

🛡️ 𝐀𝐑𝐓𝐇𝐔𝐑`
                    }
                );



                setTimeout(
                    async()=>{


                        await sock.groupSettingUpdate(
                            jid,
                            "not_announcement"
                        );



                        await sock.sendMessage(
                            jid,
                            {
                                text:
`🔓 انتهى الوقت

✅ تم فتح الشات تلقائياً`
                            }
                        );


                    },
                    minutes * 60 * 1000
                );



            }else{


                await sock.sendMessage(
                    jid,
                    {
                        text:
`🔒 تم قفل الشات

⚠️ لن يفتح إلا بالأمر:
.شات فتح`
                    }
                );


            }


        }


    }


};