## Демо

Сейчас сервис запущен в виртуальной машине.  Доступен по адресу [http://185.105.89.11](http://185.105.89.11)

Начальная загрузка занимает довольно долго. Если получать историю за 30 мин, то 8-15 сек (500 кб).
Это, похоже, проблема сети в вируталке (я взял самый дешевый VPS).
В локальной сети то же самое загружается меньше секунды. Уменьшил историю до 5 мин.

## Детали реализации

+ Цены хранятся в numpy-массиве формы (количество инструментов, максимальное количество временных точек)

+ С массивом обращаемся как с циркулярным (после полного заполнения перезаписывает с начала).
  Благодаря этому размер памяти постоянный.

+ Тип данных массива вынесен в настройки. Сейчас это uint16, поэтому цены будут неотрицательные.
  При изменении цены проверяется, чтобы значение не вышло за границы, характерные для типа данных.

+ При генерации новых цен гарантируется, что никакие временные точки не будут пропущены.
  Например, если между двумя запусками функции по каким-то причиным прошло, допустим 3 сек, то 
  создадутся 3 недостающих массива точек.

+ Для получения цен передается индекс, начиная с которого следует получить цены. 
  Вместе с ценами возвращается индекс будущей точки. Это позволяет гарантированно получать
  всю последовательность точек, просто передавая возвращенный индекс в очередной вызов.
  Фронтенд таким образом получает всю последовательнось без пропусков, независимо от интервалов между запросами.

+ При загрузке страницы фронтенд сначала обычными http-запросами получает настройки 
  (имена инструментов и интервал между точками) и массив цен, соответствующий заданному размеру начальной истории.

+ Дальнейший обмен данными происходит через веб-сокет. Клиент передает серверу начальный индекс для
  очередной порции данных. В ответ получает эту порцию данных, следующий индекс и таймстамп последней точки.

+ Бэкенд реализован на flask и flask-socketio. Фронтенд на чистом javascript. График библиотечный (chartist.js).
  Я только реализовал прокрутку графика.


## Сборка и запуск

Локально

```bash
env/build.sh # Создаст докер образ

docker run --name=quote_generator --rm -d -p 80:80 fertilis/quote_generator python3.10 /app/main.py --port=80
```

Деплой на любую машину с докером

```bash
env/deploy.sh 185.105.89.11 fertilis # хост, имя в докерхабе (образ передается через него)
```
