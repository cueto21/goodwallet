import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataExportImportService } from '../../services/data-export-import.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-data-backup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-backup.component.html',
  styleUrls: ['./data-backup.component.scss']
})
export class DataBackupComponent implements OnInit {
  private dataService = inject(DataExportImportService);
  private notificationService = inject(NotificationService);
  
  // States
  dataSummary = signal(this.dataService.getDataSummary());
  selectedFile = signal<File | null>(null);
  isExporting = signal(false);
  isImporting = signal(false);
  exportSuccess = signal(false);
  exportError = signal<string | null>(null);
  importSuccess = signal(false);
  importError = signal<string | null>(null);
  showResetConfirm = false;

  ngOnInit(): void {
    this.refreshDataSummary();
  }

  refreshDataSummary(): void {
    const summary = this.dataService.getDataSummary();
    this.dataSummary.set(summary);
  }

  async exportData(): Promise<void> {
    this.isExporting.set(true);
    this.exportSuccess.set(false);
    this.exportError.set(null);

    try {
      console.log('Iniciando exportación desde componente...');
      await this.dataService.downloadDataBackup();
      
      // Actualizar resumen de datos pero no mostrar notificaciones aquí
      // El servicio maneja todas las notificaciones de éxito/error
      this.dataSummary.set(this.dataService.getDataSummary());
      this.exportSuccess.set(true);
      
    } catch (error) {
      console.error('Error en exportData del componente:', error);
      // El servicio ya maneja todas las notificaciones de error
      // No mostramos mensajes adicionales para evitar duplicación
      const errorMessage = error instanceof Error ? error.message : 'Error al exportar datos';
      this.exportError.set(errorMessage);
    } finally {
      this.isExporting.set(false);
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    this.selectedFile.set(file || null);
    
    // Resetear mensajes
    this.importSuccess.set(false);
    this.importError.set(null);
  }

  async importData(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    this.isImporting.set(true);
    this.importSuccess.set(false);
    this.importError.set(null);

    try {
      await this.dataService.importDataFromFile(file);
      this.importSuccess.set(true);
      this.dataSummary.set(this.dataService.getDataSummary());
      this.selectedFile.set(null);
      
      // Resetear input file
      const fileInput = document.getElementById('importFile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      this.importError.set(error instanceof Error ? error.message : 'Error desconocido');
      setTimeout(() => this.importError.set(null), 8000);
    } finally {
      this.isImporting.set(false);
    }
  }

  // Exposed as an instance property to ensure the Angular template type-checker
  // recognizes it as a component member when referenced from the template.
  resetAllData = (): void => {
    if (confirm('¿Estás COMPLETAMENTE seguro? Esta acción eliminará todos los datos permanentemente.')) {
      this.dataService.resetAllData();
      this.dataSummary.set(this.dataService.getDataSummary());
      this.showResetConfirm = false;
      alert('Todos los datos han sido eliminados. Recarga la página.');
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
