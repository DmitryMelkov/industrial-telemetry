import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeToggleComponent } from '../../../shared/ui/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    ThemeToggleComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly form = this.formBuilder.group({
    email: ['operator@telemetry.local', [Validators.required, Validators.email]],
    password: ['password123', [Validators.required]],
  });

  submit = (): void => {
    if (this.form.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    const { email, password } = this.form.getRawValue();
    this.authService.login(email, password).subscribe({
      next: () => void this.router.navigate(['/overview']),
      error: () => {
        this.errorMessage.set('Не удалось войти. Проверьте email и пароль.');
        this.isSubmitting.set(false);
      },
    });
  };
}
