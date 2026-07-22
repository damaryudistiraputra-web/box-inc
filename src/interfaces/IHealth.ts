export const HealthStatus = {
    HEALTHY: 'Healthy',
    WARNING: 'Warning',
    CRITICAL: 'Critical',
    UNKNOWN: 'Unknown'
} as const;

export type HealthStatus = typeof HealthStatus[keyof typeof HealthStatus];

export interface IHealthStats {
    status: HealthStatus;
    [key: string]: any;
}
