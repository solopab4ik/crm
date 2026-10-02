# Orbit — Mini CRM

CRM с ролями Client, Employee и Admin, серверным API, PostgreSQL через Netlify Database, заметками, журналом действий и Kanban-доской.

Деплой: Node.js 22, `npm run build`, publish directory `.next`, base directory пустой (корень репозитория `crm`). Настройки сохранены в `netlify.toml`. Миграции PostgreSQL находятся в `netlify/database/migrations/` и применяются Netlify при публикации. База подключается автоматически через `@netlify/database`; секреты в репозитории не нужны.

Проверки: `npm run test:postgres` проверяет API, роли, транзакции и связи таблиц на временной PostgreSQL. `npm run build` проверяет производственную сборку Next.js. Для локальной работы с базой используйте `npx netlify dev` после `npx netlify link`.

Переход с D1 создаёт отдельную базу PostgreSQL. Существующие данные локальной D1 автоматически не переносятся. При первом API-запросе создаются демонстрационные аккаунты и данные.

Полное описание, тестовые аккаунты, архитектура, permissions и команды запуска: [PROJECT.md](PROJECT.md).
