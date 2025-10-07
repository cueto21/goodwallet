import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DateUtilService {
  
  /**
   * Convierte una fecha de string (formato YYYY-MM-DD) a Date object en la zona horaria local
   * Esto evita problemas de timezone cuando se usa new Date() con strings de fecha
   */
  parseLocalDate(dateString: string | Date): Date {
    if (!dateString) {
      return new Date();
    }
    
    // Si ya es un objeto Date, devolverlo tal como está
    if (dateString instanceof Date) {
      return dateString;
    }
    
    // Para fechas en formato YYYY-MM-DD, crear la fecha en la zona horaria local
    // Si la cadena contiene horas (ISO) delegar al parseLocalDateTime para preservar la hora y zona
    if (typeof dateString === 'string' && dateString.includes('T')) {
      return this.parseLocalDateTime(dateString);
    }

    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    return new Date(year, month - 1, day); // month - 1 porque los meses en JS van de 0-11
  }
  
  /**
   * Convierte una fecha de string (formato YYYY-MM-DD HH:mm) a Date object en la zona horaria local
   */
  parseLocalDateTime(dateTimeString: string | Date): Date {
    if (!dateTimeString) {
      return new Date();
    }
    
    if (dateTimeString instanceof Date) {
      return dateTimeString;
    }
    
    // Si contiene 'T', es formato ISO (por ejemplo: 2025-08-29T10:00:00.000Z)
    // Usar el constructor estándar para interpretar correctamente la zona/hora
    if (typeof dateTimeString === 'string' && dateTimeString.includes('T')) {
      return new Date(dateTimeString);
    }
    
    // Si es solo fecha, usar parseLocalDate
    if (dateTimeString.length === 10) {
      return this.parseLocalDate(dateTimeString);
    }
    
    // Para formato YYYY-MM-DD HH:mm
    const [datePart, timePart] = dateTimeString.split(' ');
    const [year, month, day] = datePart.split('-').map(num => parseInt(num, 10));
    
    let hour = 0, minute = 0;
    if (timePart) {
      [hour, minute] = timePart.split(':').map(num => parseInt(num, 10));
    }
    
    return new Date(year, month - 1, day, hour, minute);
  }
  
  /**
   * Convierte un Date object a string en formato YYYY-MM-DD para inputs de tipo date
   */
  formatForDateInput(date: Date): string {
    if (!date || !(date instanceof Date)) {
      return '';
    }
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Convierte un Date object a string en formato DD/MM/YYYY para mostrar
   */
  formatForDisplay(date: Date): string {
    if (!date || !(date instanceof Date)) {
      return '';
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  }
  
  /**
   * Verifica si una fecha es hoy
   */
  isToday(date: Date): boolean {
    if (!date || !(date instanceof Date)) {
      return false;
    }
    
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }
  
  /**
   * Obtiene la fecha actual en formato YYYY-MM-DD
   */
  getTodayString(): string {
    return this.formatForDateInput(new Date());
  }
}
