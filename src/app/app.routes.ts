import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent),
        canActivate: [authGuard]
    },
    {
        path: 'login',
        loadComponent: () => import('./components/auth/login.component').then(m => m.default)
    },
    {
        path: 'register',
        loadComponent: () => import('./components/auth/register.component').then(m => m.default)
    },
    {
        path: 'accounts',
        loadComponent: () => import('./components/accounts/accounts').then(m => m.AccountsComponent),
        canActivate: [authGuard]
    },
    {
        path: 'loans',
        loadComponent: () => import('./components/loans-v2/loans-v2.component').then(m => m.LoansV2Component),
        canActivate: [authGuard]
    },
    {
        path: 'recurring-transactions',
        loadComponent: () => import('./components/recurring-transactions/recurring-transactions.component').then(m => m.RecurringTransactionsComponent),
        canActivate: [authGuard]
    },
    {
        path: 'friends',
        loadComponent: () => import('./components/friends/friends').then(m => m.FriendsComponent),
        canActivate: [authGuard]
    },
    {
        path: 'backup',
        loadComponent: () => import('./components/data-backup/data-backup.component').then(m => m.DataBackupComponent),
        canActivate: [authGuard]
    }
];
