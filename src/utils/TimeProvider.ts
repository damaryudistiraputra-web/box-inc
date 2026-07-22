/**
 * Wrapper for time access to easily swap Date.now() 
 * with server-time or Yandex Cloud time later.
 */
export class TimeProvider {
    public static now(): number {
        return Date.now();
    }
}
