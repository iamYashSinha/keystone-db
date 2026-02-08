import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { WALEntry } from '../types';

export class WriteAheadLog { 
    private walPath: string;
    private writeStream: fs.WriteStream | null = null;

    constructor(dataDir: string) { 
        this.walPath = path.join(dataDir, 'wal.log');
    }

    async init(): Promise<void> { 
        const dir = path.dirname(this.walPath);
        if (!fs.existsSync(dir)) { 
            fs.mkdirSync(dir, { recursive: true });
        }

        this.writeStream = fs.createWriteStream(this.walPath, { flags: 'a' });
    }

    async append(entry: WALEntry): Promise<void> { 
        return new Promise((resolve, reject) => { 
            if (!this.writeStream) {
                reject(new Error('WAL not initialized'));
                return;
            }
            const line = JSON.stringify(entry) + '\n';
            this.writeStream.write(line, (err) => { 
                if (err) { 
                    reject(err);
                } else { 
                    resolve();
                }
            });
        });
    }

    async recover(): Promise<WALEntry[]> { 
        const entries: WALEntry[] = [];

        if(!fs.existsSync(this.walPath)) { 
            return entries; 
        }

        const fileStream = fs.createReadStream(this.walPath);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        for await (const line of rl) { 
            if(line.trim()) { 
                try {
                    entries.push(JSON.parse(line));
                } catch (error) { 
                    console.error('Error parsing WAL entry:', error);
                }
            }
        }

        return entries;
    }

    async checkpoint(): Promise<void> {
        if (this.writeStream) {
          this.writeStream.end();
        }
        fs.writeFileSync(this.walPath, '');
        this.writeStream = fs.createWriteStream(this.walPath, { flags: 'a' });
      }
    
      close(): void {
        if (this.writeStream) {
          this.writeStream.end();
        }
    }
}