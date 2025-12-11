# Google OAuth Setup Guide

## Шаг 1: Google Cloud Console

### 1.1 Создайте проект
1. Перейдите: https://console.cloud.google.com/
2. Нажмите на выпадающий список проектов (вверху)
3. Нажмите **NEW PROJECT**
4. Название: `Anoteros Logos`
5. Нажмите **CREATE**

### 1.2 Настройте OAuth Consent Screen
1. В меню слева: **APIs & Services** → **OAuth consent screen**
2. Выберите **External** → **CREATE**
3. Заполните форму:
   - **App name**: `Anoteros Logos`
   - **User support email**: ваш email
   - **App logo**: (опционально)
   - **App domain** → **Application home page**: `https://anteroslogos.vercel.app`
   - **Authorized domains**: добавьте `anteroslogos.vercel.app`
   - **Developer contact information**: ваш email
4. Нажмите **SAVE AND CONTINUE**
5. На странице **Scopes** нажмите **ADD OR REMOVE SCOPES**
   - Выберите: `userinfo.email`, `userinfo.profile`, `openid`
   - Нажмите **UPDATE** → **SAVE AND CONTINUE**
6. На странице **Test users** нажмите **SAVE AND CONTINUE**
7. На странице **Summary** нажмите **BACK TO DASHBOARD**

### 1.3 Создайте OAuth Client ID
1. В меню слева: **APIs & Services** → **Credentials**
2. Нажмите **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Выберите **Application type**: **Web application**
4. **Name**: `Anoteros Logos Web Client`

5. **Authorized JavaScript origins** - нажмите **+ ADD URI** и добавьте:
   ```
   https://anteroslogos.vercel.app
   https://uixgwvyzptarzgwuwrmz.supabase.co
   http://localhost:5173
   ```

6. **Authorized redirect URIs** - нажмите **+ ADD URI** и добавьте:
   ```
   https://uixgwvyzptarzgwuwrmz.supabase.co/auth/v1/callback
   https://anteroslogos.vercel.app/auth/callback
   http://localhost:5173/auth/callback
   ```

7. Нажмите **CREATE**

### 1.4 Сохраните учетные данные
После создания появится окно с:
- **Your Client ID**: `123456789-abc.apps.googleusercontent.com`
- **Your Client Secret**: `GOCSPX-abc123...`

**ВАЖНО**: Скопируйте оба значения!

## Шаг 2: Supabase Configuration

1. Перейдите: https://supabase.com/dashboard/project/uixgwvyzptarzgwuwrmz
2. В меню слева: **Authentication** → **Providers**
3. Найдите **Google** и нажмите на него
4. Включите переключатель **Enable Sign in with Google**
5. Вставьте данные из Google Cloud Console:
   - **Client IDs**: вставьте ваш Client ID
   - **Client Secret (for OAuth)**: вставьте ваш Client Secret
6. **Callback URL** уже заполнен: `https://uixgwvyzptarzgwuwrmz.supabase.co/auth/v1/callback`
7. Нажмите **Save**

## Шаг 3: Проверка

1. Откройте: https://anteroslogos.vercel.app/signup
2. Нажмите кнопку **Continue with Google**
3. Должно открыться окно выбора Google аккаунта
4. После выбора аккаунта вы будете перенаправлены обратно на сайт
5. Проверьте, что вы вошли в систему

## Troubleshooting

### Ошибка "redirect_uri_mismatch"
- Убедитесь, что все redirect URIs добавлены в Google Cloud Console
- Проверьте, что нет лишних пробелов или символов
- URL должны точно совпадать (включая https://)

### Ошибка "Access blocked: This app's request is invalid"
- Проверьте, что OAuth Consent Screen настроен
- Убедитесь, что добавлены необходимые scopes
- Проверьте, что домен добавлен в Authorized domains

### Кнопка не работает
- Откройте консоль браузера (F12)
- Проверьте наличие ошибок
- Убедитесь, что Supabase credentials настроены в Vercel

## Текущая конфигурация

- **Supabase URL**: https://uixgwvyzptarzgwuwrmz.supabase.co
- **Production Domain**: https://anteroslogos.vercel.app
- **Callback URL**: https://uixgwvyzptarzgwuwrmz.supabase.co/auth/v1/callback
- **Redirect After Auth**: https://anteroslogos.vercel.app/auth/callback

## Важные замечания

1. После настройки Google OAuth может потребоваться до 5 минут для применения изменений
2. В режиме разработки (Testing) только добавленные Test users смогут войти
3. Для публичного доступа нужно опубликовать приложение (Publish app) в OAuth Consent Screen
4. Google требует верификацию приложения, если запрашиваются sensitive scopes
