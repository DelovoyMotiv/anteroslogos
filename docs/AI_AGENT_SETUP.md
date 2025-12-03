# GEO Marketolog AI Agent - Setup Guide

## 📋 Overview

**GEO Marketolog** - это встроенный AI-агент, который автоматически генерирует персонализированные рекомендации на основе результатов аудита сайта. Агент работает на базе OpenRouter API и использует LLM модели для анализа.

### Ключевые особенности:

✅ **Скрыт от пользователя** - работает в фоне, без UI чата  
✅ **Автоматическая генерация** - рекомендации создаются во время аудита  
✅ **Graceful fallback** - если API недоступен, используются дефолтные рекомендации  
✅ **Бесплатные модели** - поддержка free-tier моделей OpenRouter  
✅ **Production-ready** - полная типизация, error handling, timeout защита

---

## 🚀 Quick Start

### 1. Получить API ключ

1. Зарегистрироваться на [OpenRouter.ai](https://openrouter.ai/)
2. Перейти в [Keys](https://openrouter.ai/keys)
3. Создать новый API ключ

### 2. Настроить environment

Скопируйте `.env.example` в `.env`:

```bash
cp .env.example .env
```

Добавьте ваш API ключ:

```env
VITE_OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
VITE_OPENROUTER_MODEL=meta-llama/llama-3.2-3b-instruct:free
```

### 3. Запустить проект

```bash
npm run dev
```

AI Agent автоматически активируется при наличии API ключа.

---

## 🎯 Архитектура

```
utils/
├── ai/
│   ├── openrouter.ts          # OpenRouter API client
│   └── geoMarketologAgent.ts  # AI Agent service
└── geoAuditEnhanced.ts        # Audit engine (интегрирован с AI)

components/
└── AnalysisProgress.tsx        # UI с индикацией AI этапа
```

### Процесс работы:

1. **Аудит сайта** → выполняется полный технический анализ (9 категорий)
2. **Подготовка данных** → извлекаются критичные проблемы и сильные стороны
3. **AI генерация** → агент получает данные и создает рекомендации через LLM
4. **Fallback** → если AI недоступен, используются дефолтные рекомендации
5. **Результат** → пользователь получает либо AI, либо дефолтные рекомендации

---

## 🤖 Доступные модели

### Бесплатные (Free Tier):

| Модель | Скорость | Качество | Рекомендация |
|--------|----------|----------|--------------|
| `meta-llama/llama-3.2-3b-instruct:free` | ⚡⚡⚡ | ⭐⭐⭐⭐ | **Recommended** |
| `meta-llama/llama-3.2-1b-instruct:free` | ⚡⚡⚡⚡ | ⭐⭐⭐ | Faster, lower quality |
| `google/gemma-2-9b-it:free` | ⚡⚡ | ⭐⭐⭐⭐ | Good for long responses |
| `microsoft/phi-3-mini-128k-instruct:free` | ⚡⚡⚡⚡ | ⭐⭐⭐ | Very fast |

### Платные (Paid - лучшее качество):

| Модель | Цена | Качество | Рекомендация |
|--------|------|----------|--------------|
| `anthropic/claude-3.5-sonnet` | ~$3/1M tokens | ⭐⭐⭐⭐⭐ | Best quality |
| `openai/gpt-4-turbo` | ~$10/1M tokens | ⭐⭐⭐⭐⭐ | Excellent |
| `google/gemini-pro-1.5` | ~$1.25/1M tokens | ⭐⭐⭐⭐ | Good balance |

### Как выбрать модель:

**Для development/testing:**  
→ `meta-llama/llama-3.2-3b-instruct:free`

**Для production (бесплатно):**  
→ `meta-llama/llama-3.2-3b-instruct:free` или `google/gemma-2-9b-it:free`

**Для премиум качества:**  
→ `anthropic/claude-3.5-sonnet` или `google/gemini-pro-1.5`

---

## ⚙️ Configuration Options

### Environment Variables:

```env
# Required
VITE_OPENROUTER_API_KEY=          # Your API key

# Optional
VITE_OPENROUTER_MODEL=            # Model name (default: llama-3.2-3b)
VITE_APP_URL=                     # Your site URL for tracking
```

### Programmatic Configuration:

```typescript
import { auditWebsite } from './utils/geoAuditEnhanced';

// Disable AI (use default recommendations only)
const result = await auditWebsite(url, { useAI: false });

// Enable AI with progress callback
const result = await auditWebsite(url, {
  useAI: true,
  onProgress: (stage) => console.log(stage)
});
```

---

## 🧪 Testing

### Test без API ключа (fallback):

```bash
# Удалить API key из .env
# VITE_OPENROUTER_API_KEY=

npm run dev
```

Результат: используются дефолтные рекомендации

### Test с невалидным API ключом:

```env
VITE_OPENROUTER_API_KEY=invalid-key
```

Результат: AI пытается сгенерировать → ошибка → fallback на дефолтные

### Test с валидным API ключом:

```env
VITE_OPENROUTER_API_KEY=sk-or-v1-your-real-key
```

Результат: AI генерирует персонализированные рекомендации

---

## 📊 Monitoring & Debugging

### Консоль браузера:

AI Agent логирует все действия:

```
✓ AI recommendations generated successfully
→ Using fallback recommendations
→ AI Agent not configured, using default recommendations
```

### Error Handling:

Все ошибки логируются, но **не прерывают** работу приложения:

```typescript
try {
  // AI generation
} catch (error) {
  console.error('AI Agent error:', error);
  // Fallback to defaults
}
```

### Timeout Protection:

AI запросы имеют timeout 30 секунд:

```typescript
timeout: 30000 // 30s
```

Если модель не ответила вовремя → fallback на дефолтные рекомендации.

---

## 🎨 Prompt Engineering

AI Agent использует structured prompt с персоной **"GEO Marketolog"**:

### Система:
```
Ты - GEO Marketolog, экспертный ИИ-агент компании Anóteros Lógos.

ПРИНЦИПЫ:
1. Конкретность (не "улучшить контент", а "добавить 5 фактов")
2. Приоритет (quick-wins → strategic changes)
3. Метрики (impact + время реализации)
4. Реализуемость (только то, что можно сделать сегодня)
```

### Входные данные:
- Overall Score
- 10 категорий scores
- Топ-3 слабых места
- Топ-3 сильных сторон
- Критичные проблемы
- Преимущества

### Выходные данные:
```json
{
  "recommendations": [
    {
      "category": "Schema Markup",
      "priority": "critical",
      "effort": "quick-win",
      "title": "Add Organization Schema",
      "description": "...",
      "impact": "Increases citation by 40%",
      "implementation": "Step by step...",
      "estimatedTime": "30 minutes"
    }
  ],
  "insights": [
    "Strategic insight 1",
    "Key opportunity 2",
    "Risk to address 3"
  ]
}
```

---

## 💰 Cost Estimation

### Free Models (0 cost):

- Unlimited requests
- Rate limits: зависят от модели (обычно 100-200 req/min)
- Отлично для development и небольших проектов

### Paid Models:

**Пример: Claude 3.5 Sonnet**

- Prompt: ~800 tokens (аудит данные)
- Response: ~1000 tokens (рекомендации)
- **Total: ~1800 tokens per audit**

Стоимость:
- Claude 3.5: $3 per 1M tokens = **$0.0054 per audit**
- 1000 audits = ~$5.40
- 10,000 audits = ~$54

**Gemini Pro 1.5** (дешевле):
- $1.25 per 1M tokens = **$0.00225 per audit**
- 10,000 audits = ~$22.50

---

## 🔒 Security Best Practices

### ✅ DO:

- Store API key in `.env` (not `.env.example`)
- Add `.env` to `.gitignore`
- Use environment variables for client-side code (`VITE_*`)
- Rotate API keys regularly
- Monitor usage on OpenRouter dashboard

### ❌ DON'T:

- Commit API keys to git
- Share API keys in public
- Use same key for dev/prod
- Hardcode API keys in source code

---

## 🐛 Troubleshooting

### Problem: "AI Agent not configured"

**Solution:** Добавить `VITE_OPENROUTER_API_KEY` в `.env`

---

### Problem: "OpenRouter API error: Invalid API key"

**Solution:** Проверить API ключ на [OpenRouter Keys](https://openrouter.ai/keys)

---

### Problem: "AI request timeout"

**Причины:**
- Медленная модель
- Перегрузка OpenRouter
- Плохое интернет-соединение

**Solution:** 
- Использовать более быструю модель
- Увеличить timeout в `geoMarketologAgent.ts`

---

### Problem: Recommendations качество низкое

**Solution:**
- Попробовать другую модель (Gemini, Claude)
- Улучшить prompt в `openrouter.ts` → `buildSystemPrompt()`
- Добавить больше контекста в user prompt

---

## 📚 API Reference

### `auditWebsite(url, options)`

Main audit function with AI integration.

**Parameters:**
- `url: string` - Website URL to audit
- `options?: object`
  - `useAI?: boolean` - Enable AI Agent (default: `true`)
  - `onProgress?: (stage: string) => void` - Progress callback

**Returns:**
- `Promise<AuditResult>` - Complete audit result with AI recommendations

**Example:**
```typescript
const result = await auditWebsite('https://example.com', {
  useAI: true,
  onProgress: (stage) => console.log(stage)
});
```

---

### `getGeoMarketologAgent()`

Get singleton AI Agent instance.

**Returns:**
- `GeoMarketologAgent` - Agent instance

**Methods:**
- `isReady(): boolean` - Check if agent is configured
- `getStatus()` - Get agent configuration status
- `generateRecommendations(auditResult)` - Generate AI recommendations

**Example:**
```typescript
import { getGeoMarketologAgent } from './utils/ai/geoMarketologAgent';

const agent = getGeoMarketologAgent();

if (agent.isReady()) {
  const result = await agent.generateRecommendations(auditResult);
}
```

---

## 🎓 Advanced Usage

### Custom Agent Configuration:

```typescript
import { GeoMarketologAgent } from './utils/ai/geoMarketologAgent';

const agent = new GeoMarketologAgent({
  enabled: true,
  fallbackToDefault: true,
  timeout: 60000 // 60 seconds
});
```

### Disable AI for specific pages:

```typescript
// In your component
const handleAudit = async (url: string) => {
  // Force disable AI for demo/testing
  const result = await auditWebsite(url, { useAI: false });
};
```

### Custom prompt modification:

Edit `utils/ai/openrouter.ts` → `buildSystemPrompt()` to customize AI behavior.

---

## 📈 Roadmap

**Current (v1.0):**
- ✅ OpenRouter integration
- ✅ Free model support
- ✅ Graceful fallback
- ✅ Progress indication

**Coming Soon (v1.1):**
- 🔄 Caching for repeat audits
- 🔄 Model selection UI
- 🔄 Usage analytics dashboard
- 🔄 Multi-language support

**Future (v2.0):**
- 🔮 Fine-tuned GEO model
- 🔮 Real-time streaming responses
- 🔮 A/B testing different prompts
- 🔮 Custom recommendation templates

---

## 💡 Tips & Best Practices

1. **Start with free models** - test thoroughly before paying
2. **Monitor API usage** - check OpenRouter dashboard regularly
3. **Cache results** - avoid re-analyzing same URLs
4. **Optimize prompts** - shorter prompts = faster + cheaper
5. **Test fallback** - ensure app works without AI

---

## 🤝 Support

**Issues:**  
GitHub Issues - [Report bug](https://github.com/your-repo/issues)

**Questions:**  
Email - support@anoteros-logos.com

**OpenRouter Docs:**  
[OpenRouter Documentation](https://openrouter.ai/docs)

---

**Document Version:** 1.0  
**Last Updated:** November 4, 2025  
**Author:** Anóteros Lógos Development Team
