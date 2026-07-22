export interface BoxLevelConfig {
    level: number;
    color: number;
    textColor: string;
    baseValue: bigint;
}

export const BOX_SIZE = 80;
export const BOX_CORNER_RADIUS = 12;

export const BOX_CONFIG: Record<number, BoxLevelConfig> = {
    1: { level: 1, color: 0x8D6E63, textColor: '#ffffff', baseValue: 1n }, // Wood/Paper
    2: { level: 2, color: 0x78909C, textColor: '#ffffff', baseValue: 3n }, // Iron
    3: { level: 3, color: 0x37474F, textColor: '#4fc3f7', baseValue: 9n }, // Steel
    4: { level: 4, color: 0x512DA8, textColor: '#e040fb', baseValue: 27n },// Quantum
    5: { level: 5, color: 0xD50000, textColor: '#ffff00', baseValue: 81n } // AI
};
