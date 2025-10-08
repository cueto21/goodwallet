import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ModalVisibilityService {
  private openCount = signal(0);
  anyModalOpen = computed(() => this.openCount() > 0);

  registerModal() {
    this.openCount.update(c => c + 1);
  }

  unregisterModal() {
    this.openCount.update(c => Math.max(0, c - 1));
  }
}
