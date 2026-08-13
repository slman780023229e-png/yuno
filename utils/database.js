
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "../data");

// التأكد من وجود مجلد البيانات الأساسي
if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
}

class Database {
    constructor() {
        this.cache = new Map();
        this.locks = new Map();
    }

    // قراءة ملف JSON بأمان تام مع التخزين المؤقت (Cache) للسرعة
    read(filename, defaultData = []) {
        const filePath = path.join(dbPath, filename);
        
        if (this.cache.has(filename)) {
            return this.cache.get(filename);
        }

        try {
            if (!fs.existsSync(filePath)) {
                this.write(filename, defaultData);
                return defaultData;
            }

            const data = fs.readFileSync(filePath, "utf-8");
            if (!data.trim()) {
                this.write(filename, defaultData);
                return defaultData;
            }

            const parsed = JSON.parse(data);
            this.cache.set(filename, parsed);
            return parsed;
        } catch (error) {
            console.error(`❌ [Database Error] Failed to read ${filename}:`, error.message);
            return defaultData;
        }
    }

    // كتابة البيانات إلى الملف بأسلوب آمن يمنع التلف عند الضغط العالي
    write(filename, data) {
        const filePath = path.join(dbPath, filename);
        
        try {
            this.cache.set(filename, data);
            
            // كتابة مؤقتة ثم استبدال لضمان عدم تلف الملف إن انقطع الاتصال
            const tempPath = `${filePath}.tmp`;
            fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
            fs.renameSync(tempPath, filePath);
            
            return true;
        } catch (error) {
            console.error(`❌ [Database Error] Failed to write ${filename}:`, error.message);
            return false;
        }
    }

    // تحديث جزئي أو إضافة بيانات بداخل ملف معين
    update(filename, updaterFunc, defaultData = []) {
        let currentData = this.read(filename, defaultData);
        if (typeof updaterFunc === "function") {
            currentData = updaterFunc(currentData);
        }
        return this.write(filename, currentData);
    }

    // مسح الكاش لإجبار قاعدة البيانات على إعادة قراءة الملفات من القرص الصلب
    clearCache() {
        this.cache.clear();
    }
}

export default new Database();
