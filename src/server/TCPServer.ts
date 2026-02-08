import * as net from 'net';
import { StorageEngine } from '../storage/StorageEngine';

export class TCPServer { 
    private server: net.Server;
    private storage: StorageEngine;
    private port: number; 

    constructor(storage: StorageEngine, port: number = 6379) { 
        this.storage = storage;
        this.port = port;
        this.server = net.createServer(this.handleConnection.bind(this));

    } 

    private handleConnection(socket: net.Socket): void { 
        console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
        socket.on('data', async(data) => { 
            const command = data.toString().trim();
            const response = await this.executeCommand(command);
            socket.write(response + '\n');
        })
        socket.on('close', () => {
            console.log('Client disconnected');
        });
      
        socket.on('error', (err) => {
            console.error('Socket error:', err);
        });
    }

    private async executeCommand(command: string): Promise<string> { 
        const parts = command.split(' ');
        const cmd = parts[0]?.toUpperCase();

        try {
            switch (cmd) { 
                case 'GET':  {
                    if (parts.length < 2) return 'ERROR: GET requires a key';
                    const value = await this.storage.get(parts[1]);
                    return value !== null ? JSON.stringify(value) : '(nil)';
                }
                case 'SET': { 
                    if (parts.length < 3) return 'ERROR: SET requires a key and value';
                    const key = parts[1];
                    const value = parts.slice(2).join(' ');

                    let parsedValue: any;
                    try {
                        parsedValue = JSON.parse(value);
                    } catch (error) {
                        parsedValue = value;
                    }
                    await this.storage.set(key, parsedValue);
                    return 'OK';
                }
                case 'DEL': { 
                    if (parts.length < 2) return 'ERROR: DEL requires a key';
                    const deleted = await this.storage.delete(parts[1]);
                    return deleted ? '(deleted)' : '(not found)';
                }
                case 'KEYS': { 
                    const pattern = parts.length > 1 ? parts[1] : '*';
                    const keys = await this.storage.keys(pattern);
                    return keys.length > 0 ? keys.join('\n') : '(no matching keys)';
                }
                case 'EXISTS': {
                    if (parts.length < 2) return 'ERROR: EXISTS requires a key';
                    const exists = await this.storage.has(parts[1]);
                    return exists ? '1' : '0';
                }
                case 'SIZE':
                  case 'DBSIZE': {
                    const size = await this.storage.size();
                    return size.toString();
                }
                case 'SAVE': {
                    await this.storage.checkpoint();
                    return 'OK';
                }
                case 'PING': {
                    return 'PONG';
                }
                case 'HELP': {
                    return [
                      'Available commands:',
                      '  GET <key>           - Get value by key',
                      '  SET <key> <value>   - Set key-value pair',
                      '  DEL <key>           - Delete a key',
                      '  KEYS [pattern]      - List keys (optional wildcard pattern)',
                      '  EXISTS <key>        - Check if key exists',
                      '  SIZE / DBSIZE       - Get number of keys',
                      '  SAVE                - Force save to disk',
                      '  PING                - Test connection',
                      '  HELP                - Show this help',
                    ].join('\n');
                }
                default: {
                    return `ERROR: Unknown command: ${cmd}`;
                }
            }
        } catch (err) {
            return `ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`;
        }
    }

    start(): Promise<void> {
        return new Promise((resolve) => {
          this.server.listen(this.port, () => {
            console.log(`TCP Server listening on port ${this.port}`);
            resolve();
          });
        });
    }

    stop(): Promise<void> {
        return new Promise((resolve) => {
          this.server.close(() => {
            console.log('TCP Server stopped');
            resolve();
          });
        });
      }
}