import { PlatformManager } from '../platform/PlatformManager';

type TranslationMap = { [key: string]: string };

const EN: TranslationMap = {
    'shop.buy': 'BUY',
    'shop.max_level': 'MAX LEVEL',
    
    'shipment.title': 'SHIPMENT',
    'shipment.claim': 'CLAIM SHIPMENT',
    'shipment.ready': 'SHIPMENT READY!',
    'shipment.not_met': 'NOT MET',
    'shipment.wait': 'Wait for shipment',
    
    'prestige.title': 'PRESTIGE',
    'prestige.desc': 'Reset progress to earn Blueprints.\nBlueprints permanently increase income by +10% each.',
    'prestige.earn': 'You will earn:',
    'prestige.blueprints': 'Blueprints',
    'prestige.req_stage': 'Requires Stage 6',
    'prestige.req_blueprint': 'Need 1+ Blueprint',
    'prestige.reset': 'PRESTIGE NOW',
    'prestige.reset_warn': 'This will reset:',
    'prestige.reset_list': '✓ Money\n✓ Boxes\n✓ Stage & Shipments',
    'prestige.safe_warn': 'This will NOT reset:',
    'prestige.safe_list': '✓ Achievements\n✓ Lifetime Money\n✓ Blueprints',
    'prestige.trigger': '✨ PRESTIGE',
    'prestige.income_total': 'Permanent Income:\n+{0}% (Total)',
    'prestige.gain_text': 'You will gain:\n+{0} Blueprints',

    'stats.money': 'Money:',
    'stats.income': 'Income:',
    
    'stage.1': 'Garage',
    'stage.2': 'Small Warehouse',
    'stage.3': 'Factory',
    'stage.4': 'Distribution Center',
    'stage.5': 'Global Network',
    'stage.6': 'Space Logistics'
};

const ID: TranslationMap = {
    'shop.buy': 'BELI',
    'shop.max_level': 'LEVEL MAKS',
    
    'shipment.title': 'KIRIMAN',
    'shipment.claim': 'KLAIM',
    'shipment.ready': 'KIRIMAN SIAP!',
    'shipment.not_met': 'BELUM CUKUP',
    'shipment.wait': 'Tunggu kiriman',
    
    'prestige.title': 'PRESTISE',
    'prestige.desc': 'Reset progres untuk mendapat Blueprint.\nSetiap Blueprint memberi bonus pendapatan +10% permanen.',
    'prestige.earn': 'Anda akan mendapat:',
    'prestige.blueprints': 'Blueprint',
    'prestige.req_stage': 'Butuh Stage 6',
    'prestige.req_blueprint': 'Butuh 1+ Blueprint',
    'prestige.reset': 'PRESTISE SEKARANG',
    'prestige.reset_warn': 'Ini akan di-reset:',
    'prestige.reset_list': '✓ Uang\n✓ Box\n✓ Stage & Kiriman',
    'prestige.safe_warn': 'Ini TIDAK di-reset:',
    'prestige.safe_list': '✓ Pencapaian\n✓ Total Uang\n✓ Blueprint',
    'prestige.trigger': '✨ PRESTISE',
    'prestige.income_total': 'Pendapatan Permanen:\n+{0}% (Total)',
    'prestige.gain_text': 'Anda akan mendapat:\n+{0} Blueprint',

    'stats.money': 'Uang:',
    'stats.income': 'Pendapatan:',
    
    'stage.1': 'Garasi',
    'stage.2': 'Gudang Kecil',
    'stage.3': 'Pabrik',
    'stage.4': 'Pusat Distribusi',
    'stage.5': 'Jaringan Global',
    'stage.6': 'Logistik Luar Angkasa'
};

const RU: TranslationMap = {
    'shop.buy': 'КУПИТЬ',
    'shop.max_level': 'МАКС. УРОВЕНЬ',
    
    'shipment.title': 'ГРУЗ',
    'shipment.claim': 'ЗАБРАТЬ',
    'shipment.ready': 'ГРУЗ ГОТОВ!',
    'shipment.not_met': 'НЕ ХВАТАЕТ',
    'shipment.wait': 'Ожидание груза',
    
    'prestige.title': 'ПРЕСТИЖ',
    'prestige.desc': 'Сбросьте прогресс, чтобы получить Чертежи.\nКаждый чертеж навсегда увеличивает доход на +10%.',
    'prestige.earn': 'Вы получите:',
    'prestige.blueprints': 'Чертежи',
    'prestige.req_stage': 'Требуется Этап 6',
    'prestige.req_blueprint': 'Нужен 1+ Чертеж',
    'prestige.reset': 'СДЕЛАТЬ ПРЕСТИЖ',
    'prestige.reset_warn': 'Это будет сброшено:',
    'prestige.reset_list': '✓ Деньги\n✓ Коробки\n✓ Этапы и грузы',
    'prestige.safe_warn': 'Это НЕ будет сброшено:',
    'prestige.safe_list': '✓ Достижения\n✓ Заработанные деньги\n✓ Чертежи',
    'prestige.trigger': '✨ ПРЕСТИЖ',
    'prestige.income_total': 'Постоянный доход:\n+{0}% (Всего)',
    'prestige.gain_text': 'Вы получите:\n+{0} Чертежей',

    'stats.money': 'Деньги:',
    'stats.income': 'Доход:',
    
    'stage.1': 'Гараж',
    'stage.2': 'Малый склад',
    'stage.3': 'Фабрика',
    'stage.4': 'Распределительный центр',
    'stage.5': 'Глобальная сеть',
    'stage.6': 'Космическая логистика'
};

const LOCALES: Record<'en' | 'id' | 'ru', TranslationMap> = {
    'en': EN,
    'id': ID,
    'ru': RU
};

export class LocalizationManager {
    private static instance: LocalizationManager;
    private currentLang: 'en' | 'id' | 'ru' = 'en';

    private constructor() {
        // Will be updated when Platform is ready, but safe default
    }

    public static getInstance(): LocalizationManager {
        if (!LocalizationManager.instance) {
            LocalizationManager.instance = new LocalizationManager();
        }
        return LocalizationManager.instance;
    }

    public init(): void {
        this.currentLang = PlatformManager.getLocalization().getLang();
    }

    public static t(key: string, ...args: any[]): string {
        const inst = this.getInstance();
        const map = LOCALES[inst.currentLang];
        let text = key;

        if (map && map[key]) {
            text = map[key];
        } else if (LOCALES['en'][key]) {
            text = LOCALES['en'][key];
        }

        // Format arguments {0}, {1}
        args.forEach((arg, index) => {
            text = text.replace(`{${index}}`, String(arg));
        });

        return text;
    }
}
