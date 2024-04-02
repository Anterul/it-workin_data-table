import { useEffect, useState } from "react";
import * as Api from "../../utils/Api";
import Customer from "../Customer/Customer";
import { urlForApi } from "../../utils/constants";
import axios from "axios";
import "./DataTab.scss";
import PaginationBar from "../PaginationBar/PaginationBar";
import LoadingPopup from "../LoadingPopup/LoadingPopup";
import SearchBar from "../SearchBar/SearchBar";

function DataTab() {
  // стейт для массива с персонажами
  const [characters, setCharacters] = useState<any[]>([]);

  // стейт для массива с локациями
  const [locations, setLocations] = useState([]);

  // выполняется ли в данный момент запрос данных
  const [isFetchingData, setIsFetchingData] = useState(false);

  // количество отбражаемых строк
  const [elementsToDisplayOnCurrentPage, setElementsToDisplayOnCurrentPage] =
    useState<number>(15);

  // всего возможных строк с api/character
  const [totalAvailabeCharacters, setTotalAvailableCharacters] = useState(0);

  // счетчик общего количества страниц с учетом rows per page(округление в +)
  function countPagesNumber(selectedApiCount: number): number {
    return Math.ceil(selectedApiCount / elementsToDisplayOnCurrentPage);
  }

  let countPagesNumberForCharacters: number = countPagesNumber(
    totalAvailabeCharacters
  );

  // число строк, которое может возвратить apiCharacters
  const numberOfReturnedApiCharacters: number = 20;

  // текущая страница
  const [currentPage, setCurrentPage] = useState<number>(1);

  // попап загрузки
  const [isLoadingPopupOpen, setIsLoadingPopupOpen] = useState(false);

  // таймаут для закрытя попапа, чтобы он был заметен
  function loadingPopupCloseTimer() {
    return setTimeout(() => {
      setIsLoadingPopupOpen(false);
    }, 100);
  }

  // сортировка по имени, отслеживание нажатия
  const [isSortingPressed, setIsSortingPressed] = useState(false);

  // сортировка по имени
  function sortByName(arrayForSorting: any) {
    // проверка отсортирован ли массив
    function isSortedAlphabetically(arrayForSorting: any[]): boolean {
      for (let i = 0; i < arrayForSorting.length - 1; i++) {
        if (arrayForSorting[i].name > arrayForSorting[i + 1].name) {
          return false; // Если текущий элемент больше следующего, массив не отсортирован
        }
      }
      return true; // Если все элементы удовлетворяют условию сортировки, массив отсортирован
    }
    // переключение a-z, z-a
    if (isSortedAlphabetically(arrayForSorting)) {
      arrayForSorting.sort(
        (a: any, b: any) => (a.name > b.name ? -1 : 1)
        // Сортировка строк от Z-A
      );
    } else {
      arrayForSorting.sort((a: any, b: any) => (a.name > b.name ? 1 : 1));
    }
  }
  // отмена отслеживания сортировки, если был переход на другую страницу
  useEffect(() => {
    setIsSortingPressed(false);
  }, [currentPage]);

  /* функция, которая подгрузит данные если в массиве меньше контента,
  чем необходимо отбразить. useEffect ниже сработает от
  изменения в селекторе выбора количества отбражаемых страниц*/
  async function getMissingData(arrayFromApi: any) {
    if (
      arrayFromApi.length !== 0 &&
      elementsToDisplayOnCurrentPage > arrayFromApi.length
    ) {
      const totalPagesToDownload = Math.ceil(
        elementsToDisplayOnCurrentPage / arrayFromApi.length
      );
      for (let i = 2; i <= totalPagesToDownload; ++i) {
        await getCharacters(i);
      }
    }
  }

  useEffect(() => {
    getMissingData(characters);
  }, [elementsToDisplayOnCurrentPage]);

  // функция, высчитывающая начало рендера
  function calculateStartOfRendering(): number {
    if (currentPage === 1) {
      return 0;
    } else {
      return (
        elementsToDisplayOnCurrentPage * currentPage -
        elementsToDisplayOnCurrentPage
      );
    }
  }

  //
  function calculateEndOfRendering(): number {
    return Number(calculateStartOfRendering()) + elementsToDisplayOnCurrentPage;
  }

  // проверка на необходимость загрузки новых даных
  async function getAdditionalData(arrayFromApi: any) {
    if (
      arrayFromApi.length - calculateEndOfRendering() <
      elementsToDisplayOnCurrentPage
    ) {
      const numberOfDownloadedPages = Math.ceil(
        arrayFromApi.length / numberOfReturnedApiCharacters
      );
      // сколько загрузить целых страниц с учетом размера отбражаемых элементов
      const pagesForElementsToDisplay = Math.ceil(
        elementsToDisplayOnCurrentPage / numberOfReturnedApiCharacters
      );
      const numberOfPagesToDownload =
        numberOfDownloadedPages + pagesForElementsToDisplay;
      // console.log(numberOfDownloadedPages);
      // проверка на случай, когда нужно загрузить данные несколько раз
      if (numberOfPagesToDownload - numberOfDownloadedPages > 1) {
        for (
          let i = numberOfDownloadedPages + 1;
          i <= numberOfPagesToDownload;
          i++
        ) {
          // console.log(i);
          await getCharacters(i);
        }
      } else {
        getCharacters(numberOfPagesToDownload);
      }
    }
  }

  // пагинация, следующая страница
  function loadNextPage() {
    getAdditionalData(characters);
    setCurrentPage(currentPage + 1);
  }

  // пагинация, предыдущая страница
  function loadPreviousPage() {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }

  // функция, отвечающая за изменение количества отбражаемых элементов
  function handleElementsPerPageChange(value: number) {
    setCurrentPage(1);
    setElementsToDisplayOnCurrentPage(value);
  }

  // запрос к api, черновик(переместить в папку api)
  async function getCharacters(pageNumber: number) {
    setIsFetchingData(true);
    setIsLoadingPopupOpen(true);
    try {
      const response = await axios.get(
        `https://rickandmortyapi.com/api/character?page=${pageNumber}`
      );
      if (characters.length === 0) {
        setCharacters(response.data.results);
      } else {
        setCharacters((prevArray) => {
          return prevArray.concat(response.data.results);
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsFetchingData(false);
      loadingPopupCloseTimer();
    }
  }

  useEffect(() => {
    /* достаточно прогрузить только первую страницу,
    т.к. по умолчанию нужно отбразить 15 строк*/
    getCharacters(1);
    // записываем в переменную сколько всего может быть строк с персонажами
    Api.getCharacterApiInfoCount(
      urlForApi.character,
      setTotalAvailableCharacters,
      loadingPopupCloseTimer
    );
  }, []);

  // функция для разработки - загрузить несколько страниц подряд
  async function getManyCharacters() {
    for (let i = 2; i <= 10; i++) {
      await getCharacters(i);
    }
  }

  // кнопки для разработки
  function testFunction1(): any {
    console.log(characters);

    getManyCharacters();

    // getCharacters(2);
    /*
    console.log(customers[0]["name"]);
    console.log(apiInfoCount);
    console.log(countPagesNumber());
    */
    /*
    console.log(testArray.length);
    console.log(computeNewPageNumber(testArray));
    */
  }

  const slicedElements = characters.slice(
    calculateStartOfRendering(),
    calculateEndOfRendering()
  );

  let renderdElements = slicedElements.map((item) => (
    <Customer customer={item} key={item["id"]} />
  ));

  // test
  const renderdElementsTest: any = slicedElements.sort((a: any, b: any) =>
    a.name.localeCompare(b.name)
  );

  function testFunction2(): any {
    console.log(slicedElements);
    console.log(renderdElementsTest);
  }

  return (
    <div className="data-tab">
      <button
        className="data-tab__button"
        type="button"
        onClick={testFunction1}
      >
        testButton1
      </button>
      <button
        className="data-tab__button"
        type="button"
        onClick={testFunction2}
      >
        testButton2
      </button>
      <SearchBar setIsSortingPressed={setIsSortingPressed} />
      <ul className="data-tab__ul">{renderdElements}</ul>
      <PaginationBar
        // currentPage
        currentPage={currentPage}
        // индексы начала и конца
        firstOnList={calculateStartOfRendering() + 1}
        lastOnList={calculateEndOfRendering()}
        // всего возможных записей с api
        totalAvailabeCharacters={totalAvailabeCharacters}
        //
        pagesNumberCounter={countPagesNumberForCharacters}
        elementsToDisplayOnCurrentPage={elementsToDisplayOnCurrentPage}
        // изменение количества отбражаемых элементов
        handleElementsPerPageChange={handleElementsPerPageChange}
        // логика кнопок пагинации
        loadPreviousPage={loadPreviousPage}
        loadNextPage={loadNextPage}
      />
      <LoadingPopup isOpen={isLoadingPopupOpen} />
    </div>
  );
}

export default DataTab;
