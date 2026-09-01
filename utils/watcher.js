import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

// دالة رسم الإطارات المطلوبة للأخطاء
function printBox(title, contentArray) {
    const border = "◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇";
    console.log("\n" + chalk.red.bold(border));
    console.log(chalk.red.bold(`          🚨 ${title} 🚨`));
    console.log(chalk.red.bold(border));
    for (const line of contentArray) {
        console.log(chalk.white(line));
    }
    console.log(chalk.red.bold(border) + "\n");
}

// دالة للبحث التلقائي في جميع مجلدات وملفات المشروع بشكل عميق
async function getAllJsFiles(dir, fileList = []) {
    const files = await fs.readdir(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);

        // استثناء مجلدات النظام المؤقتة أو جلسة الاتصال لعدم إبطاء الفحص
        if (file === "node_modules" || file === ".git" || file === "ملف_الاتصال") {
            continue;
        }

        if (stat.isDirectory()) {
            await getAllJsFiles(filePath, fileList);
        } else if (file.endsWith(".js")) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

// نظام فحص شامل لجميع ملفات البوت بلا استثناء
export async function scanAllProjectFiles() {
    console.log(chalk.cyan("◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇"));
    console.log(chalk.cyan("      🛡️ جاري الفحص الشامل لكل ملفات البوت...      "));
    console.log(chalk.cyan("◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇"));

    const allFiles = await getAllJsFiles(process.cwd());
    let errorsFound = 0;

    for (const filePath of allFiles) {
        try {
            const code = await fs.readFile(filePath, "utf8");
            
            // فحص صحة بناء الكود (Syntax Error Check)
            try {
                new Function(code);
            } catch (syntaxErr) {
                errorsFound++;
                
                // استخراج رقم السطر بدقة
                const lineMatch = syntaxErr.stack.match(/:(\d+):\d+/);
                const lineNumber = lineMatch ? lineMatch[1] : "غير معروف";
                
                // تخمين اسم الدالة أو النطاق الذي وقع فيه الخطأ
                const codeLines = code.split("\n");
                let functionName = "في النطاق العام (Global Scope)";
                if (lineNumber !== "غير معروف" && !isNaN(lineNumber)) {
                    for (let i = parseInt(lineNumber) - 1; i >= 0; i--) {
                        const currentLine = codeLines[i] || "";
                        const matchFunc = currentLine.match(/(?:function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\()/);
                        if (matchFunc) {
                            functionName = matchFunc[1] || matchFunc[2];
                            break;
                        }
                    }
                }

                printBox("خطأ برمجي مكتشف في أحد الملفات", [
                    `📁 مسار الملف : ${path.relative(process.cwd(), filePath)}`,
                    `📌 السطر      : ${lineNumber}`,
                    `⚙️ الدالة     : ${functionName}`,
                    `❌ الخطأ      : ${syntaxErr.message}`
                ]);
            }
        } catch (readErr) {
            console.log(chalk.red(`⚠️ تعذر قراءة الملف ${filePath}: ${readErr.message}`));
        }
    }

    if (errorsFound === 0) {
        console.log(chalk.green("◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇"));
        console.log(chalk.green("     👑 تمت الجولة: جميع ملفات البوت سليمة تماماً! 👑"));
        console.log(chalk.green("◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇"));
    } else {
        printBox("نتيجة الفحص الشامل", [
            `⚠️ تم العثور على أخطاء في (${errorsFound}) ملفاً. يجدر بك مراجعتها أعلاه.`
        ]);
    }
}

// التقاط الأخطاء غير المعالجة أثناء تشغيل البوت (Runtime Errors)
process.on("unhandledRejection", (reason) => {
    if (reason && String(reason).includes("Bad MAC")) return;
    
    const errorText = reason?.stack || String(reason);
    const lineMatch = errorText.match(/:(\d+):\d+/);
    const lineNumber = lineMatch ? lineMatch[1] : "غير معروف";

    printBox("خطأ فادح غير معالج (Unhandled Rejection)", [
        `📌 نوع الخطأ : Unhandled Rejection`,
        `📍 السطر التقريبي: ${lineNumber}`,
        `📜 التفاصيل : ${errorText}`
    ]);
});

process.on("uncaughtException", (error) => {
    if (error && String(error).includes("Bad MAC")) return;

    const errorText = error.stack || String(error);
    const lineMatch = errorText.match(/:(\d+):\d+/);
    const lineNumber = lineMatch ? lineMatch[1] : "غير معروف";

    printBox("انهيار أو استثناء خطير (Uncaught Exception)", [
        `💥 اسم الخطأ : ${error.name}`,
        `💬 الرسالة   : ${error.message}`,
        `📍 السطر    : ${lineNumber}`,
        `📜 مسار الخطأ: \n${errorText}`
    ]);
});

// مراقبة الذاكرة
setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    if (heapUsedMB > 750) {
        printBox("تحذير أداء الذاكرة المرتفع", [
            `⚠️ الاستهلاك الحالي: ${heapUsedMB} MB`,
            `💡 النصيحة: الذاكرة مرتفعة، قد يتسبب ذلك ببطء أو إعادة تشغيل قريبة.`
        ]);
    }
}, 300000);
