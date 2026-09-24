(()=>{
  const KEY='sir_admin_lang';
  const valid=new Set(['no','ru']);
  let lang=localStorage.getItem(KEY)||'no';
  if(!valid.has(lang))lang='no';

  const rows=[
    ['SIR Admin','Админка SIR'],['ADMIN','АДМИНКА'],['WORK CENTER','РАБОЧИЙ ЦЕНТР'],
    ['Logg inn i administrasjonspanelet','Вход в админ-панель'],['SIR-databasen er ikke koblet til denne versjonen ennå.','База SIR ещё не подключена к этой сборке.'],
    ['E-post','Эл. почта'],['Passord','Пароль'],['Logg inn','Войти'],['Åpne sikker forhåndsvisning','Открыть безопасный предпросмотр'],
    ['Innlogging skjer via sikker Supabase-autentisering. Ansattes passord vises ikke til eieren; tilgang styres av roller.','Вход выполняется через защищённую авторизацию Supabase. Пароли сотрудников владельцу не показываются; доступ ограничивается ролями.'],
    ['← Til SIR Rens & Pleie-nettstedet','← На сайт SIR Rens & Pleie'],['Åpne nettstedet','Открыть сайт'],['Logg ut','Выйти'],
    ['Arbeid','Работа'],['Kontrollsenter','Центр контроля'],['Bestillinger','Заказы'],['Kalender','Календарь'],['Lager','Склад'],
    ['Kunnskap','Знания'],['Utstyr og veiledning','Арсенал и справочник'],['Kjemi og prosedyrer','Химия и процедуры'],['Fortynningskalkulator','Калькулятор разбавления'],
    ['Administrasjon','Управление'],['Kunder','Клиенты'],['Økonomi / ENK','Финансы / ENK'],['Betalinger og anbefalinger','Оплаты и рекомендации'],['Team','Команда'],
    ['Handlingslogg','Журнал действий'],['Innstillinger','Настройки'],['Sikkerhetskopi','Резервная копия'],['SIR QR-kode','QR SIR'],
    ['Eier','Владелец'],['Administrator','Администратор'],['Leder','Менеджер'],['Utfører','Исполнитель'],['Forhåndsvisning','Предпросмотр'],
    ['Ny','Новый'],['Til vurdering','На рассмотрении'],['Tilbud sendt','Предложение отправлено'],['Venter på bekreftelse','Ждёт подтверждения'],['Bekreftet','Подтверждён'],
    ['Planlagt','Запланирован'],['Pågår','В работе'],['Fullført','Выполнен'],['Trenger nytt tidspunkt','Нужно другое время'],['Avbestilt av kunde','Отменён клиентом'],
    ['Avbestilt av SIR','Отменён SIR'],['Ikke møtt','Неявка'],['Venter','Ожидает'],['Opptjent','Начислен'],['Kreditert','Зачислен'],['Avvist','Отклонён'],
    ['Lav risiko','Низкий риск'],['Forsiktig','Осторожно'],['Høy risiko','Высокий риск'],['Ikke kontrollert','Не проверено'],['Kilde kontrollert','Источник проверен'],
    ['Kontrollert','Проверено'],['Kontrollert mot produsentens instruksjon','Проверено по инструкции производителя'],['Utkast','Черновик'],
    ['Lett','Лёгкое'],['Middels','Среднее'],['Kraftig','Сильное'],['Spesielt','Особое'],
    ['Bilinteriør','Салон автомобиля'],['Sofa','Диван'],['Lenestol','Кресло'],['Madrass','Матрас'],['Teppe','Ковёр'],
    ['Teppe / gulv','Ковролин'],['Barnesete','Детское кресло'],['Taktrekk','Потолок салона'],['Innvendig plast','Пластик салона'],['Skinn','Кожа'],['Sikkerhetsbelte','Ремень безопасности'],['Tekstil','Текстиль'],
    ['Kjemi','Химия'],['Prosedyrer','Процедуры'],['Kjemikalie','Средство'],['Bruksområde','Назначение'],['Fortynning','Разведение'],['Kontroll','Проверка'],['Risiko','Риск'],['Aktiv','Активно'],
    ['Rediger','Редактировать'],['Åpne','Открыть'],['Legg til middel','Добавить средство'],['Legg til prosedyre','Добавить процедуру'],['Lagre','Сохранить'],['Lagret','Сохранено'],['Avbryt','Отмена'],['Lukk','Закрыть'],['Slett','Удалить'],
    ['Veiledningsredigerer','Редактор справочника'],['Kjemi og teknologiske prosedyrer endres her uten å redigere nettstedets kode.','Химия и технологические процедуры меняются здесь без редактирования кода сайта.'],
    ['Fortynningskalkulator','Калькулятор разбавления'],['Beregner nøyaktig mengde kjemi og vann for ønsket volum.','Считает точное количество химии и воды для нужного объёма.'],
    ['Middel','Средство'],['Uten kobling — manuell beregning','Без привязки — ручной расчёт'],['Forhold','Пропорция'],['1 del middel + X deler vann','1 часть средства + X частей воды'],
    ['Ønsket sluttvolum, ml','Нужный итоговый объём, мл'],['Hvor mye vann er allerede fylt, ml','Сколько воды уже налито, мл'],['Beregningsmåte','Как считать'],
    ['Sluttvolum av løsning','Итоговый объём раствора'],['Vann er allerede fylt','Вода уже налита'],['Resultat','Результат'],['Middel:','Средство:'],['Vann:','Вода:'],['Totalt:','Итого:'],
    ['Konsentrasjon av middel i ferdig løsning','Концентрация средства в готовом растворе'],['Klar til bruk.','Готово к применению.'],['Fortynning fra produktkortet:','Разведение из карточки:'],
    ['Manuell beregning er bare matematikk. Kontroller tillatt fortynning mot produktkortet og produsentens instruksjon før bruk.','Ручной расчёт — только математика. Перед применением сверяйте допустимое разведение с карточкой средства и инструкцией производителя.'],
    ['STOP: valgt middel har ikke bestått HMS/SDS-kontroll eller er sperret. Arbeidsberegning er deaktivert.','STOP: выбранное средство не прошло HMS/SDS-проверку или заблокировано. Рабочий расчёт для него отключён.'],
    ['Beregn','Рассчитать'],['Vis hele lageret','Показать весь склад'],['HMS / STOP — sperrede midler','HMS / STOP — заблокированные средства'],['Krever sikkerhetskontroll','Требует проверки безопасности'],
    ['Lager og kjemi','Склад и химия'],['Beholdning og HMS-kontroll i én liste','Наличие средств и контроль HMS в одном списке'],['Beholdningskontroll','Контроль наличия'],
    ['På lager','Есть'],['Lite igjen','Заканчивается'],['Tomt','Нет'],['Notat','Заметка'],['For eksempel: bestill 1 l','Например: заказать 1 л'],
    ['Kalender','Календарь'],['Laster kalender…','Загрузка календаря…'],['I dag','Сегодня'],['Ledig','Свободно'],['venter på bekreftelse','ожидает подтверждения'],['bekreftet','подтверждено'],['pågår','в работе'],['fullført','выполнено'],['avbestilling/problem','отмена/проблема'],
    ['Planlegg arbeid','Запланировать работу'],['Bestilling','Заказ'],['Start','Начало'],['Varighet, min','Длительность, мин'],['Format','Формат'],['SIR kommer til kunden','SIR приезжает к клиенту'],['Kunden kommer til SIR','Клиент приезжает к SIR'],['Annet sted','Другое место'],['Adresse / sted','Адрес / место'],
    ['Lagre midlertidig tidspunkt','Сохранить временный слот'],['Midlertidig tidspunkt — kunden har ikke bekreftet ennå.','Временный слот — клиент ещё не подтвердил.'],['Tidspunkt bekreftet.','Слот подтверждён.'],
    ['Ring','Позвонить'],['Åpne bestilling','Открыть заказ'],
    ['BETALINGER · ANBEFALINGER','ОПЛАТЫ · РЕКОМЕНДАЦИИ'],['Betalinger','Оплаты'],['Anbefalinger','Рекомендации'],['Betalt','Оплачено'],['Ubetalt','Не оплачено'],
    ['Regnskap','Бухгалтерия'],['ENK · REGNSKAP','ENK · БУХГАЛТЕРИЯ'],['Oversikt','Обзор'],['Inntekter','Доходы'],['Utgifter','Расходы'],['Fakturaer','Счета'],['Kjøring','Поездки'],['Utstyr','Оборудование'],
    ['Faktura','Счёт'],['Kreditnota','Кредит-нота'],['Kunde','Клиент'],['Dato','Дата'],['Forfall','Срок оплаты'],['Levering','Выполнение'],['Beskrivelse','Описание'],['Beløp','Сумма'],['Å betale','К оплате'],['Betaling','Оплата'],
    ['Betalingsfrist','Срок оплаты'],['Kontonummer','Банковский счёт'],['Betalingsmåte','Способ оплаты'],['Status','Статус'],['MVA registrert','MVA зарегистрирован'],
    ['Under MVA-grensen','До порога MVA'],['Nær MVA-grensen','Близко к порогу MVA'],['Grensen er overskredet — kontroller MVA-registrering','Порог превышен — проверьте регистрацию MVA'],
    ['Sikkerhetskopi av SIR','Резервная копия SIR'],['Lag eksport','Создать экспорт'],['Last ned JSON-sikkerhetskopi','Скачать резервную копию JSON'],['Eksporten er klar. Oppbevar kopien på et sikkert sted.','Экспорт готов. Храните копию в безопасном месте.'],
    ['TEKNOLOG','ТЕХНОЛОГ'],['Teknologikort','Технологическая карта'],['Veiledningsredigerer','Редактор справочника'],['Start arbeid','Начать работу'],['Fullfør arbeid','Завершить работу'],['Arbeidet er startet.','Работа начата.'],['Arbeidet er markert som fullført.','Работа отмечена выполненной.'],
    ['Ingen nettverk','Нет сети'],['Oppdater','Обновить'],['Laster…','Загрузка…'],['Lagrer…','Сохраняем…'],['Sender…','Отправляем…'],['Prøver igjen','Повторить'],
    ['Kritisk modul ble ikke lastet. Ingen data ble endret. Oppdater siden.','Критический модуль не загрузился. Данные не изменялись. Обновите страницу.'],
    ['Visningen kan være ufullstendig. Ikke send endringer før tilkoblingen er gjenopprettet.','Просмотр может быть неполным. Изменения не отправляйте до восстановления подключения.'],
    ['Hvis delen oppfører seg uvanlig, oppdater siden før du endrer data.','Если раздел работает необычно, обновите страницу перед изменением данных.'],
    ['Søk','Поиск'],['Søk etter navn, merke, bruksområde eller materiale…','Поиск по названию, бренду, назначению или материалу…'],['Alle','Все'],['Ingen resultater','Ничего не найдено'],
    ['Arbeidspanel','Рабочая панель'],['PROFESJONELL MODUS','ПРОФЕССИОНАЛЬНЫЙ РЕЖИМ'],['Sikkerhet','Безопасность'],['Bruk','Применение'],['Advarsler','Предупреждения'],['Oppbevaring','Хранение'],['Førstehjelp','Первая помощь'],
    ['Personlig verneutstyr','Средства индивидуальной защиты'],['HMS / kjemikalieregister','HMS / реестр химических веществ'],['Bygg arbeidsplan','Составить план работы'],['Arbeidsplan','План работы'],
    ['Overflate','Поверхность'],['Forurensning','Загрязнение'],['Materiale','Материал'],['Metode','Метод'],['Kjemiregel','Правило химии'],['Mekanisk metode','Механический метод'],['Stoppbetingelser','Условия STOP'],
    ['mandag','понедельник'],['tirsdag','вторник'],['onsdag','среда'],['torsdag','четверг'],['fredag','пятница'],['lørdag','суббота'],['søndag','воскресенье'],
    ['januar','январь'],['februar','февраль'],['mars','март'],['april','апрель'],['mai','май'],['juni','июнь'],['juli','июль'],['august','август'],['september','сентябрь'],['oktober','октябрь'],['november','ноябрь'],['desember','декабрь']
  ];

  const tokenRows=[
    ['Språk','Язык'],['Norsk','Норвежский'],['Russisk','Русский'],['Tilbake','Назад'],['Neste','Далее'],['Ferdig','Готово'],['Ja','Да'],['Nei','Нет'],
    ['Aktiv','Активен'],['Inaktiv','Неактивен'],['Navn','Имя'],['Telefon','Телефон'],['Adresse','Адрес'],['Pris','Цена'],['Tid','Время'],['Minutter','Минуты'],
    ['Kommentar','Комментарий'],['Bilder','Фото'],['Kilde','Источник'],['Produsent','Производитель'],['Instruksjon','Инструкция'],['Arbeid','Работа'],['Handling','Действие'],
    ['Profil','Профиль'],['Opprettet','Создано'],['Oppdatert','Обновлено'],['Feil','Ошибка'],['Advarsel','Предупреждение'],['Bekreft','Подтвердить'],
    ['OWNER','Владелец'],['ADMIN','Администратор'],['MANAGER','Менеджер'],['WORKER','Исполнитель'],
    ['HIGH_RISK','Высокий риск'],['HIGH RISK','Высокий риск'],['CAUTION','Осторожно'],['LOW','Низкий риск'],
    ['source_reviewed','Источник проверен'],['manufacturer_verified','Проверено по инструкции производителя'],['unverified','Не проверено'],['verified','Проверено'],['draft','Черновик'],
    ['pending','Ожидает'],['issued','Выставлен'],['credited','Исправлен кредит-нотой'],['cancelled','Отменён'],['paid','Оплачен'],
    ['bank','Банковский перевод'],['card','Карта'],['cash','Наличные'],['other','Другое'],
    ['Admin','Админка'],['Regnskap','Бухгалтерия'],['Faktura','Счёт'],['Kreditnota','Кредит-нота'],['Email','Эл. почта']
  ];

  const ruToNo=[
    ['Центр контроля','Kontrollsenter'],['Под контролем','Under kontroll'],['Требует внимания','Krever oppmerksomhet'],['Срочных действий нет','Ingen hastetiltak'],
    ['Решение','Beslutning'],['Не оплачено','Ikke betalt'],['Запланировано','Planlagt'],['В работе','Pågår'],['Последние заказы','Siste bestillinger'],
    ['Создать заказ','Opprett bestilling'],['Новый заказ','Ny bestilling'],['Клиент','Kunde'],['Телефон','Telefon'],['Адрес','Adresse'],['Услуга','Tjeneste'],['Статус','Status'],['Оплата','Betaling'],
    ['Итоговая цена','Sluttpris'],['Предварительная цена','Foreløpig pris'],['Сохранить','Lagre'],['Отмена','Avbryt'],['Закрыть','Lukk'],['Открыть','Åpne'],['Редактировать','Rediger'],
    ['Сегодня','I dag'],['Загрузка','Laster'],['Проверка доступа','Kontrollerer tilgang'],['Повторить','Prøv igjen'],['Нет доступа','Ingen tilgang'],
    ['Доступно после входа','Tilgjengelig etter innlogging'],['Рабочий день','Arbeidsdag'],['буфер','buffer'],['мин','min'],['Свободно','Ledig'],
    ['Имя','Navn'],['Роль','Rolle'],['Активен','Aktiv'],['Команда','Team'],['Раздельные аккаунты и роли','Separate kontoer og roller'],
    ['Журнал','Logg'],['Критические изменения','Kritiske endringer'],['Время','Tid'],['Событие','Hendelse'],['Объект','Objekt'],['Пользователь','Bruker'],
    ['Компания','Bedrift'],['Основной телефон','Primærtelefon'],['Второй телефон','Sekundærtelefon'],['Радиус, км','Radius, km'],['Выезд','Utrykning'],['Рабочее время','Arbeidstid'],
    ['Начало','Start'],['Конец','Slutt'],['Сохранить все настройки','Lagre alle innstillinger'],['Стартовые цены','Startpriser'],['Услуга','Tjeneste'],['Размер','Størrelse'],
    ['Лёгкое','Lett'],['Среднее','Middels'],['Сильное','Kraftig'],['Химия','Kjemi'],['Процедуры','Prosedyrer'],['Средство','Middel'],['Назначение','Bruksområde'],['Разведение','Fortynning'],
    ['Проверка','Kontroll'],['Риск','Risiko'],['Активно','Aktiv'],['Добавить средство','Legg til middel'],['Добавить процедуру','Legg til prosedyre'],
    ['Калькулятор разбавления','Fortynningskalkulator'],['Пропорция','Forhold'],['Вода','Vann'],['Итого','Totalt'],['Рассчитать','Beregn'],
    ['Склад и химия','Lager og kjemi'],['Контроль наличия','Beholdningskontroll'],['Есть','På lager'],['Заканчивается','Lite igjen'],['Нет','Tomt'],['Заметка','Notat'],
    ['Календарь','Kalender'],['Заказ','Bestilling'],['Длительность','Varighet'],['Формат','Format'],['Другое место','Annet sted'],['Позвонить','Ring'],
    ['Оплаты','Betalinger'],['Рекомендации','Anbefalinger'],['Финансы','Økonomi'],['Бухгалтерия','Regnskap'],['Доход','Inntekt'],['Расход','Utgift'],['Счёт','Faktura'],
    ['Кредит-нота','Kreditnota'],['Дата','Dato'],['Срок оплаты','Forfall'],['Описание','Beskrivelse'],['Сумма','Beløp'],['К оплате','Å betale'],['Способ оплаты','Betalingsmåte'],
    ['Резервная копия','Sikkerhetskopi'],['Создать экспорт','Lag eksport'],['Скачать резервную копию JSON','Last ned JSON-sikkerhetskopi'],
    ['Технолог','Teknolog'],['Технологическая карта','Teknologikort'],['Начать работу','Start arbeid'],['Завершить работу','Fullfør arbeid'],
    ['Низкий риск','Lav risiko'],['Осторожно','Forsiktig'],['Высокий риск','Høy risiko'],['Не проверено','Ikke kontrollert'],['Источник проверен','Kilde kontrollert'],['Проверено','Kontrollert'],
    ['Владелец','Eier'],['Администратор','Administrator'],['Менеджер','Leder'],['Исполнитель','Utfører'],['Предпросмотр','Forhåndsvisning'],
    ['понедельник','mandag'],['вторник','tirsdag'],['среда','onsdag'],['четверг','torsdag'],['пятница','fredag'],['суббота','lørdag'],['воскресенье','søndag'],
    ['январь','januar'],['февраль','februar'],['март','mars'],['апрель','april'],['май','mai'],['июнь','juni'],['июль','juli'],['август','august'],['сентябрь','september'],['октябрь','oktober'],['ноябрь','november'],['декабрь','desember']
  ];

  const exact=new Map();
  for(const [no,ru] of rows){exact.set(no,{no,ru});exact.set(ru,{no,ru});}
  for(const [no,ru] of tokenRows){exact.set(no,{no,ru});exact.set(ru,{no,ru});}

  const ruParts=[...ruToNo].sort((a,b)=>b[0].length-a[0].length);
  const noParts=[...tokenRows,...rows].sort((a,b)=>b[0].length-a[0].length);

  function preserveSpace(raw,value){
    const lead=raw.match(/^\s*/)?.[0]||'',tail=raw.match(/\s*$/)?.[0]||'';
    return lead+value+tail;
  }

  function translate(raw){
    if(raw==null)return raw;
    const s=String(raw),t=s.trim();
    if(!t)return s;
    const hit=exact.get(t);
    if(hit)return preserveSpace(s,hit[lang]);
    let out=t;
    if(lang==='no' && /[А-Яа-яЁё]/.test(out)){
      for(const [ru,no] of ruParts)out=out.split(ru).join(no);
    }else if(lang==='ru' && /[A-Za-zÆØÅæøå]/.test(out)){
      for(const [no,ru] of noParts)out=out.split(no).join(ru);
    }
    return out===t?s:preserveSpace(s,out);
  }

  let applying=false;
  function apply(root=document.body){
    if(applying||!root)return;
    applying=true;
    try{
      const base=root.nodeType===1?root:root.parentElement||document.body;
      const walker=document.createTreeWalker(base,NodeFilter.SHOW_TEXT);const nodes=[];
      while(walker.nextNode())nodes.push(walker.currentNode);
      for(const n of nodes){
        const p=n.parentElement;if(!p||['SCRIPT','STYLE','CODE','PRE'].includes(p.tagName))continue;
        const v=translate(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v;
      }
      const els=[base,...(base.querySelectorAll?.('[placeholder],[title],[aria-label]')||[])];
      for(const el of els)for(const a of ['placeholder','title','aria-label']){
        if(!el?.hasAttribute?.(a))continue;const before=el.getAttribute(a),after=translate(before);if(after!==before)el.setAttribute(a,after);
      }
      document.documentElement.lang=lang==='no'?'nb':'ru';
      const dt=translate(document.title);if(dt!==document.title)document.title=dt;
      document.querySelectorAll('[data-sir-lang]').forEach(b=>b.classList.toggle('active',b.dataset.sirLang===lang));
      const sw=document.querySelector('.sir-lang-switch');
      if(sw)sw.setAttribute('aria-label',lang==='no'?'Språkvalg':'Выбор языка');
    }finally{applying=false;}
  }

  function makeSwitch(){
    if(document.querySelector('.sir-lang-switch'))return;
    const wrap=document.createElement('div');wrap.className='sir-lang-switch';wrap.setAttribute('role','group');
    wrap.innerHTML='<button type="button" data-sir-lang="no">NO</button><button type="button" data-sir-lang="ru">RU</button>';
    const host=document.querySelector('.admin-top-actions')||document.querySelector('.admin-top .toolbar')||document.querySelector('.admin-top')||document.querySelector('.nav')||document.body;
    host.appendChild(wrap);
    wrap.querySelectorAll('[data-sir-lang]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.sirLang)));
  }

  function style(){
    if(document.getElementById('sirLangStyle'))return;
    const s=document.createElement('style');s.id='sirLangStyle';
    s.textContent='.sir-lang-switch{display:inline-flex;gap:3px;padding:3px;border:1px solid #39444f;border-radius:999px;background:#0b1116;align-items:center;flex:0 0 auto}.sir-lang-switch button{border:0;background:transparent;color:#9eabb5;font:800 12px/1 system-ui;padding:7px 9px;border-radius:999px;cursor:pointer}.sir-lang-switch button.active{background:#38d3ae;color:#07120f}@media(max-width:700px){.sir-lang-switch{position:fixed;right:12px;bottom:14px;z-index:10000;box-shadow:0 6px 24px #0008}}@media print{.sir-lang-switch{display:none!important}}';
    document.head.appendChild(s);
  }

  function select(next){
    if(!valid.has(next))return;
    lang=next;localStorage.setItem(KEY,lang);
    location.reload();
  }

  function init(){
    style();makeSwitch();apply();
    const obs=new MutationObserver(ms=>{
      if(applying)return;
      for(const m of ms){
        if(m.type==='characterData'){apply(m.target.parentElement||document.body);continue;}
        for(const n of m.addedNodes){if(n.nodeType===1)apply(n);else if(n.nodeType===3)apply(n.parentElement||document.body);}
      }
    });
    obs.observe(document.body,{subtree:true,childList:true,characterData:true});
  }

  window.SIR_ADMIN_I18N={get lang(){return lang},select,apply,translate};
  if(document.readyState==='loading')addEventListener('DOMContentLoaded',init,{once:true});else init();
})();