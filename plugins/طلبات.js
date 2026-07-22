import fs from "fs-extra";
import path from "path";

const requestsFile = path.join(
    process.cwd(),
    "data/الطلبات.json"
);

const eliteFile = path.join(
    process.cwd(),
    "data/النخبة.json"
);

function getRequests(){
    if(!fs.existsSync(requestsFile)){
        fs.writeFileSync(
            requestsFile,
            JSON.stringify([], null, 2)
        );
    }
    return JSON.parse(
        fs.readFileSync(
            requestsFile,
            "utf-8"
        )
    );
}

function saveRequests(data){
    fs.writeFileSync(
        requestsFile,
        JSON.stringify(
            data,
            null,
            2
        )
    );
}

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

export default {

    command: "طلبات",

    category: "النخبه",

    description: "إدارة طلبات الانضمام أو اللقب لأعضاء النخبة 📋",

    execute: async(sock, msg, data)=>{

        const jid = data.jid;

        const head =
`*╭━━━〔 📋 إِدَارَةُ اَلطَّلَبَات 〕━━━╮*
*┃ 📋 نظام الطلبات والقبول*
*╰━━━━━━━━━━━━━━━━━━━━━━╯*`;

        // التحقق من صلاحية أعضاء النخبة
        const eliteUsers = getElite();
        const senderNumber = data.sender.split("@")[0];

        if(!eliteUsers.includes(senderNumber)){
            return sock.sendMessage(
                jid,
                {
                    text:
`${head}

*┃ ❌ ليس لديك صلاحية*
*┃ 👑 الأمر خاص بأعضاء النخبه فقط*
*╰━━━━━━━━━━━━━━━━━━━━━━╯*`
                }
            );
        }

        const args =
        data.text.trim().split(/\s+/);

        const action = args[1]; // عرض، قبول، رفض
        const subAction = args[2]; // الرقم أو "الكل"

        // عرض الطلبات
        if(action === "عرض"){

            const requests = getRequests();

            if(requests.length === 0){
                return sock.sendMessage(
                    jid,
                    {
                        text:
`${head}

*┃ 📭 لا توجد طلبات معلقة*
*┃ 👥 العدد : 0*
*╰━━━━━━━━━━━━━━━━━━━━━━╯*`
                    }
                );
            }

            let list =
            requests.map(
                (req, i)=>
`*┃ ${i+1} 👤 @${req.number}*
*┃ 📌 الطلب : ${req.content || "بدون تفاصيل"}*
*┣━━━━━━━━━━━━━━━━━━━━━━┫*`
            ).join("\n");

            return sock.sendMessage(
                jid,
                {
                    text:
`${head}

*┃ 📜 قائمة الطلبات المعلقة*
*┣━━━━━━━━━━━━━━━━━━━━━━┫*
${list}
*┃ 👥 إجمالي الطلبات : ${requests.length}*
*╰━━━━━━━━━━━━━━━━━━━━━━╯*`,

                    mentions:
                    requests.map(
                        req => req.number + "@s.whatsapp.net"
                    )
                }
            );

        }

        // قبول أو رفض طلب
        if(action === "قبول" || action === "رفض"){

            let requests = getRequests();

            if(requests.length === 0){
                return sock.sendMessage(
                    jid,
                    {
                        text:
`${head}

*┃ ⚠️ لا توجد طلبات لإدارتها*
*╰━━━━━━━━━━━━━━━━━━━━━━╯*`
                    }
                );
            }

            // إذا كتب "الكل"
            if(subAction === "الكل"){
                
                if(action === "قبول"){
                    saveRequests([]);
                    return sock.sendMessage(
                        jid,
                        {
                            text:
`${head}

*┃ ✅ تم قبول جميع الطلبات بنجاح*
*┃ 👥 العدد المقبول : ${requests.length}*
*╰━━━━━━━━━━━━━━━━━━━━━━╯*`
                        }
                    );
                } else {
                    saveRequests([]);
                    return sock.sendMessage(
                        jid,
                        {
                            text:
`${head}

*┃ ❌ تم رفض وتهيئة جميع الطلبات*
*╰━━━━━━━━━━━━━━━━━━━━━━╯*`
                        }
                    );
                }

            }

            // إذا كتب رقم الطلب (مثلاً: طلبات قبول 1)
            const index = parseInt(subAction) - 1;

            if(isNaN(index) || !requests[index]){
                return sock.sendMessage(
                    jid,
                    {
                        text:
`${head}

*┃ ❌ رقم الطلب غير صحيح*
*┃ استخدم: .طلبات عرض لمعرفة الأرقام*
*╰━━━━━━━━━━━━━━━━━━━━━━╯*`
                    }
                );
            }

            const targetRequest = requests[index];

            // حذف الطلب المحدد من القائمة
            requests.splice(index, 1);
            saveRequests(requests);

            const statusText = action === "قبول" ? "✅ تم قبول الطلب بنجاح" : "❌ تم رفض الطلب";

            return sock.sendMessage(
                jid,
                {
                    text:
`${head}

*┃ ${statusText}*
*┃*
*┃ 👤 العضو : @${targetRequest.number}*
*┃ 📋 الطلب : ${targetRequest.content || "بدون تفاصيل"}*
*┃ 👥 المتبقي : ${requests.length}*
*╰━━━━━━━━━━━━━━━━━━━━━━╯*`,

                    mentions: [targetRequest.number + "@s.whatsapp.net"]
                }
            );

        }

        // واجهة المساعدة للأمر
        return sock.sendMessage(
            jid,
            {
                text:
`${head}

*┃ ⚜️ أوامر الطلبات (خاص بالنخبة):*
*┃*
*┃ 📋 .طلبات عرض*
*┃ ✅ .طلبات قبول [رقم الطلب أو الكل]*
*┃ ❌ .طلبات رفض [رقم الطلب أو الكل]*
*┃*
*┃ 📖 الوصف :*
*┃ إدارة طلبات الأعضاء بسهولة*
*╰━━━━━━━━━━━━━━━━━━━━━━╯*`
            }
        );

    }

};
