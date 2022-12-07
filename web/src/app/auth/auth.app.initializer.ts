import { AuthService } from './auth.service';

export function AuthAppInitializer(authService: AuthService): () => Promise<void> {
    // attempt to refresh token on app start up to auto authenticate
    return () => authService.refreshTokenIfNotLogout();
}