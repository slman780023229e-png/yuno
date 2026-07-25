import fs from "fs";
import path from "path";


const baseDir = process.cwd();

const dataDir =
path.join(baseDir,"data");


const stateFile =
path.join(dataDir,"welcomeState.json");


const jsonFile =
path.join(dataDir,"استقبال.json");


const استقبالFolder =
path.join(baseDir,"استقبال_الألقاب");



if(!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir,{recursive:true});
}


if(!fs.existsSync(استقبالFolder)){
    fs.mkdirSync(استقبالFolder,{recursive:true});
}


if(!fs.existsSync(stateFile)){
    fs.writeFileSync(
        stateFile,
        JSON.stringify({},null,2)
    );
}


if(!fs.existsSync(jsonFile)){
    fs.writeFileSync(
        jsonFile,
        JSON.stringify({},null,2)
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
        JSON.stringify(data,null,2)
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
        JSON.stringify(data,null,2)
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
                withFileTypes:true
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





function deleteMessageAfterDelay(
    sock,
    jid,
    key,
    delay=120000
){

    setTimeout(async()=>{

        try{

            await sock.sendMessage(
                jid,
                {
                    delete:key
                }
            );

        }catch{}

    },delay);

}




const pendingUsers = new Map();

const waitingForPartyUsers = new Map();

const notifiedUsers = new Map();





export default {


command:"استقبال",


category:"الحماية",


description:"نظام استقبال الأعضاء وتسجيل الألقاب",






onMessage: async(sock,msg,data)=>{


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



    if(!text)
    return;

// استقبال رد "من طرف مين"
if(waitingForPartyUsers.has(sender)){


    let partyName =
    text.trim();



    partyName =
    partyName
    .replace(/^(من|طرف|مين|يا|؟|\?)+/g,"")
    .trim();



    if(!partyName)
    partyName="غير محدد";



    waitingForPartyUsers.delete(sender);



    pendingUsers.set(
        sender,
        {
            inviter:partyName
        }
    );



    return sock.sendMessage(
        jid,
        {
            text:
`🪶 𝐅𝐋𝐎𝐑𝐈𝐀

نورت ✨

ارسل استمارة التسجيل:

اللقب [ ]
من طرف [ ${partyName} ]

📷 ضع صورة الشخصية مع الاستمارة

🪶 𝐅𝐋𝐎𝐑𝐈𝐀`
        },
        {
            quoted:msg
        }
    );


}




// استخراج اللقب من الأقواس

let characterName="";
let inviterName="";



const brackets =
[...text.matchAll(
/[\(\[【「『《（](.*?)[\)\]】」』》（]/g
)];



if(brackets.length){

    characterName =
    brackets[0][1].trim();


    if(brackets[1]){

        inviterName =
        brackets[1][1].trim();

    }

}




// قراءة من طرف

if(text.includes("من طرف")){


    const part =
    text.split("من طرف")[1];


    if(part){

        inviterName =
        part
        .replace(/[\[\]()【】]/g,"")
        .trim();

    }

}




const pending =
pendingUsers.get(sender);



if(!inviterName && pending){

    inviterName =
    pending.inviter;

}




if(
!characterName ||
characterName==="اللقب" ||
characterName==="[ ]"
)
return;



if(!inviterName)
inviterName="غير محدد";





// التأكد من وجود صورة

const imageMessage =
msg.message?.imageMessage;



const quoted =
msg.message?.extendedTextMessage
?.contextInfo
?.quotedMessage;



let targetMsg=null;



if(imageMessage){


    targetMsg=msg;


}
else if(
quoted?.imageMessage
){


    targetMsg={
        message:quoted
    };


}



if(!targetMsg){


return sock.sendMessage(
jid,
{
text:
"⚠️ أرسل صورة الشخصية مع الاستمارة 📷"
},
{
quoted:msg
}
);


}





// تحميل الصورة

let buffer;


try{


const {
downloadContentFromMessage
}
=
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
{
text:"❌ فشل تحميل الصورة"
},
{
quoted:msg
}
);


}







const safeName =
characterName
.replace(/[\/\\?%*:|"<>]/g,"_");



const userFolder =
path.join(
استقبالFolder,
safeName
);



if(!fs.existsSync(userFolder)){

fs.mkdirSync(
userFolder,
{
recursive:true
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
groupData[jid]={};

groupData[jid][sender]={
user:sender,
character:characterName,
inviter:inviterName,
image:imagePath,
time:new Date().toISOString()
};


saveData(groupData);




pendingUsers.delete(sender);



notifiedUsers.delete(sender);





await sock.sendMessage(
jid,
{
text:
`🪶 𝐅𝐋𝐎𝐑𝐈𝐀

✅ تم تسجيل لقبك بنجاح

🎭 الشخصية:
**${characterName}**

👤 من طرف:
**${inviterName}**

🪶 𝐅𝐋𝐎𝐑𝐈𝐀`,
mentions:[sender]
},
{
quoted:msg
}
);

  





    // هنا نكمل استقبال الاستمارة في الجزء الثاني

},








execute: async(sock,msg,data)=>{


const jid =
data.jid;



if(
    !jid.endsWith("@g.us")
){

return sock.sendMessage(
jid,
{
text:"❌ الأمر للمجموعات فقط"
},
{quoted:msg}
);

}




const text =
data.text ||
msg.message?.conversation ||
msg.message?.extendedTextMessage?.text ||
"";



const clean =
text.trim().replace(/^\./,"").trim();



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

${db[jid]?.active ? "✅ مفعل" : "⛔ متوقف"}

الاستخدام:

.استقبال تفعيل
.استقبال تعطيل`
},
{quoted:msg}
);

}







if(action==="تفعيل"){



db[jid]={
active:true
};



saveState(db);



return sock.sendMessage(
jid,
{
text:
`━━━╼╃⌬〔 🪶 𝐅𝐋𝐎𝐑𝐈𝐀 🪶 〕⌬╄━━━

✅ تم تفعيل نظام الاستقبال

🪶 𝐅𝐋𝐎𝐑𝐈𝐀 𝐁𝐎𝐓`
},
{quoted:msg}
);


}







if(action==="تعطيل"){



delete db[jid];


saveState(db);



return sock.sendMessage(
jid,
{
text:
`⛔ تم تعطيل نظام الاستقبال

🪶 𝐅𝐋𝐎𝐑𝐈𝐀`
},
{quoted:msg}
);


}



}

 }, 
onGroupParticipantsUpdate: async(sock, update)=>{


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

⚠️ تم استقبال العضو مسبقاً
👤 @${user.split("@")[0]}

🎭 اللقب:
**${registered}**

🪶 𝐅𝐋𝐎𝐑𝐈𝐀`,
                        mentions:[user]
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
`🪶 منور @${user.split("@")[0]}

من طرف مين؟`,
                    mentions:[user]
                }
            );






            // طرد بعد 24 ساعة إذا لم يسجل

            setTimeout(async()=>{


                try{


                    const check =
                    isUserRegisteredInFolder(user);



                    if(!check){


                        const meta =
                        await sock.groupMetadata(jid);



                        const still =
                        meta.participants.some(
                            p=>p.id===user
                        );



                        if(still){


                            await sock.groupParticipantsUpdate(
                                jid,
                                [user],
                                "remove"
                            );



                            await sock.sendMessage(
                                jid,
                                {
                                    text:
`⚠️ تم طرد @${user.split("@")[0]}

السبب:
لم يتم تسجيل اللقب خلال 24 ساعة.`,
                                    mentions:[user]
                                }
                            );


                        }

                    }


                }catch(e){}



            },24*60*60*1000);



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

👋 غادر العضو:
@${user.split("@")[0]}

🎭 الشخصية:
**${oldChar}**

🪶 𝐅𝐋𝐎𝐑𝐈𝐀`,
                    mentions:[user]
                }
            );


        }


    }


}

};

