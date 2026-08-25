import './styles.css';
import { supabase } from './supabase.js';
import { initQuiz } from './quiz.jsx';

const elements = {
   status: document.querySelector('#status'),
   animeList: document.querySelector('#anime-list'),
   characterListTitle: document.querySelector('#character-list-title'),
   characterStatus: document.querySelector('#character-status'),
   characterList: document.querySelector('#character-list'),
   animeSearchForm: document.querySelector('#anime-search-form'),
   animeSearchInput: document.querySelector('#anime-search'),
   animeSearchStatus: document.querySelector('#anime-search-status'),
   animeSearchResults: document.querySelector('#anime-search-results'),
   animeSeasonSelect: document.querySelector('#anime-season'),
};

const seasonNames = {
  1: '冬季',
  2: '春季',
  3: '夏季',
  4: '秋季',
};

function main() {
   // initloadAnimes();
   initSearchAnimes();
   initQuiz();
}

function initloadAnimes() {
   elements.status.textContent = '正在讀取動畫資料……';
   loadAnimes();
}

async function loadAnimes() {   
   // supabase 固定回傳 { data, error } 兩個屬性，如果要換掉變數只能用解構賦值的方式 => data:animes
   const { data:animes, error } = await supabase.from('animes').select
   (
      `
      id,
      title,
      release_year,
      release_season,
      series_season_number
      `
   )   
   .order('release_year', { ascending: true })
   .order('release_season', { ascending: true });

   if (error) {
      console.error('Supabase 查詢失敗：', error);
      elements.status.textContent = `查詢失敗：${error.message}`;

      return;
   }
   
   renderAnimesList(animes);
}

function createAnimeListItem(anime) {
   const listItem = document.createElement('li');
   const animeInfo = document.createElement('span');
   const button = document.createElement('button');

   // 要跟 styles.css 對應
   button.className = 'anime-button';

   const releaseSeason =
      seasonNames[anime.release_season] ?? '未知季度';

   animeInfo.className = 'anime-info';
   animeInfo.textContent =
      `${anime.title}｜第 ${anime.series_season_number} 季｜` +
      `${anime.release_year} 年 ${releaseSeason}`;

   button.type = 'button';
   button.textContent = '查看角色';
   button.addEventListener('click', () => {         
      handleAnimeClick(anime);
   });

   listItem.append(animeInfo, button);
   return listItem;
}

function renderAnimesList(animes) {
   // 用空內容代替現在的 child node，也就是清空目前網頁就對了
   // 網頁是由 DOM 管理 => 一大堆 node
   elements.animeList.replaceChildren();

   if (animes.length === 0) {
      elements.status.textContent = '資料庫目前沒有動畫資料';
      return;
   }

   elements.status.textContent = `成功取得 ${animes.length} 部動畫`;

   for (const anime of animes) {
      const listItem = createAnimeListItem(anime);
      elements.animeList.appendChild(listItem);
   }
}

async function handleAnimeClick(anime) {
   elements.characterListTitle.style.display = 'block';
   elements.characterListTitle.textContent =
      `${anime.title} Season ${anime.series_season_number} 的角色`;

   elements.characterStatus.style.display = 'block';
   elements.characterStatus.textContent =
      '正在讀取角色資料……';

   elements.characterList.replaceChildren();

   const characters =
      await loadCharacters(anime.id);

   if (characters === null) {
      elements.characterStatus.textContent =
         '讀取角色資料失敗，請稍後再試';
      return;
   }

   renderCharacters(characters);
}

async function loadCharacters(animeID) {
   // elements.status.textContent = '讀取角色中……';

   const { data:characters, error } = await supabase.from('characters').select(
      `
      id,
      display_name,
      description,
      character_animes!inner(anime_id)
      `
   ).eq('character_animes.anime_id', animeID);
   // 對應的 sql 語法
   // select
   // character.id,
   // character.display_name,
   // character.description
   // from character
   // inner join character_animes
   // on character.id = character_animes.character_id
   // where character_animes.anime_id = animeID;
   if (error) {
      console.error('Supabase 查詢失敗：', error);
      elements.characterStatus.textContent = `查詢失敗：${error.message}`;

      return null;
   }

   return characters;
}

function renderCharacters(characters) {   
   const characterList = elements.characterList;
   characterList.replaceChildren();

   if (characters.length === 0) {
      elements.characterStatus.textContent = '資料庫目前沒有角色資料';
      return;
   }

   elements.characterStatus.textContent = `成功取得 ${characters.length} 個角色`;

   for (const character of characters) {
      const listItem =
         document.createElement('li');

      listItem.textContent =
         `${character.display_name}｜${character.description}`;
      characterList.appendChild(listItem);
   }   
}

function initSearchAnimes() {
   elements.animeSearchForm.addEventListener('submit', async (event) => {
      // 阻止 form 原本的行為，避免重新載入網頁，交給後續的 javascript 來處理
      event.preventDefault();

      const keyword = elements.animeSearchInput.value.trim();

      const releaseSeason = elements.animeSeasonSelect.value;
      await searchAnimes(keyword, releaseSeason);
   });
}

async function searchAnimes(keyword, releaseSeason) {
   if (keyword === '' && releaseSeason === '') {
      elements.animeSearchStatus.textContent = '請輸入關鍵字或選擇季度進行搜尋';
      return;
   }

   elements.animeSearchStatus.textContent = '正在搜尋動畫……';

   let query = supabase.from('animes').select(
      `
      id,
      title,
      release_year,
      release_season,
      series_season_number
      `
   );
   // 如果有輸入關鍵字，就回傳含有關鍵字的資料
   if (keyword !== '') {
      query = query.ilike('title', `%${keyword}%`);
   }
   // 如果是用季度搜尋，回傳符合季度的資料
   if (releaseSeason !== '') {
      query = query.eq('release_season', releaseSeason);
   }

   query = query.order('release_year', { ascending: true })
                .order('release_season', { ascending: true });
   
   const { data: filteredAnimes, error } = await query
   if (error) {
      console.error('Supabase 搜尋失敗：', error);
      elements.animeSearchStatus.textContent = `搜尋失敗：${error.message}`;
      return;
   }

   displaySearchResults(filteredAnimes);
}

function displaySearchResults(animes) {
   elements.animeSearchResults.replaceChildren();
   if (animes.length === 0) {
      elements.animeSearchStatus.textContent = '沒有找到符合條件的動畫';
   } 
   else {
      elements.animeSearchStatus.textContent = `找到 ${animes.length} 部動畫`;
   }
   
   for (const anime of animes) {
      const listItem = createAnimeListItem(anime);
      elements.animeSearchResults.appendChild(listItem);
   }
}

main();
