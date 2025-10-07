import { Component, EventEmitter, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.scss']
})
export class BottomNavComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() toggleAccount = new EventEmitter<void>();

  emitToggleSidebar() {
    this.toggleSidebar.emit();
  }

  emitToggleAccount() {
    this.toggleAccount.emit();
  }
}
