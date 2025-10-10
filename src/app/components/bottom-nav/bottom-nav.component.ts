import { Component, EventEmitter, Output, inject, ViewChildren, QueryList, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { ModalVisibilityService } from '../../services/modal-visibility.service';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.scss']
})
export class BottomNavComponent implements AfterViewInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() toggleAccount = new EventEmitter<void>();

  @ViewChildren('navItem') navItems!: QueryList<ElementRef>;
  @ViewChild('indicator') indicator!: ElementRef;

  private modalVisibility = inject(ModalVisibilityService);
  private router = inject(Router);
  private routerSub!: Subscription;

  ngAfterViewInit() {
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        setTimeout(() => this.updateIndicator(), 0); // Allow DOM to update
      }
    });
    // Initial positioning after routerLinkActive sets the active class
    setTimeout(() => this.updateIndicator(), 100);
  }

  ngOnDestroy() {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  updateIndicator() {
    const activeLi = this.navItems.find(item =>
      item.nativeElement.querySelector('a.active')
    );
    if (activeLi && this.indicator) {
      const liElement = activeLi.nativeElement;
      const indicatorWidth = 24;
      const left = liElement.offsetLeft + (liElement.offsetWidth - indicatorWidth) / 2;
      this.indicator.nativeElement.style.left = `${left}px`;
      this.indicator.nativeElement.style.width = `${indicatorWidth}px`;
    }
  }

  anyModalOpen() {
    return this.modalVisibility.anyModalOpen();
  }

  emitToggleSidebar() {
    this.toggleSidebar.emit();
  }

  emitToggleAccount() {
    this.toggleAccount.emit();
  }
}
