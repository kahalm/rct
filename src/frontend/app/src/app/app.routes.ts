import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent) },
  { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'reset-password', loadComponent: () => import('./features/auth/reset-password.component').then(m => m.ResetPasswordComponent) },
  { path: 'profile', canActivate: [authGuard], loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
  // Das eine Feature: die Trial-Seite (Guidelines + Start + Review-Video).
  { path: 'trial', canActivate: [authGuard], loadComponent: () => import('./features/trial/trial.component').then(m => m.TrialComponent) },
  // Der Kalkulations-Trainer (verbatim aus RookHub) läuft unter RookHubs Routen-Form
  // /courses/:bookId/calc — so bleibt die Komponente unangetastet. Der „Zurück zu den
  // Kursen"-Link der Komponente (/courses) landet auf der Trial-Seite.
  { path: 'admin/chapters', canActivate: [authGuard, adminGuard], loadComponent: () => import('./features/admin/chapter-authoring.component').then(m => m.ChapterAuthoringComponent) },
  { path: 'admin/users', canActivate: [authGuard, adminGuard], loadComponent: () => import('./features/admin/user-admin.component').then(m => m.UserAdminComponent) },
  { path: 'courses/:bookId/calc', canActivate: [authGuard], loadComponent: () => import('./features/courses/calc/calculation.component').then(m => m.CalculationComponent) },
  { path: 'courses', redirectTo: 'trial' },
  { path: '', redirectTo: 'trial', pathMatch: 'full' },
  { path: '**', redirectTo: 'trial' },
];
