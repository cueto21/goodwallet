import { Component, EventEmitter, Input, Output, OnInit, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardStyle, BankType } from '../../models/account.interface';
import { CardStyleService } from '../../services/card-style.service';
import type { CardStyleOption } from '../../services/card-style.service';

@Component({
  selector: 'app-card-style-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-style-selector.component.html'
})
export class CardStyleSelectorComponent implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() currentStyle?: CardStyle;
  @Output() styleSelected = new EventEmitter<CardStyle>();
  @Output() closed = new EventEmitter<void>();

  private cardStyleService = inject(CardStyleService);
  
  cardTypeGroups: { type: 'debit' | 'visa' | 'mastercard', name: string, styles: CardStyleOption[] }[] = [];
  selectedStyle: CardStyleOption | null = null;

  ngOnInit() {
    console.log('CardStyleSelector ngOnInit called');
    this.loadCardTypeGroups();
    console.log('Card types loaded:', this.cardTypeGroups.length);
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('CardStyleSelector ngOnChanges called with:', changes);
    if (changes['isVisible']) {
      console.log('CardStyleSelector isVisible changed from:', changes['isVisible'].previousValue, 'to:', changes['isVisible'].currentValue);
      
      // Controlar el scroll del body cuando el modal se abre/cierra
      if (changes['isVisible'].currentValue) {
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-open');
      } else {
        document.body.style.overflow = '';
        document.body.classList.remove('modal-open');
      }
    }
    if (changes['currentStyle']) {
      console.log('CardStyleSelector currentStyle changed from:', changes['currentStyle'].previousValue, 'to:', changes['currentStyle'].currentValue);
    }
  }

  private loadCardTypeGroups() {
    console.log('Loading card type groups...');
    const stylesByType = this.cardStyleService.getStylesByCardType();
    console.log('Styles by type:', stylesByType);
    
    this.cardTypeGroups = [
      { 
        type: 'debit', 
        name: this.cardStyleService.getCardTypeName('debit'),
        styles: stylesByType.debit 
      },
      { 
        type: 'visa', 
        name: this.cardStyleService.getCardTypeName('visa'),
        styles: stylesByType.visa 
      },
      { 
        type: 'mastercard', 
        name: this.cardStyleService.getCardTypeName('mastercard'),
        styles: stylesByType.mastercard 
      }
    ];
    
    console.log('Final cardTypeGroups:', this.cardTypeGroups);
  }

  getBankName(bank: BankType): string {
    return this.cardStyleService.getBankName(bank);
  }

  getShortName(fullName: string): string {
    // Acortar nombres para que se vean bien en tarjetas
    return fullName.replace('Tarjetas de ', '')
                  .replace('Débito', 'Déb.')
                  .replace('Classic', 'Clásica')
                  .replace('Standard', 'Estándar')
                  .replace('Platinum', 'Plat.')
                  .replace('Signature', 'Sig.')
                  .replace('Titanium', 'Tit.');
  }

  isSelected(style: CardStyleOption): boolean {
    if (this.selectedStyle) {
      // Si hay una tarjeta seleccionada manualmente, solo esa debe aparecer seleccionada
      return this.selectedStyle === style;
    }
    // Si no hay selección manual, mostrar la actual del componente padre
    return this.currentStyle ? 
      style.cardType === this.currentStyle.cardType && 
      style.bank === this.currentStyle.bank : false;
  }

  selectStyle(style: CardStyleOption) {
    // Limpiar selección anterior y establecer nueva
    this.selectedStyle = style;
    console.log('Tarjeta seleccionada:', style.name);
  }

  trackByStyle(index: number, style: CardStyleOption): string {
    return `${style.bank}-${style.cardType}`;
  }

  onConfirm() {
    if (this.selectedStyle) {
      const cardStyle: CardStyle = {
        gradient: this.selectedStyle.gradient,
        cardType: this.selectedStyle.cardType,
        bank: this.selectedStyle.bank
      };
      this.styleSelected.emit(cardStyle);
    }
  }

  onClose() {
    // Restaurar scroll del body
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    this.closed.emit();
  }
}
