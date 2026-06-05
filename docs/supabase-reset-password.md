# Supabase Password Reset Configuration

## 1. Configure Redirect URLs in Supabase Dashboard

Go to **Supabase Dashboard → Authentication → URL Configuration**:

### Site URL
```
https://nagriva.com
```

### Redirect URLs
Add ALL of the following:
```
http://localhost:3000/pages/reset-password.html
http://localhost:5173/pages/reset-password.html
http://localhost:8080/pages/reset-password.html
https://nagriva.com/pages/reset-password.html
https://www.nagriva.com/pages/reset-password.html
```

For production, add any other custom domain:
```
https://*.vercel.app/pages/reset-password.html
```

## 2. (Optional) Customize Email Template

Go to **Authentication → Email Templates → Reset Password**

Edit the template. The magic link variable `{{ .SiteURL }}` will use the `redirectTo` parameter from the client code. The default template is fine but you can customize the HTML.

## 3. Verify Auth Settings

- **Authentication → Settings → General**
  - Confirm "Confirmable users" is ON (email confirmation)
  - Confirm "Security → Max forward duration" is set appropriately (default 3600s = 1 hour for the reset link expiry)

## 4. How It Works

1. User enters email on `/pages/forgot-password.html`
2. `supabaseClient.auth.resetPasswordForEmail(email, { redirectTo })` sends email
3. Supabase sends email with link containing an access token in the URL hash
4. User clicks link → lands on `/pages/reset-password.html#access_token=xxx`
5. `supabaseClient` (with `detectSessionInUrl: true`) reads the hash, exchanges token for session
6. `auth.getSession()` returns the session — form is shown
7. User submits new password → `auth.updateUser({ password })` updates it

## 5. Verification Checklist

- [ ] Redirect URLs configured in Supabase Dashboard
- [ ] `detectSessionInUrl: true` in `supabase-config.js` (already set)
- [ ] `redirectTo` in `forgot-password.html` matches the reset page URL
- [ ] Reset link works on `localhost` during development
- [ ] Reset link works on `nagriva.com` in production
