export interface BoxLevelConfig {
    level: number;
    color: number;
    textColor: string;
    baseValue: bigint;
    emoji: string;
}

export const BOX_SIZE = 80;
export const BOX_CORNER_RADIUS = 12;

export const BOX_CONFIG: Record<number, BoxLevelConfig> = {
    1: { level: 1, color: 0x8D6E63, textColor: '#ffffff', baseValue: 1n, emoji: '📦' }, // Cardboard
    2: { level: 2, color: 0x78909C, textColor: '#ffffff', baseValue: 3n, emoji: '🎁' }, // Gift
    3: { level: 3, color: 0x37474F, textColor: '#4fc3f7', baseValue: 9n, emoji: '💼' }, // Briefcase
    4: { level: 4, color: 0x512DA8, textColor: '#e040fb', baseValue: 27n, emoji: '🧰' }, // Toolbox
    5: { level: 5, color: 0xD50000, textColor: '#ffff00', baseValue: 81n, emoji: '🎒' }, // Backpack
    6: { level: 6, color: 0x1E88E5, textColor: '#ffffff', baseValue: 243n, emoji: '🛢️' }, // Barrel
    7: { level: 7, color: 0xFFA000, textColor: '#000000', baseValue: 729n, emoji: '🏦' }, // Bank/Safe
    8: { level: 8, color: 0x00C853, textColor: '#ffffff', baseValue: 2187n, emoji: '💎' }, // Diamond
    9: { level: 9, color: 0xFFD600, textColor: '#000000', baseValue: 6561n, emoji: '👑' }, // Crown
    10: { level: 10, color: 0xFFFFFF, textColor: '#000000', baseValue: 19683n, emoji: '🏆' } // Trophy
};
