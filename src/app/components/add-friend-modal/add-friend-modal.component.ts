import { Component, signal, inject, output, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FriendsService } from '../../services/friends';

@Component({
  selector: 'app-add-friend-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-friend-modal.component.html',
  styleUrls: ['./add-friend-modal.component.scss']
})
export class AddFriendModalComponent {
  private friendsService = inject(FriendsService);

  // Inputs y outputs
  isOpen = input<boolean>(false);
  onClose = output<void>();
  onFriendAdded = output<void>();

  // Signals
  isSubmitting = signal(false);
  email = signal('');

  constructor() {
    // Effect para manejar el scroll del body cuando se abre/cierra el modal
    effect(() => {
      if (this.isOpen()) {
        // Prevenir scroll del body
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        // Calcular el ancho de la scrollbar para evitar saltos
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
          document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
      } else {
        // Restaurar scroll del body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
    });
  }

  async onSubmit() {
    if (this.isSubmitting()) return;

    const emailValue = this.email().trim();
    if (!emailValue) {
      alert('Por favor ingresa un email');
      return;
    }

    this.isSubmitting.set(true);

    try {
      await this.friendsService.addFriend(emailValue);
      this.email.set('');
      this.onFriendAdded.emit();
      this.closeModal();
      alert('Solicitud de amistad enviada');
    } catch (error: any) {
      alert(error.message || 'Error al enviar solicitud');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.onClose.emit();
  }
}