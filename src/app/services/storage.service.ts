import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  /**
   * Guarda datos en localStorage
   * @param key Clave para almacenar los datos
   * @param data Datos a almacenar (se serializarán a JSON)
   */
  setItem<T>(key: string, data: T): void {
    try {
      const serializedData = JSON.stringify(data, this.dateReplacer);
      localStorage.setItem(key, serializedData);
    } catch (error) {
      console.error('Error al guardar en localStorage:', error);
    }
  }

  /**
   * Obtiene datos del localStorage
   * @param key Clave de los datos a obtener
   * @param defaultValue Valor por defecto si no existe la clave
   * @returns Los datos deserializados o el valor por defecto
   */
  getItem<T>(key: string, defaultValue: T): T {
    try {
      const serializedData = localStorage.getItem(key);
      if (serializedData === null) {
        return defaultValue;
      }
      return JSON.parse(serializedData, this.dateReviver);
    } catch (error) {
      console.error('Error al leer de localStorage:', error);
      return defaultValue;
    }
  }

  /**
   * Elimina un elemento del localStorage
   * @param key Clave del elemento a eliminar
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error al eliminar de localStorage:', error);
    }
  }

  /**
   * Verifica si localStorage está disponible
   * @returns true si localStorage está disponible
   */
  isAvailable(): boolean {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Limpia todo el localStorage (usar con cuidado)
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error al limpiar localStorage:', error);
    }
  }

  /**
   * Replacer para JSON.stringify que maneja fechas
   */
  private dateReplacer(key: string, value: any): any {
    if (value instanceof Date) {
      return { __type: 'Date', __value: value.toISOString() };
    }
    return value;
  }

  /**
   * Reviver para JSON.parse que reconstruye fechas
   */
  private dateReviver(key: string, value: any): any {
    if (typeof value === 'object' && value !== null && value.__type === 'Date') {
      return new Date(value.__value);
    }
    return value;
  }
}
