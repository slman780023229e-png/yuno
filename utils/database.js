import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "../data");

if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
}

class Database {
    constructor() {
        this.cache = new Map();
        this.cacheTimestamps = new Map();
        this.CACHE_DURATION = 60 * 1000; // صلاحية الكاش دقيقة واحدة فقط لتفريغ الرام باستمرار
    }

    read(filename, defaultData = []) {
        const filePath = path.join(dbPath, filename);
        const now = Date.now();

        // التحقق من وجود الكاش وصلاحيته (لم تتجاوز الدقيقة)
        if (this.cache.has(filename) && (now - this.cacheTimestamps.get(filename) < this.CACHE_DURATION)) {
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
            
            // تحديث الكاش والوقت الحالي
            this.cache.set(filename, parsed);
            this.cacheTimestamps.set(filename, now);
            
            return parsed;
        } catch (error) {
            console.error(`❌ [Database Error] Failed to read ${filename}:`, error.message);
            return defaultData;
        }
    }

    write(filename, data) {
        const filePath = path.join(dbPath, filename);
        
        try {
            this.cache.set(filename, data);
            this.cacheTimestamps.set(filename, Date.now());
            
            const tempPath = `${filePath}.tmp`;
            fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
            fs.renameSync(tempPath, filePath);
            
            return true;
        } catch (error) {
            console.error(`❌ [Database Error] Failed to write ${filename}:`, error.message);
            return false;
        }
    }

    update(filename, updaterFunc, defaultData = []) {
        let currentData = this.read(filename, defaultData);
        if (typeof updaterFunc === "function") {
            currentData = updaterFunc(currentData);
        }
        return this.write(filename, currentData);
    }

    clearCache() {
        this.cache.clear();
        this.cacheTimestamps.clear();
    }
}

export default new Database();
