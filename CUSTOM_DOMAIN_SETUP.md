# Custom Domain Setup (anoteroslogos.com)

## Проблема
После успешной аутентификации через Google, пользователь перенаправляется на `localhost` вместо `anoteroslogos.com`.

## Причина
Приложение настроено на домен `anteroslogos.vercel.app`, а не на кастомный домен `anoteroslogos.com`.

## Решение

### 1. Обновите Supabase Redirect URLs

Перейдите: https://supabase.com/dashboard/project/uixgwvyzptarzgwuwrmz/auth/url-configuration

Добавьте в **Redirect URLs**:
```
https://anoteroslogos.com/**
https://anoteroslogos.com/auth/callback
https://anoteroslogos.com/dashboard
https://anoteroslogos.com/dashboard/**
```

Обновите **Site URL**:
```
https://anoteroslogos.com
```

### 2. Обновите Google OAuth настройки

Перейдите: https://console.cloud.google.com/apis/credentials

Найдите ваш OAuth 2.0 Client ID и добавьте:

**Authorized JavaScript origins**:
```
https://anoteroslogos.com
```

**Authorized redirect URIs**:
```
https://uixgwvyzptarzgwuwrmz.supabase.co/auth/v1/callback
https://anoteroslogos.com/auth/callback
```

### 3. Обновите Vercel Environment Variables

Перейдите: https://vercel.com/delovoymotiv/anteroslogos/settings/environment-variables

Обновите или добавьте переменные для **Production**:

| Variable Name | Value |
|--------------|-------|
| `VITE_SITE_URL` | `https://anoteroslogos.com` |
| `VITE_AUTH_REDIRECT_URL` | `https://anoteroslogos.com/auth/callback` |
| `VITE_SUPABASE_URL` | `https://uixgwvyzptarzgwuwrmz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpeGd3dnl6cHRhcnpnd3V3cm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3Njk1MjUsImV4cCI6MjA4MDM0NTUyNX0._29jikBOLaMcazo1JLTOHPnfSivQglTjBIQnF3tk3qo` |

**ВАЖНО**: После обновления переменных нужно сделать новый деплой!

### 4. Проверьте Vercel Custom Domain

Убедитесь, что домен `anoteroslogos.com` правильно настроен в Vercel:

1. Перейдите: https://vercel.com/delovoymotiv/anteroslogos/settings/domains
2. Проверьте, что `anoteroslogos.com` добавлен и активен
3. Проверьте DNS записи:
   - A record: `76.76.21.21`
   - CNAME record: `cname.vercel-dns.com`

### 5. Сделайте новый деплой

После обновления всех настроек:

```bash
git add .
git commit -m "fix: update redirect URLs for custom domain anoteroslogos.com"
git push origin main
```

Vercel автоматически задеплоит изменения.

### 6. Проверка

1. Откройте: https://anoteroslogos.com/signup
2. Нажмите **Continue with Google**
3. Выберите Google аккаунт
4. После успешной аутентификации вы должны быть перенаправлены на `https://anoteroslogos.com/auth/callback`
5. Затем на `https://anoteroslogos.com/dashboard`

## Важные замечания

1. **Оба домена должны работать**:
   - `anoteroslogos.com` (основной)
   - `anteroslogos.vercel.app` (резервный)

2. **Добавьте оба домена везде**:
   - В Supabase Redirect URLs
   - В Google OAuth настройках
   - В Vercel Environment Variables (для Preview и Development можно оставить vercel.app)

3. **Время применения изменений**:
   - Supabase: 1-2 минуты
   - Google OAuth: до 5 минут
   - Vercel: сразу после деплоя
   - DNS: до 48 часов (обычно 5-10 минут)

## Текущая конфигурация

- **Primary Domain**: https://anoteroslogos.com
- **Vercel Domain**: https://anteroslogos.vercel.app
- **Supabase URL**: https://uixgwvyzptarzgwuwrmz.supabase.co
- **Auth Callback**: https://anoteroslogos.com/auth/callback
- **Dashboard**: https://anoteroslogos.com/dashboard
