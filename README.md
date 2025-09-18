# webpage.yaml -  Dokumentacja Projektu: Generator Stron WWW z Manifestu YAML

Generator Stron WWW z Manifestu YAML

## 1. Cel projektu

Projekt umożliwia tworzenie stron HTML z formularzami lub innymi elementami poprzez **manifest w formacie YAML**, który określa:

* strukturę DOM
* style CSS z możliwością dziedziczenia (`extends`)
* dynamiczną aktualizację podglądu na żywo w przeglądarce

Dzięki temu można w łatwy sposób projektować strony i formularze bez ręcznego pisania HTML/CSS.

<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/27a758ec-8f21-4b66-8bc7-de55ebdd6564" />


## 2. Technologie

| Komponent       | Technologia                                  | Uwagi                                                        |
| --------------- | -------------------------------------------- | ------------------------------------------------------------ |
| Parsowanie YAML | [js-yaml](https://github.com/nodeca/js-yaml) | Biblioteka JS do konwersji YAML → JS                         |
| Edytor YAML     | [CodeMirror 5](https://codemirror.net/)      | Edycja YAML z kolorowaniem składni                           |
| Stylowanie      | CSS generowane dynamicznie                   | Style definiowane w YAML, wsparcie dziedziczenia (`extends`) |
| HTML            | Vanilla JS + DOM API                         | Tworzenie elementów HTML dynamicznie                         |
| Layout          | Flexbox                                      | Edytor i podgląd w jednej linii, wysokość 100%               |

---

## 3. Struktura projektu

### 3.1 Pliki

* `index.html` – główny plik HTML z edytorem, podglądem i skryptami JS
* Biblioteki z CDN: `js-yaml` i `codemirror`

### 3.2 Struktura YAML

Manifest YAML składa się z dwóch głównych sekcji:

```yaml
styles:         # definicje stylów CSS
  base:
    font-family: Arial, sans-serif
    margin: 20px
  container:
    extends: base
    background: "#f9f9f9"
    padding: 20px
    border-radius: 5px
    max-width: 500px

structure:      # definicja struktury DOM
  body:
    style: base
    children:
      form:
        style: container
        children:
          - label:
              text: "Imię"
              style: label
          - input:
              type: text
              style: input_text
```

#### 3.2.1 Sekcja `styles`

* Każdy wpis to klasa CSS, np. `base`, `container`
* Obsługa dziedziczenia przez `extends`
* Każda właściwość to standardowy CSS w formacie `key: value`

#### 3.2.2 Sekcja `structure`

* Definiuje hierarchię DOM
* Każdy element ma:

  * `tag` – nazwa elementu HTML (`div`, `input`, `form`, `label`)
  * `style` – przypisana klasa CSS z sekcji `styles`
  * `text` – zawartość tekstowa (opcjonalna)
  * `id` – opcjonalny identyfikator
  * `type` – np. `text` dla inputów
  * `children` – listę dzieci, rekursywnie

<img width="849" height="983" alt="image" src="https://github.com/user-attachments/assets/db81d6ba-5eff-4b31-b3ea-945964452052" />

## 4. Mechanizm działania

1. **Parsowanie YAML**

   * Edytor wysyła zawartość YAML do funkcji `jsyaml.load()`
   * Tworzy obiekt JS z `styles` i `structure`

2. **Generowanie CSS**

   * Funkcja `mergeStyles` łączy style z dziedziczeniem
   * Funkcja `generateCss` konwertuje obiekt JS → CSS w `<style>`

3. **Generowanie DOM**

   * Funkcja `createElement` rekursywnie tworzy elementy HTML
   * Przypisuje klasy CSS, atrybuty i dzieci
   * Rezultat wstawiany do kontenera podglądu

4. **Podgląd live**

   * Edytor CodeMirror nasłuchuje zmiany (`onchange`)
   * Przy każdej zmianie wywoływana jest funkcja `renderManifest`
   * Podgląd aktualizowany bez odświeżania strony

---

## 5. Instrukcja użytkownika

1. Otwórz plik `index.html` w przeglądarce (lokalny serwer jest opcjonalny).
2. W lewej kolumnie znajduje się **edytor YAML**.
3. W prawej kolumnie podgląd formularza lub strony.
4. Edytując YAML:

   * Zmiana stylów w sekcji `styles` aktualizuje wygląd
   * Zmiana struktury w `structure` aktualizuje DOM
5. Wszystkie zmiany są od razu widoczne na żywo w podglądzie.

---

## 6. Instrukcja dewelopera

### 6.1 Funkcje kluczowe

| Funkcja                     | Opis                                    |
| --------------------------- | --------------------------------------- |
| `mergeStyles(styles, name)` | Łączy style z dziedziczeniem            |
| `styleToCss(styleObj)`      | Konwertuje obiekt JS → string CSS       |
| `generateCss(styles)`       | Generuje CSS dla wszystkich klas z YAML |
| `createElement(node)`       | Rekurencyjnie tworzy elementy DOM       |
| `renderManifest(yamlText)`  | Renderuje podgląd na podstawie YAML     |

### 6.2 Dodawanie nowych elementów

1. Dodaj definicję stylu w `styles`
2. Dodaj element w `structure` z odpowiednią klasą CSS
3. Elementy mogą mieć `children` dla zagnieżdżonych elementów


