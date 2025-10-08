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
      // parse and clamp to viewport to avoid being off-screen
      let px = parseInt(savedX, 10);
      let py = parseInt(savedY, 10);
      if (isNaN(px) || isNaN(py)) {
        px = window.innerWidth - 56; // 36px width + 20px margin
        py = Math.floor(window.innerHeight / 2 - 18); // center for 36px height
      } else {
        // clamp coordinates to viewport (leave 10px margin)
        const maxX = Math.max(0, window.innerWidth - 36 - 10);
        const maxY = Math.max(0, window.innerHeight - 36 - 10);
        px = Math.max(10, Math.min(px, maxX));
        py = Math.max(10, Math.min(py, maxY));
      }
      this.currentX.set(px);
      this.currentY.set(py);
      this.updatePosition();
    } else {
      // Default position: right side, middle
      this.currentX.set(window.innerWidth - 56); // 36px width + 20px margin
      this.currentY.set(window.innerHeight / 2 - 18); // Center vertically for 36px height
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
    // If a recent drag set preventClick, allow closing the dropdown by clicking
    // the gear (but still prevent opening immediately after a drag).
    if (this.preventClick && !this.dropdownOpen()) {
      // clicking while prevented and dropdown closed -> ignore (prevents accidental open)
      this.preventClick = false;
      return;
    }

    const isLeft = this.currentX() < window.innerWidth / 2;
    this.dropdownClass.set(isLeft ? 'left' : 'right');
    this.dropdownOpen.update(v => !v);

    // clear the preventClick flag so subsequent clicks behave normally
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
    // Only potential drag if pointer is on the button element
    const target = event.target as HTMLElement;
    const btn = this.elRef.nativeElement.querySelector('.theme-btn') as HTMLElement;
    if (!btn || !btn.contains(target)) return;

    event.preventDefault();
    event.stopPropagation();

    this.pointerId = event.pointerId;
    this.preventClick = false; // allow click unless movement threshold exceeded
    this.isDragging.set(false); // WILL become true only after threshold
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.initialX = this.currentX();
    this.initialY = this.currentY();

    // Capture pointer (best effort)
    try {
      if (btn && typeof (btn as any).setPointerCapture === 'function') {
        (btn as any).setPointerCapture(event.pointerId);
      }
    } catch {}

    // Attach listeners
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
  }

  private onPointerMove(e: PointerEvent) {
    if (this.pointerId === null || e.pointerId !== this.pointerId) return;

    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;

    // Movement threshold (in px) to distinguish click from drag
    const threshold = 5;
    if (!this.isDragging()) {
      if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
        return; // still a potential click
      }
      // Threshold passed -> begin drag
      this.isDragging.set(true);
      this.preventClick = true; // block opening via impending click
      // Close dropdown only once actual drag starts
      if (this.dropdownOpen()) this.dropdownOpen.set(false);
      // Add dragging classes
      const container = this.elRef.nativeElement.querySelector('.theme-selector') as HTMLElement;
      const button = this.elRef.nativeElement.querySelector('.theme-btn') as HTMLElement;
      if (container) container.classList.add('dragging');
      if (button) button.classList.add('dragging');
    }

    let newX = this.initialX + deltaX;
    let newY = this.initialY + deltaY;
    const btnWidth = 36;
    const btnHeight = 36;
    newX = Math.max(0, Math.min(window.innerWidth - btnWidth, newX));
    newY = Math.max(0, Math.min(window.innerHeight - btnHeight, newY));

    this.currentX.set(newX);
    this.currentY.set(newY);
    this.updatePosition();
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

      // release pointer capture if available
      try {
        const btnEl = this.elRef.nativeElement.querySelector('.theme-btn') as HTMLElement;
        if (btnEl && this.pointerId !== null && typeof (btnEl as any).releasePointerCapture === 'function') {
          (btnEl as any).releasePointerCapture(this.pointerId);
        }
      } catch (err) {}

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
  const btnWidth = 36;
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
