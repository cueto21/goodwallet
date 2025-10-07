import { Injectable, inject } from '@angular/core';
import { DateUtilService } from './date-util.service';
import { NotificationService } from './notification.service';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { AccountService } from './account';
import { LoanService } from './loan.service';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export interface ExportData {
  exportInfo: {
    version: string;
    exportDate: string;
    appName: string;
  };
  accounts: any[];
  transactions: any[];
  loans: any[];
  recurringTransactions: any[];
  categories: any[];
  settings: any;
  metadata: {
    totalAccounts: number;
    totalTransactions: number;
    totalLoans: number;
    totalRecurringTransactions: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DataExportImportService {
  private dateUtil = inject(DateUtilService);
  private notificationService = inject(NotificationService);
  private storageService = inject(StorageService);
  private accountService = inject(AccountService);
  private loanService = inject(LoanService);

  /**
   * Exporta todos los datos del usuario desde la API
   */
  async exportAllData(): Promise<ExportData> {
    console.log('Iniciando exportación de datos desde API...');
    
    try {
      // Obtener todos los datos del usuario desde la API
      const exportData = await ApiService.get('/backup/export');
      
      console.log('Datos obtenidos desde API:', exportData);
      console.log('- Cuentas:', exportData.accounts.length);
      console.log('- Transacciones:', exportData.transactions.length);
      console.log('- Préstamos:', exportData.loans.length);
      console.log('- Transacciones recurrentes:', exportData.recurringTransactions.length);
      console.log('- Categorías:', exportData.categories.length);
      
      return exportData;
      
    } catch (error) {
      console.error('Error obteniendo datos desde API:', error);
      throw new Error('Error al obtener los datos del servidor para exportación');
    }
  }  /**
   * Descarga un archivo JSON con todos los datos
   */
  async downloadDataBackup(): Promise<void> {
    try {
      console.log('=== INICIO EXPORTACIÓN ===');
      
      // Mostrar notificación inicial
      this.notificationService.showInfo(
        'Exportación iniciada', 
        'Obteniendo datos del servidor...', 
        3000
      );
      console.log('Notificación inicial enviada');
      
      const exportData = await this.exportAllData();
      console.log('Datos exportados:', exportData);
      console.log('Validando estructura de datos...');
      
      // Verificar que los datos sean válidos para JSON
      try {
        // Test de serialización rápida
        JSON.stringify(exportData);
        console.log('✅ Datos válidos para serialización JSON');
      } catch (jsonError) {
        console.error('❌ Error en serialización de datos:', jsonError);
        throw new Error(`Los datos no son válidos para exportación: ${jsonError instanceof Error ? jsonError.message : 'Error desconocido'}`);
      }
      
      if (!exportData || Object.keys(exportData).length === 0) {
        throw new Error('No hay datos para exportar');
      }
      
      const dataStr = JSON.stringify(exportData, null, 2);
      console.log('Datos serializados exitosamente, tamaño:', dataStr.length);
      console.log('Muestra de datos serializados (primeros 500 chars):', dataStr.substring(0, 500));
      
      if (dataStr.length === 0) {
        throw new Error('Error al serializar los datos - resultado vacío');
      }
      
      if (dataStr.length < 100) {
        console.warn('ADVERTENCIA: Datos serializados muy pequeños, posible problema');
        console.log('Datos completos:', dataStr);
      }
      
      // Crear nombre de archivo con fecha y hora
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const filename = `finanzas-backup-${dateStr}-${timeStr}.json`;
      console.log('Nombre de archivo:', filename);

      // Verificar si estamos en un entorno móvil (Capacitor)
      console.log('Verificando plataforma...');
      console.log('Capacitor.isNativePlatform():', Capacitor.isNativePlatform());
      
      if (Capacitor.isNativePlatform()) {
        console.log('DETECTADO ENTORNO NATIVO - usando Capacitor Filesystem');
        await this.downloadDataBackupMobile(dataStr, filename, exportData);
        console.log('=== FIN EXPORTACIÓN MÓVIL ===');
        return;
      } else {
        console.log('DETECTADO ENTORNO WEB - usando descarga browser');
        await this.downloadDataBackupWeb(dataStr, filename, exportData);
        console.log('=== FIN EXPORTACIÓN WEB ===');
        return;
      }
      
    } catch (error: any) {
      console.error('=== ERROR EN EXPORTACIÓN ===');
      console.error('Error detallado en downloadDataBackup:', error);
      
      let errorMessage = 'Error desconocido';
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Determinar detalles específicos del error
      if (errorMessage.includes('Permission denied')) {
        errorDetails = 'No tienes permisos para guardar archivos en esta ubicación.';
      } else if (errorMessage.includes('Network')) {
        errorDetails = 'Problema de conectividad. Verifica tu conexión a internet.';
      } else if (errorMessage.includes('Storage') || errorMessage.includes('QUOTA_EXCEEDED')) {
        errorDetails = 'Problema con el almacenamiento. Verifica el espacio disponible.';
      } else if (errorMessage.includes('JSON')) {
        errorDetails = 'Error al procesar los datos. Algunos datos pueden estar corruptos.';
      } else {
        errorDetails = `Detalles técnicos: ${errorMessage}`;
      }
      
      this.notificationService.showError(
        'Error en la exportación',
        `No se pudo completar la exportación de datos. ${errorDetails}`,
        0 // No auto-dismiss for errors
      );
      
      throw error;
    }
  }

  /**
   * Método para descargar en dispositivos móviles usando Capacitor
   */
  private async downloadDataBackupMobile(dataStr: string, filename: string, exportData: any): Promise<void> {
    try {
      console.log('=== INICIO DESCARGA MÓVIL ===');
      console.log('Datos recibidos - tamaño:', dataStr.length);
      console.log('Nombre archivo:', filename);
      
      this.notificationService.showInfo(
        'Exportación en proceso', 
        'Guardando archivo en el dispositivo...', 
        5000
      );
      console.log('Notificación de proceso enviada');

      // Verificar que Filesystem esté disponible
      console.log('Verificando disponibilidad de Filesystem...');
      if (!Filesystem) {
        throw new Error('Capacitor Filesystem no está disponible');
      }
      
      console.log('Filesystem disponible, escribiendo archivo...');
      console.log('Directorio destino:', Directory.Documents);
      console.log('Encoding:', Encoding.UTF8);
      
      // Escribir archivo en el directorio Documents
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: dataStr,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      console.log('Archivo escrito exitosamente!');
      console.log('URI del archivo:', writeResult.uri);
      
      // Verificar que el archivo se escribió correctamente
      try {
        const readResult = await Filesystem.readFile({
          path: filename,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        const readData = typeof readResult.data === 'string' ? readResult.data : readResult.data.toString();
        console.log('Verificación de archivo - tamaño leído:', readData.length);
        
        if (readData.length !== dataStr.length) {
          console.warn('ADVERTENCIA: Tamaño de archivo no coincide');
        } else {
          console.log('Archivo verificado correctamente');
        }
      } catch (verifyError) {
        console.warn('No se pudo verificar el archivo, pero posiblemente se guardó:', verifyError);
      }
      
      this.updateLastBackupDate();
      
      this.notificationService.showSuccess(
        'Exportación completada',
        `Archivo guardado exitosamente en Documents/${filename}. ${exportData.metadata.totalTransactions} transacciones y ${exportData.metadata.totalAccounts} cuentas exportadas.`,
        15000
      );
      
      console.log('=== ÉXITO EN DESCARGA MÓVIL ===');
      
    } catch (error: any) {
      console.error('=== ERROR EN DESCARGA MÓVIL ===');
      console.error('Error detallado:', error);
      console.error('Tipo de error:', typeof error);
      console.error('Error completo:', JSON.stringify(error, null, 2));
      console.error('Stack trace:', error?.stack);
      
      // Manejo específico de errores de Capacitor/Android
      let errorTitle = 'Error al guardar archivo';
      let errorMessage = '';
      
      if (error?.message) {
        const message = error.message.toLowerCase();
        console.log('Analizando mensaje de error:', message);
        
        if (message.includes('permission') || message.includes('denied')) {
          errorTitle = 'Permisos insuficientes';
          errorMessage = 'La aplicación no tiene permisos para escribir archivos. Ve a Configuración > Apps > GoodWallet > Permisos > Almacenamiento y habilita el acceso.';
        } else if (message.includes('not_found') || message.includes('directory')) {
          errorTitle = 'Directorio no encontrado';
          errorMessage = 'No se pudo acceder al directorio de documentos. Verifica que el almacenamiento del dispositivo esté disponible.';
        } else if (message.includes('quota') || message.includes('space') || message.includes('storage')) {
          errorTitle = 'Espacio insuficiente';
          errorMessage = 'No hay suficiente espacio en el dispositivo. Libera espacio de almacenamiento e inténtalo nuevamente.';
        } else if (message.includes('filesystem') || message.includes('capacitor')) {
          errorTitle = 'Error del sistema de archivos';
          errorMessage = `Error técnico del sistema de archivos: ${error.message}. Reinicia la aplicación e inténtalo nuevamente.`;
        } else {
          errorTitle = 'Error desconocido';
          errorMessage = `Error inesperado: ${error.message}. Si persiste el problema, contacta al soporte técnico.`;
        }
      } else {
        errorTitle = 'Error crítico';
        errorMessage = 'Error sin mensaje específico. Verifica los permisos y el espacio disponible en el dispositivo.';
      }
      
      this.notificationService.showError(
        errorTitle,
        errorMessage,
        0 // No auto-dismiss for errors
      );
      
      console.log('Notificación de error enviada:', errorTitle, errorMessage);
      
      throw error;
    }
  }

  /**
   * Método para descargar en navegadores web
   */
  private async downloadDataBackupWeb(dataStr: string, filename: string, exportData: any): Promise<void> {
    try {
      this.notificationService.showInfo(
        'Exportación iniciada', 
        'Preparando descarga del archivo...', 
        3000
      );
      
      // Intentar usar la API moderna de File System Access si está disponible
      if ('showSaveFilePicker' in window) {
        console.log('Usando File System Access API');
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'Archivos JSON',
              accept: { 'application/json': ['.json'] }
            }]
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(dataStr);
          await writable.close();
          
          console.log('Archivo guardado usando File System Access API');
          this.notificationService.showSuccess(
            'Exportación exitosa',
            `Archivo guardado como: ${filename}`,
            5000
          );
          this.updateLastBackupDate();
          return;
        } catch (fsError: any) {
          if (fsError.name === 'AbortError') {
            this.notificationService.showWarning(
              'Exportación cancelada',
              'La selección de archivo fue cancelada por el usuario',
              3000
            );
            return;
          }
          console.log('File System Access API falló, usando método fallback:', fsError);
        }
      }

      // Método fallback tradicional
      console.log('Usando método de descarga tradicional');
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      console.log('Blob creado, tamaño:', dataBlob.size);

      if (dataBlob.size === 0) {
        throw new Error('Error al crear el archivo de respaldo');
      }

      // Crear enlace de descarga
      const downloadLink = document.createElement('a');
      const objectURL = URL.createObjectURL(dataBlob);
      downloadLink.href = objectURL;
      downloadLink.download = filename;
      downloadLink.style.display = 'none';

      // Agregar al DOM, hacer clic y remover
      document.body.appendChild(downloadLink);
      console.log('Enlace agregado al DOM, iniciando descarga...');
      downloadLink.click();
      console.log('Click ejecutado');
      
      // Remover el enlace después de un pequeño delay para asegurar que la descarga inicie
      setTimeout(() => {
        if (document.body.contains(downloadLink)) {
          document.body.removeChild(downloadLink);
        }
        URL.revokeObjectURL(objectURL);
        console.log('Enlace removido y URL limpiada');
      }, 1000);

      this.updateLastBackupDate();
      console.log('Exportación completada exitosamente');
      
      this.notificationService.showSuccess(
        'Exportación exitosa',
        `Archivo descargado: ${filename}. Total de registros: ${exportData.metadata.totalTransactions} transacciones, ${exportData.metadata.totalAccounts} cuentas`,
        7000
      );
      
    } catch (error: any) {
      console.error('Error detallado en downloadDataBackupWeb:', error);
      
      let errorMessage = 'Error al descargar archivo en navegador';
      let errorDetails = '';
      
      if (error?.message) {
        const message = error.message.toLowerCase();
        if (message.includes('permission') || message.includes('denied')) {
          errorDetails = 'El navegador bloqueó la descarga. Verifica la configuración de descargas.';
        } else if (message.includes('quota') || message.includes('storage')) {
          errorDetails = 'No hay suficiente espacio en el dispositivo para descargar el archivo.';
        } else if (message.includes('network')) {
          errorDetails = 'Error de conectividad. Verifica tu conexión a internet.';
        } else if (message.includes('blob') || message.includes('file')) {
          errorDetails = 'Error al crear el archivo de descarga. Intenta nuevamente.';
        } else {
          errorDetails = `Error técnico: ${error.message}`;
        }
      } else {
        errorDetails = 'Error desconocido durante la descarga. Verifica la configuración del navegador.';
      }
      
      this.notificationService.showError(
        'Error en exportación web',
        `No se pudo descargar el archivo de respaldo. ${errorDetails}`,
        0 // Error persistente
      );
      
      throw error;
    }
  }

  /**
   * Importa datos desde un archivo usando la API
   */
  async importDataFromFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No se ha seleccionado ningún archivo'));
        return;
      }

      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        reject(new Error('El archivo debe ser de tipo JSON'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const importData = JSON.parse(content) as ExportData;
          
          this.validateImportData(importData);
          
          console.log('Datos válidos, enviando al servidor...');
          
          // Mostrar notificación de progreso
          this.notificationService.showInfo(
            'Importación en proceso',
            'Enviando datos al servidor...',
            5000
          );
          
          // Enviar datos al servidor para importación
          const result = await ApiService.post('/backup/import', importData);
          
          console.log('Importación exitosa:', result);
          
          // Recargar datos locales después de la importación exitosa
          await this.accountService.loadAccounts();
          await this.loanService.loadLoans();
          
          this.notificationService.showSuccess(
            'Importación exitosa',
            `Datos importados: ${result.imported.accounts} cuentas, ${result.imported.transactions} transacciones, ${result.imported.loans} préstamos`,
            7000
          );
          
          resolve();
          
        } catch (error) {
          console.error('Error en importación:', error);
          
          let errorMessage = 'Error desconocido al importar los datos';
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          }
          
          this.notificationService.showError(
            'Error de importación',
            errorMessage,
            0
          );
          
          reject(new Error(errorMessage));
        }
      };

      reader.onerror = () => {
        const error = 'Error al leer el archivo';
        this.notificationService.showError(
          'Error de lectura',
          error,
          5000
        );
        reject(new Error(error));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Valida que los datos importados tengan la estructura correcta
   */
  private validateImportData(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Estructura de datos inválida');
    }

    if (!data.exportInfo || !data.exportInfo.appName) {
      throw new Error('Archivo de respaldo inválido');
    }

    if (data.exportInfo.appName !== 'WebApp-Finanzas') {
      throw new Error('Este archivo no pertenece a WebApp-Finanzas');
    }
  }

  /**
   * Importa y guarda los datos en localStorage
   */
  private importData(importData: ExportData): void {
    try {
      // Crear respaldo de datos actuales antes de importar
      this.createBackupBeforeImport();

      // Importar cada tipo de dato con las claves correctas
      this.storageService.setItem('financial_accounts', importData.accounts || []);
      this.storageService.setItem('transactions', importData.transactions || []);
      this.storageService.setItem('loans', importData.loans || []);
      this.storageService.setItem('recurring-transactions', importData.recurringTransactions || []);
      this.storageService.setItem('categories', importData.categories || []);

      // Importar configuraciones
      if (importData.settings) {
        Object.keys(importData.settings).forEach(key => {
          if (importData.settings[key] !== null && importData.settings[key] !== undefined) {
            this.storageService.setItem(key, importData.settings[key]);
          }
        });
      }
      
    } catch (error) {
      throw new Error('Error al importar los datos');
    }
  }

  /**
   * Crea un respaldo automático antes de importar nuevos datos
   */
  private createBackupBeforeImport(): void {
    try {
      const currentData = this.exportAllData();
      const backupKey = `backup_before_import_${Date.now()}`;
      this.storageService.setItem(backupKey, currentData);
    } catch (error) {
      // Silently fail backup creation
    }
  }

  /**
   * Obtiene información sobre los datos actuales
   */
  getDataSummary(): {
    accounts: number;
    transactions: number;
    loans: number;
    recurringTransactions: number;
    categories: number;
    lastBackup?: string;
  } {
    return {
      accounts: this.storageService.getItem('financial_accounts', []).length,
      transactions: this.storageService.getItem('transactions', []).length,
      loans: this.storageService.getItem('loans', []).length,
      recurringTransactions: this.storageService.getItem('recurring-transactions', []).length,
      categories: this.storageService.getItem('categories', []).length,
      lastBackup: this.storageService.getItem('lastBackupDate', undefined)
    };
  }

  /**
   * Marca la fecha del último respaldo
   */
  updateLastBackupDate(): void {
    this.storageService.setItem('lastBackupDate', new Date().toISOString());
  }

  /**
   * Procesa los préstamos para asegurar una serialización JSON correcta
   * Convierte todas las fechas a strings ISO y maneja las estructuras complejas
   */
  private processLoansForExport(rawLoans: any[]): any[] {
    return rawLoans.map(loan => {
      try {
        const processedLoan = {
          ...loan,
          // Convertir fechas a strings ISO para serialización
          date: loan.date instanceof Date ? loan.date.toISOString() : loan.date,
          dueDate: loan.dueDate instanceof Date ? loan.dueDate.toISOString() : loan.dueDate,
          createdAt: loan.createdAt instanceof Date ? loan.createdAt.toISOString() : loan.createdAt,
          updatedAt: loan.updatedAt instanceof Date ? loan.updatedAt.toISOString() : loan.updatedAt,
          paidDate: loan.paidDate instanceof Date ? loan.paidDate.toISOString() : loan.paidDate,
        };

        // Procesar cuotas si existen
        if (loan.installments && loan.installments.installmentsList) {
          processedLoan.installments = {
            ...loan.installments,
            firstInstallmentDate: loan.installments.firstInstallmentDate instanceof Date 
              ? loan.installments.firstInstallmentDate.toISOString() 
              : loan.installments.firstInstallmentDate,
            installmentsList: loan.installments.installmentsList.map((installment: any) => ({
              ...installment,
              dueDate: installment.dueDate instanceof Date ? installment.dueDate.toISOString() : installment.dueDate,
              paidDate: installment.paidDate instanceof Date ? installment.paidDate.toISOString() : installment.paidDate,
            }))
          };
        }

        return processedLoan;
      } catch (error) {
        console.error('Error procesando préstamo:', loan, error);
        // Si hay error procesando un préstamo específico, intentar guardarlo como está
        return {
          ...loan,
          _processingError: true,
          _originalError: error instanceof Error ? error.message : 'Error desconocido'
        };
      }
    });
  }

  /**
   * Elimina todos los datos de la aplicación
   */
  resetAllData(): void {
    const keysToReset = [
      'financial_accounts', 'transactions', 'loans', 'recurring-transactions', 
      'pending-recurring-transactions', 'categories'
    ];
    
    keysToReset.forEach(key => {
      this.storageService.removeItem(key);
    });
  }
}