export class HashIndex { 
    private index: Map<string, Set<string>> = new Map();

    add(fieldValue: string, recordKey: string): void { 
        if (!this.index.has(fieldValue)) { 
            this.index.set(fieldValue, new Set());
        }
        this.index.get(fieldValue)?.add(recordKey);

    }

    remove(fieldValue: string, recordKey: string): void { 
        const keys = this.index.get(fieldValue);
        if (keys) { 
            keys.delete(recordKey);
            if (keys.size === 0) { 
                this.index.delete(fieldValue);
            }
        }
    }
    
    find(fieldValue: string): string[] { 
        const keys = this.index.get(fieldValue);
        return keys ? Array.from(keys) : [];
    }

    values(): string[] { 
        return Array.from(this.index.keys());    
    }
}