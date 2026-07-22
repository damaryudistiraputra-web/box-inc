export interface ShipmentTemplate {
    tier: string;
    requirements: Array<{ levelOffset: number; count: number }>;
    rewardMult: bigint;
    score: number;
    icon: string;
}

export const SHIPMENT_DIRECTOR_SEQUENCE = [
    'Easy',
    'Easy',
    'Normal',
    'Easy',
    'Hard',
    'Normal',
    'Epic'
];

export const SHIPMENT_TEMPLATES: Record<string, ShipmentTemplate[]> = {
    'Easy': [
        { tier: 'Easy', requirements: [{ levelOffset: -2, count: 1 }], rewardMult: 5n, score: 300, icon: '📦' },
        { tier: 'Easy', requirements: [{ levelOffset: -3, count: 2 }], rewardMult: 6n, score: 400, icon: '📦' }
    ],
    'Normal': [
        { tier: 'Normal', requirements: [{ levelOffset: -1, count: 1 }], rewardMult: 10n, score: 600, icon: '🚚' },
        { tier: 'Normal', requirements: [{ levelOffset: -2, count: 2 }], rewardMult: 12n, score: 800, icon: '🚚' }
    ],
    'Hard': [
        { tier: 'Hard', requirements: [{ levelOffset: 0, count: 1 }], rewardMult: 20n, score: 1000, icon: '🚢' },
        { tier: 'Hard', requirements: [{ levelOffset: -1, count: 2 }], rewardMult: 25n, score: 1200, icon: '🚢' }
    ],
    'Epic': [
        { tier: 'Epic', requirements: [{ levelOffset: 0, count: 2 }], rewardMult: 100n, score: 2500, icon: '✈️' },
        { tier: 'Epic', requirements: [{ levelOffset: -1, count: 3 }], rewardMult: 120n, score: 3000, icon: '🚀' }
    ]
};
