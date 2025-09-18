konwersja stron w react do manifest
konwersja strony www z url do manifest
tworzenie submanifestow aby stworzyc moduły

jak potem łączyc te moduły?

może dodać jeszcze jedno pole do manifestu, które będzie zawierało liste modułów, które mają być załadowane?

jak łączyć manifesty jeden po drugim bezposrednio z url tak jakby to był js?
zrob server do serowwania stron www z manifestow, aby mozna było łatwo konwertować pomiędzy róznymi formatami:
- php
- html
- react
- vue
 
 
Dodaj Makefile i folder scripts z ktorego makefile bedzie urcuhamial skrypty bash/python
Stworz fodler examples dla przykładów wykorzystania tego rozwiązania z róznymi technologiami, językami jak python, php  i wróżnych konfiguracjach i użyciach

Zmien domyślny port na ustawiony w pliku .env
dodaj do .env rowniez inne zmienne
* zmien port na 3009

Rozszerzenia projektu:
* Automatyczne zapisywanie YAML do pliku lokalnego
* Eksport HTML + CSS jednym kliknięciem
* Obsługa dodatkowych tagów i atrybutów HTML
* Walidacja YAML i wyświetlanie błędów w edytorze
* Integracja z frameworkiem frontendowym (React/Vue)


zaktualizuj dokumentacje z ascii, mermaid, przykladami, 
- dodaj mozliwosc laczenia roznych templates poporzez manifest, 
- podaj przyklady integracji roznych jezykow, framework, jak mozna dzieki dodatkowej wirtualizacji z docker, renderowac w locie te moduly
- stworz taki manifest z automatycznym renderowaniem poprozez podanie plikow i spospu renderowania np . docker i wyboru images: lokalny lub zdalny
- reszta powinna po chwili stac sie sama porporzez automatyczne uruchomienie manifestu jako servera bazujacego na docker compose, 
- dodaj mozliwosc uzycia innej domeny niz localhost z opcja tls dla produkcyjnych systemow