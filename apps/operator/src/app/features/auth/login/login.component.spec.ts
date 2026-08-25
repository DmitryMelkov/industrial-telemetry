import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginComponent } from './login.component';

@Component({
  standalone: true,
  template: '',
})
class TestOverviewComponent {}

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authService: { login: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = { login: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        provideRouter([{ path: 'overview', component: TestOverviewComponent }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should submit the default credentials', () => {
    authService.login.mockReturnValue(
      of({ id: '1', email: 'operator@telemetry.local', role: 'operator' }),
    );

    component.submit();

    expect(authService.login).toHaveBeenCalledWith('operator@telemetry.local', 'password123');
  });

  it('should show an error when login fails', () => {
    authService.login.mockReturnValue(throwError(() => new Error('Unauthorized')));

    component.submit();

    expect(component.errorMessage()).toContain('Не удалось войти');
    expect(component.isSubmitting()).toBe(false);
  });
});
