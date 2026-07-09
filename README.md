# Карточки

Mini App для Telegram и VK: учебные карточки, наборы, повторение и дальнейшее подключение FSRS.

## Первый сценарий MVP

1. Пользователь открывает Mini App.
2. Backend создает или находит платформенный профиль.
3. Пользователь создает набор.
4. Пользователь добавляет карточки.
5. Пользователь запускает базовое повторение.
6. Результат повторения сохраняется.

## Локальный запуск

```bash
npm install
npm run prisma:generate
npm run dev:backend
npm run dev:web
```

## Как открыть приложение сейчас

1. Поднять PostgreSQL:

```bash
docker compose up -d
```

2. Создать файл `.env` по примеру `.env.example`.

3. Применить схему базы:

```bash
npm run prisma:migrate
```

4. В двух отдельных терминалах запустить backend и frontend:

```bash
npm run dev:backend
npm run dev:web
```

5. Открыть web-версию:

```text
http://localhost:5173
```

Пока это dev-режим без настоящей проверки Telegram/VK, но основной сценарий уже можно пройти в браузере.
