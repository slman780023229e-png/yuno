// memory-cleaner.js
'use strict';

import fs from 'fs';
import path from 'path';

const CONFIG = {
    checkIntervalMs: 30 * 1000,     // فحص سريع كل 30 ثانية
    maxRamMB: 50,                   // الحد الأقصى (50 ميجابايت)
    targetCacheDirs: ['tmp', 'temp', 'cache', '.cache'], // مجلدات الكاش المؤقتة المسموح بتنظيفها
    
    // درع الحماية القصوى: محظور تماماً الاقتراب منها
    protectedExtensions: ['.js', '.json', '.ts', '.env', '.sh', '.db'],
    protectedFolders: ['commands', 'events', 'plugins', 'src', 'lib', 'node_modules', 'session', 'sessions'],
    protectedFiles: ['creds.json', 'package.json', 'package-lock.json', 'index.js', 'main.js']
};

function getMB(bytes) {
    return Number((bytes / 1024 / 1024).toFixed(2));
}

function cleanCacheFolder(dirPath) {
    try {
        const absolutePath = path.resolve(process.cwd(), dirPath);
        if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isDirectory()) return;

        const entries = fs.readdirSync(absolutePath, { withFileTypes: true });
        let deletedCount = 0;

        for (const entry of entries) {
            const fullPath = path.join(absolutePath, entry.name);

            // فحص الحماية الصارم
            if (CONFIG.protectedFiles.includes(entry.name)) continue;
            if (CONFIG.protectedFolders.includes(entry.name)) continue;

            try {
                if (entry.isDirectory()) {
                    // حذف المجلدات الفرعية المؤقتة التي مر عليها أكثر من 5 دقائق فقط
                    const stat = fs.statSync(fullPath);
                    if (Date.now() - stat.mtimeMs > 5 * 60 * 1000) {
                        fs.rmSync(fullPath, { recursive: true, force: true });
                        deletedCount++;
                    }
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    // منع حذف أي ملف برمجي أو قاعدة بيانات تحت أي ظرف
                    if (CONFIG.protectedExtensions.includes(ext)) continue;

                    // حذف الملفات المؤقتة البحتة القديمة (أكثر من دقيقتين)
                    const stat = fs.statSync(fullPath);
                    if (Date.now() - stat.mtimeMs > 2 * 60 * 1000) {
                        fs.unlinkSync(fullPath);
                        deletedCount++;
                    }
                }
            } catch {}
        }

        if (deletedCount > 0) {
            console.log(`[Memory Cleaner] 🗑️ Cleared ${deletedCount} cache files/folders from /${dirPath}`);
        }
    } catch {}
}

function runDeepClean() {
    // 1. تنظيف مجلدات الكاش المؤقتة بأمان
    for (const dir of CONFIG.targetCacheDirs) {
        cleanCacheFolder(dir);
    }

    // 2. إجبار نظام نود.جايز على تفريغ הـ Garbage Collection الميت
    if (global.gc) {
        try {
            global.gc();
        } catch {}
    }
}

// بدء تشغيل المراقب بصمت في الخلفية
function initMemoryCleaner() {
    console.log(`[Memory Cleaner] 🛡️ Active. Target limit: ${CONFIG.maxRamMB}MB (Protected & Safe Mode).`);

    setInterval(() => {
        try {
            const currentRamMB = getMB(process.memoryUsage().rss);

            if (currentRamMB >= CONFIG.maxRamMB) {
                console.log(`[Memory Cleaner] ⚠️ RAM reached ${currentRamMB}MB. Cleaning up...`);
                runDeepClean();
                const afterCleanMB = getMB(process.memoryUsage().rss);
                console.log(`[Memory Cleaner] ✅ Cleaned successfully. Current RAM: ${afterCleanMB}MB`);
            }
        } catch {}
    }, CONFIG.checkIntervalMs);
}

// التشغيل الفوري
initMemoryCleaner();

export { runDeepClean };