export interface AchievementConfig {
    id: string;
    title: string;
    description: string;
    target: number;
    stat: 'totalMerges' | 'totalMoneyEarned' | 'boxesBought' | 'highestBoxLevel';
    rewardAmount: string; // BigInt as string
}

export const ACHIEVEMENTS: AchievementConfig[] = [
    {
        id: 'merge_10',
        title: 'Novice Merger',
        description: 'Merge 10 boxes',
        target: 10,
        stat: 'totalMerges',
        rewardAmount: '500'
    },
    {
        id: 'merge_100',
        title: 'Adept Merger',
        description: 'Merge 100 boxes',
        target: 100,
        stat: 'totalMerges',
        rewardAmount: '5000'
    },
    {
        id: 'level_5',
        title: 'Moving Up',
        description: 'Reach a level 5 box',
        target: 5,
        stat: 'highestBoxLevel',
        rewardAmount: '2500'
    },
    {
        id: 'rich_kid',
        title: 'Rich Kid',
        description: 'Earn a total of $100,000',
        target: 100000,
        stat: 'totalMoneyEarned',
        rewardAmount: '20000'
    }
];
