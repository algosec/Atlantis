import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ClientStorageService {

    getFromLocalStorage<T>(key: string): T {
        const raw = localStorage.getItem(key);
        return raw ? <T> JSON.parse(raw) : null;
    }

    persistToLocalStorage<T>(key: string, value: T): void {
        localStorage.setItem(key, JSON.stringify(value));
    }

    deleteFromLocalStorage(key: string): void {
        localStorage.removeItem(key);
    }

    getFromSessionStorage<T>(key: string): T {
        const raw = sessionStorage.getItem(key);
        return raw ? <T> JSON.parse(raw) : null;
    }

    persistToSessionStorage<T>(key: string, value: T): void {
        sessionStorage.setItem(key, JSON.stringify(value));
    }

    deleteFromSessionStorage(key: string): void {
        sessionStorage.removeItem(key);
    }
}
