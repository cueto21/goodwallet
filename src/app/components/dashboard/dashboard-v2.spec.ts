import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardV2 } from './dashboard-v2';

describe('DashboardV2', () => {
  let component: DashboardV2;
  let fixture: ComponentFixture<DashboardV2>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardV2]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardV2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
