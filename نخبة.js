import fs from "fs";
import path from "path";

const eliteFile = path.join(
    process.cwd(),
    "data/النخبة.json"
);

function getElite(){

    if(!fs.existsSync(eliteFile)){

        fs.writeFileSync(
            eliteFile,
            JSON.stringify([], null, 2)
        );

    }

    return JSON.parse(
        fs.readFileSync(
            eliteFile,
            "utf-8"
        )
    );

}

function saveElite(data){

    fs.writeFileSync(
        eliteFile,
        JSON.stringify(
            data,
            null,
            2
        )
    );

}

export default {

    command: "نخبه",

    category: "النخبه",

    description: "إضافة أو إزالة أعضاء النخبه 👑",

    execute: async(sock,msg,data)=>{

        const jid = data.jid;


        const head =
`*╭━━━〔 👑 𝐄𝐋𝐈𝐓𝐄 〕━━━╮*
*┃ 👑 نظام النخبه*
*╰━━━━━━━━━━━━━━━━━━╯*`;


// صلاحية النخبه فقط

        const eliteUsers = getElite();

        const senderNumber =
        data.sender.split("@")[0];


        if(!eliteUsers.includes(senderNumber)){

            return sock.sendMessage(
                jid,
                {
                    text:
`${head}

*┃ ❌ ليس لديك صلاحية*
*┃ 👑 الأمر خاص بأعضاء النخبه فقط*
*╰━━━━━━━━━━━━━━━━━━╯*`
                }
            );

        }



        const args =
        data.text.trim().split(/\s+/);


        const action =
        args[1];


        // عرض النخبه

        if(action === "عرض"){

            const elite = getElite();


            if(elite.length === 0){

                return sock.sendMessage(
                    jid,
                    {
                        text:
`${head}

*┃ 📭 لا يوجد أعضاء نخبه*
*┃ 👥 العدد : 0*`
                    }
                );

            }


            let list =
            elite.map(
                (n,i)=>
`*┃ ${i+1} 👑 @${n}┃*`
            ).join("\n");


            return sock.sendMessage(
                jid,
                {
                    text:
`${head}

*┃ 📜 قائمة النخبه*
*┣━━━━━━━━━━━━━━━━━━┃*
${list}                          ┃*
*┣━━━━━━━━━━━━━━━━━━┃*
*┃ 👥 العدد : ${elite.length}    ┃*
*╰━━━━━━━━━━━━━━━━━━╯*`,

                    mentions:
                    elite.map(
                        n=>n+"@s.whatsapp.net"
                    )
                }
            );

        }



        if(
            action !== "اضف" &&
            action !== "ازل"
        ){

            return sock.sendMessage(
                jid,
                {
                    text:
`${head}

*┃ ⚜️ الأوامر*
*┃*
*┃ 👑 .نخبه اضف @العضو*
*┃ 👑 .نخبه ازل @العضو*
*┃ 👑 .نخبه عرض*
*┃*
*┃ 📖 الوصف :*
*┃ إضافة عضو إلى النخبه أو إزالته*`
                }
            );

        }
        // تحديد العضو من المنشن أو الرد

        const context =
        msg.message
        ?.extendedTextMessage
        ?.contextInfo;


        let target;


        if(context?.mentionedJid?.length){

            target =
            context.mentionedJid[0];

        }
        else if(context?.participant){

            target =
            context.participant;

        }


        if(!target){

            return sock.sendMessage(
                jid,
                {
                    text:
`${head}

*┃ ❌ يجب منشن العضو*
*┃ أو الرد على رسالته*
*╰━━━━━━━━━━━━━━━━━━╯*`
                }
            );

        }


        const number =
        target.split("@")[0];


        let elite =
        getElite();



        // إضافة عضو

        if(action === "اضف"){


            if(elite.includes(number)){

                return sock.sendMessage(
                    jid,
                    {
                        text:
`${head}

*┃ ⚠️ العضو موجود بالفعل*
*┃ 👤 @${number}*`,
                        mentions:[target]
                    }
                );

            }


            elite.push(number);

            saveElite(elite);


            return sock.sendMessage(
                jid,
                {
                    text:
`${head}

*┃ ✅ تمت الإضافة بنجاح*
*┃*
*┃ 👤 العضو : @${number}*
*┃ 👑 الحالة : عضو نخبه*
*┃ 👥 العدد : ${elite.length}*
*╰━━━━━━━━━━━━━━━━━━╯*`,
                    
                    mentions:[target]
                }
            );

        }




        // إزالة عضو

        if(action === "ازل"){


            if(!elite.includes(number)){

                return sock.sendMessage(
                    jid,
                    {
                        text:
`${head}

*┃ ⚠️ العضو غير موجود*
*┃ 👤 @${number}*`,
                        mentions:[target]
                    }
                );

            }


            elite =
            elite.filter(
                n=>n!==number
            );


            saveElite(elite);


            return sock.sendMessage(
                jid,
                {
                    text:
`${head}

*┃ ❌ تمت الإزالة بنجاح*
*┃*
*┃ 👤 العضو : @${number}*
*┃ 👥 العدد الحالي : ${elite.length}*
*╰━━━━━━━━━━━━━━━━━━╯*`,
                    
                    mentions:[target]
                }
            );

        }


    }

};