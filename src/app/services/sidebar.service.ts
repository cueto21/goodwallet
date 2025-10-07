import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private _sidebarVisible = signal(false); // Cambiado a false para que aparezca oculto por defecto
  private _sidebarCollapsed = signal(true); // true = icons-only collapsed by default
  
  get sidebarVisible() {
    return this._sidebarVisible.asReadonly();
  }

  get sidebarCollapsed() {
    return this._sidebarCollapsed.asReadonly();
  }
  
  toggleSidebar() {
    this._sidebarVisible.set(!this._sidebarVisible());
  }
  
  setSidebarVisible(visible: boolean) {
    this._sidebarVisible.set(visible);
  }

  toggleCollapse() {
    this._sidebarCollapsed.set(!this._sidebarCollapsed());
  }

  setCollapsed(collapsed: boolean) {
    this._sidebarCollapsed.set(collapsed);
  }
}
