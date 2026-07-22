import fs from "fs";


const file =
"./data/contactGuard.json";



if(!fs.existsSync("./data")){

    fs.mkdirSync("./data");

}



if(!fs.existsSync(file)){

    fs.writeFileSync(
        file,
        "{}"
    );

}



function loadData(){

    try{

        return JSON.parse(
            fs.readFileSync(file,"utf-8")
        );

    }catch{

        return {};

    }

}



function saveData(data){

    fs.writeFileSync(
        file,
        JSON.stringify(data,null,2)
    );

}





export default {


    command:"حمايه",


    category:"الحماية",


    description:"حماية جهات الاتصال",




    execute: async(sock,msg,data)=>{


        const jid =
        data.jid;



        if(!jid.endsWith("@g.us")){

            return sock.sendMessage(
                jid,
                {
                    text:
`❌ الأمر للمجموعات فقط`
                }
            );

        }




        const metadata =
        await sock.groupMetadata(jid);



        const admin =
        metadata.participants.find(
            p =>
            p.id === data.sender
        );



        if(!admin?.admin){

            return sock.sendMessage(
                jid,
                {
                    text:
`❌ الأمر للمشرفين فقط`
                }
            );

        }




        const db =
        loadData();



        db[jid] =
        !db[jid];



        saveData(db);



        await sock.sendMessage(
            jid,
            {
                text:

db[jid]
?
`━━━ ╼╃ ⌬〔 ✦ 🛡️ 𝐘𝐔𝐍𝐎 𝐒𝐄𝐂𝐔𝐑𝐈𝐓𝐘 ✦ 〕⌬ ╄╾ ━━━

*┤ ✅ تم تشغيل الحماية*

*┤ 📱 حذف جهات الاتصال*
*┤ 🚫 طرد المرسل*
*┤ ⚡ نظام سريع*

*┇ 𓆩 ⚜ 𝐘𝐔𝐍𝐎 𝐁𝐎𝐓 ⚜ 𓆪 👑*`
:
`🔓 تم إيقاف حماية جهات الاتصال`

            }
        );


    },





    onMessage: async(sock,msg)=>{


        const jid =
        msg.key.remoteJid;



        if(
            !jid ||
            !jid.endsWith("@g.us")
        )
        return;



        const db =
        loadData();



        if(!db[jid])
        return;



        const message =
        msg.message;



        let contacts = [];



        if(message?.contactMessage){

            contacts.push(
                message.contactMessage
            );

        }



        if(message?.contactsArrayMessage){

            contacts =
            message.contactsArrayMessage.contacts;

        }



        if(!contacts.length)
        return;



        const user =
        msg.key.participant;



        if(!user)
        return;




        try{


            // حذف الرسالة فوراً

            await sock.sendMessage(
                jid,
                {
                    delete:{
                        remoteJid:jid,
                        id:msg.key.id,
                        participant:user
                    }
                }
            );



            // الطرد

            await sock.groupParticipantsUpdate(
                jid,
                [
                    user
                ],
                "remove"
            );



            console.log(
`╭━━━━━━━━━━━━━━━━━━━━━━╮
┃ 🛡️ 𝐘𝐔𝐍𝐎 𝐒𝐄𝐂𝐔𝐑𝐈𝐓𝐘
┣━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🚫 تم منع جهة اتصال
┃ 👤 ${user}
┃ 📦 العدد : ${contacts.length}
┃ ⚡ تم التنفيذ
╰━━━━━━━━━━━━━━━━━━━━━━╯`
            );



        }catch(e){


            console.log(
                "حماية:",
                e.message
            );


        }



    }


};
