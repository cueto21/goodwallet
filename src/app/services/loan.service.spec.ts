import { TestBed } from '@angular/core/testing';
import { LoanService } from './loan.service';
import { Loan } from '../models/loan.interface';

describe('LoanService', () => {
  let service: LoanService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add a new loan', () => {
    const initialCount = service.getLoans()().length;
    
    service.addLoan({
      amount: 1000,
      description: 'Test loan',
      date: new Date(),
      dueDate: new Date(),
      type: 'lent',
      personName: 'Test Person',
      status: 'pending'
    });

    expect(service.getLoans()().length).toBe(initialCount + 1);
  });

  it('should update loan status', () => {
    const loans = service.getLoans()();
    const firstLoan = loans[0];
    
    service.updateLoanStatus(firstLoan.id, 'paid');
    
    const updatedLoan = service.getLoans()().find(l => l.id === firstLoan.id);
    expect(updatedLoan?.status).toBe('paid');
  });

  it('should calculate total lent amount correctly', () => {
    const totalLent = service.getTotalLent();
    const lentLoans = service.getLentLoans();
    const expectedTotal = lentLoans().reduce((sum: number, loan: Loan) => sum + loan.amount, 0);
    
    expect(totalLent()).toBe(expectedTotal);
  });

  it('should calculate total borrowed amount correctly', () => {
    const totalBorrowed = service.getTotalBorrowed();
    const borrowedLoans = service.getBorrowedLoans();
    const expectedTotal = borrowedLoans().reduce((sum: number, loan: Loan) => sum + loan.amount, 0);
    
    expect(totalBorrowed()).toBe(expectedTotal);
  });
});
