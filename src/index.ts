import * as readline from 'readline';
import { StorageEngine } from './storage/StorageEngine';
import { TCPServer } from './server/TCPServer';

async function startCLI(storage: StorageEngine): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\n keystone-db - A Simple TypeScript Database');
  console.log('Type HELP for available commands, EXIT to quit.\n');

  const prompt = (): void => {
    rl.question('keystone-db> ', async (input) => {
      const command = input.trim();
      
      if (!command) {
        prompt();
        return;
      }

      const parts = command.split(' ');
      const cmd = parts[0].toUpperCase();

      try {
        switch (cmd) {
          case 'GET': {
            if (parts.length < 2) {
              console.log('Usage: GET <key>');
              break;
            }
            const value = await storage.get(parts[1]);
            console.log(value !== null ? JSON.stringify(value, null, 2) : '(nil)');
            break;
          }

          case 'SET': {
            if (parts.length < 3) {
              console.log('Usage: SET <key> <value>');
              break;
            }
            const key = parts[1];
            const rawValue = parts.slice(2).join(' ');
            
            let value: any;
            try {
              value = JSON.parse(rawValue);
            } catch {
              value = rawValue;
            }
            
            await storage.set(key, value);
            console.log('OK');
            break;
          }

          case 'DEL':
          case 'DELETE': {
            if (parts.length < 2) {
              console.log('Usage: DEL <key>');
              break;
            }
            const deleted = await storage.delete(parts[1]);
            console.log(deleted ? '(deleted)' : '(not found)');
            break;
          }

          case 'KEYS': {
            const pattern = parts[1];
            const keys = await storage.keys(pattern);
            if (keys.length === 0) {
              console.log('(empty)');
            } else {
              keys.forEach((key, i) => console.log(`${i + 1}) "${key}"`));
            }
            break;
          }

          case 'EXISTS': {
            if (parts.length < 2) {
              console.log('Usage: EXISTS <key>');
              break;
            }
            const exists = await storage.has(parts[1]);
            console.log(exists ? '(true)' : '(false)');
            break;
          }

          case 'SIZE':
          case 'COUNT':
          case 'DBSIZE': {
            const size = await storage.size();
            console.log(`(integer) ${size}`);
            break;
          }

          case 'ALL': {
            const records = await storage.getAll();
            if (records.length === 0) {
              console.log('(empty)');
            } else {
              records.forEach((record) => {
                console.log(`${record.key}: ${JSON.stringify(record.value)}`);
              });
            }
            break;
          }

          case 'SAVE': {
            await storage.checkpoint();
            console.log('OK - Snapshot saved');
            break;
          }

          case 'HELP': {
            console.log(`
Available Commands:
  SET <key> <value>    Set a key-value pair (value can be JSON)
  GET <key>            Get value by key
  DEL <key>            Delete a key
  KEYS [pattern]       List all keys (optional wildcard: user:*)
  EXISTS <key>         Check if a key exists
  SIZE                 Get total number of keys
  ALL                  Show all key-value pairs
  SAVE                 Force save snapshot to disk
  HELP                 Show this help message
  EXIT                 Exit the database

Examples:
  SET name "John Doe"
  SET user:1 {"name":"Alice","age":30}
  GET user:1
  KEYS user:*
            `);
            break;
          }

          case 'EXIT':
          case 'QUIT': {
            console.log('Saving and shutting down...');
            await storage.close();
            console.log('Goodbye! 👋');
            rl.close();
            process.exit(0);
          }

          default:
            console.log(`Unknown command: ${cmd}. Type HELP for available commands.`);
        }
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : err);
      }

      prompt();
    });
  };

  prompt();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const serverMode = args.includes('--server');
  const port = parseInt(args.find(a => a.startsWith('--port='))?.split('=')[1] || '6379');

  // Initialize storage engine
  const storage = new StorageEngine({
    dataDir: './data',
    walEnabled: true,
    syncOnWrite: true,
  });

  await storage.init();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    await storage.close();
    process.exit(0);
  });

  if (serverMode) {
    // Start TCP server mode
    const server = new TCPServer(storage, port);
    await server.start();
    console.log('Press Ctrl+C to stop the server.');
  } else {
    await startCLI(storage);
  }
}

main().catch(console.error);