export interface StageInfo {
    id: number;
    name: string;
    threshold: number;
    unlocks: string[];
    background?: string;
    music?: string;
    particleColor?: number;
    uiAccent?: number;
}

export const STAGES: StageInfo[] = [
    { 
        id: 1, 
        name: "Garage Startup", 
        threshold: 0, 
        unlocks: ["shipment"],
        background: "bg_garage",
        particleColor: 0x888888,
        uiAccent: 0x555555
    },
    { 
        id: 2, 
        name: "Small Warehouse", 
        threshold: 1000, 
        unlocks: ["luckyBox"],
        background: "bg_warehouse",
        particleColor: 0x44aa44,
        uiAccent: 0x338833
    },
    { 
        id: 3, 
        name: "Local Factory", 
        threshold: 4000, 
        unlocks: ["goldenTruck"],
        background: "bg_factory",
        particleColor: 0xaa4444,
        uiAccent: 0x883333
    },
    { 
        id: 4, 
        name: "Distribution Center", 
        threshold: 10000, 
        unlocks: ["comboMultiplier"],
        background: "bg_distribution",
        particleColor: 0x4444aa,
        uiAccent: 0x333388
    },
    { 
        id: 5, 
        name: "Global Logistics", 
        threshold: 25000, 
        unlocks: ["criticalMerge"],
        background: "bg_global",
        particleColor: 0xaaaa44,
        uiAccent: 0x888833
    },
    { 
        id: 6, 
        name: "Space Logistics", 
        threshold: 150000, 
        unlocks: ["prestige"],
        background: "bg_space",
        particleColor: 0xffd700,
        uiAccent: 0xaa9900
    }
];
