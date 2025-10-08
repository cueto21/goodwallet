import { Component, inject, signal, ElementRef, Renderer2, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '../../services/theme.service';

@Component({
  selector: 'app-theme-selector',
  imports: [CommonModule],
  templateUrl: './theme-selector.html',
  styleUrl: './theme-selector.scss'
})
export class ThemeSelector implements OnInit, OnDestroy {
  private themeService = inject(ThemeService);
  private elRef = inject(ElementRef);
  private renderer = inject(Renderer2);

  themes = this.themeService.getThemes();
  currentThemeIndex = this.themeService.currentThemeIndex;
  dropdownOpen = signal(false);
  dropdownClass = signal('right');

  // Drag functionality (pointer-based)
  isDragging = signal(false);
  pointerId: number | null = null; // track active pointer when dragging
  dragStartX = 0;
  dragStartY = 0;
  initialX = 0;
  initialY = 0;
  currentX = signal(0);
  currentY = signal(0);
  preventClick = false;

  private mouseMoveListener?: () => void;
  private mouseUpListener?: () => void;
  private touchMoveListener?: () => void;
  private touchEndListener?: () => void;
  private pointerMoveListener?: () => void;
  private pointerUpListener?: () => void;
  private pointerCancelListener?: () => void;
  private documentClickListener?: () => void;

  ngOnInit() {
    // Load saved position from localStorage
    const savedX = localStorage.getItem('theme-btn-x');
    const savedY = localStorage.getItem('theme-btn-y');
    if (savedX && savedY) {
      this.currentX.set(parseInt(savedX, 10));
      this.currentY.set(parseInt(savedY, 10));
      this.updatePosition();
    } else {
      // Default position: right side, middle
      this.currentX.set(window.innerWidth - 70); // 50px width + 20px margin
      this.currentY.set(window.innerHeight / 2 - 25); // Center vertically
    }

    // Add listener to close dropdown when clicking outside (ignore while actively dragging)
    this.documentClickListener = this.renderer.listen('document', 'click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const container = this.elRef.nativeElement;

      // If a drag is in progress, ignore outside clicks
      if (this.isDragging()) return;

      if (!container.contains(target) && this.dropdownOpen()) {
        this.dropdownOpen.set(false);
        // cleanup any listeners
        this.removeEventListeners();
        console.debug('[theme-selector] closed by outside click', { x: this.currentX(), y: this.currentY() });
      }
    });
  }

  /** Restore last saved position from localStorage (or currentX/currentY if none) */
  private restoreSavedPosition() {
    const savedX = localStorage.getItem('theme-btn-x');
    const savedY = localStorage.getItem('theme-btn-y');
    // Only restore if we explicitly have saved coordinates. If not, do nothing
    // — avoid applying potentially stale runtime values that could move the button.
    if (savedX && savedY) {
      this.currentX.set(parseInt(savedX, 10));
      this.currentY.set(parseInt(savedY, 10));
      this.updatePosition();
    }
  }

  ngOnDestroy() {
    this.removeEventListeners();
    if (this.documentClickListener) {
      this.documentClickListener();
      this.documentClickListener = undefined;
    }
  }

  toggleDropdown() {
    if (!this.preventClick) {
      const isLeft = this.currentX() < window.innerWidth / 2;
      this.dropdownClass.set(isLeft ? 'left' : 'right');
      this.dropdownOpen.update(v => !v);
    }
    this.preventClick = false;
  }

  selectTheme(index: number) {
    this.themeService.setTheme(index);
    this.dropdownOpen.set(false);
  }

  getCurrentTheme(): Theme {
    return this.themeService.getCurrentTheme();
  }

  // Pointer-based handlers to unify mouse/touch and avoid outside-click moving
  onPointerDown(event: PointerEvent) {
    // Only start drag if pointer is on the button element
    const target = event.target as HTMLElement;
    const btn = this.elRef.nativeElement.querySelector('.theme-btn') as HTMLElement;
    if (!btn || !btn.contains(target)) return;

    // Prevent default behavior and stop propagation
    event.preventDefault();
    event.stopPropagation();

    this.pointerId = event.pointerId;
    this.preventClick = false;
    this.isDragging.set(true); // Start dragging immediately
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.initialX = this.currentX();
    this.initialY = this.currentY();

    // Close dropdown when starting to drag
    this.dropdownOpen.set(false);

    // Add dragging class to disable transitions
    const container = this.elRef.nativeElement.querySelector('.theme-selector') as HTMLElement;
    const button = this.elRef.nativeElement.querySelector('.theme-btn') as HTMLElement;
    if (container) container.classList.add('dragging');
    if (button) button.classList.add('dragging');

    // Remove pointer capture - use simple document listeners instead
    // Attach listeners to document for better coverage
    this.pointerMoveListener = this.renderer.listen('document', 'pointermove', (e: PointerEvent) => {
      if (e.pointerId === this.pointerId) {
        e.preventDefault();
        this.onPointerMove(e);
      }
    });
    this.pointerUpListener = this.renderer.listen('document', 'pointerup', (e: PointerEvent) => {
      if (e.pointerId === this.pointerId) {
        this.onPointerUp(e);
      }
    });
    this.pointerCancelListener = this.renderer.listen('document', 'pointercancel', (e: PointerEvent) => {
      if (e.pointerId === this.pointerId) {
        this.onPointerUp(e);
      }
    });
    console.debug('[theme-selector] pointerdown - dragging started', { pointerId: this.pointerId, x: this.dragStartX, y: this.dragStartY });
  }

  private onPointerMove(e: PointerEvent) {
    // Ensure this move belongs to the active pointer
    if (this.pointerId === null || e.pointerId !== this.pointerId) return;
    
    // If not dragging, ignore
    if (!this.isDragging()) return;

    const clientX = e.clientX;
    const clientY = e.clientY;
    const deltaX = clientX - this.dragStartX;
    const deltaY = clientY - this.dragStartY;

    this.preventClick = true;

    let newX = this.initialX + deltaX;
    let newY = this.initialY + deltaY;

    // Constrain to viewport
    const btnWidth = 50;
    const btnHeight = 50;
    newX = Math.max(0, Math.min(window.innerWidth - btnWidth, newX));
    newY = Math.max(0, Math.min(window.innerHeight - btnHeight, newY));

    this.currentX.set(newX);
    this.currentY.set(newY);
    this.updatePosition();
    console.debug('[theme-selector] move', { x: newX, y: newY });
  }

  private onPointerUp(e: PointerEvent) {
    // Only handle pointerups for the active pointer
    if (this.pointerId !== null && e.pointerId === this.pointerId) {
      if (this.isDragging()) {
        this.isDragging.set(false);
        
        // Snap to sides like messenger bubbles
        this.snapToSides();
        
        // Remove dragging class to restore transitions
        const container = this.elRef.nativeElement.querySelector('.theme-selector') as HTMLElement;
        const button = this.elRef.nativeElement.querySelector('.theme-btn') as HTMLElement;
        if (container) container.classList.remove('dragging');
        if (button) button.classList.remove('dragging');
        
        console.debug('[theme-selector] dragend', { x: this.currentX(), y: this.currentY() });
      }

      // cleanup
      this.pointerId = null;
      this.removeEventListeners();
      setTimeout(() => { this.preventClick = false; }, 20);
    }
  }

  private updatePosition() {
    const element = this.elRef.nativeElement.querySelector('.theme-selector') as HTMLElement;
    if (element) {
      element.style.left = `${this.currentX()}px`;
      element.style.top = `${this.currentY()}px`;
      element.style.right = 'auto';
      element.style.transform = 'none';
    }
  }

  private snapToSides() {
    const currentX = this.currentX();
    const currentY = this.currentY();
    const screenWidth = window.innerWidth;
    const btnWidth = 50;
    const margin = 10; // margin from edge
    
    // Determine if we're closer to left or right side
    const isCloserToLeft = currentX < (screenWidth / 2);
    
    // Snap to the closest side
    let newX: number;
    if (isCloserToLeft) {
      newX = margin; // Snap to left with margin
    } else {
      newX = screenWidth - btnWidth - margin; // Snap to right with margin
    }
    
    // Add snapping class for smooth animation
    const container = this.elRef.nativeElement.querySelector('.theme-selector') as HTMLElement;
    if (container) {
      container.classList.add('snapping');
      
      // Remove snapping class after animation completes
      setTimeout(() => {
        container.classList.remove('snapping');
      }, 300);
    }
    
    // Keep the current Y position (don't change vertical position)
    this.currentX.set(newX);
    this.updatePosition();
    this.savePosition();
    
    console.debug('[theme-selector] snapped to side', { 
      from: currentX, 
      to: newX, 
      side: isCloserToLeft ? 'left' : 'right' 
    });
  }

  private savePosition() {
    localStorage.setItem('theme-btn-x', this.currentX().toString());
    localStorage.setItem('theme-btn-y', this.currentY().toString());
  }

  private removeEventListeners() {
    if (this.mouseMoveListener) {
      this.mouseMoveListener();
      this.mouseMoveListener = undefined;
    }
    if (this.mouseUpListener) {
      this.mouseUpListener();
      this.mouseUpListener = undefined;
    }
    if (this.touchMoveListener) {
      this.touchMoveListener();
      this.touchMoveListener = undefined;
    }
    if (this.touchEndListener) {
      this.touchEndListener();
      this.touchEndListener = undefined;
    }
    if (this.pointerMoveListener) {
      this.pointerMoveListener();
      this.pointerMoveListener = undefined;
    }
    if (this.pointerUpListener) {
      this.pointerUpListener();
      this.pointerUpListener = undefined;
    }
    if (this.pointerCancelListener) {
      this.pointerCancelListener();
      this.pointerCancelListener = undefined;
    }
    // reset active pointer
    this.pointerId = null;
  }
}
