# keystone-db
A storage engine experiment.

## Features

- **Write-Ahead Log (WAL)** - Crash recovery and durability
- **Snapshot Persistence** - Fast startup with periodic saves
- **In-Memory Storage** - Fast reads/writes with disk persistence
- **TCP Server** - Redis-like network interface
- **CLI** - Interactive command-line interface
- **Hash Index** - O(1) lookups by field values

## Quick Start

```bash
# Install dependencies
npm install

# Run in CLI mode
npx ts-node src/index.ts

# Run in server mode
npx ts-node src/index.ts --server --port=6379
```

## Commands

| Command | Description |
|---------|-------------|
| `SET <key> <value>` | Store a key-value pair |
| `GET <key>` | Retrieve value by key |
| `DEL <key>` | Delete a key |
| `KEYS [pattern]` | List keys (supports wildcards) |
| `EXISTS <key>` | Check if key exists |
| `SIZE` | Count total keys |
| `SAVE` | Force save to disk |

## Architecture

```
src/
├── index.ts           # Entry point & CLI
├── storage/
│   ├── StorageEngine.ts  # Core database engine
│   └── WAL.ts            # Write-Ahead Log
├── index/
│   └── HashIndex.ts      # Hash-based indexing
├── server/
│   └── TCPServer.ts      # TCP network interface
└── types/
    └── index.ts          # Type definitions
```

## How It Works

1. **Write Path**: Data is first written to WAL (durability), then stored in memory
2. **Read Path**: Direct memory lookup - O(1)
3. **Recovery**: On startup, loads snapshot + replays WAL entries
4. **Checkpoint**: Saves snapshot and clears WAL periodically


## To DO 
- Redis + mini-Mongo hybrid