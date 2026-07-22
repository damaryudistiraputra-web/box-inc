export const RewardSource = {
    SHIPMENT: 0,
    GOLDEN_TRUCK: 1,
    LUCKY_BOX: 2,
    CRITICAL_MERGE: 3,
    DAILY: 4,
    ACHIEVEMENT: 5,
    ADS: 6,
    PRESTIGE: 7,
    SYSTEM: 8 // For Offline Income, Debug, Recovery
} as const;

export type RewardSource = typeof RewardSource[keyof typeof RewardSource];

export const RewardState = {
    Pending: "PENDING",
    Granted: "GRANTED",
    Saved: "SAVED",
    Visualized: "VISUALIZED",
    Completed: "COMPLETED"
} as const;

export type RewardState = typeof RewardState[keyof typeof RewardState];

export interface RewardLedgerEntry {
    id: string;
    source: RewardSource;
    createdAt: number;
    completedAt?: number;
    state: RewardState;
    checksum: string;
    schemaVersion: number;
    bundle: RewardBundle;
}

export interface RewardRequest {
    id: string;
    source: RewardSource;
    bundle: RewardBundle;
    timestamp: number;
}

export interface RewardBundle {
    money?: number;
    blueprint?: number;
    score?: number;
    incomeBoost?: {
        multiplier: number;
        durationSec: number;
    };
    spawnBox?: {
        level: number;
    };
    triggerLuckyBox?: boolean;
    metadata?: {
        rarity?: string;
        critical?: boolean;
        title?: string;
    };
}
