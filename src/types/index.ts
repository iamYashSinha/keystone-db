export interface Record { 
    key: string, 
    value: any, 
    timestamp: number, 
    deleted?: boolean
}

export interface WALEntry { 
    operation: 'SET' | 'DELETE',
    key: string,
    value?: any, 
    timestamp: number
}

export interface DatabaseConfig { 
    dataDir: string,
    walEnabled: boolean,
    syncOnWrite: boolean
}